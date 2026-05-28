require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns
    WHERE table_name = 'homework_submissions'
    ORDER BY ordinal_position
  `);
  
  res.rows.forEach(r => {
    console.log(`${r.column_name} | ${r.data_type}`);
  });

  await client.end();
}
main().catch(console.error);
