const { Client } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

async function check() {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    console.log('Connected to local database.');

    const resUsers = await client.query('SELECT id, email, role, full_name FROM users LIMIT 10');
    console.log('--- Local Users ---');
    console.log(resUsers.rows);

    const resInst = await client.query('SELECT id, name FROM institutions LIMIT 5');
    console.log('--- Local Institutions ---');
    console.log(resInst.rows);
  } catch (err) {
    console.error('Error connecting to local DB:', err.message);
  } finally {
    await client.end();
  }
}

check();
