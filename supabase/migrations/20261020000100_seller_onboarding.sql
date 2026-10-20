-- Seller onboarding (owner designs, 2026-10-20): the kind of seller, a contact number, a logo and opening hours,
-- the documents a seller hands in (student card, ID, proof of address, CIPC registration for companies) and how
-- Vossie Operations reviews them. Same rules as before: RLS on, read policies only, writes through functions.
--
-- Flow: save_seller_onboarding (draft) -> attach_seller_document for each document -> submit_seller_verification
-- (documents go in review, seller goes to pending_review) -> staff_review_seller_document for each document. When
-- the last required document is verified the seller is approved through the existing review_seller.

create type public.seller_kind as enum ('student', 'campus_business', 'registered');
create type public.seller_doc_kind as enum ('student_card', 'id', 'address', 'cipc');
create type public.seller_doc_status as enum ('required', 'uploaded', 'in_review', 'verified', 'rejected');

alter table public.sellers
  add column kind public.seller_kind,
  add column contact_phone text,
  add column logo_path text,
  add column open_days text[] not null default '{mon,tue,wed,thu,fri}',
  add column opens_at time not null default '08:00',
  add column closes_at time not null default '17:00',
  add constraint sellers_open_days_valid check (open_days <@ array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']::text[] and cardinality(open_days) > 0),
  add constraint sellers_hours_valid check (opens_at < closes_at);

create table public.seller_documents (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  kind public.seller_doc_kind not null,
  status public.seller_doc_status not null default 'uploaded',
  /** Path in the private seller-documents bucket, or 'eduvos-record' when the student card was matched to the Eduvos record. */
  storage_path text not null,
  file_name text,
  note text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, kind)
);
create index seller_documents_review_idx on public.seller_documents (status) where status = 'in_review';
create trigger seller_documents_touch before update on public.seller_documents
  for each row execute function private.touch_updated_at();

-- The documents a seller of this kind must give.
create function private.required_seller_docs(p_kind public.seller_kind) returns public.seller_doc_kind[]
language sql immutable as $$
  select case when p_kind = 'registered'
              then array['student_card', 'id', 'address', 'cipc']::public.seller_doc_kind[]
              else array['student_card', 'id', 'address']::public.seller_doc_kind[] end
$$;

-- Step 1 and step 3 of the setup: who the seller is and how buyers see the store. Keeps the status a seller already has.
create function public.save_seller_onboarding(
  p_kind public.seller_kind, p_display_name text, p_phone text, p_bio text, p_location_text text, p_campus_id text,
  p_open_days text[], p_opens_at time, p_closes_at time, p_logo_path text default null
) returns public.sellers
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[\s()-]', '', 'g');
  v_row public.sellers;
