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
  const userId = loginData.user.id;

  const url = `${supabaseUrl}/rest/v1/config_sync?select=config_json&user_id=eq.${userId}`;
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
  const row = data[0];
  if (row && row.config_json && row.config_json.debugLogs) {
    const logs = row.config_json.debugLogs['mob-gp1o2o7r-rgmsm102'] || [];
    console.log('--- PHONE LOGS REGARDING ORDERS_SYNC ---');
    logs.forEach(l => {
      if (l.includes('orders_sync') || l.includes('TKT-0005') || l.includes('Error')) {
        console.log(l);
      }
    });
  } else {
    console.log('No debugLogs found.');
  }
}

check();
