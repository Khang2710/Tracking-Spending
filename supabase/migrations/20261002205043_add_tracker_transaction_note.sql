alter table public.tracker_transactions
  add column note text null
  check (note is null or char_length(note) <= 500);

-- Replace the old signatures instead of leaving ambiguous defaulted overloads.
drop function public.tracker_create_transaction(uuid, text, date, numeric, text);
drop function public.tracker_update_transaction(uuid, uuid, text, date, numeric, text);

create or replace function public.tracker_create_transaction(
  p_wallet_id uuid,
  p_name text,
  p_occurred_on date,
  p_amount numeric,
  p_category text,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_transaction_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_amount is null or p_amount = 0 then
    raise exception 'Transaction amount must be non-zero';
  end if;

  perform 1
  from public.tracker_wallets
  where id = p_wallet_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Wallet not found';
  end if;

  update public.tracker_wallets
  set balance = balance + p_amount
  where id = p_wallet_id and user_id = v_user_id;

  insert into public.tracker_transactions (
    user_id, wallet_id, name, occurred_on, amount, category, note
  ) values (
    v_user_id,
    p_wallet_id,
    trim(p_name),
    p_occurred_on,
    p_amount,
    coalesce(nullif(trim(p_category), ''), 'Others'),
    nullif(trim(p_note), '')
  ) returning id into v_transaction_id;

  return v_transaction_id;
end;
$$;

create or replace function public.tracker_update_transaction(
  p_transaction_id uuid,
  p_wallet_id uuid,
  p_name text,
  p_occurred_on date,
  p_amount numeric,
  p_category text,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_existing public.tracker_transactions%rowtype;
  v_locked_wallet_id uuid;
  v_locked_wallet_count integer := 0;
  v_expected_wallet_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_amount is null or p_amount = 0 then
    raise exception 'Transaction amount must be non-zero';
  end if;

  select * into v_existing
  from public.tracker_transactions
  where id = p_transaction_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Transaction not found';
  end if;

  v_expected_wallet_count := case
    when v_existing.wallet_id = p_wallet_id then 1
    else 2
  end;

  for v_locked_wallet_id in
    select id
    from public.tracker_wallets
    where user_id = v_user_id
      and id in (v_existing.wallet_id, p_wallet_id)
    order by id
    for update
  loop
    v_locked_wallet_count := v_locked_wallet_count + 1;
  end loop;

  if v_locked_wallet_count <> v_expected_wallet_count then
    raise exception 'Wallet not found';
  end if;

  update public.tracker_wallets
  set balance = balance - v_existing.amount
  where id = v_existing.wallet_id and user_id = v_user_id;

  update public.tracker_wallets
  set balance = balance + p_amount
  where id = p_wallet_id and user_id = v_user_id;

  update public.tracker_transactions
  set wallet_id = p_wallet_id,
      name = trim(p_name),
      occurred_on = p_occurred_on,
      amount = p_amount,
      category = coalesce(nullif(trim(p_category), ''), 'Others'),
      note = nullif(trim(p_note), '')
  where id = p_transaction_id and user_id = v_user_id;

  return p_transaction_id;
end;
$$;

revoke execute on function public.tracker_create_transaction(uuid, text, date, numeric, text, text) from public;
revoke execute on function public.tracker_update_transaction(uuid, uuid, text, date, numeric, text, text) from public;

grant execute on function public.tracker_create_transaction(uuid, text, date, numeric, text, text) to authenticated;
grant execute on function public.tracker_update_transaction(uuid, uuid, text, date, numeric, text, text) to authenticated;
