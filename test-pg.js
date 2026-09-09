import { Client } from 'pg';

async function testConnection() {
  const url = process.env.DATABASE_URL;
  console.log("Connecting to:", url.replace(/:[^:@]+@/, ':***@'));
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log("Connected successfully!");
    const res = await client.query('SELECT NOW()');
    console.log("Time:", res.rows[0].now);
  } catch (err) {
    console.error("Connection error:", err.message);
  } finally {
    await client.end();
  }
}

testConnection();
