create extension if not exists "pgcrypto";

drop table if exists public.deliveries cascade;
drop table if exists public.delivery_events cascade;
drop table if exists public.driver_vehicles cascade;
drop table if exists public.vehicle_assignments cascade;
drop table if exists public.operational_bases cascade;
drop table if exists public.drivers cascade;
drop table if exists public.clients cascade;
drop table if exists public.users cascade;
drop table if exists public.tenants cascade;

drop function if exists public.set_updated_at() cascade;
drop function if exists public.ensure_first_user_is_superadmin() cascade;
drop function if exists public.handle_new_auth_user() cascade;

drop type if exists public.delivery_status cascade;
drop type if exists public.delivery_event_type cascade;
drop type if exists public.driver_status cascade;
drop type if exists public.user_role cascade;
drop type if exists public.tenant_status cascade;
drop type if exists public.tenant_payment_status cascade;

create type public.user_role as enum ('superadmin', 'admin', 'motorista');
create type public.driver_status as enum ('available', 'busy', 'offline');
create type public.delivery_status as enum ('pendente', 'em_rota', 'entregue', 'cancelado');
create type public.delivery_event_type as enum ('status_change');
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

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_name text;
begin
  profile_name :=
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.email
    );

  insert into public.users (
    "openId",
    "authUserId",
    name,
    email,
    "loginMethod",
    role,
    "tenantId"
  )
  values (
    new.id::text,
    new.id,
    profile_name,
    new.email,
    'supabase',
    'motorista',
    null
  )
  on conflict ("authUserId")
  do update set
    "openId" = excluded."openId",
    name = coalesce(excluded.name, public.users.name),
    email = coalesce(excluded.email, public.users.email),
    "loginMethod" = coalesce(public.users."loginMethod", excluded."loginMethod"),
    "updatedAt" = now();

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

create table public.operational_bases (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  "postalCode" text,
  street text not null,
  number text,
  neighborhood text,
  city text not null,
  state text not null,
  complement text,
  reference text,
  latitude numeric(12, 8),
  longitude numeric(12, 8),
  "isPrimary" boolean not null default false,
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
  "currentDriverId" uuid references public.drivers (id) on delete set null,
  model text not null,
  plate text not null,
  nickname text,
  "isPrimary" boolean not null default false,
  "lastAssignedAt" timestamptz,
  "lastUnassignedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint driver_vehicles_plate_unique unique ("tenantId", plate)
);

create table public.vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references public.tenants (id) on delete cascade,
  "vehicleId" uuid not null references public.driver_vehicles (id) on delete cascade,
  "driverId" uuid not null references public.drivers (id) on delete cascade,
  "assignedByUserId" uuid references public.users (id) on delete set null,
  "assignedAt" timestamptz not null default now(),
  "unassignedAt" timestamptz,
  notes text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references public.tenants (id) on delete cascade,
  "clientId" uuid references public.clients (id) on delete set null,
  "baseId" uuid references public.operational_bases (id) on delete set null,
  "clientName" text not null,
  "clientPhone" text,
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

create table public.delivery_events (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references public.tenants (id) on delete cascade,
  "deliveryId" uuid not null references public.deliveries (id) on delete cascade,
  "driverId" uuid references public.drivers (id) on delete set null,
  "createdByUserId" uuid references public.users (id) on delete set null,
  "eventType" public.delivery_event_type not null default 'status_change',
  "fromStatus" public.delivery_status,
  "toStatus" public.delivery_status not null,
  latitude numeric(12, 8),
  longitude numeric(12, 8),
  accuracy numeric(10, 2),
  metadata jsonb not null default '{}'::jsonb,
  "recordedAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create or replace function public.is_current_user_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.users u
    where u."authUserId" = auth.uid()
      and u.role = 'superadmin'
  );
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select u.role
  from public.users u
  where u."authUserId" = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select u."tenantId"
  from public.users u
  where u."authUserId" = auth.uid()
  limit 1;
$$;

create or replace function public.list_tenants()
returns setof public.tenants
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.tenants
  where public.is_current_user_superadmin()
  order by "createdAt" desc;
$$;

create or replace function public.get_tenant_by_id(p_id uuid)
returns public.tenants
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.tenants
  where id = p_id
  limit 1;
$$;

create or replace function public.create_tenant(p_payload jsonb)
returns public.tenants
language plpgsql
security definer
set search_path = public
as $$
declare
  created_tenant public.tenants;
  tenant_name text;
  tenant_slug text;
