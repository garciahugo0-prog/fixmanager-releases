const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nudkxnfraithxhtutkdw.supabase.co';
const supabaseAnonKey = 'sb_publishable_HW76IfOUlLj0LdyOUAZeCw_dPG-J9zZ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Testing connection to Supabase...');
  const start = Date.now();
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('getSession success in', Date.now() - start, 'ms');
    if (error) console.error('Error:', error);
  } catch (err) {
    console.error('Catch error:', err);
  }
}

run();
