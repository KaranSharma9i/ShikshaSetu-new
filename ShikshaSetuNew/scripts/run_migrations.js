const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

async function run() {
  console.log('Connecting to database...');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log('Resetting schema public...');
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    
    // In PostgreSQL, dropping the public schema also removes default privileges,
    // so we grant usage and create back to public role/user if needed, or it's fine for dev.
    console.log('Schema reset complete.');

    const migrationsDir = path.join(__dirname, '../db/migrations');
    const files = fs.readdirSync(migrationsDir);
    
    // Filter and sort migrations (e.g. 0001_..., 0002_...)
    const sqlFiles = files
      .filter(f => /^\d{4}_.*\.sql$/.test(f))
      .sort();

    console.log(`Found ${sqlFiles.length} migration files.`);

    for (const file of sqlFiles) {
      console.log(`Running migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Execute the migration SQL
      await client.query(sql);
    }

    console.log('All migrations executed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
