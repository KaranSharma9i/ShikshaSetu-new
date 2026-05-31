const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Client } = require('pg');

async function main() {
  const query = process.argv[2];
  if (!query) {
    console.error("Please provide a SQL query as an argument.");
    process.exit(1);
  }

  // Parse connection string or use direct connection to avoid SSL issues.
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  try {
    const res = await client.query(query);
    if (res.command === 'SELECT') {
      console.log(JSON.stringify(res.rows, null, 2));
    } else {
      console.log(`Executed: ${res.command}. Affected rows: ${res.rowCount}`);
    }
  } catch (err) {
    console.error("SQL Error:", err.message);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
