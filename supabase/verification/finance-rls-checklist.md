# Finance RLS verification checklist

Run this checklist after applying `20260930180000_harden_tracker_relationship_rls.sql` in the Supabase SQL editor. Use two ordinary email/password accounts, never a service-role key.

## Schema inspection

Run:

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname like 'tracker_%'
  and c.relkind = 'r'
order by c.relname;
```

Expected: every returned table has `rls_enabled = true`.

## Account-isolation matrix

Create a wallet, transaction, recurring expense, split bill, split participant, and split balance under Account A. Sign out and sign in as Account B before each check.

| Attempt by Account B against Account A's row | Expected result | Result |
| --- | --- | --- |
| Read wallet, transaction, goal, or budget | No rows returned | Not run |
| Update or delete a known UUID | Zero rows affected | Not run |
| Insert a transaction with Account A's `wallet_id` | Rejected by RLS | Not run |
| Insert a recurring expense with Account A's `wallet_id` | Rejected by RLS | Not run |
| Insert an occurrence with Account A's expense or transaction UUID | Rejected by RLS | Not run |
| Insert a split item or participant with Account A's bill UUID | Rejected by RLS | Not run |
| Insert a split balance with Account A's bill or participant UUID | Rejected by RLS | Not run |

## Browser persistence check

1. Create a wallet and transaction as Account A, then reload the page.
2. Sign out completely and sign in as Account B on the same device.
3. Confirm Account B never sees Account A's rows while data is loading, after loading, or after an error.
4. Sign back in as Account A and confirm the wallet and transaction appear exactly once.
