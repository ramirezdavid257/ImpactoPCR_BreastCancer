const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybhnvhonyovijqspxqjm.supabase.co';
const supabaseKey = 'sb_publishable_12Q53ovGzhiheZCOZmXNZQ_AC-ypLdM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing connection to Supabase...');
  try {
    const { data, error } = await supabase.from('patients').select('*').limit(1);
    if (error) {
      console.error('Error connecting to Supabase:', error.message);
      process.exit(1);
    }
    console.log('Successfully connected to Supabase!');
    console.log('Data:', data);
  } catch (err) {
    console.error('Unexpected error:', err.message);
    process.exit(1);
  }
}

testConnection();
