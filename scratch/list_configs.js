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

  const url = `${supabaseUrl}/rest/v1/config_sync?select=*`;
  const response = await fetch(url, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    console.error('Error fetching config:', response.status, await response.text());
    return;
  }

  const data = await response.json();
  console.log('--- ALL CONFIG ROWS IN DB ---');
  data.forEach((row, idx) => {
    console.log(`Row #${idx + 1}:`);
    console.log(`  id: ${row.id}`);
    console.log(`  user_id: ${row.user_id}`);
    console.log(`  updated_at: ${row.updated_at}`);
    console.log(`  has debugLogs: ${!!row.config_json?.debugLogs}`);
    console.log(`  debugLogs count: ${row.config_json?.debugLogs?.length || 0}`);
  });
}

check();
