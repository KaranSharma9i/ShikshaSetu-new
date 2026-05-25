const { Client } = require('pg');
require('dotenv').config();

async function testAyQuery() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const institutionId = '11111111-1111-1111-1111-111111111111'; // typical default in these apps, let's check first what institution id exists
    const instRes = await client.query('SELECT id FROM institutions LIMIT 1');
    const instId = instRes.rows[0].id;
    console.log("Institution ID:", instId);

    const year = 2026;
    const month = 5;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-15`;

    // Exact SQL representation of the Supabase query:
    // .eq("institution_id", institutionId).lte("starts_on", dateStr).gte("ends_on", dateStr)
    const queryStr = `
      SELECT id, label, starts_on, ends_on
      FROM academic_years
      WHERE institution_id = $1
        AND starts_on <= $2
        AND ends_on >= $2
        AND deleted_at IS NULL
    `;
    const res = await client.query(queryStr, [instId, dateStr]);
    console.log("Query Results for 2026-05-15:");
    console.log(res.rows);

  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await client.end();
  }
}

testAyQuery();
