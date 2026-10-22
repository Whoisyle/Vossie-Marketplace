-- Courier onboarding (owner designs, 2026-10-21): a student becomes a courier on the same account, through a setup, the
-- documents and a review by Vossie Operations, the same way a seller does. This replaces "invite only" for the courier role;
-- an invited courier still works as before.
--
-- Flow: save_courier_onboarding (draft) -> attach_courier_document for each document -> submit_courier_verification
-- (documents go in review, courier goes to pending_review) -> staff_review_courier_document for each document. When the last
-- required document is verified the courier is approved and can go online. Same rules as before: RLS on, read policies only,
-- writes through functions.
--
-- What is checked here is the shape of what a courier types (a South African plate, a licence number, a licence that has not
-- run out and is at most five years away). Whether the person, the plate or the licence is real is for the document review.

alter table public.courier_profiles drop constraint courier_profiles_status_check;
alter table public.courier_profiles add constraint courier_profiles_status_check
  check (status in ('draft', 'pending_review', 'active', 'suspended', 'rejected'));

alter table public.courier_profiles
  add column vehicle_make text,
  add column vehicle_model text,
  add column vehicle_colour text,
  add column plate text,
  add column licence_number text,
  add column licence_expires date,
  /** Per day hours the courier works, like the seller's opening hours: {"mon": {"from": "08:00", "to": "17:00"}, ...}. A missing day is a day off. */
  add column schedule jsonb not null default '{}',
  add column auto_offline boolean not null default true,
  /** The longest trip the courier takes, in kilometres. */
  add column max_km numeric(4, 1) not null default 3 check (max_km between 0.5 and 20),
  add column weekly_goal_cents bigint not null default 0 check (weekly_goal_cents >= 0),
  add column review_note text,
  add constraint courier_licence_expiry_range check (licence_expires is null or licence_expires <= date '2100-01-01');

create type public.courier_doc_kind as enum ('id', 'selfie', 'licence', 'background');
create type public.courier_doc_status as enum ('required', 'uploaded', 'in_review', 'verified', 'rejected');

create table public.courier_documents (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid not null references public.courier_profiles (user_id) on delete cascade,
  kind public.courier_doc_kind not null,
  status public.courier_doc_status not null default 'uploaded',
  /** Path in the private courier-documents bucket. */
  storage_path text not null,
  file_name text,
  note text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (courier_id, kind)
);
create index courier_documents_review_idx on public.courier_documents (status) where status = 'in_review';
create trigger courier_documents_touch before update on public.courier_documents
  for each row execute function private.touch_updated_at();

/** Where a courier takes jobs from: the campus and nearby places differ for every campus; a courier can add a place by searching. */
create table public.courier_zones (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid not null references public.courier_profiles (user_id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 80),
  detail text not null default '',
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  custom boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (courier_id, name)
);
create index courier_zones_courier_idx on public.courier_zones (courier_id);

-- ---------------------------------------------------------------------------
-- Shape checks
-- ---------------------------------------------------------------------------
create function private.is_motor_vehicle(p_vehicle text) returns boolean
language sql immutable as $$ select p_vehicle in ('scooter', 'car') $$;

/** A South African number plate in the provincial, Western Cape or KwaZulu-Natal form, upper case with no spaces; null when it is not one. */
create function private.normalise_plate(p_plate text) returns text
language sql immutable as $$
  select case
    when t ~ '^[A-Z]{2,3}[0-9]{2,3}([A-Z]{2})?(GP|MP|NW|FS|EC|NC|LP|KZN|WC)$' then t
    when t ~ '^C[A-Z]{1,2}[0-9]{3,6}$' then t
    when t ~ '^N[A-Z]{1,2}[0-9]{3,6}$' then t
    else null end
  from (select regexp_replace(upper(coalesce(p_plate, '')), '[^A-Z0-9]', '', 'g') as t) s
$$;

create function private.check_licence(p_number text, p_expires date) returns text
language sql immutable as $$
  select case
    when regexp_replace(upper(coalesce(p_number, '')), '\s', '', 'g') !~ '^[A-Z0-9]{10,13}$' then 'invalid_licence_number'
    when p_expires is null or p_expires <= current_date then 'licence_expired'
    when p_expires > current_date + 1830 then 'licence_too_far'
    else null end
$$;

/** The documents a courier must give: the ID and the selfie for everyone, and the driving licence for a scooter or a car. */
create function private.required_courier_docs(p_vehicle text) returns public.courier_doc_kind[]
language sql immutable as $$
  select case when private.is_motor_vehicle(p_vehicle)
              then array['id', 'selfie', 'licence']::public.courier_doc_kind[]
              else array['id', 'selfie']::public.courier_doc_kind[] end
