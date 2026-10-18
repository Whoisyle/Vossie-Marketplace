-- API exposure: grants, storage buckets and policies, realtime publication and scheduled jobs.

-- ---------------------------------------------------------------------------
-- Table and function grants (deny by default, then allow exactly what the app needs)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema private to authenticated, anon;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- anonymous browsing: public catalogue only
grant select on public.campuses, public.categories, public.category_attributes, public.sellers, public.listings,
  public.listing_options, public.listing_media, public.service_slots, public.reviews, public.reels,
  public.reel_comments, public.listing_cards, public.profile_cards to anon;

-- signed-in users: select everything their policies allow; no direct writes except addresses
do $$
declare t record;
begin
  for t in select c.relname from pg_class c
            where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v')
              and c.relname not in ('handoff_challenges') loop
    execute format('grant select on public.%I to authenticated', t.relname);
  end loop;
end $$;
grant insert, update, delete on public.addresses to authenticated;

-- RPCs: everything in public is callable by signed-in users except trusted-only functions
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p
            where p.pronamespace = 'public'::regnamespace
              and p.proname not in ('save_payment_method', 'apply_payment_event', 'attach_provider_reference',
                                    'settle_provider_refund', 'expire_stale', 'hook_before_user_created') loop
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;

-- helpers that policies call
grant execute on function private.has_role(public.app_role, text), private.is_staff(text), private.owns_seller(uuid),
  private.is_order_party(uuid), private.is_job_courier(uuid), private.so_campus(uuid),
  private.is_conversation_member(uuid), private.listing_is_public(uuid), private.owns_listing(uuid)
  to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('listing-media', 'listing-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('reels', 'reels', true, 52428800, array['video/mp4', 'video/quicktime']),
  ('evidence', 'evidence', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- Uploads go into a folder named after the user id; evidence is readable by its owner and staff only.
create policy "avatars_owner_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');

create policy "listing_media_seller_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-media' and (storage.foldername(name))[1] = auth.uid()::text
              and exists (select 1 from public.sellers s where s.user_id = auth.uid() and s.status = 'active'));
create policy "listing_media_seller_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "listing_media_public_read" on storage.objects for select using (bucket_id = 'listing-media');

create policy "reels_seller_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'reels' and (storage.foldername(name))[1] = auth.uid()::text
              and exists (select 1 from public.sellers s where s.user_id = auth.uid() and s.status = 'active'));
create policy "reels_public_read" on storage.objects for select using (bucket_id = 'reels');

create policy "evidence_owner_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidence_owner_or_staff_read" on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and ((storage.foldername(name))[1] = auth.uid()::text or private.is_staff()));

-- ---------------------------------------------------------------------------
-- Realtime (row changes still pass through RLS)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['messages', 'notifications', 'seller_orders', 'delivery_jobs', 'custody_events', 'conversations'] loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then null;
      end;
    end loop;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Scheduled jobs (only where pg_cron exists, i.e. a real Supabase project)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('vossie-expire-stale', '* * * * *', 'select public.expire_stale()');
    perform cron.schedule('vossie-purge-accounts', '17 3 * * *', 'select private.purge_deleted_accounts()');
  end if;
end $$;
