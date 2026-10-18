-- Money: wallet, saved payment methods, payment intents, ledger, fees, refunds, payouts, reconciliation.
-- Never stored: card numbers, CVV, bank credentials, provider secrets. Provider tokens only.
-- The ledger is double-entry and append-only; balances are derived from it.

create type public.payment_method as enum ('wallet', 'card', 'apple_pay', 'google_pay');
create type public.payment_status as enum
  ('created', 'provider_pending', 'authorised', 'captured', 'reconciled', 'failed', 'expired',
   'uncertain', 'refund_pending', 'partially_refunded', 'refunded', 'disputed', 'reconciliation_required');

-- ---------------------------------------------------------------------------
-- Ledger
-- ---------------------------------------------------------------------------
create type public.ledger_kind as enum ('asset', 'liability', 'revenue', 'expense');

create table public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  kind public.ledger_kind not null,
  owner_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique nulls not distinct (code, owner_user_id)
);

create table public.ledger_journals (
  id uuid primary key default gen_random_uuid(),
  ref_type text not null,
  ref_id uuid,
  memo text not null default '',
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
create index ledger_journals_ref_idx on public.ledger_journals (ref_type, ref_id);

create table public.ledger_entries (
  id bigint generated always as identity primary key,
  journal_id uuid not null references public.ledger_journals (id),
  account_id uuid not null references public.ledger_accounts (id),
  debit_cents bigint not null default 0 check (debit_cents >= 0),
  credit_cents bigint not null default 0 check (credit_cents >= 0),
  check ((debit_cents = 0) <> (credit_cents = 0))
);
create index ledger_entries_account_idx on public.ledger_entries (account_id);
create index ledger_entries_journal_idx on public.ledger_entries (journal_id);

create trigger ledger_entries_immutable before update or delete on public.ledger_entries
  for each row execute function private.forbid_change();
create trigger ledger_journals_immutable before update or delete on public.ledger_journals
  for each row execute function private.forbid_change();

-- A journal must balance by the time its transaction commits.
create function private.assert_journal_balanced() returns trigger
language plpgsql as $$
declare v_diff bigint;
begin
  select coalesce(sum(debit_cents) - sum(credit_cents), 0) into v_diff
    from public.ledger_entries where journal_id = new.journal_id;
  if v_diff <> 0 then
    raise exception 'unbalanced_journal % (off by %)', new.journal_id, v_diff using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger ledger_entries_balanced after insert on public.ledger_entries
  deferrable initially deferred for each row execute function private.assert_journal_balanced();

create function private.ledger_account(p_code text, p_owner uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_kind public.ledger_kind;
begin
  select id into v_id from public.ledger_accounts
   where code = p_code and owner_user_id is not distinct from p_owner;
  if found then return v_id; end if;
  v_kind := case p_code
    when 'provider_clearing' then 'asset' when 'payouts_clearing' then 'asset'
    when 'platform_fees' then 'revenue' when 'delivery_revenue' then 'revenue'
    when 'promotions_expense' then 'expense'
    else 'liability' end;
  insert into public.ledger_accounts (code, kind, owner_user_id) values (p_code, v_kind, p_owner)
  on conflict (code, owner_user_id) do nothing;
  select id into v_id from public.ledger_accounts
   where code = p_code and owner_user_id is not distinct from p_owner;
  return v_id;
end $$;

-- p_lines: [{"account": "escrow", "owner": null|uuid, "debit": 100} | {"account": ..., "credit": 100}]
-- Re-posting with the same idempotency key returns the original journal.
create function private.post_journal(p_ref_type text, p_ref_id uuid, p_memo text, p_lines jsonb,
                                     p_idempotency_key text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_line jsonb;
  v_debit bigint;
  v_credit bigint;
begin
  if p_idempotency_key is not null then
    select id into v_id from public.ledger_journals where idempotency_key = p_idempotency_key;
    if found then return v_id; end if;
  end if;
  select coalesce(sum((l ->> 'debit')::bigint), 0), coalesce(sum((l ->> 'credit')::bigint), 0)
    into v_debit, v_credit from jsonb_array_elements(p_lines) l;
  if v_debit <> v_credit then
    raise exception 'unbalanced_journal (debit %, credit %)', v_debit, v_credit using errcode = '23514';
  end if;
  insert into public.ledger_journals (ref_type, ref_id, memo, idempotency_key)
  values (p_ref_type, p_ref_id, coalesce(p_memo, ''), p_idempotency_key) returning id into v_id;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    continue when coalesce((v_line ->> 'debit')::bigint, 0) = 0 and coalesce((v_line ->> 'credit')::bigint, 0) = 0;
    insert into public.ledger_entries (journal_id, account_id, debit_cents, credit_cents)
    values (v_id, private.ledger_account(v_line ->> 'account', nullif(v_line ->> 'owner', '')::uuid),
            coalesce((v_line ->> 'debit')::bigint, 0), coalesce((v_line ->> 'credit')::bigint, 0));
  end loop;
  return v_id;
end $$;

-- Liability accounts are credit-normal, asset and expense accounts debit-normal.
create function private.account_balance(p_code text, p_owner uuid default null) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(sum(case when a.kind in ('liability', 'revenue') then e.credit_cents - e.debit_cents
                           else e.debit_cents - e.credit_cents end), 0)::bigint
    from public.ledger_accounts a
    left join public.ledger_entries e on e.account_id = a.id
   where a.code = p_code and a.owner_user_id is not distinct from p_owner
$$;

-- ---------------------------------------------------------------------------
-- Wallet
-- ---------------------------------------------------------------------------
create table public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  updated_at timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  amount_cents bigint not null check (amount_cents <> 0),
  balance_after_cents bigint not null,
  kind text not null check (kind in ('top_up', 'purchase', 'refund', 'adjustment', 'withdrawal')),
  label text not null default '',
  ref_type text,
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index wallet_transactions_user_idx on public.wallet_transactions (user_id, created_at desc);
create trigger wallet_transactions_immutable before update or delete on public.wallet_transactions
  for each row execute function private.forbid_change();

create function private.ensure_wallet(p_user uuid) returns void
language sql security definer set search_path = public as $$
  insert into public.wallets (user_id) values (p_user) on conflict do nothing
$$;

-- Moves money in or out of a wallet with the matching journal. p_counter is the other side's account code.
create function private.wallet_move(p_user uuid, p_amount bigint, p_kind text, p_label text, p_counter text,
                                    p_ref_type text, p_ref_id uuid, p_key text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_balance bigint;
begin
  perform private.ensure_wallet(p_user);
  update public.wallets set balance_cents = balance_cents + p_amount, updated_at = now()
   where user_id = p_user returning balance_cents into v_balance;
  if v_balance < 0 then raise exception 'insufficient_funds' using errcode = '23514'; end if;
  insert into public.wallet_transactions (user_id, amount_cents, balance_after_cents, kind, label, ref_type, ref_id)
  values (p_user, p_amount, v_balance, p_kind, p_label, p_ref_type, p_ref_id);
  perform private.post_journal(p_ref_type, p_ref_id, p_label, case when p_amount > 0 then
      jsonb_build_array(jsonb_build_object('account', p_counter, 'debit', p_amount),
                        jsonb_build_object('account', 'wallet', 'owner', p_user, 'credit', p_amount))
    else
      jsonb_build_array(jsonb_build_object('account', 'wallet', 'owner', p_user, 'debit', -p_amount),
                        jsonb_build_object('account', p_counter, 'credit', -p_amount)) end, p_key);
  return v_balance;
end $$;

-- ---------------------------------------------------------------------------
-- Saved payment methods (provider tokens only)
-- ---------------------------------------------------------------------------
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null,
  provider_token text not null,
  brand text not null check (brand in ('visa', 'mastercard', 'other')),
  last4 text not null check (last4 ~ '^[0-9]{4}$'),
  exp_month int not null check (exp_month between 1 and 12),
  exp_year int not null check (exp_year >= 2024),
  holder_name text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, provider, provider_token)
);
create unique index payment_methods_one_default on public.payment_methods (user_id) where is_default;

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  buyer_id uuid not null references public.profiles (id),
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  method public.payment_method not null,
  payment_method_id uuid references public.payment_methods (id),
  provider text not null default 'none',
  provider_ref text,
  status public.payment_status not null default 'created',
  idempotency_key text not null,
  failure_reason text,
  expires_at timestamptz,
  captured_at timestamptz,
  refunded_cents bigint not null default 0 check (refunded_cents >= 0),
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_id, idempotency_key),
  check (refunded_cents <= amount_cents)
);
create index payment_intents_order_idx on public.payment_intents (order_id);
create index payment_intents_provider_idx on public.payment_intents (provider, provider_ref);
create trigger payment_intents_touch before update on public.payment_intents
  for each row execute function private.touch_updated_at();

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid not null references public.payment_intents (id),
  event_type text not null,
  from_status public.payment_status,
  to_status public.payment_status,
  provider_event_id text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index payment_events_intent_idx on public.payment_events (payment_intent_id);
