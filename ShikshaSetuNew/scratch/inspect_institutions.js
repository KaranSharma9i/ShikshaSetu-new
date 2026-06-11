const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log("=== INSTITUTIONS ===");
    const instRes = await client.query('SELECT id, name, theme, logo_url, tagline FROM institutions');
    console.log(JSON.stringify(instRes.rows, null, 2));

    console.log("=== BBS USERS ===");
    const usersRes = await client.query("SELECT id, full_name, email, role, institution_id FROM users WHERE institution_id = '65ac109d-2e8e-4bd8-8b59-8b557a1bca16'");
    console.log(JSON.stringify(usersRes.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
