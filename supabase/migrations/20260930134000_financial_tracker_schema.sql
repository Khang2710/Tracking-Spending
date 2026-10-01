create extension if not exists pgcrypto;

create or replace function public.tracker_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.tracker_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.tracker_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 100),
  balance numeric(14, 2) not null default 0,
  accent text not null default '#171b18',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.tracker_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.tracker_wallets(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 160),
  occurred_on date not null,
  amount numeric(14, 2) not null check (amount <> 0),
  category text not null default 'Others',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.tracker_monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month_start date not null check (month_start = date_trunc('month', month_start::timestamp)::date),
  amount numeric(14, 2) not null check (amount >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, month_start)
);

create table public.tracker_savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  target_amount numeric(14, 2) not null check (target_amount >= 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  icon text not null default 'PiggyBank',
  color text not null default '#171b18',
  deadline date,
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS', 'COMPLETED')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.tracker_recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  wallet_id uuid references public.tracker_wallets(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  amount numeric(14, 2) not null check (amount > 0),
  category text not null default 'Others',
  cadence text not null check (cadence in ('MONTHLY', 'WEEKLY', 'YEARLY')),
  next_due_on date not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.tracker_recurring_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recurring_expense_id uuid not null references public.tracker_recurring_expenses(id) on delete cascade,
  due_on date not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'SKIPPED')),
  transaction_id uuid references public.tracker_transactions(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (recurring_expense_id, due_on)
);

create table public.tracker_split_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  occurred_on date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.tracker_split_bill_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  split_bill_id uuid not null references public.tracker_split_bills(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 160),
  amount numeric(14, 2) not null check (amount >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.tracker_split_participants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  split_bill_id uuid not null references public.tracker_split_bills(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.tracker_split_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  split_bill_id uuid not null references public.tracker_split_bills(id) on delete cascade,
  participant_id uuid not null references public.tracker_split_participants(id) on delete cascade,
  amount numeric(14, 2) not null,
  settled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (split_bill_id, participant_id)
);

create index tracker_wallets_user_id_idx on public.tracker_wallets (user_id);
create index tracker_transactions_user_occurred_on_idx on public.tracker_transactions (user_id, occurred_on desc);
create index tracker_transactions_wallet_id_idx on public.tracker_transactions (wallet_id);
create index tracker_monthly_budgets_user_month_idx on public.tracker_monthly_budgets (user_id, month_start desc);
create index tracker_savings_goals_user_id_idx on public.tracker_savings_goals (user_id);
create index tracker_recurring_expenses_user_due_idx on public.tracker_recurring_expenses (user_id, next_due_on);
create index tracker_recurring_occurrences_user_due_idx on public.tracker_recurring_occurrences (user_id, due_on);
create index tracker_split_bills_user_occurred_idx on public.tracker_split_bills (user_id, occurred_on desc);
create index tracker_split_bill_items_bill_id_idx on public.tracker_split_bill_items (split_bill_id);
create index tracker_split_participants_bill_id_idx on public.tracker_split_participants (split_bill_id);
create index tracker_split_balances_bill_id_idx on public.tracker_split_balances (split_bill_id);

alter table public.tracker_profiles enable row level security;
alter table public.tracker_wallets enable row level security;
alter table public.tracker_transactions enable row level security;
alter table public.tracker_monthly_budgets enable row level security;
alter table public.tracker_savings_goals enable row level security;
alter table public.tracker_recurring_expenses enable row level security;
alter table public.tracker_recurring_occurrences enable row level security;
alter table public.tracker_split_bills enable row level security;
alter table public.tracker_split_bill_items enable row level security;
alter table public.tracker_split_participants enable row level security;
alter table public.tracker_split_balances enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  public.tracker_profiles,
  public.tracker_wallets,
  public.tracker_transactions,
  public.tracker_monthly_budgets,
  public.tracker_savings_goals,
  public.tracker_recurring_expenses,
  public.tracker_recurring_occurrences,
  public.tracker_split_bills,
  public.tracker_split_bill_items,
  public.tracker_split_participants,
  public.tracker_split_balances
to authenticated;

create policy "tracker_profiles select own" on public.tracker_profiles for select to authenticated using ((select auth.uid()) = id);
create policy "tracker_profiles insert own" on public.tracker_profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "tracker_profiles update own" on public.tracker_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "tracker_profiles delete own" on public.tracker_profiles for delete to authenticated using ((select auth.uid()) = id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tracker_wallets', 'tracker_transactions', 'tracker_monthly_budgets', 'tracker_savings_goals',
    'tracker_recurring_expenses', 'tracker_recurring_occurrences', 'tracker_split_bills',
    'tracker_split_bill_items', 'tracker_split_participants', 'tracker_split_balances'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || ' select own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || ' insert own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || ' update own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || ' delete own', table_name);
  end loop;
end;
$$;

create trigger set_tracker_profiles_updated_at before update on public.tracker_profiles for each row execute function public.tracker_set_updated_at();
create trigger set_tracker_wallets_updated_at before update on public.tracker_wallets for each row execute function public.tracker_set_updated_at();
create trigger set_tracker_transactions_updated_at before update on public.tracker_transactions for each row execute function public.tracker_set_updated_at();
create trigger set_tracker_monthly_budgets_updated_at before update on public.tracker_monthly_budgets for each row execute function public.tracker_set_updated_at();
create trigger set_tracker_savings_goals_updated_at before update on public.tracker_savings_goals for each row execute function public.tracker_set_updated_at();
create trigger set_tracker_recurring_expenses_updated_at before update on public.tracker_recurring_expenses for each row execute function public.tracker_set_updated_at();
create trigger set_tracker_recurring_occurrences_updated_at before update on public.tracker_recurring_occurrences for each row execute function public.tracker_set_updated_at();
create trigger set_tracker_split_bills_updated_at before update on public.tracker_split_bills for each row execute function public.tracker_set_updated_at();
create trigger set_tracker_split_bill_items_updated_at before update on public.tracker_split_bill_items for each row execute function public.tracker_set_updated_at();
create trigger set_tracker_split_participants_updated_at before update on public.tracker_split_participants for each row execute function public.tracker_set_updated_at();
create trigger set_tracker_split_balances_updated_at before update on public.tracker_split_balances for each row execute function public.tracker_set_updated_at();
