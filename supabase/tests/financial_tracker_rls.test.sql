-- Run after the migration with `supabase test db` or a local Supabase instance.
-- This test intentionally uses two distinct authenticated identities.
begin;

create extension if not exists pgtap;
select plan(5);

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

insert into public.tracker_wallets (id, user_id, label, balance, accent)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', auth.uid(), 'A wallet', 10, '#000000');

select is((select count(*) from public.tracker_wallets), 1::bigint, 'a user can read their own wallet');

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select is((select count(*) from public.tracker_wallets), 0::bigint, 'another user cannot read user A wallet');
select throws_ok(
  $$insert into public.tracker_wallets (user_id, label, balance, accent) values ('11111111-1111-1111-1111-111111111111', 'forbidden', 1, '#000000')$$,
  'new row violates row-level security policy for table "tracker_wallets"',
  'another user cannot create a wallet for user A'
);
select is((select count(*) from public.tracker_wallets where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint, 'another user cannot target user A wallet');

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select lives_ok(
  $$insert into public.tracker_transactions (user_id, wallet_id, name, occurred_on, amount, category) values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Coffee', current_date, -20, 'Food')$$,
  'a user can create a transaction for their own wallet'
);

select * from finish();
rollback;
