create extension if not exists "pgcrypto";

drop table if exists public.deliveries cascade;
drop table if exists public.driver_vehicles cascade;
drop table if exists public.client_bases cascade;
drop table if exists public.drivers cascade;
drop table if exists public.clients cascade;
drop table if exists public.users cascade;
drop table if exists public.tenants cascade;

drop function if exists public.set_updated_at() cascade;
drop function if exists public.ensure_first_user_is_superadmin() cascade;

drop type if exists public.delivery_status cascade;
drop type if exists public.driver_status cascade;
drop type if exists public.user_role cascade;
drop type if exists public.tenant_status cascade;
drop type if exists public.tenant_payment_status cascade;

create type public.user_role as enum ('superadmin', 'admin', 'motorista');
create type public.driver_status as enum ('available', 'busy', 'offline');
create type public.delivery_status as enum ('pendente', 'em_rota', 'entregue', 'cancelado');
create type public.tenant_status as enum ('active', 'suspended');
create type public.tenant_payment_status as enum ('ok', 'pending', 'overdue');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

create or replace function public.ensure_first_user_is_superadmin()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.users where role = 'superadmin') then
    new.role = 'superadmin';
  end if;
  return new;
end;
$$;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  contactName text,
  contactEmail text,
  contactPhone text,
  status public.tenant_status not null default 'active',
  paymentStatus public.tenant_payment_status not null default 'pending',
  paymentDueAt timestamptz,
  notes text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  "openId" text not null unique,
  "authUserId" uuid unique references auth.users (id) on delete set null,
  "tenantId" uuid references public.tenants (id) on delete set null,
  name text,
  email text unique,
  "loginMethod" text,
  role public.user_role not null default 'motorista',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "lastSignedIn" timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  document text,
  email text,
  phone text,
  notes text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.client_bases (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references public.tenants (id) on delete cascade,
  "clientId" uuid not null references public.clients (id) on delete cascade,
  name text not null,
  "postalCode" text,
  street text,
  number text,
  neighborhood text,
  city text,
  state text,
  complement text,
  reference text,
  latitude numeric(12, 8),
  longitude numeric(12, 8),
  "isDefault" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references public.tenants (id) on delete cascade,
  "userId" uuid unique references public.users (id) on delete set null,
  name text not null,
  email text,
  phone text,
  status public.driver_status not null default 'offline',
  notes text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.driver_vehicles (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references public.tenants (id) on delete cascade,
  "driverId" uuid not null references public.drivers (id) on delete cascade,
  model text not null,
  plate text not null,
  nickname text,
  "isPrimary" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint driver_vehicles_plate_unique unique ("tenantId", plate)
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references public.tenants (id) on delete cascade,
  "clientId" uuid references public.clients (id) on delete set null,
  "baseId" uuid references public.client_bases (id) on delete set null,
  "clientName" text not null,
  "originPostalCode" text,
  "originStreet" text,
  "originNumber" text,
  "originNeighborhood" text,
  "originCity" text,
  "originState" text,
  "originComplement" text,
  "originReference" text,
  "originLatitude" numeric(12, 8),
  "originLongitude" numeric(12, 8),
  "originAddress" text not null,
  "destinationPostalCode" text,
  "destinationStreet" text,
  "destinationNumber" text,
  "destinationNeighborhood" text,
  "destinationCity" text,
  "destinationState" text,
  "destinationComplement" text,
  "destinationReference" text,
  "destinationLatitude" numeric(12, 8),
  "destinationLongitude" numeric(12, 8),
  "destinationAddress" text not null,
  "driverId" uuid references public.drivers (id) on delete set null,
  "createdByUserId" uuid references public.users (id) on delete set null,
  status public.delivery_status not null default 'pendente',
  "scheduledAt" timestamptz,
  notes text,
  distance text,
  "estimatedTime" text,
  "routeOrder" integer,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists tenants_slug_idx on public.tenants (slug);
create index if not exists tenants_status_idx on public.tenants (status);
create index if not exists users_open_id_idx on public.users ("openId");
create index if not exists users_auth_user_id_idx on public.users ("authUserId");
create index if not exists users_tenant_id_idx on public.users ("tenantId");
create index if not exists drivers_tenant_id_idx on public.drivers ("tenantId");
create index if not exists drivers_user_id_idx on public.drivers ("userId");
create index if not exists driver_vehicles_tenant_id_idx on public.driver_vehicles ("tenantId");
create index if not exists driver_vehicles_driver_id_idx on public.driver_vehicles ("driverId");
create index if not exists clients_tenant_id_idx on public.clients ("tenantId");
create index if not exists clients_name_idx on public.clients (name);
create index if not exists client_bases_tenant_id_idx on public.client_bases ("tenantId");
create index if not exists client_bases_client_id_idx on public.client_bases ("clientId");
create index if not exists client_bases_default_idx on public.client_bases ("tenantId", "clientId", "isDefault");
create index if not exists deliveries_tenant_id_idx on public.deliveries ("tenantId");
create index if not exists deliveries_status_idx on public.deliveries (status);
create index if not exists deliveries_driver_id_idx on public.deliveries ("driverId");
create index if not exists deliveries_client_id_idx on public.deliveries ("clientId");
create index if not exists deliveries_base_id_idx on public.deliveries ("baseId");
create index if not exists deliveries_scheduled_at_idx on public.deliveries ("scheduledAt");
create index if not exists deliveries_route_order_idx on public.deliveries ("tenantId", "driverId", "routeOrder");

alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.client_bases enable row level security;
alter table public.drivers enable row level security;
alter table public.driver_vehicles enable row level security;
alter table public.deliveries enable row level security;

drop policy if exists "tenant users can read themselves" on public.users;
drop policy if exists "tenant users can manage themselves" on public.users;
drop policy if exists "superadmin can manage tenants" on public.tenants;
drop policy if exists "authenticated can read tenants" on public.tenants;
drop policy if exists "tenant users can read clients" on public.clients;
drop policy if exists "tenant users can manage clients" on public.clients;
drop policy if exists "tenant users can read bases" on public.client_bases;
drop policy if exists "tenant users can manage bases" on public.client_bases;
drop policy if exists "tenant users can read drivers" on public.drivers;
drop policy if exists "tenant users can manage drivers" on public.drivers;
drop policy if exists "tenant users can read driver vehicles" on public.driver_vehicles;
drop policy if exists "tenant users can manage driver vehicles" on public.driver_vehicles;
drop policy if exists "tenant users can read deliveries" on public.deliveries;
drop policy if exists "tenant users can manage deliveries" on public.deliveries;

create policy "superadmin can manage tenants"
on public.tenants
for all
to authenticated
using (exists (select 1 from public.users u where u."authUserId" = auth.uid() and u.role = 'superadmin'))
with check (exists (select 1 from public.users u where u."authUserId" = auth.uid() and u.role = 'superadmin'));

create policy "authenticated can read tenants"
on public.tenants
for select
to authenticated
using (true);

create policy "tenant users can read themselves"
on public.users
for select
to authenticated
using (
  exists (
    select 1
    from public.users me
    where me."authUserId" = auth.uid()
      and (me.role = 'superadmin' or me."tenantId" = "tenantId")
  )
);

create policy "tenant users can manage themselves"
on public.users
for all
to authenticated
using (
  exists (
    select 1
    from public.users me
    where me."authUserId" = auth.uid()
      and (me.role = 'superadmin' or me.role = 'admin' and me."tenantId" = "tenantId" or me."authUserId" = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.users me
    where me."authUserId" = auth.uid()
      and (me.role = 'superadmin' or me.role = 'admin' and me."tenantId" = "tenantId" or me."authUserId" = auth.uid())
  )
);

create policy "tenant users can read clients"
on public.clients
for select
to authenticated
using (exists (select 1 from public.users me where me."authUserId" = auth.uid() and (me.role = 'superadmin' or me."tenantId" = "tenantId")));

create policy "tenant users can manage clients"
on public.clients
for all
to authenticated
using (exists (select 1 from public.users me where me."authUserId" = auth.uid() and (me.role = 'superadmin' or me.role = 'admin' and me."tenantId" = "tenantId")))
with check (exists (select 1 from public.users me where me."authUserId" = auth.uid() and (me.role = 'superadmin' or me.role = 'admin' and me."tenantId" = "tenantId")));

create policy "tenant users can read bases"
on public.client_bases
for select
to authenticated
using (exists (select 1 from public.users me where me."authUserId" = auth.uid() and (me.role = 'superadmin' or me."tenantId" = "tenantId")));

create policy "tenant users can manage bases"
on public.client_bases
for all
to authenticated
using (exists (select 1 from public.users me where me."authUserId" = auth.uid() and (me.role = 'superadmin' or me.role = 'admin' and me."tenantId" = "tenantId")))
with check (exists (select 1 from public.users me where me."authUserId" = auth.uid() and (me.role = 'superadmin' or me.role = 'admin' and me."tenantId" = "tenantId")));

create policy "tenant users can read drivers"
on public.drivers
for select
to authenticated
using (exists (select 1 from public.users me where me."authUserId" = auth.uid() and (me.role = 'superadmin' or me."tenantId" = "tenantId")));

create policy "tenant users can manage drivers"
on public.drivers
for all
to authenticated
using (exists (select 1 from public.users me where me."authUserId" = auth.uid() and (me.role = 'superadmin' or me.role = 'admin' and me."tenantId" = "tenantId")))
with check (exists (select 1 from public.users me where me."authUserId" = auth.uid() and (me.role = 'superadmin' or me.role = 'admin' and me."tenantId" = "tenantId")));

create policy "tenant users can read driver vehicles"
on public.driver_vehicles
for select
to authenticated
using (exists (select 1 from public.users me where me."authUserId" = auth.uid() and (me.role = 'superadmin' or me."tenantId" = "tenantId")));

create policy "tenant users can manage driver vehicles"
on public.driver_vehicles
for all
to authenticated
using (exists (select 1 from public.users me where me."authUserId" = auth.uid() and (me.role = 'superadmin' or me.role = 'admin' and me."tenantId" = "tenantId")))
with check (exists (select 1 from public.users me where me."authUserId" = auth.uid() and (me.role = 'superadmin' or me.role = 'admin' and me."tenantId" = "tenantId")));

create policy "tenant users can read deliveries"
on public.deliveries
for select
to authenticated
using (exists (select 1 from public.users me where me."authUserId" = auth.uid() and (me.role = 'superadmin' or me."tenantId" = "tenantId")));

create policy "tenant users can manage deliveries"
on public.deliveries
for all
to authenticated
using (exists (select 1 from public.users me where me."authUserId" = auth.uid() and (me.role = 'superadmin' or me.role = 'admin' and me."tenantId" = "tenantId")))
with check (exists (select 1 from public.users me where me."authUserId" = auth.uid() and (me.role = 'superadmin' or me.role = 'admin' and me."tenantId" = "tenantId")));

create trigger set_tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger ensure_first_user_is_superadmin_trigger
before insert on public.users
for each row execute function public.ensure_first_user_is_superadmin();

create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger set_client_bases_updated_at
before update on public.client_bases
for each row execute function public.set_updated_at();

create trigger set_drivers_updated_at
before update on public.drivers
for each row execute function public.set_updated_at();

create trigger set_driver_vehicles_updated_at
before update on public.driver_vehicles
for each row execute function public.set_updated_at();

create trigger set_deliveries_updated_at
before update on public.deliveries
for each row execute function public.set_updated_at();
