const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function debugRls() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  try {
    console.log("=== Debugging RLS Policy in PostgreSQL ===");

    await client.query("BEGIN");
    
    // Set simulated JWT claim sub to the user ID
    const userId = "a98a6b33-61be-4392-bfca-cf1a3c4a875e";
    const claims = JSON.stringify({ sub: userId, role: "authenticated" });
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);
    
    // 1. Check auth.uid()
    const uidRes = await client.query("SELECT auth.uid() AS uid");
    console.log("auth.uid() returns:", uidRes.rows[0].uid);

    // 2. Check (storage.foldername(name))[1]
    const testPath = `${userId}/test-rls.png`;
    const folderRes = await client.query("SELECT (storage.foldername($1))[1] AS folder", [testPath]);
    console.log("storage.foldername first element:", folderRes.rows[0].folder);

    // 3. Check comparison
    const compRes = await client.query(`
      SELECT (auth.uid())::text = (storage.foldername($1))[1] AS is_match
    `, [testPath]);
    console.log("Do they match? :", compRes.rows[0].is_match);

    // 4. Try actual insert into storage.objects under transaction (will rollback)
    // First find bucket id
    const bucketRes = await client.query("SELECT id FROM storage.buckets WHERE name = 'avatars'");
    console.log("Bucket ID found in storage.buckets:", bucketRes.rows[0]);

    console.log("Attempting simulated INSERT under policy check...");
    const insertRes = await client.query(`
      INSERT INTO storage.objects (bucket_id, name, owner, metadata)
      VALUES ('avatars', $1, auth.uid(), '{"size": 100, "mimetype": "image/png"}')
      RETURNING id, name
    `, [testPath]);
    console.log("INSERT successful!", insertRes.rows[0]);

    await client.query("ROLLBACK");
  } catch (error) {
    console.error("❌ RLS Policy check failed with Postgres error:", error.message);
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
  } finally {
    await client.end();
  }
}

debugRls();
