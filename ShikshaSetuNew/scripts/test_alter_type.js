const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('Altering types...');
    await client.query("ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'holiday'");
    await client.query("ALTER TYPE teacher_attendance_status ADD VALUE IF NOT EXISTS 'holiday'");
    console.log('Successfully altered types!');
  } catch (err) {
    console.error('Error altering types:', err.message);
  } finally {
    await client.end();
  }
}

run();
