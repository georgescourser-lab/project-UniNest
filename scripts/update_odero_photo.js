const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("UPDATE agents SET image = '/images/odero.jpg' WHERE name LIKE '%Odero%'")
  .then(res => {
    console.log(res.rowCount + ' row(s) updated');
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
