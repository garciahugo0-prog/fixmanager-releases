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

  const url = `${supabaseUrl}/rest/v1/app_session_logs?select=*&user_id=eq.${userId}&order=created_at.desc&limit=10`;
  const response = await fetch(url, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    console.error('Error fetching logs:', response.status, await response.text());
    return;
  }

  const data = await response.json();
  console.log('--- LATEST SESSION LOGS ---');
  data.forEach((log, i) => {
    console.log(`[${log.created_at}] Machine: ${log.machine_id}, OS: ${log.os_name}, App: ${log.app_name}`);
  });
}

check();
