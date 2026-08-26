-- Habilitar tiempo real (Realtime) para las tablas de sincronización de FixManager
-- Copia y pega esto en tu consola de SQL en Supabase y ejecútalo (Run)

alter publication supabase_realtime add table 
  config_sync, 
  orders_sync, 
  inventory_sync, 
  refacciones_sync, 
  clients_sync, 
  sales_sync, 
  expenses_sync, 
  cortes_sync, 
  app_users_sync, 
  services_sync, 
  donors_sync, 
  quotes_sync, 
  credit_accounts_sync, 
  apartados_sync,
  chip_activations_sync;
