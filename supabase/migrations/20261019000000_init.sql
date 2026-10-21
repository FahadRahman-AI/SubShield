-- ============================================================================
-- SubShield — initial schema
--
-- Security model
--   * Every table has RLS enabled. The browser (anon / authenticated roles)
--     can only ever READ its own rows; all writes go through server code using
--     the service role after explicit authorization checks.
--   * The paywall is enforced in the database, not just the UI: a free user can
--     read exactly one "teaser" subscription row. Everything else requires Pro.
--   * OAuth / Plaid tokens are encrypted at the application layer (AES-256-GCM)
--     and the token columns are not even selectable by the authenticated role.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Profiles / Users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  is_pro boolean not null default false,
  plan text check (plan in ('monthly', 'yearly')),
  subscription_status text,
  current_period_end timestamp with time zone,
  region text not null default 'US' check (region in ('US', 'UK', 'EU', 'CA', 'AU')),
  alert_email boolean not null default true,
  alert_sms boolean not null default false,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ---------------------------------------------------------------------------
-- External App Connections (Plaid / OAuth)
-- ---------------------------------------------------------------------------
create table public.app_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  provider text not null check (provider in ('plaid', 'google', 'microsoft')),
  access_token text not null,          -- Encrypted at application layer
  refresh_token text,                  -- Encrypted at application layer (OAuth only)
  token_expires_at timestamp with time zone,
  item_id text unique,                 -- Specific to Plaid (NULL for email providers)
  institution_name text,
  account_email text,                  -- Mailbox address for email providers
  sync_cursor text,                    -- Plaid /transactions/sync cursor
  status text check (status in ('active', 'error', 'disconnected')) default 'active',
  error_code text,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index app_connections_user_idx on public.app_connections (user_id);

-- ---------------------------------------------------------------------------
-- Raw bank transactions (from Plaid /transactions/sync)
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  connection_id uuid references public.app_connections(id) on delete cascade not null,
  external_id text not null,
  account_id text,
  merchant_name text,
  description text not null,
  website text,
  amount numeric(12, 2) not null,       -- Plaid convention: positive = money out
  iso_currency_code text not null default 'USD',
  date date not null,
  category text,                        -- Plaid personal_finance_category.detailed
  pending boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (connection_id, external_id)
);

create index transactions_user_date_idx on public.transactions (user_id, date desc);

-- ---------------------------------------------------------------------------
-- Email signals (receipts, renewals, price changes, cancellations)
-- ---------------------------------------------------------------------------
create table public.email_signals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  connection_id uuid references public.app_connections(id) on delete cascade not null,
  external_id text not null,
  kind text not null check (kind in ('receipt', 'renewal_notice', 'price_change', 'trial_ending', 'cancellation')),
  merchant_key text not null,
  sender text,
  subject text,
  amount numeric(12, 2),
  currency text,
  occurred_at date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (connection_id, external_id)
);

create index email_signals_user_idx on public.email_signals (user_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Subscriptions / Recurring Charges (output of the leak engine)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  connection_id uuid references public.app_connections(id) on delete set null,
  name text not null,
  cost numeric(10, 2) not null,
  billing_cycle text check (billing_cycle in ('monthly', 'yearly', 'weekly')) default 'monthly',
  category text default 'General',
  next_billing_date date not null,
  cancellation_difficulty text check (cancellation_difficulty in ('easy', 'medium', 'nightmare')) default 'medium',
  cancellation_url text,
  status text check (status in ('active', 'cancelling', 'cancelled', 'ignored')) default 'active',
  -- Leak engine output
  merchant_key text not null,
  domain text,
  source text not null default 'plaid' check (source in ('plaid', 'email', 'manual')),
  currency text not null default 'USD',
  previous_cost numeric(10, 2),
  last_charged_at date,
  first_seen_at date,
  charge_count integer not null default 1,
  confidence numeric(4, 3) not null default 0,
  waste_score integer not null default 0 check (waste_score between 0 and 100),
  yearly_waste numeric(10, 2) not null default 0,
  leak_reasons jsonb not null default '[]'::jsonb,
  duplicate_group text,
  is_teaser boolean not null default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, merchant_key)
);

