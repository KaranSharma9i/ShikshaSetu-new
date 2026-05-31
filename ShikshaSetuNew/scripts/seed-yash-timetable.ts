import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ 
  path: path.resolve(__dirname, '../.env') 
});

const sectionId = '4ca1a74f-b821-456d-bb86-6c6c94bcb853';
const academicYearId = '24653c8d-4fba-4a08-aa6b-b11ab3450a55';

const subjectIds = [
  '2973d95d-74f0-4164-9bc9-0738fbaa14fb', // Mathematics
  '159c11dd-03a0-4058-a9aa-32c9446e71d3', // Science
  'b870fd38-a0e2-406b-abb9-7f7abae26b84', // English
  '77ebcea9-0193-409e-a2ad-daecffac5cf8', // Hindi
  '4f5b4ba5-f3ff-4a90-ae59-a80e5b764661', // Social Science
  'b04ec1e3-03ac-401c-a5fe-2eef51bde383', // Sanskrit
  'aec5f065-ed93-477f-a026-06fc3b880437', // Computer Science
  '45dc25cf-067d-4a89-a07a-08769786142f'  // Physical Education
];

const periods = [
  { period_number: 1, starts_at: '08:00:00', ends_at: '08:45:00' },
  { period_number: 2, starts_at: '08:45:00', ends_at: '09:30:00' },
  { period_number: 3, starts_at: '09:30:00', ends_at: '10:15:00' },
  { period_number: 4, starts_at: '10:30:00', ends_at: '11:15:00' },
  { period_number: 5, starts_at: '11:15:00', ends_at: '12:00:00' },
  { period_number: 6, starts_at: '12:00:00', ends_at: '12:45:00' },
  { period_number: 7, starts_at: '13:30:00', ends_at: '14:15:00' },
  { period_number: 8, starts_at: '14:15:00', ends_at: '15:00:00' }
];

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

async function seedTimetable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  try {
    console.log('Cleaning up existing timetable entries for Yash\'s section...');
    await client.query(
      'DELETE FROM timetable WHERE section_id = $1 AND academic_year_id = $2',
      [sectionId, academicYearId]
    );

    console.log('Seeding timetable...');
    for (let d = 0; d < days.length; d++) {
      const day = days[d];
      for (let p = 0; p < periods.length; p++) {
        const period = periods[p];
        const subjectIdx = (d + p) % subjectIds.length;
        const classSubjectId = subjectIds[subjectIdx];

        await client.query(
          `INSERT INTO timetable (
            section_id, 
            class_subject_id, 
            academic_year_id, 
            day, 
            period_number, 
            starts_at, 
            ends_at, 
            room
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            sectionId,
            classSubjectId,
            academicYearId,
            day,
            period.period_number,
            period.starts_at,
            period.ends_at,
            null // Room
          ]
        );
      }
    }
    console.log('✅ Timetable seeding complete!');
  } catch (error) {
    console.error('Error seeding timetable:', error);
  } finally {
    await client.end();
  }
}

seedTimetable();
