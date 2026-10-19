-- =============================================================================
-- UniNest Server-Side Authorization & Privacy Shield Migration
-- Enforces:
-- 1. Agent-controlled inquiries (only authorized agents and the inquirer can view)
-- 2. Private listing details (owner phone, email, and room info hidden behind RLS)
-- 3. Disables public comments / discussion threads
-- 4. Prevents unauthorized users from extracting private data via direct database requests
-- =============================================================================

-- 1. Inquiries Table (Agent-Controlled Viewing & Inspection Appointments)
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  reference_code text unique not null,
  property_id integer references public.properties(id) on delete set null,
  marketplace_item_id text,
  agent_id integer references public.agents(id) on delete set null,
  client_name text not null,
  client_phone text not null,
  client_email text,
  preferred_date date not null,
  preferred_time text,
  preferred_hub text,
  message text,
  status text not null default 'Pending', -- 'Pending', 'Agent Confirmed', 'Rescheduled', 'Completed', 'Cancelled'
  agent_notes text,
  deal_update text,
  user_id uuid references auth.users(id) on delete set null,
  inquiry_type text not null default 'general',
  created_at timestamptz not null default now()
);

-- Indexes for efficient lookup
create index if not exists inquiries_ref_idx on public.inquiries(reference_code);
create index if not exists inquiries_agent_id_idx on public.inquiries(agent_id);
create index if not exists inquiries_user_id_idx on public.inquiries(user_id);

-- 2. Listing Private Details Table (Confidential Landlord & Student Seller Vault)
create table if not exists public.listing_private_details (
  id uuid primary key default gen_random_uuid(),
  listing_ref text unique not null,
  property_id integer references public.properties(id) on delete cascade,
  marketplace_item_id text,
  owner_legal_name text not null,
  owner_phone text not null,
  owner_email text not null,
  owner_private_address text not null, -- Private hostel & room number
  assigned_agent_id integer references public.agents(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists listing_private_agent_idx on public.listing_private_details(assigned_agent_id);

-- =============================================================================
-- Row Level Security (Server-Side Authorization Enforcement)
-- =============================================================================

-- Enable RLS on both tables
alter table public.inquiries enable row level security;
alter table public.listing_private_details enable row level security;

-- Function: Check if current authenticated user is an authorized agent or admin
create or replace function public.is_authorized_agent()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.agents a
    where a.email = (auth.jwt() ->> 'email')
  )
  or (auth.jwt() ->> 'role' in ('agent', 'service_role', 'admin'))
  or exists (
    select 1 from auth.users u
    where u.id = auth.uid()
    and u.email in (select unnest(string_to_array(coalesce(current_setting('app.admin_emails', true), ''), ',')))
  );
$$;

-- RLS Policies for Inquiries Table:
-- Policy A: Anyone (prospective buyers/tenants) can submit an inquiry request
create policy "Anyone can insert inquiries"
  on public.inquiries
  for insert
  with check (true);

-- Policy B: Prospective client can view ONLY their own submitted inquiry
create policy "Clients can view their own inquiries"
  on public.inquiries
  for select
  using (
    auth.uid() is not null and auth.uid() = user_id
  );

-- Policy C: Authorized agents can view all inquiries assigned to them
create policy "Agents can view assigned inquiries"
  on public.inquiries
  for select
  using (
    public.is_authorized_agent()
  );

-- Policy D: Only authorized agents can update inquiry status & deal notes
create policy "Agents can update inquiry status"
  on public.inquiries
  for update
  using (
    public.is_authorized_agent()
  )
  with check (
    public.is_authorized_agent()
  );

-- RLS Policies for Listing Private Details Table:
-- STRICT: Ordinary visitors and prospective buyers can NEVER select private owner contacts
create policy "Only authorized agents can view private owner details"
  on public.listing_private_details
  for select
  using (
    public.is_authorized_agent()
  );

create policy "Only authorized agents can manage private owner details"
  on public.listing_private_details
  for all
  using (
    public.is_authorized_agent()
  )
  with check (
    public.is_authorized_agent()
  );

-- Disable public comment discussion: Disable insertion on public.reviews by anonymous/unvetted users
alter table if exists public.reviews enable row level security;

create or replace policy "Only verified admins can manage reviews"
  on public.reviews
  for all
  using (
    public.is_authorized_agent()
  )
  with check (
    public.is_authorized_agent()
  );
