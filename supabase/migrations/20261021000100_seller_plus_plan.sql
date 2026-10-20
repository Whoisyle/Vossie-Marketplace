-- A middle seller plan between free and Seller Pro (owner choice 2026-10-20: Free, Plus and Pro for sellers).
-- Prices and perks are demo values until the owner confirms them.
insert into public.subscription_plans (id, name, price_cents, audience, perks) values
  ('seller-plus', 'Vossie Seller Plus', 4900, 'Sellers',
   '["Unlimited products", "A lower fee on every sale (3%)", "Up to 5 live reels", "Sales analytics by product"]')
on conflict (id) do nothing;

update public.subscription_plans
   set perks = '["The lowest fee on every sale (2%)", "Unlimited reels and reel analytics", "Featured listings in Explore", "Priority support"]'
 where id = 'seller-pro';
