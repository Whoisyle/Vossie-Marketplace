-- The back of an ID (2026-11-17): the seller scanner photographs an ID front and back. The front stays in storage_path;
-- the back goes in back_storage_path, in the same private folder. Additive: one nullable column and an optional last
-- argument on attach_seller_document, so every existing caller keeps working.

alter table public.seller_documents add column back_storage_path text;

drop function public.attach_seller_document(public.seller_doc_kind, text, text);

create function public.attach_seller_document(
  p_kind public.seller_doc_kind, p_storage_path text, p_file_name text default null, p_back_path text default null
) returns public.seller_documents
language plpgsql security definer set search_path = public as $$
declare
  v_seller public.sellers := private.own_seller();
  v_row public.seller_documents;
begin
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text then
    raise exception 'invalid_path' using errcode = '42501';
  end if;
  if p_back_path is not null and split_part(p_back_path, '/', 1) <> auth.uid()::text then
    raise exception 'invalid_path' using errcode = '42501';
  end if;
  if p_kind = 'cipc' and v_seller.kind is distinct from 'registered' then
    raise exception 'not_required' using errcode = '22023';
  end if;
  if exists (select 1 from public.seller_documents where seller_id = v_seller.id and kind = p_kind and status = 'verified') then
    raise exception 'already_verified' using errcode = '22023';
  end if;
  insert into public.seller_documents (seller_id, kind, status, storage_path, file_name, back_storage_path)
  values (v_seller.id, p_kind, 'uploaded', p_storage_path, p_file_name, p_back_path)
  on conflict (seller_id, kind) do update set
    status = 'uploaded', storage_path = excluded.storage_path, file_name = excluded.file_name,
    back_storage_path = excluded.back_storage_path,
    note = null, reviewed_by = null, reviewed_at = null
  returning * into v_row;
  perform private.audit('seller.document_attached', 'seller', v_seller.id::text, jsonb_build_object('kind', p_kind, 'has_back', p_back_path is not null));
  return v_row;
end $$;

revoke execute on function public.attach_seller_document(public.seller_doc_kind, text, text, text) from public, anon, authenticated;
grant execute on function public.attach_seller_document(public.seller_doc_kind, text, text, text) to authenticated, service_role;
