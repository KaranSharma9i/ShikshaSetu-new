const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Please provide a SQL file path as an argument.");
    process.exit(1);
  }

  const filePath = path.resolve(fileArg);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Reading SQL from: ${filePath}`);
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log('Connecting to database...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  try {
    console.log('Executing SQL...');
    const res = await client.query(sql);
    console.log('SQL executed successfully!');
    if (Array.isArray(res)) {
      res.forEach((r, idx) => {
        console.log(`Statement ${idx + 1}: Command=${r.command}, Affected rows=${r.rowCount}`);
      });
    } else {
      console.log(`Command=${res.command}, Affected rows=${res.rowCount}`);
    }
  } catch (err) {
    console.error("SQL Error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
