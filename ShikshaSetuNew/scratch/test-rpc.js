const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    console.log('Calling setup_next_academic_year inside transaction...');
    const res = await client.query(`
      SELECT * FROM setup_next_academic_year(
        '1d32deac-4363-4dec-9ddc-943392877351'::uuid,
        '2026-27',
        '2026-04-01'::date,
        '2027-03-31'::date,
        'cc6bc75a-4bf6-423b-a43d-1eeb421e31c0'::uuid
      );
    `);
    console.log('Result:', JSON.stringify(res.rows, null, 2));
    await client.query('ROLLBACK');
    console.log('Transaction rolled back successfully!');
  } catch (err) {
    console.error('Error running test:', err);
    try {
      await client.query('ROLLBACK');
    } catch(e) {}
  } finally {
    await client.end();
  }
}

main().catch(console.error);
