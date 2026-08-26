-- =====================================================================
-- FIXMANAGER - SCRIPT DE CONFIGURACIÓN DE TABLAS DE SINCRONIZACIÓN
-- =====================================================================
-- Copia y pega este script en el editor SQL de Supabase (SQL Editor -> New Query)
-- y haz clic en "Run" para crear las tablas y las políticas de seguridad.

-- 1. Habilitar extensión para generación de UUIDs si no está activa
create extension if not exists "uuid-ossp";

-- 2. Función automática para actualizar el campo 'updated_at'
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- ==========================================
-- TABLA 1: EMPLEADOS Y ROLES (app_users_sync)
-- ==========================================
create table if not exists public.app_users_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name varchar not null,
  role varchar not null default 'tecnico', -- admin, tecnico, employee
  pin varchar not null,
  permissions jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

create trigger update_app_users_sync_updated_at
  before update on public.app_users_sync
  for each row execute procedure update_updated_at_column();

-- ==========================================
-- TABLA 2: CLIENTES (clients_sync)
-- ==========================================
create table if not exists public.clients_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name varchar not null,
  phone varchar,
  email varchar,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

create trigger update_clients_sync_updated_at
  before update on public.clients_sync
  for each row execute procedure update_updated_at_column();

-- ==========================================
-- TABLA 3: INVENTARIO Y SERVICIOS (inventory_sync)
-- ==========================================
create table if not exists public.inventory_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name varchar not null,
  category varchar default 'Varios',
  code varchar, -- Código de barras / SKU
  price numeric(10,2) not null default 0.00,
  cost numeric(10,2) not null default 0.00,
  stock integer not null default 0,
  min_stock integer default 0,
  manage_stock boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

create trigger update_inventory_sync_updated_at
  before update on public.inventory_sync
  for each row execute procedure update_updated_at_column();

-- ==========================================
-- TABLA 4: ÓRDENES DE REPARACIÓN (orders_sync)
-- ==========================================
create table if not exists public.orders_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  folio varchar not null,
  client_name varchar not null,
  client_phone varchar,
  device_brand varchar not null,
  device_model varchar not null,
  serial_number varchar,
  failure_details text not null,
  estimated_cost numeric(10,2) default 0.00,
  advance_payment numeric(10,2) default 0.00,
  status varchar not null default 'Pendiente',
  assigned_tech_id varchar,
  history_json jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

create trigger update_orders_sync_updated_at
  before update on public.orders_sync
  for each row execute procedure update_updated_at_column();

-- ==========================================
-- TABLA 5: HISTORIAL DE VENTAS (sales_sync)
-- ==========================================
create table if not exists public.sales_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  ticket_number varchar not null,
  client_name varchar default 'Público General',
  total numeric(10,2) not null,
  payment_method varchar not null default 'Efectivo',
  items_json jsonb not null default '[]'::jsonb,
  created_by varchar,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

create trigger update_sales_sync_updated_at
  before update on public.sales_sync
  for each row execute procedure update_updated_at_column();

-- ==========================================
-- TABLA 6: MOVIMIENTOS DE CAJA CHICA (expenses_sync)
-- ==========================================
create table if not exists public.expenses_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric(10,2) not null,
  type varchar not null, -- ingreso, egreso
  concept varchar not null,
  created_by varchar,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

create trigger update_expenses_sync_updated_at
  before update on public.expenses_sync
  for each row execute procedure update_updated_at_column();

-- ==========================================
-- TABLA 7: CORTES DE CAJA (cortes_sync)
-- ==========================================
create table if not exists public.cortes_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  apertura_timestamp timestamp with time zone not null,
  cierre_timestamp timestamp with time zone not null,
  saldo_inicial numeric(10,2) not null default 0.00,
  ingresos numeric(10,2) not null default 0.00,
  egresos numeric(10,2) not null default 0.00,
  saldo_final numeric(10,2) not null default 0.00,
  diferencia numeric(10,2) not null default 0.00,
  created_by varchar,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

create trigger update_cortes_sync_updated_at
  before update on public.cortes_sync
  for each row execute procedure update_updated_at_column();

-- =====================================================================
-- CONFIGURACIÓN DE SEGURIDAD RLS (Row Level Security)
-- =====================================================================

-- Habilitar RLS en cada tabla
alter table public.app_users_sync enable row level security;
alter table public.clients_sync enable row level security;
alter table public.inventory_sync enable row level security;
alter table public.orders_sync enable row level security;
alter table public.sales_sync enable row level security;
alter table public.expenses_sync enable row level security;
alter table public.cortes_sync enable row level security;

-- Crear políticas para app_users_sync
create policy "Acceso selectivo de usuarios de app_users_sync"
  on public.app_users_sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Crear políticas para clients_sync
create policy "Acceso selectivo de usuarios de clients_sync"
  on public.clients_sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Crear políticas para inventory_sync
create policy "Acceso selectivo de usuarios de inventory_sync"
  on public.inventory_sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Crear políticas para orders_sync
create policy "Acceso selectivo de usuarios de orders_sync"
  on public.orders_sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Crear políticas para sales_sync
create policy "Acceso selectivo de usuarios de sales_sync"
  on public.sales_sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Crear políticas para expenses_sync
create policy "Acceso selectivo de usuarios de expenses_sync"
  on public.expenses_sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Crear políticas para cortes_sync
create policy "Acceso selectivo de usuarios de cortes_sync"
  on public.cortes_sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Indices para optimizar las consultas de sincronización por usuario y fecha
create index if not exists idx_app_users_sync_lookup on public.app_users_sync (user_id, updated_at);
create index if not exists idx_clients_sync_lookup on public.clients_sync (user_id, updated_at);
create index if not exists idx_inventory_sync_lookup on public.inventory_sync (user_id, updated_at);
create index if not exists idx_orders_sync_lookup on public.orders_sync (user_id, updated_at);
create index if not exists idx_sales_sync_lookup on public.sales_sync (user_id, updated_at);
create index if not exists idx_expenses_sync_lookup on public.expenses_sync (user_id, updated_at);
create index if not exists idx_cortes_sync_lookup on public.cortes_sync (user_id, updated_at);
