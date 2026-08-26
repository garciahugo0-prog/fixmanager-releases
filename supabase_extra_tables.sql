-- =====================================================================
-- TABLAS ADICIONALES: SERVICIOS, DONANTES, COTIZACIONES Y CONFIGURACIÓN
-- =====================================================================
-- Copia y pega este script en tu Editor SQL de Supabase y dale "Run".

-- ==========================================
-- TABLA 1: SERVICIOS (services_sync)
-- ==========================================
create table if not exists public.services_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name varchar not null,
  category varchar default 'General',
  price numeric(10,2) not null default 0.00,
  cost numeric(10,2) default 0.00,
  duration_minutes integer default 30,
  popularity integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

create trigger update_services_sync_updated_at
  before update on public.services_sync
  for each row execute procedure update_updated_at_column();

alter table public.services_sync enable row level security;

create policy "Acceso selectivo de usuarios de services_sync"
  on public.services_sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_services_sync_lookup on public.services_sync (user_id, updated_at);


-- ==========================================
-- TABLA 2: DONANTES (donors_sync)
-- ==========================================
create table if not exists public.donors_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  brand varchar not null,
  model varchar not null,
  color varchar,
  notes text,
  parts_json jsonb not null default '[]'::jsonb, -- Lista de refacciones extraíbles del equipo donante
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

create trigger update_donors_sync_updated_at
  before update on public.donors_sync
  for each row execute procedure update_updated_at_column();

alter table public.donors_sync enable row level security;

create policy "Acceso selectivo de usuarios de donors_sync"
  on public.donors_sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_donors_sync_lookup on public.donors_sync (user_id, updated_at);


-- ==========================================
-- TABLA 3: COTIZACIONES (quotes_sync)
-- ==========================================
create table if not exists public.quotes_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  client_name varchar not null,
  client_phone varchar,
  device_brand varchar not null,
  device_model varchar not null,
  failure_details text not null,
  estimated_cost numeric(10,2) default 0.00,
  valid_until timestamp with time zone,
  status varchar default 'Pendiente', -- Pendiente, Aceptado, Rechazado
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

create trigger update_quotes_sync_updated_at
  before update on public.quotes_sync
  for each row execute procedure update_updated_at_column();

alter table public.quotes_sync enable row level security;

create policy "Acceso selectivo de usuarios de quotes_sync"
  on public.quotes_sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_quotes_sync_lookup on public.quotes_sync (user_id, updated_at);


-- ==========================================
-- TABLA 4: CONFIGURACIÓN DEL TALLER (config_sync)
-- ==========================================
create table if not exists public.config_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique, -- Un registro de configuración único por taller
  config_json jsonb not null default '{}'::jsonb, -- Guarda todos los ajustes del taller
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

create trigger update_config_sync_updated_at
  before update on public.config_sync
  for each row execute procedure update_updated_at_column();

alter table public.config_sync enable row level security;

create policy "Acceso selectivo de usuarios de config_sync"
  on public.config_sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_config_sync_lookup on public.config_sync (user_id, updated_at);
