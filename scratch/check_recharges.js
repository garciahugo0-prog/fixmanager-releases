const supabaseUrl = 'https://nudkxnfraithxhtutkdw.supabase.co';
const apiKey = 'sb_publishable_HW76IfOUlLj0LdyOUAZeCw_dPG-J9zZ';
const email = 'lupitasanchez1002@gmail.com';
const password = 'Mejoramigo1995';

async function check() {
  const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const { access_token, user } = await loginRes.json();
  const userId = user.id;

  const url = `${supabaseUrl}/rest/v1/sales_sync?select=*&user_id=eq.${userId}&order=created_at.desc&limit=100`;
  const res = await fetch(url, {
    headers: { 'apikey': apiKey, 'Authorization': `Bearer ${access_token}` }
  });
  const data = await res.json();

  console.log('\n=== ANÁLISIS DE VENTAS EN BD ===\n');

  const byPrefix = {};
  let rechargeByItemId = 0;

  data.forEach(row => {
    const p = row.payload_json;
    if (!p) return;
    const id = p.id || '(sin id)';
    const prefix = id.split('-')[0] || '(sin prefijo)';
    byPrefix[prefix] = (byPrefix[prefix] || 0) + 1;

    const items = p.items || [];
    const hasRechargeItem = items.some(i => i.itemId && i.itemId.startsWith('recharge-'));
    if (hasRechargeItem) rechargeByItemId++;

    // Mostrar las que tienen recharge- en items
    if (hasRechargeItem) {
      console.log(`[RECARGA] id=${id} | items: ${items.map(i=>i.itemId).join(', ')}`);
    }
  });

  console.log('\n=== PREFIJOS ENCONTRADOS ===');
  Object.entries(byPrefix).forEach(([k,v]) => console.log(`  ${k}-... : ${v} ventas`));
  console.log(`\nVentas con itemId recharge-* : ${rechargeByItemId}`);
  console.log(`Total ventas analizadas      : ${data.length}`);
}

check().catch(console.error);
