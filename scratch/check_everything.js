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

  // 1. Query database row
  const dbUrl = `${supabaseUrl}/rest/v1/orders_sync?folio=eq.TKT-0005&user_id=eq.${userId}`;
  const dbRes = await fetch(dbUrl, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${token}`
    }
  });

  if (dbRes.ok) {
    const dbData = await dbRes.json();
    console.log('--- DATABASE ROW FOR TKT-0005 ---');
    console.log(JSON.stringify(dbData, null, 2));
  } else {
    console.error('Error fetching database row:', dbRes.status);
  }

  // 2. Query storage files
  const storageUrl = `${supabaseUrl}/storage/v1/object/list/evidencias`;
  const storageRes = await fetch(storageUrl, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prefix: 'order_TKT-0005',
      limit: 100,
      sort_by: { column: 'name', order: 'asc' }
    })
  });

  if (storageRes.ok) {
    const storageData = await storageRes.json();
    console.log('\n--- STORAGE FILES FOR TKT-0005 ---');
    console.log(JSON.stringify(storageData, null, 2));
  } else {
    console.error('Error fetching storage files:', storageRes.status, await storageRes.text());
  }
}

check();