create trigger payment_events_immutable before update or delete on public.payment_events
  for each row execute function private.forbid_change();

create table public.provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  signature_valid boolean not null,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

-- ---------------------------------------------------------------------------
-- Fees (versioned; one disclosed transaction percentage)
-- ---------------------------------------------------------------------------
create table public.fee_policies (
  id uuid primary key default gen_random_uuid(),
  version int not null unique,
  transaction_fee_bps int not null check (transaction_fee_bps between 0 and 3000),
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  note text not null default '',
  approved_by uuid references public.profiles (id),
  effective_from timestamptz,
  created_at timestamptz not null default now()
);
create unique index fee_policies_one_active on public.fee_policies ((true)) where status = 'active';

create function private.active_fee_bps() returns table (policy_id uuid, bps int)
language sql stable security definer set search_path = public as $$
  select id, transaction_fee_bps from public.fee_policies where status = 'active'
$$;

-- ---------------------------------------------------------------------------
-- Refunds, payouts, reconciliation
-- ---------------------------------------------------------------------------
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid not null references public.payment_intents (id),
  seller_order_id uuid,
  amount_cents bigint not null check (amount_cents > 0),
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  destination text not null check (destination in ('wallet', 'provider')),
  requested_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  provider_ref text,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index refunds_intent_idx on public.refunds (payment_intent_id);

