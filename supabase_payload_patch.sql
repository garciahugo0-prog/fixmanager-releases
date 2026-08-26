-- =====================================================================
-- PARCHE: AGREGAR COLUMNA PAYLOAD_JSON PARA SINCRONIZACIÓN HÍBRIDA ROBUSTA
-- =====================================================================
-- Copia y pega este script en tu Editor SQL de Supabase y dale "Run".

alter table public.orders_sync add column if not exists payload_json jsonb;
alter table public.inventory_sync add column if not exists payload_json jsonb;
alter table public.refacciones_sync add column if not exists payload_json jsonb;
alter table public.clients_sync add column if not exists payload_json jsonb;
alter table public.sales_sync add column if not exists payload_json jsonb;
alter table public.expenses_sync add column if not exists payload_json jsonb;
alter table public.cortes_sync add column if not exists payload_json jsonb;
alter table public.app_users_sync add column if not exists payload_json jsonb;
alter table public.services_sync add column if not exists payload_json jsonb;
alter table public.donors_sync add column if not exists payload_json jsonb;
alter table public.quotes_sync add column if not exists payload_json jsonb;

-- Comentario informativo en las tablas
comment on column public.orders_sync.payload_json is 'Objeto completo serializado para evitar pérdida de propiedades';
comment on column public.inventory_sync.payload_json is 'Objeto completo serializado para evitar pérdida de propiedades';
comment on column public.refacciones_sync.payload_json is 'Objeto completo serializado para evitar pérdida de propiedades';
comment on column public.clients_sync.payload_json is 'Objeto completo serializado para evitar pérdida de propiedades';
comment on column public.sales_sync.payload_json is 'Objeto completo serializado para evitar pérdida de propiedades';
comment on column public.expenses_sync.payload_json is 'Objeto completo serializado para evitar pérdida de propiedades';
comment on column public.cortes_sync.payload_json is 'Objeto completo serializado para evitar pérdida de propiedades';
comment on column public.app_users_sync.payload_json is 'Objeto completo serializado para evitar pérdida de propiedades';
comment on column public.services_sync.payload_json is 'Objeto completo serializado para evitar pérdida de propiedades';
comment on column public.donors_sync.payload_json is 'Objeto completo serializado para evitar pérdida de propiedades';
comment on column public.quotes_sync.payload_json is 'Objeto completo serializado para evitar pérdida de propiedades';
