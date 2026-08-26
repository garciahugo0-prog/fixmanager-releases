const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nudkxnfraithxhtutkdw.supabase.co';
const supabaseAnonKey = 'sb_publishable_HW76IfOUlLj0LdyOUAZeCw_dPG-J9zZ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Testing network request to Supabase...');
  const start = Date.now();
  try {
    const { data, error } = await supabase.from('profiles').select('license_status').limit(1);
    console.log('Request completed in', Date.now() - start, 'ms');
    if (error) console.error('Error:', error);
    else console.log('Data fetched successfully (rows:', data.length, ')');
  } catch (err) {
    console.error('Catch error:', err);
  }
}

run();