create index subscriptions_user_idx on public.subscriptions (user_id);
create index subscriptions_renewal_idx on public.subscriptions (next_billing_date) where status = 'active';
-- At most one free "teaser" leak per user.
create unique index subscriptions_one_teaser_idx on public.subscriptions (user_id) where is_teaser;

-- ---------------------------------------------------------------------------
-- Cancellation Requests / Tracking
-- ---------------------------------------------------------------------------
create table public.cancellation_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subscription_id uuid references public.subscriptions(id) on delete cascade not null,
  method text check (method in ('email', 'letter', 'manual_guide')),
  status text check (status in ('draft', 'sent', 'confirmed')) default 'draft',
  recipient text,
  subject text,
  body text,
  region text,
  provider_message_id text,
  sent_at timestamp with time zone,
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index cancellation_logs_user_idx on public.cancellation_logs (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Monitoring alerts (new subscriptions, price hikes, renewals)
-- ---------------------------------------------------------------------------
create table public.alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  kind text not null check (kind in ('new_subscription', 'price_hike', 'renewal', 'duplicate', 'trial_ending', 'charged_after_cancel')),
  title text not null,
  body text,
  amount_delta numeric(10, 2),
  dedupe_key text not null,
  delivered_email_at timestamp with time zone,
  delivered_sms_at timestamp with time zone,
  read_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, dedupe_key)
);

create index alerts_user_idx on public.alerts (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Stripe webhook idempotency (service role only)
-- ---------------------------------------------------------------------------
create table public.stripe_events (
  id text primary key,
  type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================================
-- Functions & triggers
-- ============================================================================

-- Create a profile row whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- Paywall predicate used by RLS. Takes no argument so a caller can't probe
-- another user's plan.
create or replace function public.current_user_is_pro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_pro from public.profiles where id = (select auth.uid())), false);
$$;

revoke execute on function public.current_user_is_pro() from public, anon;
grant execute on function public.current_user_is_pro() to authenticated;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.app_connections enable row level security;
alter table public.transactions enable row level security;
alter table public.email_signals enable row level security;
alter table public.subscriptions enable row level security;
alter table public.cancellation_logs enable row level security;
alter table public.alerts enable row level security;
alter table public.stripe_events enable row level security;

-- Start from zero: the anon role gets nothing, authenticated gets only what is
-- granted below. The service role bypasses RLS for server-side writes.
revoke all on public.profiles, public.app_connections, public.transactions,
  public.email_signals, public.subscriptions, public.cancellation_logs,
  public.alerts, public.stripe_events
  from anon, authenticated;

-- profiles: read own row; may only edit preference columns (never is_pro,
-- stripe ids or plan — those are written by the Stripe webhook).
grant select on public.profiles to authenticated;
grant update (full_name, region, alert_email, alert_sms, phone) on public.profiles to authenticated;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own preferences" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- app_connections: read own rows, but token columns are not selectable.
grant select (id, user_id, provider, item_id, institution_name, account_email,
  status, error_code, last_synced_at, created_at) on public.app_connections to authenticated;

create policy "app_connections: read own" on public.app_connections
  for select to authenticated using (user_id = (select auth.uid()));

-- transactions / email_signals: read own.
grant select on public.transactions, public.email_signals to authenticated;

create policy "transactions: read own" on public.transactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "email_signals: read own" on public.email_signals
  for select to authenticated using (user_id = (select auth.uid()));

-- subscriptions: the hard paywall. Free users see only their teaser row.
grant select on public.subscriptions to authenticated;
grant update (status) on public.subscriptions to authenticated;

create policy "subscriptions: read own (paywalled)" on public.subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()) and (is_teaser or (select public.current_user_is_pro())));
create policy "subscriptions: update own status (paywalled)" on public.subscriptions
  for update to authenticated
  using (user_id = (select auth.uid()) and (is_teaser or (select public.current_user_is_pro())))
  with check (user_id = (select auth.uid()));

-- cancellation_logs: read own.
grant select on public.cancellation_logs to authenticated;

create policy "cancellation_logs: read own" on public.cancellation_logs
  for select to authenticated using (user_id = (select auth.uid()));

-- alerts: read own, mark as read.
grant select on public.alerts to authenticated;
grant update (read_at) on public.alerts to authenticated;

create policy "alerts: read own" on public.alerts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "alerts: mark own read" on public.alerts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- stripe_events: no policies — service role only.
