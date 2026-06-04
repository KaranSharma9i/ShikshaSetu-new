import * as dotenv from 'dotenv';
dotenv.config();

// Override anon key with service role key to bypass RLS in node testing environment
if (process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
}

import ws from 'ws';
(global as any).WebSocket = ws;

// --- MOCK REACT NATIVE IMPORTS FOR NODE ENVIRONMENT ---
import Module from 'module';
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === '@react-native-async-storage/async-storage') {
    const mockStorage = {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    };
    return {
      ...mockStorage,
      default: mockStorage
    };
  }
  if (id === 'react-native-url-polyfill/auto') {
    return {};
  }
  if (id === 'react-native') {
    return {};
  }
  return originalRequire.apply(this, arguments as any);
};
// ------------------------------------------------------

import { getStudentFees } from '../src/repositories/feeRepository';
import { getStudentReportCard } from '../src/repositories/academicRepository';
import { getInstitutionAttendance } from '../src/repositories/attendanceRepository';
import { getInstitutionDashboardMetrics } from '../src/repositories/metricRepository';
import { getTeacherDashboardStats } from '../src/repositories/teacherRepository';
import { supabase } from '../src/lib/supabase';
import { Client } from 'pg';

async function verify() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // 1. Get a student ID with active enrollment who has payments
    const studentRes = await client.query(`
      SELECT e.student_id, s.institution_id 
      FROM enrollments e 
      JOIN students s ON s.id = e.student_id 
      WHERE e.is_active = true 
      LIMIT 1
    `);
    
    if (studentRes.rows.length === 0) {
      console.warn('No active students found to verify.');
      return;
    }
    
    const studentId = studentRes.rows[0].student_id;
    const institutionId = studentRes.rows[0].institution_id;
    console.log(`Using Student ID: ${studentId}, Institution ID: ${institutionId}`);

    // 2. Verify getStudentFees
    console.log('\n--- Verify getStudentFees ---');
    const feesResult = await getStudentFees(studentId);
    console.log(`Total Due: ${feesResult.totalDue}`);
    console.log(`Total Paid: ${feesResult.totalPaid}`);
    console.log(`Total Pending: ${feesResult.totalPending}`);
    console.log(`Fees count: ${feesResult.fees.length}`);

    // 3. Verify getStudentReportCard
    console.log('\n--- Verify getStudentReportCard ---');
    const ayRes = await client.query('SELECT id FROM academic_years WHERE institution_id = $1 LIMIT 1', [institutionId]);
    if (ayRes.rows.length > 0) {
      const academicYearId = ayRes.rows[0].id;
      const reportCard = await getStudentReportCard(studentId, academicYearId);
      if (reportCard) {
        console.log(`Overall Avg: ${reportCard.overallAvg}%`);
        console.log(`Overall Grade: ${reportCard.overallGrade}`);
        console.log(`Subjects count: ${reportCard.subjects.length}`);
      }
    }

    // 4. Verify getInstitutionAttendance
    console.log('\n--- Verify getInstitutionAttendance ---');
    const attendanceBreakdown = await getInstitutionAttendance(institutionId, '2026-05-25');
    console.log(`Sections count: ${attendanceBreakdown.length}`);

    // 5. Verify getInstitutionDashboardMetrics
    console.log('\n--- Verify getInstitutionDashboardMetrics ---');
    const metrics = await getInstitutionDashboardMetrics(institutionId);
    console.log(`Total Students: ${metrics.totalStudents}`);
    console.log(`Total Teachers: ${metrics.totalTeachers}`);
    console.log(`Attendance Rate: ${metrics.attendanceRate}`);
    console.log(`Fee Collection Rate: ${metrics.feeCollectionRate}`);

    // 6. Verify getTeacherDashboardStats
    console.log('\n--- Verify getTeacherDashboardStats ---');
    const teacherRes = await client.query(`
      SELECT t.user_id 
      FROM teachers t 
      JOIN users u ON u.id = t.user_id 
      JOIN class_subjects cs ON cs.teacher_id = t.user_id
      WHERE t.institution_id = $1 
      GROUP BY t.id, t.user_id
      ORDER BY count(cs.id) DESC
      LIMIT 1
    `, [institutionId]);

    if (teacherRes.rows.length > 0) {
      const teacherUserId = teacherRes.rows[0].user_id;
      console.log(`Attempting getTeacherDashboardStats for active user_id: ${teacherUserId}`);
      
      const teacherStats = await getTeacherDashboardStats(teacherUserId);
      if (teacherStats) {
        console.log(`Teacher Name: ${teacherStats.teacher.name}`);
        console.log(`Subjects count: ${teacherStats.subjects.length}`);
        console.log(`Average Marks: ${teacherStats.avgMarks}`);
        console.log(`Average AI Score: ${teacherStats.avgAiScore}`);
        console.log(`Pending Homeworks: ${teacherStats.pendingHomeworkCount}`);
        console.log(`Top students count: ${teacherStats.topStudents.length}`);
      } else {
        console.log('Teacher stats returned null.');
      }
    } else {
      console.log('No active teachers with class_subjects found.');
    }

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await client.end();
  }
}

verify();
