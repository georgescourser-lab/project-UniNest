create table if not exists public.marketplace_items (
  id bigint primary key,
  listing_ref text not null unique,
  status text not null,
  data jsonb not null,
  private_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_items_status_updated_idx
  on public.marketplace_items (status, updated_at desc);

alter table public.marketplace_items enable row level security;

create policy "Anyone can view marketplace items"
  on public.marketplace_items
  for select
  to anon, authenticated
  using (true);

revoke all on public.marketplace_items from anon, authenticated;
grant select (id, listing_ref, status, data, created_at, updated_at)
  on public.marketplace_items to anon, authenticated;