begin
  if not public.is_current_user_superadmin() then
    raise exception 'Only superadmin can manage tenants';
  end if;

  tenant_name := nullif(trim(coalesce(p_payload->>'name', '')), '');
  tenant_slug := nullif(trim(coalesce(p_payload->>'slug', '')), '');

  if tenant_name is null then
    raise exception 'Tenant name is required';
  end if;

  if tenant_slug is null then
    raise exception 'Tenant slug is required';
  end if;

  insert into public.tenants (
    name,
    slug,
    contactName,
    contactEmail,
    contactPhone,
    status,
    paymentStatus,
    paymentDueAt,
    notes
  )
  values (
    tenant_name,
    lower(regexp_replace(tenant_slug, '\s+', '-', 'g')),
    nullif(trim(coalesce(p_payload->>'contactName', '')), ''),
    nullif(trim(coalesce(p_payload->>'contactEmail', '')), ''),
    nullif(trim(coalesce(p_payload->>'contactPhone', '')), ''),
    coalesce(nullif(p_payload->>'status', '')::public.tenant_status, 'active'),
    coalesce(nullif(p_payload->>'paymentStatus', '')::public.tenant_payment_status, 'pending'),
    nullif(p_payload->>'paymentDueAt', '')::timestamptz,
    nullif(trim(coalesce(p_payload->>'notes', '')), '')
  )
  returning * into created_tenant;

  return created_tenant;
end;
$$;

create or replace function public.update_tenant(p_id uuid, p_payload jsonb)
returns public.tenants
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_tenant public.tenants;
begin
  if not public.is_current_user_superadmin() then
    raise exception 'Only superadmin can manage tenants';
  end if;

  update public.tenants t
  set
    name = case when p_payload ? 'name' then nullif(trim(coalesce(p_payload->>'name', '')), '') else t.name end,
    slug = case when p_payload ? 'slug' then lower(regexp_replace(nullif(trim(coalesce(p_payload->>'slug', '')), ''), '\s+', '-', 'g')) else t.slug end,
    contactName = case when p_payload ? 'contactName' then nullif(trim(coalesce(p_payload->>'contactName', '')), '') else t.contactName end,
    contactEmail = case when p_payload ? 'contactEmail' then nullif(trim(coalesce(p_payload->>'contactEmail', '')), '') else t.contactEmail end,
    contactPhone = case when p_payload ? 'contactPhone' then nullif(trim(coalesce(p_payload->>'contactPhone', '')), '') else t.contactPhone end,
    status = case when p_payload ? 'status' and nullif(p_payload->>'status', '') is not null then (p_payload->>'status')::public.tenant_status else t.status end,
    paymentStatus = case when p_payload ? 'paymentStatus' and nullif(p_payload->>'paymentStatus', '') is not null then (p_payload->>'paymentStatus')::public.tenant_payment_status else t.paymentStatus end,
    paymentDueAt = case when p_payload ? 'paymentDueAt' then nullif(p_payload->>'paymentDueAt', '')::timestamptz else t.paymentDueAt end,
    notes = case when p_payload ? 'notes' then nullif(trim(coalesce(p_payload->>'notes', '')), '') else t.notes end,
    "updatedAt" = now()
  where t.id = p_id
  returning * into updated_tenant;

  return updated_tenant;
end;
$$;