$$;

-- ---------------------------------------------------------------------------
-- Setup
-- ---------------------------------------------------------------------------
create function public.save_courier_onboarding(
  p_full_name text, p_phone text, p_campus_id text, p_vehicle text,
  p_make text default null, p_model text default null, p_colour text default null, p_plate text default null,
  p_licence_number text default null, p_licence_expires date default null
) returns public.courier_profiles
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[\s()-]', '', 'g');
  v_plate text := private.normalise_plate(p_plate);
  v_problem text;
  v_row public.courier_profiles;
begin
  if not exists (select 1 from public.profiles where id = v_user and deleted_at is null) then
    raise exception 'profile_missing' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_full_name, ''))) < 2 then raise exception 'invalid_name' using errcode = '22023'; end if;
  if v_phone !~ '^(\+27|0)[6-8][0-9]{8}$' then raise exception 'invalid_phone' using errcode = '22023'; end if;
  if p_vehicle not in ('on_foot', 'bicycle', 'scooter', 'car') then raise exception 'invalid_vehicle' using errcode = '22023'; end if;
  if not exists (select 1 from public.campuses where id = p_campus_id) then raise exception 'invalid_campus' using errcode = '22023'; end if;
  if private.is_motor_vehicle(p_vehicle) then
    if length(btrim(coalesce(p_make, ''))) = 0 or length(btrim(coalesce(p_model, ''))) = 0 or length(btrim(coalesce(p_colour, ''))) = 0 then
      raise exception 'vehicle_incomplete' using errcode = '22023';
    end if;
    if v_plate is null then raise exception 'invalid_plate' using errcode = '22023'; end if;
    v_problem := private.check_licence(p_licence_number, p_licence_expires);
    if v_problem is not null then raise exception '%', v_problem using errcode = '22023'; end if;
  end if;
  if exists (select 1 from public.courier_profiles where user_id = v_user and status in ('pending_review', 'active', 'suspended')) then
    raise exception 'already_submitted' using errcode = '22023';
  end if;
  insert into public.courier_profiles (user_id, full_name, phone, vehicle, campus_ids, status, online,
                                       vehicle_make, vehicle_model, vehicle_colour, plate, licence_number, licence_expires)
  values (v_user, btrim(p_full_name), v_phone, p_vehicle, array[p_campus_id], 'draft', false,
          case when private.is_motor_vehicle(p_vehicle) then btrim(p_make) end,
          case when private.is_motor_vehicle(p_vehicle) then btrim(p_model) end,
          case when private.is_motor_vehicle(p_vehicle) then btrim(p_colour) end,
          case when private.is_motor_vehicle(p_vehicle) then v_plate end,
          case when private.is_motor_vehicle(p_vehicle) then upper(regexp_replace(p_licence_number, '\s', '', 'g')) end,
          case when private.is_motor_vehicle(p_vehicle) then p_licence_expires end)
  on conflict (user_id) do update set
    full_name = excluded.full_name, phone = excluded.phone, vehicle = excluded.vehicle, campus_ids = excluded.campus_ids,
    vehicle_make = excluded.vehicle_make, vehicle_model = excluded.vehicle_model, vehicle_colour = excluded.vehicle_colour,
    plate = excluded.plate, licence_number = excluded.licence_number, licence_expires = excluded.licence_expires,
    status = 'draft', review_note = null
  returning * into v_row;
  perform private.audit('courier.onboarding_saved', 'courier', v_user::text);
  return v_row;
end $$;

create function public.attach_courier_document(p_kind public.courier_doc_kind, p_storage_path text, p_file_name text default null)
returns public.courier_documents
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_row public.courier_documents;
begin
  if not exists (select 1 from public.courier_profiles where user_id = v_user and status in ('draft', 'rejected', 'pending_review')) then
    raise exception 'setup_incomplete' using errcode = '22023';
  end if;
  if split_part(p_storage_path, '/', 1) <> v_user::text then raise exception 'invalid_path' using errcode = '42501'; end if;
  if p_kind = 'licence' and not private.is_motor_vehicle((select vehicle from public.courier_profiles where user_id = v_user)) then
    raise exception 'not_required' using errcode = '22023';
  end if;
  if exists (select 1 from public.courier_documents where courier_id = v_user and kind = p_kind and status = 'verified') then
    raise exception 'already_verified' using errcode = '22023';
  end if;
  insert into public.courier_documents (courier_id, kind, status, storage_path, file_name)
  values (v_user, p_kind, 'uploaded', p_storage_path, p_file_name)
  on conflict (courier_id, kind) do update set
    status = 'uploaded', storage_path = excluded.storage_path, file_name = excluded.file_name,
    note = null, reviewed_by = null, reviewed_at = null
  returning * into v_row;
  perform private.audit('courier.document_attached', 'courier', v_user::text, jsonb_build_object('kind', p_kind));
  return v_row;
