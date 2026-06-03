const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const email = 'stu1@gurukulsiksha.edu.in';
    const users = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    console.log("USERS ROW:", users.rows);
    if (users.rows.length > 0) {
      const students = await client.query('SELECT * FROM students WHERE user_id = $1', [users.rows[0].id]);
      console.log("STUDENTS ROW:", students.rows);
      if (students.rows.length > 0) {
        const enrollments = await client.query('SELECT * FROM enrollments WHERE student_id = $1', [students.rows[0].id]);
        console.log("ENROLLMENTS ROW:", enrollments.rows);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