create or replace function public.delete_tenant(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_superadmin() then
    raise exception 'Only superadmin can manage tenants';
  end if;

  delete from public.tenants where id = p_id;
end;
$$;

create index if not exists tenants_slug_idx on public.tenants (slug);
create index if not exists tenants_status_idx on public.tenants (status);
create index if not exists users_open_id_idx on public.users ("openId");
create index if not exists users_auth_user_id_idx on public.users ("authUserId");
create index if not exists users_tenant_id_idx on public.users ("tenantId");
create index if not exists drivers_tenant_id_idx on public.drivers ("tenantId");
create index if not exists drivers_user_id_idx on public.drivers ("userId");
create index if not exists driver_vehicles_tenant_id_idx on public.driver_vehicles ("tenantId");
create index if not exists driver_vehicles_current_driver_id_idx on public.driver_vehicles ("currentDriverId");
create index if not exists vehicle_assignments_tenant_id_idx on public.vehicle_assignments ("tenantId");
create index if not exists vehicle_assignments_vehicle_id_idx on public.vehicle_assignments ("vehicleId");
create index if not exists vehicle_assignments_driver_id_idx on public.vehicle_assignments ("driverId");
create index if not exists clients_tenant_id_idx on public.clients ("tenantId");
create index if not exists clients_name_idx on public.clients (name);
create index if not exists operational_bases_tenant_id_idx on public.operational_bases ("tenantId");
create index if not exists operational_bases_primary_idx on public.operational_bases ("tenantId", "isPrimary");
create unique index if not exists operational_bases_single_primary_idx on public.operational_bases ("tenantId") where "isPrimary";
create index if not exists deliveries_tenant_id_idx on public.deliveries ("tenantId");
create index if not exists deliveries_status_idx on public.deliveries (status);
create index if not exists deliveries_driver_id_idx on public.deliveries ("driverId");
create index if not exists deliveries_client_id_idx on public.deliveries ("clientId");
create index if not exists deliveries_base_id_idx on public.deliveries ("baseId");
create index if not exists deliveries_scheduled_at_idx on public.deliveries ("scheduledAt");
create index if not exists deliveries_route_order_idx on public.deliveries ("tenantId", "driverId", "routeOrder");
create index if not exists delivery_events_delivery_id_idx on public.delivery_events ("deliveryId");
create index if not exists delivery_events_driver_id_idx on public.delivery_events ("driverId");
create index if not exists delivery_events_tenant_id_idx on public.delivery_events ("tenantId");
create index if not exists delivery_events_recorded_at_idx on public.delivery_events ("recordedAt");

alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.operational_bases enable row level security;
alter table public.drivers enable row level security;
alter table public.driver_vehicles enable row level security;
alter table public.vehicle_assignments enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_events enable row level security;

drop policy if exists "tenant users can read themselves" on public.users;
drop policy if exists "tenant users can manage themselves" on public.users;
drop policy if exists "superadmin can manage tenants" on public.tenants;
drop policy if exists "authenticated can read tenants" on public.tenants;
drop policy if exists "tenant users can read clients" on public.clients;
drop policy if exists "tenant users can manage clients" on public.clients;
drop policy if exists "tenant users can read bases" on public.operational_bases;
drop policy if exists "tenant users can manage bases" on public.operational_bases;
drop policy if exists "tenant users can read drivers" on public.drivers;
drop policy if exists "tenant users can manage drivers" on public.drivers;
drop policy if exists "tenant users can read driver vehicles" on public.driver_vehicles;
drop policy if exists "tenant users can manage driver vehicles" on public.driver_vehicles;
drop policy if exists "tenant users can read vehicle assignments" on public.vehicle_assignments;
drop policy if exists "tenant users can manage vehicle assignments" on public.vehicle_assignments;
drop policy if exists "tenant users can read deliveries" on public.deliveries;
drop policy if exists "tenant users can manage deliveries" on public.deliveries;
drop policy if exists "tenant users can read delivery events" on public.delivery_events;
drop policy if exists "tenant users can manage delivery events" on public.delivery_events;

create policy "superadmin can manage tenants"
on public.tenants
for all
to authenticated
using (public.current_user_role() = 'superadmin')
with check (public.current_user_role() = 'superadmin');

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
  public.current_user_role() = 'superadmin'
  or public.current_user_tenant_id() = "tenantId"
  or auth.uid() = "authUserId"
);

create policy "tenant users can manage themselves"
on public.users
for all
to authenticated
using (
  public.current_user_role() = 'superadmin'
  or (
    public.current_user_role() = 'admin'
    and public.current_user_tenant_id() = "tenantId"
  )
  or auth.uid() = "authUserId"
)
with check (
  public.current_user_role() = 'superadmin'
  or (
    public.current_user_role() = 'admin'
    and public.current_user_tenant_id() = "tenantId"
  )
  or auth.uid() = "authUserId"
);

create policy "tenant users can read clients"
on public.clients
for select
to authenticated
using (public.current_user_role() = 'superadmin' or public.current_user_tenant_id() = "tenantId");

create policy "tenant users can manage clients"
on public.clients
for all
to authenticated
using (public.current_user_role() = 'superadmin' or (public.current_user_role() = 'admin' and public.current_user_tenant_id() = "tenantId"))
with check (public.current_user_role() = 'superadmin' or (public.current_user_role() = 'admin' and public.current_user_tenant_id() = "tenantId"));

