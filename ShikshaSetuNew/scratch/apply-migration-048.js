const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Manually parse .env to get DATABASE_URL
const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
let DATABASE_URL = '';
for (const line of envContent.split('\n')) {
  if (line.trim().startsWith('DATABASE_URL=')) {
    DATABASE_URL = line.substring(line.indexOf('=') + 1).trim();
    // remove quotes if any
    if (DATABASE_URL.startsWith('"') && DATABASE_URL.endsWith('"')) {
      DATABASE_URL = DATABASE_URL.substring(1, DATABASE_URL.length - 1);
    }
    if (DATABASE_URL.startsWith("'") && DATABASE_URL.endsWith("'")) {
      DATABASE_URL = DATABASE_URL.substring(1, DATABASE_URL.length - 1);
    }
    break;
  }
}

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not defined in environment.");
  process.exit(1);
}

async function applyMigration() {
  console.log('🚀 Applying migration 0048: Update ID card settings template check constraint...\n');

  const sqlPath = path.join(__dirname, '../supabase/migrations/0048_add_template_4_id_card_settings.sql');
  const rawSql = fs.readFileSync(sqlPath, 'utf8');

  // Wrap the entire SQL in BEGIN / COMMIT transaction block as one string execution
  const sql = `BEGIN;\n${rawSql}\nCOMMIT;`;

  console.log('📋 Migration SQL loaded. Executing as ONE transaction...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log('✅ Migration 0048 executed successfully.\n');
  } catch (err) {
    console.error('❌ SQL Execution failed:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    // Check constraint exists
    const check3Res = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conname = 'id_card_settings_selected_template_check';
    `);
    if (check3Res.rows.length > 0) {
      console.log(`✅ Check constraint exists:`, check3Res.rows[0].pg_get_constraintdef);
    } else {
      console.log(`❌ Check constraint does not exist!`);
    }

  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

applyMigration()
  .then(() => verifyMigration())
  .catch((err) => {
    console.error('❌ Migration run failed:', err.message);
    process.exit(1);
  });
