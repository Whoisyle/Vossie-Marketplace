-- Accounts that sign in without an emailed code (the `real-login` Edge Function reads this list).
-- Add or remove addresses here to turn direct login on or off for them.
insert into public.app_settings (key, value, description) values
  ('direct_login_emails', '["eduv11223@vossie.net"]', 'Emails the real-login Edge Function may sign in without an emailed code')
on conflict (key) do nothing;
