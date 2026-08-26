const supabaseUrl = 'https://nudkxnfraithxhtutkdw.supabase.co';
const apiKey = 'sb_publishable_HW76IfOUlLj0LdyOUAZeCw_dPG-J9zZ';
const email = 'lupitasanchez1002@gmail.com';
const password = 'Mejoramigo1995';

async function check() {
  const loginUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`;
  const loginRes = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (!loginRes.ok) {
    console.error('Error logging in:', loginRes.status, await loginRes.text());
    return;
  }

  const loginData = await loginRes.json();
  const token = loginData.access_token;

  const url = `${supabaseUrl}/rest/v1/orders_sync?select=*`;
  const response = await fetch(url, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    console.error('Error fetching orders:', response.status, await response.text());
    return;
  }

  const data = await response.json();
  console.log('--- ALL ORDERS IN orders_sync ---');
  data.forEach((row, idx) => {
    console.log(`Order #${idx + 1}:`);
    console.log(`  id: ${row.id}`);
    console.log(`  user_id: ${row.user_id}`);
    console.log(`  folio: ${row.folio}`);
    console.log(`  device_model: ${row.device_model}`);
    console.log(`  evidence length: ${row.payload_json?.evidence?.length || 0}`);
  });
}

check();
