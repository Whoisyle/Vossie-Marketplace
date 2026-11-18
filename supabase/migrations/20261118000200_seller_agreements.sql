-- The seller agreement (stage 4 of the seller onboarding v2, 2026-11-18). Once Vossie Operations has accepted every document,
-- the seller signs a short agreement: their details, a typed name, a drawn signature and the date. Until the current version
-- is signed the seller cannot publish a listing or act on an order; the database refuses, not just the screen.
--
-- The full ID number is kept but is not readable by the app: the seller and staff can read the last four digits only, and staff
-- read the whole number through staff_read_agreement_id, which is audited. The signature is kept as vector path data, so there is
-- no file to store. The text hash proves which words were signed.

create table public.seller_agreements (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  version text not null,
  text_hash text not null check (text_hash ~ '^[0-9a-f]{64}$'),
  signed_name text not null check (length(btrim(signed_name)) >= 3),
  student_number text,
  email text,
  /** The whole ID number. Not granted to the app; staff read it through staff_read_agreement_id. */
  id_number text not null,
  id_last4 text not null,
  signature_svg text not null check (length(signature_svg) between 20 and 20000 and signature_svg ~ '^M'),
  signed_at timestamptz not null default now(),
  unique (seller_id, version)
);
create index seller_agreements_seller_idx on public.seller_agreements (seller_id);

-- A signed agreement is never edited.
create trigger seller_agreements_no_update before update on public.seller_agreements
  for each row execute function private.forbid_change();

alter table public.seller_agreements enable row level security;
create policy seller_agreements_own_read on public.seller_agreements for select to authenticated
  using (private.owns_seller(seller_id) or private.is_staff());
revoke all on public.seller_agreements from anon, authenticated;
-- every column except id_number
grant select (id, seller_id, version, text_hash, signed_name, student_number, email, id_last4, signature_svg, signed_at)
  on public.seller_agreements to authenticated;
grant all on public.seller_agreements to service_role;

-- The version everyone has to have signed. Changing the words means a new version here and in the app.
create function private.seller_agreement_version() returns text
language sql immutable set search_path = public as $$ select '2026-11-v1'::text $$;

-- A South African ID number: 13 digits, a real date of birth, citizenship digit 0 or 1, and the Luhn check digit.
create function private.is_valid_sa_id(p_id text) returns boolean
language plpgsql immutable set search_path = public as $$
declare
  v text := regexp_replace(coalesce(p_id, ''), '\s', '', 'g');
  v_sum int := 0;
  v_digit int;
  v_pos int;
  v_month int;
  v_day int;
begin
  if v !~ '^[0-9]{13}$' then return false; end if;
  v_month := substr(v, 3, 2)::int;
  v_day := substr(v, 5, 2)::int;
  begin
    perform make_date(2000 + substr(v, 1, 2)::int, v_month, v_day);
  exception when others then
    begin
      perform make_date(1900 + substr(v, 1, 2)::int, v_month, v_day);
    exception when others then
      return false;
    end;
  end;
  if substr(v, 11, 1) not in ('0', '1') then return false; end if;
  for v_pos in 1..13 loop
    v_digit := substr(v, 14 - v_pos, 1)::int;
    if v_pos % 2 = 0 then
      v_digit := v_digit * 2;
      if v_digit > 9 then v_digit := v_digit - 9; end if;
    end if;
    v_sum := v_sum + v_digit;
  end loop;
  return v_sum % 10 = 0;
end $$;

-- Refuses unless this seller has signed the current agreement.
create function private.require_signed_agreement(p_seller uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.seller_agreements where seller_id = p_seller and version = private.seller_agreement_version()) then
    raise exception 'agreement_required' using errcode = '42501';
  end if;
end $$;

-- The seller signs. Idempotent: signing a version again returns the earlier signature unchanged.
create function public.sign_seller_agreement(
  p_version text, p_text_hash text, p_signed_name text, p_id_number text, p_signature_svg text
) returns public.seller_agreements
language plpgsql security definer set search_path = public as $$
declare
  v_seller public.sellers := private.own_seller();
  v_name text;
  v_email text;
  v_number text;
  v_id text := regexp_replace(coalesce(p_id_number, ''), '\s', '', 'g');
  v_row public.seller_agreements;
