const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://postgres.yuknsftjeoxifpjqumyk:Scourser%402005@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require",
});
client.connect()
  .then(() => console.log('Connected directly to pooler 6543!'))
  .catch(err => console.error('Connection error', err))
  .finally(() => client.end());
