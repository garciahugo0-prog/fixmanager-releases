-- =====================================================================
-- FIXMANAGER - PARCHE DE SINCRONIZACIÓN PARA HISTORIAL DE CHIPS
-- =====================================================================
-- Copia y pega este script en el editor SQL de Supabase y dale "Run".

-- Crear la tabla de sincronización de activaciones de chips
create table if not exists public.chip_activations_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  chip_number varchar not null,
  client_name varchar default 'Público General',
  carrier varchar default 'Genérico',
  iccid varchar default '',
  imei varchar default '',
  price numeric(10,2) default 0.00,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone,
  payload_json jsonb not null default '{}'::jsonb
);

-- Habilitar disparador de actualización del timestamp
create trigger update_chip_activations_sync_updated_at
  before update on public.chip_activations_sync
  for each row execute procedure update_updated_at_column();

-- Habilitar Seguridad a Nivel de Fila (RLS)
alter table public.chip_activations_sync enable row level security;

-- Crear política de acceso exclusivo para el usuario autenticado
create policy "Acceso selectivo de usuarios de chip_activations_sync"
  on public.chip_activations_sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Crear índices de consulta rápida
create index if not exists idx_chip_activations_sync_lookup on public.chip_activations_sync (user_id, updated_at);

-- Agregar la tabla a la publicación de tiempo real de Supabase
alter publication supabase_realtime add table chip_activations_sync;