begin
  if not exists (select 1 from public.profiles where id = v_user and deleted_at is null) then
    raise exception 'profile_missing' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_display_name, ''))) < 2 then raise exception 'invalid_name' using errcode = '22023'; end if;
  if v_phone !~ '^(\+27|0)[6-8][0-9]{8}$' then raise exception 'invalid_phone' using errcode = '22023'; end if;
  if p_open_days is null or cardinality(p_open_days) = 0
     or not (p_open_days <@ array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']::text[]) then
    raise exception 'invalid_days' using errcode = '22023';
  end if;
  if p_opens_at >= p_closes_at then raise exception 'invalid_hours' using errcode = '22023'; end if;
  if p_logo_path is not null and split_part(p_logo_path, '/', 1) <> v_user::text then
    raise exception 'invalid_path' using errcode = '42501';
  end if;
  insert into public.sellers (user_id, display_name, bio, location_text, campus_id, sells_goods, provides_services, status,
                              kind, contact_phone, logo_path, open_days, opens_at, closes_at)
  values (v_user, btrim(p_display_name), coalesce(p_bio, ''), coalesce(p_location_text, ''), p_campus_id, true, false, 'draft',
          p_kind, v_phone, p_logo_path, p_open_days, p_opens_at, p_closes_at)
  on conflict (user_id) do update set
    display_name = excluded.display_name, bio = excluded.bio, location_text = excluded.location_text,
    campus_id = excluded.campus_id, kind = excluded.kind, contact_phone = excluded.contact_phone,
    logo_path = coalesce(excluded.logo_path, public.sellers.logo_path),
    open_days = excluded.open_days, opens_at = excluded.opens_at, closes_at = excluded.closes_at
  returning * into v_row;
  perform private.audit('seller.onboarding_saved', 'seller', v_row.id::text);
  return v_row;
end $$;

-- Step 2: hand in one document. The file is uploaded to the seller-documents bucket first, under the seller's own folder.
create function public.attach_seller_document(p_kind public.seller_doc_kind, p_storage_path text, p_file_name text default null)
returns public.seller_documents
language plpgsql security definer set search_path = public as $$
declare
  v_seller public.sellers := private.own_seller();
  v_row public.seller_documents;
begin
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text then
    raise exception 'invalid_path' using errcode = '42501';
  end if;
  if p_kind = 'cipc' and v_seller.kind is distinct from 'registered' then
    raise exception 'not_required' using errcode = '22023';
  end if;
  if exists (select 1 from public.seller_documents where seller_id = v_seller.id and kind = p_kind and status = 'verified') then
    raise exception 'already_verified' using errcode = '22023';
  end if;
  insert into public.seller_documents (seller_id, kind, status, storage_path, file_name)
  values (v_seller.id, p_kind, 'uploaded', p_storage_path, p_file_name)
  on conflict (seller_id, kind) do update set
    status = 'uploaded', storage_path = excluded.storage_path, file_name = excluded.file_name,
    note = null, reviewed_by = null, reviewed_at = null
  returning * into v_row;
  perform private.audit('seller.document_attached', 'seller', v_seller.id::text, jsonb_build_object('kind', p_kind));
  return v_row;
end $$;

-- Send everything for review. The student card is accepted straight away when the Eduvos record matched.
create function public.submit_seller_verification() returns public.sellers
language plpgsql security definer set search_path = public as $$
declare
  v_seller public.sellers := private.own_seller();
  v_user uuid := auth.uid();
  v_missing public.seller_doc_kind[];
begin
  if v_seller.kind is null then raise exception 'setup_incomplete' using errcode = '22023'; end if;
  if v_seller.status in ('active', 'suspended') then return v_seller; end if;
  if exists (select 1 from public.profiles where id = v_user and student_status = 'verified') then
    insert into public.seller_documents (seller_id, kind, status, storage_path, file_name, reviewed_at)
    values (v_seller.id, 'student_card', 'verified', 'eduvos-record', 'Eduvos record', now())
    on conflict (seller_id, kind) do nothing;
  end if;
  select array_agg(k) into v_missing
    from unnest(private.required_seller_docs(v_seller.kind)) k
   where not exists (select 1 from public.seller_documents d
                      where d.seller_id = v_seller.id and d.kind = k and d.status in ('uploaded', 'in_review', 'verified'));
  if v_missing is not null then
    raise exception 'documents_missing: %', v_missing using errcode = '22023';
  end if;
  update public.seller_documents set status = 'in_review' where seller_id = v_seller.id and status = 'uploaded';
  update public.sellers set status = 'pending_review', review_note = null where id = v_seller.id returning * into v_seller;
  insert into public.memberships (user_id, role, campus_id, state)
  values (v_user, 'seller', v_seller.campus_id, 'pending')
  on conflict (user_id, role, campus_id) do nothing;
  perform private.audit('seller.verification_submitted', 'seller', v_seller.id::text);
  return v_seller;
end $$;

-- Staff: accept or turn down one document. When every required document is verified the seller is approved.
create function public.staff_review_seller_document(p_document_id uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_doc public.seller_documents;
  v_seller public.sellers;
  v_staff uuid;
begin
  select * into v_doc from public.seller_documents where id = p_document_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into v_seller from public.sellers where id = v_doc.seller_id;
  v_staff := private.require_staff(v_seller.campus_id);
  if p_decision not in ('verified', 'rejected') then raise exception 'invalid_decision' using errcode = '22023'; end if;
  if v_doc.status <> 'in_review' then raise exception 'not_in_review' using errcode = '22023'; end if;
  update public.seller_documents set status = p_decision::public.seller_doc_status, note = p_note,
         reviewed_by = v_staff, reviewed_at = now() where id = p_document_id;
  perform private.audit('seller.document_reviewed', 'seller', v_seller.id::text, jsonb_build_object('kind', v_doc.kind, 'decision', p_decision));
  if p_decision = 'rejected' then
    perform public.review_seller(v_seller.id, 'rejected', coalesce(p_note, 'A document was not accepted. Upload it again.'));
  elsif v_seller.status = 'pending_review' and not exists (
    select 1 from unnest(private.required_seller_docs(v_seller.kind)) k
     where not exists (select 1 from public.seller_documents d where d.seller_id = v_seller.id and d.kind = k and d.status = 'verified')
  ) then
    perform public.review_seller(v_seller.id, 'approved', 'Documents verified');
  end if;
end $$;

-- Documents are private: readable by the seller and by staff, never written directly.
alter table public.seller_documents enable row level security;
create policy seller_documents_own_read on public.seller_documents for select to authenticated
  using (private.owns_seller(seller_id) or private.is_staff());
revoke all on public.seller_documents from anon, authenticated;
grant select on public.seller_documents to authenticated;
grant all on public.seller_documents to service_role;

revoke execute on function
  public.save_seller_onboarding(public.seller_kind, text, text, text, text, text, text[], time, time, text),
  public.attach_seller_document(public.seller_doc_kind, text, text), public.submit_seller_verification(),
  public.staff_review_seller_document(uuid, text, text) from public, anon, authenticated;
grant execute on function
  public.save_seller_onboarding(public.seller_kind, text, text, text, text, text, text[], time, time, text),
  public.attach_seller_document(public.seller_doc_kind, text, text), public.submit_seller_verification(),
  public.staff_review_seller_document(uuid, text, text) to authenticated;
grant execute on function private.required_seller_docs(public.seller_kind) to authenticated;
grant execute on all functions in schema public to service_role;

-- A private bucket for the documents: the seller uploads into their own folder; the seller and staff can read.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('seller-documents', 'seller-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
create policy "seller_documents_owner_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'seller-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "seller_documents_owner_or_staff_read" on storage.objects for select to authenticated
  using (bucket_id = 'seller-documents' and ((storage.foldername(name))[1] = auth.uid()::text or private.is_staff()));