begin
  if v_seller.status <> 'active' then raise exception 'seller_not_active' using errcode = '42501'; end if;
  if p_version is distinct from private.seller_agreement_version() then raise exception 'wrong_version' using errcode = '22023'; end if;
  if p_text_hash is null or p_text_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_hash' using errcode = '22023'; end if;
  select display_name, email into v_name, v_email from public.profiles where id = v_seller.user_id;
  if length(btrim(coalesce(p_signed_name, ''))) < 3
     or lower(regexp_replace(btrim(p_signed_name), '\s+', ' ', 'g')) <> lower(regexp_replace(btrim(coalesce(v_name, '')), '\s+', ' ', 'g')) then
    raise exception 'name_mismatch' using errcode = '22023';
  end if;
  if not private.is_valid_sa_id(v_id) then raise exception 'invalid_id_number' using errcode = '22023'; end if;
  if p_signature_svg is null or length(p_signature_svg) < 20 or length(p_signature_svg) > 20000 or p_signature_svg !~ '^M' then
    raise exception 'invalid_signature' using errcode = '22023';
  end if;
  select student_number into v_number from public.profile_private where user_id = v_seller.user_id;
  insert into public.seller_agreements (seller_id, version, text_hash, signed_name, student_number, email, id_number, id_last4, signature_svg)
  values (v_seller.id, p_version, p_text_hash, btrim(p_signed_name), v_number, v_email, v_id, right(v_id, 4), p_signature_svg)
  on conflict (seller_id, version) do nothing
  returning * into v_row;
  if v_row.id is null then
    -- already signed: hand back the first signature, unchanged
    select * into v_row from public.seller_agreements where seller_id = v_seller.id and version = p_version;
    return v_row;
  end if;
  perform private.audit('seller.agreement_signed', 'seller', v_seller.id::text, jsonb_build_object('version', p_version));
  return v_row;
end $$;

-- Staff only: the full ID number on a signed agreement. Every read is written to the audit log.
create function public.staff_read_agreement_id(p_agreement_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_agreement public.seller_agreements;
  v_seller public.sellers;
begin
  select * into v_agreement from public.seller_agreements where id = p_agreement_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into v_seller from public.sellers where id = v_agreement.seller_id;
  perform private.require_staff(v_seller.campus_id);
  perform private.audit('seller.agreement_id_read', 'seller', v_seller.id::text, jsonb_build_object('agreement', p_agreement_id));
  return v_agreement.id_number;
end $$;

revoke execute on function
  public.sign_seller_agreement(text, text, text, text, text), public.staff_read_agreement_id(uuid)
  from public, anon, authenticated;
grant execute on function
  public.sign_seller_agreement(text, text, text, text, text), public.staff_read_agreement_id(uuid)
  to authenticated, service_role;

-- Enforcement. Publishing a listing (own_seller with the active check) and every seller action on an order now need the
-- current agreement. Drafts and the setup itself do not.
create or replace function private.own_seller(p_require_active boolean default false) returns public.sellers
language plpgsql stable security definer set search_path = public as $$
declare v public.sellers;
begin
  select * into v from public.sellers where user_id = private.require_user();
  if not found then raise exception 'not_a_seller' using errcode = '42501'; end if;
  if p_require_active and v.status <> 'active' then
    raise exception 'seller_not_active' using errcode = '42501';
  end if;
  if p_require_active then perform private.require_signed_agreement(v.id); end if;
  return v;
end $$;

create or replace function private.lock_my_seller_order(p_so uuid) returns public.seller_orders
language plpgsql security definer set search_path = public as $$
declare so public.seller_orders;
begin
  select * into so from public.seller_orders where id = p_so for update;
  if not found or so.seller_user_id <> private.require_user() then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform private.require_signed_agreement(so.seller_id);
  return so;
end $$;