end $$;

create function public.submit_courier_verification() returns public.courier_profiles
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  c public.courier_profiles;
  v_missing public.courier_doc_kind[];
  v_problem text;
begin
  select * into c from public.courier_profiles where user_id = v_user for update;
  if not found then raise exception 'setup_incomplete' using errcode = '22023'; end if;
  if c.status in ('active', 'suspended', 'pending_review') then return c; end if;
  if private.is_motor_vehicle(c.vehicle) then
    v_problem := private.check_licence(c.licence_number, c.licence_expires);
    if v_problem is not null then raise exception '%', v_problem using errcode = '22023'; end if;
  end if;
  select array_agg(k) into v_missing
    from unnest(private.required_courier_docs(c.vehicle)) k
   where not exists (select 1 from public.courier_documents d
                      where d.courier_id = v_user and d.kind = k and d.status in ('uploaded', 'in_review', 'verified'));
  if v_missing is not null then raise exception 'documents_missing: %', v_missing using errcode = '22023'; end if;
  update public.courier_documents set status = 'in_review' where courier_id = v_user and status = 'uploaded';
  update public.courier_profiles set status = 'pending_review', review_note = null where user_id = v_user returning * into c;
  insert into public.memberships (user_id, role, campus_id, state)
  values (v_user, 'courier', c.campus_ids[1], 'pending')
  on conflict (user_id, role, campus_id) do update set state = 'pending';
  perform private.audit('courier.verification_submitted', 'courier', v_user::text);
  return c;
end $$;

