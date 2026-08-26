-- ==========================================
-- TABLA ADICIONAL: REFACCIONES (refacciones_sync)
-- ==========================================
-- Copia y pega este script en tu Editor SQL de Supabase y dale "Run".

create table if not exists public.refacciones_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  code varchar,
  name varchar not null,
  brand varchar,
  device_brand varchar,
  device_model varchar,
  category varchar,
  stock integer not null default 0,
  min_stock integer default 0,
  cost numeric(10,2) not null default 0.00,
  price numeric(10,2) not null default 0.00,
  wholesale_price numeric(10,2) default 0.00,
  favorite boolean default false,
  active boolean default true,
  manage_stock boolean default true,
  image_url varchar,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

-- Trigger para actualizar updated_at automáticamente
create trigger update_refacciones_sync_updated_at
  before update on public.refacciones_sync
  for each row execute procedure update_updated_at_column();

-- Habilitar Row Level Security (RLS)
alter table public.refacciones_sync enable row level security;

-- Política de seguridad RLS
create policy "Acceso selectivo de usuarios de refacciones_sync"
  on public.refacciones_sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Índice para optimizar consultas de sincronización
create index if not exists idx_refacciones_sync_lookup on public.refacciones_sync (user_id, updated_at);
