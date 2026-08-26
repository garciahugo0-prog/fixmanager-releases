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
    const dLogs = row.config_json.debugLogs;
    for (const key of Object.keys(dLogs)) {
      console.log(`\n===========================================`);
      console.log(`ANALYSIS FOR DEVICE: ${key}`);
      console.log(`===========================================`);
      const lines = dLogs[key] || [];
      
      const todayLines = lines.filter(l => l.includes('2026-08-08'));
      const errorLines = lines.filter(l => l.toLowerCase().includes('error') || l.toLowerCase().includes('fail') || l.toLowerCase().includes('fallo'));
      
      console.log(`Total lines: ${lines.length}. Today lines: ${todayLines.length}. Error lines: ${errorLines.length}`);
      
      if (todayLines.length > 0) {
        console.log('--- Today logs (last 30) ---');
        todayLines.slice(-30).forEach(l => console.log(l));
      }
      
      if (errorLines.length > 0) {
        console.log('--- Error logs (last 20) ---');
        errorLines.slice(-20).forEach(l => console.log(l));
      }
    }
  }
}

check();