create table public.payout_destinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  bank_name text not null,
  account_holder text not null,
  account_last4 text not null check (account_last4 ~ '^[0-9]{4}$'),
  provider_ref text,
  verified_at timestamptz,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  role text not null check (role in ('seller', 'courier')),
  destination_id uuid references public.payout_destinations (id),
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'requested' check (status in ('requested', 'approved', 'processing', 'paid', 'failed', 'cancelled')),
  requested_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  provider_ref text,
  failure_reason text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index payouts_user_idx on public.payouts (user_id, created_at desc);

create table public.reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  status text not null default 'open' check (status in ('open', 'matched', 'exceptions')),
  provider_total_cents bigint,
  ledger_total_cents bigint,
  exceptions jsonb not null default '[]',
  run_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Buyer-facing wallet and card RPCs
-- ---------------------------------------------------------------------------
-- Demo top-up. A real top-up comes from a provider webhook (apply_payment_event);
-- this path is only enabled while the setting wallet_demo_topups is true.
create function public.demo_top_up(p_amount_cents bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_user();
begin
  if coalesce((private.setting('wallet_demo_topups') #>> '{}')::boolean, false) is not true then
    raise exception 'top_ups_disabled' using errcode = '55000';
  end if;
  if p_amount_cents <= 0 or p_amount_cents > 500000 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  return private.wallet_move(v_user, p_amount_cents, 'top_up', 'Top up (demo)', 'provider_clearing',
                             'wallet_top_up', gen_random_uuid(), null);
end $$;

-- Called by the trusted payments Edge Function after a provider has tokenised a card.
create function public.save_payment_method(p_user uuid, p_provider text, p_token text, p_brand text, p_last4 text,
                                           p_exp_month int, p_exp_year int, p_holder text, p_default boolean)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_default or not exists (select 1 from public.payment_methods where user_id = p_user) then
    update public.payment_methods set is_default = false where user_id = p_user;
    p_default := true;
  end if;
  insert into public.payment_methods (user_id, provider, provider_token, brand, last4, exp_month, exp_year, holder_name, is_default)
  values (p_user, p_provider, p_token, p_brand, p_last4, p_exp_month, p_exp_year, coalesce(p_holder, ''), p_default)
  on conflict (user_id, provider, provider_token) do update set is_default = excluded.is_default
  returning id into v_id;
  return v_id;
end $$;

create function public.remove_payment_method(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_user();
begin
  delete from public.payment_methods where id = p_id and user_id = v_user;
  update public.payment_methods set is_default = true
   where id = (select id from public.payment_methods where user_id = v_user order by created_at limit 1)
     and not exists (select 1 from public.payment_methods where user_id = v_user and is_default);
end $$;

create function public.set_default_payment_method(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_user();
begin
  if not exists (select 1 from public.payment_methods where id = p_id and user_id = v_user) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  update public.payment_methods set is_default = (id = p_id) where user_id = v_user;
end $$;

insert into public.app_settings (key, value, description)
values ('wallet_demo_topups', 'true', 'Allow demo_top_up(). Set to false before any real money flows.');
