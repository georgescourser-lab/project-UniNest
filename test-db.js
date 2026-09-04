const { Pool } = require('pg');

async function test(pw) {
  console.log('Testing password:', pw);
  const pool = new Pool({
    connectionString: `postgresql://postgres.yuknsftjeoxifpjqumyk:${pw}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require`,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await pool.query('SELECT 1');
    console.log('SUCCESS for password:', pw);
  } catch (err) {
    console.log('FAILED for password:', pw, err.message);
  }
  await pool.end();
}

async function run() {
  await test('Scourser.2005');
  await test('Scourser@2005');
}

run();