create policy "tenant users can read bases"
on public.operational_bases
for select
to authenticated
using (public.current_user_role() = 'superadmin' or public.current_user_tenant_id() = "tenantId");

create policy "tenant users can manage bases"
on public.operational_bases
for all
to authenticated
using (public.current_user_role() = 'superadmin' or (public.current_user_role() = 'admin' and public.current_user_tenant_id() = "tenantId"))
with check (public.current_user_role() = 'superadmin' or (public.current_user_role() = 'admin' and public.current_user_tenant_id() = "tenantId"));

create policy "tenant users can read drivers"
on public.drivers
for select
to authenticated
using (public.current_user_role() = 'superadmin' or public.current_user_tenant_id() = "tenantId");

create policy "tenant users can manage drivers"
on public.drivers
for all
to authenticated
using (public.current_user_role() = 'superadmin' or (public.current_user_role() = 'admin' and public.current_user_tenant_id() = "tenantId"))
with check (public.current_user_role() = 'superadmin' or (public.current_user_role() = 'admin' and public.current_user_tenant_id() = "tenantId"));

create policy "tenant users can read driver vehicles"
on public.driver_vehicles
for select
to authenticated
using (public.current_user_role() = 'superadmin' or public.current_user_tenant_id() = "tenantId");

create policy "tenant users can manage driver vehicles"
on public.driver_vehicles
for all
to authenticated
using (public.current_user_role() = 'superadmin' or (public.current_user_role() = 'admin' and public.current_user_tenant_id() = "tenantId"))
with check (public.current_user_role() = 'superadmin' or (public.current_user_role() = 'admin' and public.current_user_tenant_id() = "tenantId"));

create policy "tenant users can read vehicle assignments"
on public.vehicle_assignments
for select
to authenticated
using (public.current_user_role() = 'superadmin' or public.current_user_tenant_id() = "tenantId");

create policy "tenant users can manage vehicle assignments"
on public.vehicle_assignments
for all
to authenticated
using (public.current_user_role() = 'superadmin' or (public.current_user_role() = 'admin' and public.current_user_tenant_id() = "tenantId"))
with check (public.current_user_role() = 'superadmin' or (public.current_user_role() = 'admin' and public.current_user_tenant_id() = "tenantId"));

create policy "tenant users can read deliveries"
on public.deliveries
for select
to authenticated
using (public.current_user_role() = 'superadmin' or public.current_user_tenant_id() = "tenantId");

create policy "tenant users can manage deliveries"
on public.deliveries
for all
to authenticated
using (public.current_user_role() = 'superadmin' or (public.current_user_role() = 'admin' and public.current_user_tenant_id() = "tenantId"))
with check (public.current_user_role() = 'superadmin' or (public.current_user_role() = 'admin' and public.current_user_tenant_id() = "tenantId"));

create policy "tenant users can read delivery events"
on public.delivery_events
for select
to authenticated
using (public.current_user_role() = 'superadmin' or public.current_user_tenant_id() = "tenantId");

create policy "tenant users can manage delivery events"
on public.delivery_events
for all
to authenticated
using (public.current_user_role() = 'superadmin' or (public.current_user_role() = 'admin' and public.current_user_tenant_id() = "tenantId"))
with check (public.current_user_role() = 'superadmin' or (public.current_user_role() = 'admin' and public.current_user_tenant_id() = "tenantId"));

create trigger set_tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger ensure_first_user_is_superadmin_trigger
before insert on public.users
for each row execute function public.ensure_first_user_is_superadmin();

drop trigger if exists handle_new_auth_user_trigger on auth.users;
drop trigger if exists trg_auth_user_created on auth.users;
create trigger handle_new_auth_user_trigger
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger set_operational_bases_updated_at
before update on public.operational_bases
for each row execute function public.set_updated_at();

create trigger set_driver_vehicles_updated_at
before update on public.driver_vehicles
for each row execute function public.set_updated_at();

create trigger set_vehicle_assignments_updated_at
before update on public.vehicle_assignments
for each row execute function public.set_updated_at();

create trigger set_drivers_updated_at
before update on public.drivers
for each row execute function public.set_updated_at();

create trigger set_deliveries_updated_at
before update on public.deliveries
for each row execute function public.set_updated_at();

create trigger set_delivery_events_updated_at
before update on public.delivery_events
for each row execute function public.set_updated_at();
