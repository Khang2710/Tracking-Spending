begin;

drop policy if exists "tracker_transactions insert own" on public.tracker_transactions;
drop policy if exists "tracker_transactions update own" on public.tracker_transactions;
create policy "tracker_transactions insert own" on public.tracker_transactions for insert to authenticated
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.tracker_wallets w
  where w.id = wallet_id and w.user_id = (select auth.uid())
));
create policy "tracker_transactions update own" on public.tracker_transactions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.tracker_wallets w
  where w.id = wallet_id and w.user_id = (select auth.uid())
));

drop policy if exists "tracker_recurring_expenses insert own" on public.tracker_recurring_expenses;
drop policy if exists "tracker_recurring_expenses update own" on public.tracker_recurring_expenses;
create policy "tracker_recurring_expenses insert own" on public.tracker_recurring_expenses for insert to authenticated
with check ((select auth.uid()) = user_id and (wallet_id is null or exists (
  select 1 from public.tracker_wallets w
  where w.id = wallet_id and w.user_id = (select auth.uid())
)));
create policy "tracker_recurring_expenses update own" on public.tracker_recurring_expenses for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and (wallet_id is null or exists (
  select 1 from public.tracker_wallets w
  where w.id = wallet_id and w.user_id = (select auth.uid())
)));

drop policy if exists "tracker_recurring_occurrences insert own" on public.tracker_recurring_occurrences;
drop policy if exists "tracker_recurring_occurrences update own" on public.tracker_recurring_occurrences;
create policy "tracker_recurring_occurrences insert own" on public.tracker_recurring_occurrences for insert to authenticated
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.tracker_recurring_expenses e
  where e.id = recurring_expense_id and e.user_id = (select auth.uid())
) and (transaction_id is null or exists (
  select 1 from public.tracker_transactions t
  where t.id = transaction_id and t.user_id = (select auth.uid())
)));
create policy "tracker_recurring_occurrences update own" on public.tracker_recurring_occurrences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.tracker_recurring_expenses e
  where e.id = recurring_expense_id and e.user_id = (select auth.uid())
) and (transaction_id is null or exists (
  select 1 from public.tracker_transactions t
  where t.id = transaction_id and t.user_id = (select auth.uid())
)));

drop policy if exists "tracker_split_bill_items insert own" on public.tracker_split_bill_items;
drop policy if exists "tracker_split_bill_items update own" on public.tracker_split_bill_items;
create policy "tracker_split_bill_items insert own" on public.tracker_split_bill_items for insert to authenticated
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.tracker_split_bills b
  where b.id = split_bill_id and b.user_id = (select auth.uid())
));
create policy "tracker_split_bill_items update own" on public.tracker_split_bill_items for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.tracker_split_bills b
  where b.id = split_bill_id and b.user_id = (select auth.uid())
));

drop policy if exists "tracker_split_participants insert own" on public.tracker_split_participants;
drop policy if exists "tracker_split_participants update own" on public.tracker_split_participants;
create policy "tracker_split_participants insert own" on public.tracker_split_participants for insert to authenticated
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.tracker_split_bills b
  where b.id = split_bill_id and b.user_id = (select auth.uid())
));
create policy "tracker_split_participants update own" on public.tracker_split_participants for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.tracker_split_bills b
  where b.id = split_bill_id and b.user_id = (select auth.uid())
));

drop policy if exists "tracker_split_balances insert own" on public.tracker_split_balances;
drop policy if exists "tracker_split_balances update own" on public.tracker_split_balances;
create policy "tracker_split_balances insert own" on public.tracker_split_balances for insert to authenticated
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.tracker_split_bills b
  where b.id = split_bill_id and b.user_id = (select auth.uid())
) and exists (
  select 1 from public.tracker_split_participants p
  where p.id = participant_id
    and p.split_bill_id = split_bill_id
    and p.user_id = (select auth.uid())
));
create policy "tracker_split_balances update own" on public.tracker_split_balances for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.tracker_split_bills b
  where b.id = split_bill_id and b.user_id = (select auth.uid())
) and exists (
  select 1 from public.tracker_split_participants p
  where p.id = participant_id
    and p.split_bill_id = split_bill_id
    and p.user_id = (select auth.uid())
));

commit;
