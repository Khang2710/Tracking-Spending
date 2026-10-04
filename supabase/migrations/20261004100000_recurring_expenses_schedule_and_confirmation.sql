begin;

alter table public.tracker_recurring_expenses
  add column if not exists start_on date,
  add column if not exists day_of_week smallint,
  add column if not exists day_of_month smallint,
  add column if not exists month_of_year smallint,
  add column if not exists legacy_source_id text;

update public.tracker_recurring_expenses
set
  start_on = coalesce(start_on, next_due_on),
  day_of_week = case when cadence = 'WEEKLY' then extract(isodow from next_due_on)::smallint else null end,
  day_of_month = case when cadence in ('MONTHLY', 'YEARLY') then extract(day from next_due_on)::smallint else null end,
  month_of_year = case when cadence = 'YEARLY' then extract(month from next_due_on)::smallint else null end
where start_on is null or day_of_week is null or day_of_month is null or month_of_year is null;

alter table public.tracker_recurring_expenses alter column start_on set not null;

-- This constraint is present in some older environments. Do not fail the
-- whole additive migration merely because that prior schema already added it.
do $$
begin
  begin
    alter table public.tracker_recurring_expenses
      add constraint tracker_recurring_expenses_schedule_check
      check (
        (cadence = 'WEEKLY' and day_of_week between 1 and 7 and day_of_month is null and month_of_year is null)
        or (cadence = 'MONTHLY' and day_of_week is null and day_of_month between 1 and 31 and month_of_year is null)
        or (cadence = 'YEARLY' and day_of_week is null and day_of_month between 1 and 31 and month_of_year between 1 and 12)
      ) not valid;
  exception when duplicate_object then
    -- A prior version already installed this named constraint.
    null;
  end;
end
$$;

alter table public.tracker_recurring_expenses validate constraint tracker_recurring_expenses_schedule_check;

create unique index if not exists tracker_recurring_expenses_legacy_source_idx
  on public.tracker_recurring_expenses (user_id, legacy_source_id)
  where legacy_source_id is not null;

create unique index if not exists tracker_recurring_occurrences_transaction_idx
  on public.tracker_recurring_occurrences (transaction_id)
  where transaction_id is not null;

create or replace function public.tracker_next_recurring_due(
  p_due_on date,
  p_cadence text,
  p_day_of_week smallint,
  p_day_of_month smallint,
  p_month_of_year smallint
)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_month_start date;
  v_last_day integer;
begin
  if p_cadence = 'WEEKLY' then
    return p_due_on + 7;
  end if;

  if p_cadence = 'MONTHLY' then
    v_month_start := (date_trunc('month', p_due_on) + interval '1 month')::date;
    v_last_day := extract(day from (date_trunc('month', v_month_start) + interval '1 month - 1 day'))::integer;
    return make_date(extract(year from v_month_start)::integer, extract(month from v_month_start)::integer, least(p_day_of_month, v_last_day));
  end if;

  if p_cadence = 'YEARLY' then
    v_month_start := make_date(extract(year from p_due_on)::integer + 1, p_month_of_year, 1);
    v_last_day := extract(day from (date_trunc('month', v_month_start) + interval '1 month - 1 day'))::integer;
    return make_date(extract(year from v_month_start)::integer, p_month_of_year, least(p_day_of_month, v_last_day));
  end if;

  raise exception 'Invalid recurrence cadence' using errcode = '22023';
end;
$$;

create or replace function public.tracker_confirm_recurring_occurrence(
  p_recurring_expense_id uuid,
  p_due_on date
)
returns table (occurrence_id uuid, transaction_id uuid, next_due_on date)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_expense public.tracker_recurring_expenses%rowtype;
  v_transaction_id uuid;
  v_occurrence_id uuid;
  v_next_due_on date;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into v_expense
  from public.tracker_recurring_expenses
  where id = p_recurring_expense_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Recurring expense not found' using errcode = 'P0002';
  end if;

  if not v_expense.active or v_expense.next_due_on <> p_due_on then
    raise exception 'Recurring occurrence is no longer pending' using errcode = '23505';
  end if;

  if v_expense.wallet_id is null then
    raise exception 'Recurring expense requires a wallet' using errcode = 'P0002';
  end if;

  perform 1 from public.tracker_wallets
  where id = v_expense.wallet_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'Wallet not found' using errcode = 'P0002';
  end if;

  v_next_due_on := public.tracker_next_recurring_due(
    v_expense.next_due_on,
    v_expense.cadence,
    v_expense.day_of_week,
    v_expense.day_of_month,
    v_expense.month_of_year
  );

  update public.tracker_wallets
  set balance = balance - v_expense.amount
  where id = v_expense.wallet_id and user_id = v_user_id;

  insert into public.tracker_transactions (user_id, wallet_id, name, occurred_on, amount, category)
  values (v_user_id, v_expense.wallet_id, v_expense.title, p_due_on, -v_expense.amount, v_expense.category)
  returning id into v_transaction_id;

  insert into public.tracker_recurring_occurrences (user_id, recurring_expense_id, due_on, status, transaction_id)
  values (v_user_id, v_expense.id, p_due_on, 'CONFIRMED', v_transaction_id)
  returning id into v_occurrence_id;

  update public.tracker_recurring_expenses
  set next_due_on = v_next_due_on
  where id = v_expense.id and user_id = v_user_id;

  return query select v_occurrence_id, v_transaction_id, v_next_due_on;
end;
$$;

revoke all on function public.tracker_confirm_recurring_occurrence(uuid, date) from public;
grant execute on function public.tracker_confirm_recurring_occurrence(uuid, date) to authenticated;

commit;
