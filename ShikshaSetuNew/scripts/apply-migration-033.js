/**
 * Apply migration 0033: Fix homework_submissions for AI scoring + create ai_daily_quotas
 * Run: node scripts/apply-migration-033.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not defined in environment.");
  process.exit(1);
}

async function applyMigration() {
  console.log('🚀 Applying migration 0033: AI scoring schema fixes...\n');

  const sqlPath = path.join(__dirname, '../supabase/migrations/0033_fix_homework_submissions_ai_scoring.sql');
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
    console.log('✅ Migration 0033 executed successfully.\n');
  } catch (err) {
    console.error('❌ SQL Execution failed:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

// Verification query — run after migration to confirm changes
async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    // Check 1: ai_feedback column type on homework_submissions is jsonb
    const check1Res = await client.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'homework_submissions' AND column_name = 'ai_feedback';
    `);
    const isFeedbackJsonb = check1Res.rows.length > 0 && check1Res.rows[0].data_type === 'jsonb';
    console.log(`${isFeedbackJsonb ? '✅' : '❌'} Check 1: ai_feedback column is JSONB (got: ${check1Res.rows[0]?.data_type || 'none'})`);

    // Check 2: scored_at column exists on homework_submissions
    const check2Res = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'homework_submissions' AND column_name = 'scored_at'
      );
    `);
    const hasScoredAt = check2Res.rows[0].exists;
    console.log(`${hasScoredAt ? '✅' : '❌'} Check 2: scored_at column exists on homework_submissions`);

    // Check 3: attachment_urls column exists on homework_submissions AND file_url does not
    const check3Res = await client.query(`
      SELECT 
        EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'homework_submissions' AND column_name = 'attachment_urls') AS has_attachment_urls,
        NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'homework_submissions' AND column_name = 'file_url') AS no_file_url;
    `);
    const hasAttachmentUrls = check3Res.rows[0].has_attachment_urls;
    const noFileUrl = check3Res.rows[0].no_file_url;
    console.log(`${hasAttachmentUrls && noFileUrl ? '✅' : '❌'} Check 3: attachment_urls exists and file_url does not`);

    // Check 4: ai_daily_quotas table exists
    const check4Res = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ai_daily_quotas'
      );
    `);
    const tableExists = check4Res.rows[0].exists;
    console.log(`${tableExists ? '✅' : '❌'} Check 4: ai_daily_quotas table exists`);

    // Check 5: UNIQUE constraint on homework_submissions(homework_id, student_id)
    const check5Res = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'homework_submissions_homework_id_student_id_key'
      );
    `);
    const hasUniqueConstraint = check5Res.rows[0].exists;
    console.log(`${hasUniqueConstraint ? '✅' : '❌'} Check 5: UNIQUE constraint (homework_id, student_id) exists`);

    // Check 6: ai_score column data_type = 'numeric' in information_schema.columns
    const check6Res = await client.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'homework_submissions' AND column_name = 'ai_score';
    `);
    const isScoreNumeric = check6Res.rows.length > 0 && check6Res.rows[0].data_type === 'numeric';
    console.log(`${isScoreNumeric ? '✅' : '❌'} Check 6: ai_score column is NUMERIC (got: ${check6Res.rows[0]?.data_type || 'none'})`);

    // Check 7: constraint 'ai_score_range' exists in pg_constraint for homework_submissions
    const check7Res = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_score_range' AND conrelid = 'homework_submissions'::regclass
      );
    `);
    const hasScoreRangeConstraint = check7Res.rows[0].exists;
    console.log(`${hasScoreRangeConstraint ? '✅' : '❌'} Check 7: constraint 'ai_score_range' exists for homework_submissions`);

    const allPassed = isFeedbackJsonb && hasScoredAt && hasAttachmentUrls && noFileUrl && tableExists && hasUniqueConstraint && isScoreNumeric && hasScoreRangeConstraint;
    if (allPassed) {
      console.log('\n🎉 All verification checks passed successfully!');
    } else {
      console.log('\n⚠️ Some verification checks failed. Review the output above.');
    }
  } catch (err) {
    console.error('❌ Verification query failed:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

applyMigration()
  .then(() => verifyMigration())
  .catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  });
