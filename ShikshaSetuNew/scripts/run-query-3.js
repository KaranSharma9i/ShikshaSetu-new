require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const res = await client.query(`
    SELECT policyname, cmd, qual
    FROM pg_policies 
    WHERE tablename IN ('homework', 'homework_submissions')
    ORDER BY tablename, cmd
  `);
  
  res.rows.forEach(r => {
    console.log(`${r.policyname} | ${r.cmd} | ${r.qual.replace(/\n\s+/g, ' ')}`);
  });

  await client.end();
}
main().catch(console.error);
