const supabaseUrl = 'https://nudkxnfraithxhtutkdw.supabase.co';
const apiKey = 'sb_publishable_HW76IfOUlLj0LdyOUAZeCw_dPG-J9zZ';
const email = 'lupitasanchez1002@gmail.com';
const password = 'Mejoramigo1995';

async function touch() {
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

  // Actualizar updated_at de la venta C-0002 para forzar su sincronización
  const url = `${supabaseUrl}/rest/v1/sales_sync?user_id=eq.${userId}&ticket_number=eq.0002`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      updated_at: new Date().toISOString()
    })
  });

  if (!response.ok) {
    console.error('Error updating sale:', response.status, await response.text());
    return;
  }

  const data = await response.json();
  console.log('--- TOUCHED SALE 0002 IN DATABASE ---');
  console.log(JSON.stringify(data, null, 2));
}

touch();
