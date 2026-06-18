const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Manually parse .env to get DATABASE_URL
const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
let DATABASE_URL = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    DATABASE_URL = line.substring('DATABASE_URL='.length).trim();
    break;
  }
}

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not defined in environment.");
  process.exit(1);
}

async function applyMigration() {
  console.log('🚀 Applying migration 0040: Create ID card settings table...\n');

  const sqlPath = path.join(__dirname, '../supabase/migrations/0040_create_id_card_settings.sql');
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
    console.log('✅ Migration 0040 executed successfully.\n');
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
    // Check 1: id_card_settings table exists
    const check1Res = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'id_card_settings'
      );
    `);
    const tableExists = check1Res.rows[0].exists;
    console.log(`${tableExists ? '✅' : '❌'} Check 1: id_card_settings table exists`);

    // Check 2: Columns list
    const check2Res = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'id_card_settings'
      ORDER BY ordinal_position;
    `);
    console.log('Columns:');
    check2Res.rows.forEach(r => {
      console.log(`  - ${r.column_name}: ${r.data_type} (Nullable: ${r.is_nullable}, Default: ${r.column_default})`);
    });

    // Check 3: Check constraint exists
    const check3Res = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'id_card_settings_selected_template_check'
      );
    `);
    const hasConstraint = check3Res.rows[0].exists;
    console.log(`${hasConstraint ? '✅' : '❌'} Check 3: check constraint for selected_template exists`);

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
