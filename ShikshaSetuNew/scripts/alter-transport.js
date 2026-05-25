const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL in environment");
  process.exit(1);
}

const client = new Client({
  connectionString,
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to database.");
    
    // Check if constraint exists, and drop NOT NULL
    await client.query("ALTER TABLE student_transport_assignments ALTER COLUMN route_id DROP NOT NULL;");
    console.log("Successfully altered student_transport_assignments.route_id to be NULLABLE.");
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}

run();
