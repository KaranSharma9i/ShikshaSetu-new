const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);
    
    // Group columns by table
    const tables = {};
    res.rows.forEach(row => {
      if (!tables[row.table_name]) {
        tables[row.table_name] = [];
      }
      tables[row.table_name].push(`${row.column_name} (${row.data_type})`);
    });
    
    let output = "DB Schema:\n";
    for (const [table, columns] of Object.entries(tables)) {
      output += `\nTable: ${table}\n`;
      columns.forEach(col => {
        output += `  - ${col}\n`;
      });
    }
    
    fs.writeFileSync('schema.txt', output);
    console.log("Schema written to schema.txt");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
