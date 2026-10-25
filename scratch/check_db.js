require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.yuknsftjeoxifpjqumyk:Scourser%402005@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('CONNECTED TO POSTGRES!');
    const res = await client.query('SELECT current_database(), current_user;');
    console.log('Connected DB:', res.rows);

    const triggers = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_schema, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'users' OR event_object_schema = 'auth';
    `);
    console.log('Auth triggers:', triggers.rows);

    const users = await client.query(`SELECT id, email, created_at, confirmed_at FROM auth.users ORDER BY created_at DESC LIMIT 5;`);
    console.log('Recent auth users:', users.rows);
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await client.end();
  }
}

run();