-- Staff: accept or turn down one document. When every required document is verified the courier is approved.
create function public.staff_review_courier_document(p_document_id uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_doc public.courier_documents;
  c public.courier_profiles;
  v_staff uuid;
begin
  select * into v_doc from public.courier_documents where id = p_document_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into c from public.courier_profiles where user_id = v_doc.courier_id for update;
  v_staff := private.require_staff(c.campus_ids[1]);
  if p_decision not in ('verified', 'rejected') then raise exception 'invalid_decision' using errcode = '22023'; end if;
  if v_doc.status <> 'in_review' then raise exception 'not_in_review' using errcode = '22023'; end if;
  update public.courier_documents set status = p_decision::public.courier_doc_status, note = p_note,
         reviewed_by = v_staff, reviewed_at = now() where id = p_document_id;
  perform private.audit('courier.document_reviewed', 'courier', c.user_id::text, jsonb_build_object('kind', v_doc.kind, 'decision', p_decision));
  if p_decision = 'rejected' then
    update public.courier_profiles set status = 'rejected', review_note = coalesce(p_note, 'A document was not accepted. Upload it again.')
     where user_id = c.user_id;
    perform private.notify(c.user_id, 'courier_review', 'Courier application', coalesce(p_note, 'A document was not accepted. Upload it again.'),
                           '/courier-setup/verify', '{}'::jsonb);
  elsif c.status = 'pending_review' and not exists (
    select 1 from unnest(private.required_courier_docs(c.vehicle)) k
     where not exists (select 1 from public.courier_documents d where d.courier_id = c.user_id and d.kind = k and d.status = 'verified')
  ) then
    update public.courier_profiles set status = 'active', review_note = null where user_id = c.user_id;
    update public.memberships set state = 'active', granted_by = v_staff where user_id = c.user_id and role = 'courier';
    perform private.audit('courier.approved', 'courier', c.user_id::text);
    perform private.notify(c.user_id, 'courier_review', 'You are verified', 'You can go online and take deliveries.', '/courier', '{}'::jsonb);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Hours, zones, licence renewal
-- ---------------------------------------------------------------------------
create function public.set_courier_schedule(p_schedule jsonb, p_auto_offline boolean, p_max_km numeric) returns public.courier_profiles
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_day text;
  v_hours jsonb;
  c public.courier_profiles;
begin
  if jsonb_typeof(p_schedule) <> 'object' then raise exception 'invalid_schedule' using errcode = '22023'; end if;
  for v_day, v_hours in select * from jsonb_each(p_schedule) loop
    if v_day not in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun') or jsonb_typeof(v_hours) <> 'object'
       or coalesce(v_hours ->> 'from', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or coalesce(v_hours ->> 'to', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or (v_hours ->> 'from') >= (v_hours ->> 'to') then
      raise exception 'invalid_schedule' using errcode = '22023';
    end if;
  end loop;
  if p_max_km is null or p_max_km < 0.5 or p_max_km > 20 then raise exception 'invalid_distance' using errcode = '22023'; end if;
  update public.courier_profiles set schedule = p_schedule, auto_offline = coalesce(p_auto_offline, true), max_km = p_max_km
   where user_id = v_user returning * into c;
  if not found then raise exception 'setup_incomplete' using errcode = '22023'; end if;
  return c;
end $$;

create function public.add_courier_zone(p_name text, p_detail text, p_latitude numeric, p_longitude numeric, p_custom boolean default true)
returns public.courier_zones
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_row public.courier_zones;
begin
  if not exists (select 1 from public.courier_profiles where user_id = v_user) then raise exception 'setup_incomplete' using errcode = '22023'; end if;
  if (select count(*) from public.courier_zones where courier_id = v_user) >= 12 then raise exception 'too_many_zones' using errcode = '22023'; end if;
  insert into public.courier_zones (courier_id, name, detail, latitude, longitude, custom)
  values (v_user, btrim(p_name), coalesce(p_detail, ''), p_latitude, p_longitude, coalesce(p_custom, true))
  on conflict (courier_id, name) do update set detail = excluded.detail, latitude = excluded.latitude, longitude = excluded.longitude, active = true
  returning * into v_row;
  return v_row;
end $$;

create function public.set_courier_zone_active(p_zone_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.courier_zones set active = p_active where id = p_zone_id and courier_id = private.require_user();
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

/** A courier's own zones can be removed; the places that came with the campus can only be switched off. */
create function public.remove_courier_zone(p_zone_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.courier_zones where id = p_zone_id and courier_id = private.require_user() and custom;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

/** A new licence after the old one ran out, or a change of vehicle details once approved. The new licence goes back for review. */
create function public.update_courier_licence(p_number text, p_expires date) returns public.courier_profiles
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_role('courier');
  v_problem text := private.check_licence(p_number, p_expires);
  c public.courier_profiles;
begin
  if v_problem is not null then raise exception '%', v_problem using errcode = '22023'; end if;
  update public.courier_profiles set licence_number = upper(regexp_replace(p_number, '\s', '', 'g')), licence_expires = p_expires
   where user_id = v_user and private.is_motor_vehicle(vehicle) returning * into c;
  if not found then raise exception 'not_required' using errcode = '22023'; end if;
  perform private.audit('courier.licence_updated', 'courier', v_user::text);
  return c;
end $$;

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
alter table public.courier_documents enable row level security;
alter table public.courier_zones enable row level security;
create policy courier_documents_own_read on public.courier_documents for select to authenticated
  using (courier_id = auth.uid() or private.is_staff());
create policy courier_zones_own_read on public.courier_zones for select to authenticated
  using (courier_id = auth.uid() or private.is_staff());
revoke all on public.courier_documents, public.courier_zones from anon, authenticated;
grant select on public.courier_documents, public.courier_zones to authenticated;
grant all on public.courier_documents, public.courier_zones to service_role;

revoke execute on function
  public.save_courier_onboarding(text, text, text, text, text, text, text, text, text, date),
  public.attach_courier_document(public.courier_doc_kind, text, text), public.submit_courier_verification(),
  public.staff_review_courier_document(uuid, text, text), public.set_courier_schedule(jsonb, boolean, numeric),
  public.add_courier_zone(text, text, numeric, numeric, boolean), public.set_courier_zone_active(uuid, boolean),
  public.remove_courier_zone(uuid), public.update_courier_licence(text, date) from public, anon, authenticated;
grant execute on function
  public.save_courier_onboarding(text, text, text, text, text, text, text, text, text, date),
  public.attach_courier_document(public.courier_doc_kind, text, text), public.submit_courier_verification(),
  public.staff_review_courier_document(uuid, text, text), public.set_courier_schedule(jsonb, boolean, numeric),
  public.add_courier_zone(text, text, numeric, numeric, boolean), public.set_courier_zone_active(uuid, boolean),
  public.remove_courier_zone(uuid), public.update_courier_licence(text, date) to authenticated;
grant execute on function private.normalise_plate(text), private.check_licence(text, date), private.is_motor_vehicle(text),
  private.required_courier_docs(text) to authenticated;
grant execute on all functions in schema public to service_role;

-- A private bucket for the documents: the courier uploads into their own folder; the courier and staff can read.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('courier-documents', 'courier-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
create policy "courier_documents_owner_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'courier-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "courier_documents_owner_or_staff_read" on storage.objects for select to authenticated
  using (bucket_id = 'courier-documents' and ((storage.foldername(name))[1] = auth.uid()::text or private.is_staff()));
