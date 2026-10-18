-- Reference data every environment needs (not demo content). Demo content lives in supabase/seed.sql.

insert into public.campuses (id, name, sort_order) values
  ('midrand-head-office', 'Midrand (Head Office)', 1),
  ('bedfordview', 'Bedfordview', 2),
  ('pretoria', 'Pretoria', 3),
  ('potchefstroom', 'Potchefstroom', 4),
  ('vaal-vanderbijlpark', 'Vaal (Vanderbijlpark)', 5),
  ('bloemfontein', 'Bloemfontein', 6),
  ('durban-umhlanga', 'Durban (Umhlanga)', 7),
  ('east-london', 'East London', 8),
  ('nelson-mandela-bay-gqeberha', 'Nelson Mandela Bay (Gqeberha)', 9),
  ('cape-town-mowbray', 'Cape Town (Mowbray)', 10),
  ('tyger-valley-cape-town', 'Tyger Valley (Cape Town)', 11),
  ('nelspruit-mbombela', 'Nelspruit (Mbombela)', 12)
on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into public.categories (id, name, icon, kind, sort_order) values
  ('food', 'Food', 'coffee', 'goods', 1),
  ('books', 'Books', 'book-open', 'goods', 2),
  ('electronics', 'Electronics', 'monitor', 'goods', 3),
  ('fashion', 'Fashion', 'shopping-bag', 'goods', 4),
  ('services', 'Services', 'tool', 'service', 5)
on conflict (id) do update set name = excluded.name, icon = excluded.icon, kind = excluded.kind, sort_order = excluded.sort_order;

-- Starter prohibited-content terms; operations maintain the real list (plan.md 9.5).
insert into public.policy_terms (term, severity, note) values
  ('firearm', 'block', 'prohibited goods'),
  ('ammunition', 'block', 'prohibited goods'),
  ('cocaine', 'block', 'prohibited goods'),
  ('counterfeit', 'block', 'prohibited goods'),
  ('stolen', 'block', 'prohibited goods'),
  ('vape', 'review', 'age-restricted; needs staff review'),
  ('alcohol', 'review', 'age-restricted; needs staff review')
on conflict (term) do nothing;

-- Development placeholder only: the real percentage is a finance decision (plan.md section 8).
insert into public.fee_policies (version, transaction_fee_bps, status, note, effective_from)
values (1, 0, 'active', 'development placeholder; not an approved rate', now());

insert into public.vouchers (code, description, percent_off, cents_off) values
  ('VOSSIE10', '10% off', 10, null),
  ('WELCOME20', 'R20 off', null, 2000)
on conflict (code) do nothing;
