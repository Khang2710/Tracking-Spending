begin;

alter table public.tracker_profiles
  add column if not exists preferred_language text,
  add column if not exists preferred_currency text;

alter table public.tracker_profiles
  drop constraint if exists tracker_profiles_preferred_language_check,
  drop constraint if exists tracker_profiles_preferred_currency_check;

alter table public.tracker_profiles
  add constraint tracker_profiles_preferred_language_check
    check (preferred_language is null or preferred_language in ('vi', 'en')),
  add constraint tracker_profiles_preferred_currency_check
    check (preferred_currency is null or preferred_currency in ('VND', 'USD'));

commit;
