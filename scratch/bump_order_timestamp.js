const supabaseUrl = 'https://nudkxnfraithxhtutkdw.supabase.co';
const apiKey = 'sb_publishable_HW76IfOUlLj0LdyOUAZeCw_dPG-J9zZ';
const email = 'lupitasanchez1002@gmail.com';
const password = 'Mejoramigo1995';

async function test() {
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

  const url = `${supabaseUrl}/rest/v1/orders_sync?user_id=eq.${userId}&folio=eq.TKT-0005`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      updated_at: new Date().toISOString()
    })
  });

  console.log('Patch response status:', response.status);
  console.log('Patch response text:', await response.text());
}

test();
