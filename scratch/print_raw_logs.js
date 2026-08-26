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

  const url = `${supabaseUrl}/rest/v1/config_sync?select=*&user_id=eq.${userId}`;
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
  console.log('--- ALL DEVICE KEYS IN debugLogs ---');
  if (data && data.length > 0) {
    const configObj = data[0].config_json;
    const debugLogs = configObj.debugLogs || {};
    console.log('Keys:', Object.keys(debugLogs));
    Object.keys(debugLogs).forEach(k => {
      console.log(`- Device [${k}]: has ${debugLogs[k]?.length || 0} log lines.`);
      if (debugLogs[k]?.length > 0) {
        console.log(`  Last line: ${debugLogs[k][debugLogs[k].length - 1]}`);
      }
    });
  } else {
    console.log('No config found.');
  }
}

check();
