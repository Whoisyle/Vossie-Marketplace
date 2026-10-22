-- Makes room on the hosted project for the new schema WITHOUT deleting anything.
-- The hosted database still holds the first, older schema (11 tables, no users, no real rows). The new migrations create tables with
-- the same names, so the old ones are moved into a private "legacy_v1" schema, and the old sign-up trigger is switched off so it
-- cannot write into them. Nothing is dropped; moving them back is the same statements the other way round.
--
-- Run once in the Supabase SQL editor (or with the owner's database password), BEFORE node supabase/scripts/apply-hosted.cjs.
-- apply-hosted.cjs then finds no old tables in "public" and goes straight to applying the migrations in order.

create schema if not exists legacy_v1;
revoke all on schema legacy_v1 from public, anon, authenticated;

alter table public.campuses set schema legacy_v1;
alter table public.categories set schema legacy_v1;
alter table public.profiles set schema legacy_v1;
alter table public.student_eligibility set schema legacy_v1;
alter table public.seller_profiles set schema legacy_v1;
alter table public.service_provider_profiles set schema legacy_v1;
alter table public.listings set schema legacy_v1;
alter table public.services set schema legacy_v1;
alter table public.service_slots set schema legacy_v1;
alter table public.goods_orders set schema legacy_v1;
alter table public.order_messages set schema legacy_v1;

alter table auth.users disable trigger on_auth_user_created_create_profile;
alter function public.handle_new_auth_user() set schema legacy_v1;
alter function public.set_updated_at() set schema legacy_v1;

select (select count(*) from information_schema.tables where table_schema = 'public') as public_tables,
       (select count(*) from information_schema.tables where table_schema = 'legacy_v1') as legacy_tables;
