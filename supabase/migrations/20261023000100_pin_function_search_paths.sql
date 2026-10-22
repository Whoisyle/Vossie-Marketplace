-- The Supabase advisor flagged ten plain helper functions with no fixed search_path. They only use built-in functions or schema-qualified
-- tables, so pinning the path changes nothing they do and closes the warning.
alter function private.assert_journal_balanced() set search_path = public;
alter function private.check_licence(text, date) set search_path = public;
alter function private.forbid_change() set search_path = public;
alter function private.is_motor_vehicle(text) set search_path = public;
alter function private.normalise_plate(text) set search_path = public;
alter function private.random_code() set search_path = public;
alter function private.require_user() set search_path = public;
alter function private.required_courier_docs(text) set search_path = public;
alter function private.required_seller_docs(public.seller_kind) set search_path = public;
alter function private.touch_updated_at() set search_path = public;
