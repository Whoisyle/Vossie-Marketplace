-- How a seller's buyers get their order (seller setup question, 2026-11-17): a campus courier, collection from the
-- seller, or both. Additive: one new column with a safe default, and save_seller_onboarding gains an optional last
-- argument, so every existing caller keeps working. The campus a seller sells on is already stored (sellers.campus_id).

alter table public.sellers
  add column delivery_mode text not null default 'both',
  add constraint sellers_delivery_mode_valid check (delivery_mode in ('courier', 'collection', 'both'));

-- The old ten-argument function is replaced by the same one with an eleventh, optional argument.
drop function public.save_seller_onboarding(public.seller_kind, text, text, text, text, text, text[], time, time, text);

create function public.save_seller_onboarding(
  p_kind public.seller_kind, p_display_name text, p_phone text, p_bio text, p_location_text text, p_campus_id text,
  p_open_days text[], p_opens_at time, p_closes_at time, p_logo_path text default null, p_delivery_mode text default 'both'
) returns public.sellers
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := private.require_user();
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[\s()-]', '', 'g');
  v_delivery text := coalesce(p_delivery_mode, 'both');
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
  if v_delivery not in ('courier', 'collection', 'both') then raise exception 'invalid_delivery' using errcode = '22023'; end if;
  if p_logo_path is not null and split_part(p_logo_path, '/', 1) <> v_user::text then
    raise exception 'invalid_path' using errcode = '42501';
  end if;
  insert into public.sellers (user_id, display_name, bio, location_text, campus_id, sells_goods, provides_services, status,
                              kind, contact_phone, logo_path, open_days, opens_at, closes_at, delivery_mode)
  values (v_user, btrim(p_display_name), coalesce(p_bio, ''), coalesce(p_location_text, ''), p_campus_id, true, false, 'draft',
          p_kind, v_phone, p_logo_path, p_open_days, p_opens_at, p_closes_at, v_delivery)
  on conflict (user_id) do update set
    display_name = excluded.display_name, bio = excluded.bio, location_text = excluded.location_text,
    campus_id = excluded.campus_id, kind = excluded.kind, contact_phone = excluded.contact_phone,
    logo_path = coalesce(excluded.logo_path, public.sellers.logo_path),
    open_days = excluded.open_days, opens_at = excluded.opens_at, closes_at = excluded.closes_at,
    delivery_mode = excluded.delivery_mode
  returning * into v_row;
  perform private.audit('seller.onboarding_saved', 'seller', v_row.id::text);
  return v_row;
end $$;

revoke execute on function
  public.save_seller_onboarding(public.seller_kind, text, text, text, text, text, text[], time, time, text, text)
  from public, anon, authenticated;
grant execute on function
  public.save_seller_onboarding(public.seller_kind, text, text, text, text, text, text[], time, time, text, text)
  to authenticated, service_role;
