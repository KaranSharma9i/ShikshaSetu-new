const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function checkDbPhotos() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  try {
    const res = await client.query("SELECT id, role, full_name, profile_photo_url FROM users WHERE profile_photo_url IS NOT NULL");
    console.log("Users with profile photos in DB:", res.rows);
  } catch (error) {
    console.error("Failed to query users:", error);
  } finally {
    await client.end();
  }
}

checkDbPhotos();
