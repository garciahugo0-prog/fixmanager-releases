-- =====================================================================
-- TABLAS ADICIONALES DE SINCRONIZACIÓN: FIADOS (CRÉDITOS) Y APARTADOS
-- =====================================================================
-- Copia y pega este script en tu Editor SQL de Supabase y dale "Run".

-- ==========================================
-- TABLA 1: CUENTAS DE CRÉDITO / FIADOS (credit_accounts_sync)
-- ==========================================
create table if not exists public.credit_accounts_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  client_name varchar not null,
  client_phone varchar not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

create trigger update_credit_accounts_sync_updated_at
  before update on public.credit_accounts_sync
  for each row execute procedure update_updated_at_column();

alter table public.credit_accounts_sync enable row level security;

create policy "Acceso selectivo de usuarios de credit_accounts_sync"
  on public.credit_accounts_sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_credit_accounts_sync_lookup on public.credit_accounts_sync (user_id, updated_at);


-- ==========================================
-- TABLA 2: APARTADOS (apartados_sync)
-- ==========================================
create table if not exists public.apartados_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  client_name varchar not null,
  client_phone varchar,
  total_value numeric(10,2) not null default 0.00,
  status varchar not null default 'Activo', -- Activo, Listo, Entregado, Cancelado
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

create trigger update_apartados_sync_updated_at
  before update on public.apartados_sync
  for each row execute procedure update_updated_at_column();

alter table public.apartados_sync enable row level security;

create policy "Acceso selectivo de usuarios de apartados_sync"
  on public.apartados_sync for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_apartados_sync_lookup on public.apartados_sync (user_id, updated_at);
