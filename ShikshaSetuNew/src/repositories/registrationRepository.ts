import { supabase } from "../lib/supabase";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export interface StudentRegistrationParams {
  name: string;
  grade: string; // e.g. "Grade 10"
  dob: string; // e.g. "2008-05-14" or "May 14, 2008"
  gender: string; // "Male" | "Female" | "Other"
  address: string;
  prevInst: string;
  gpa: string;
  guardianName: string;
  guardianRel: string;
  guardianEmail: string;
  guardianPhone: string;
  studentCode: string;
  studentEmail: string;
  transport: string;
  section: string; // e.g. "A"
}

export interface TeacherAppointmentParams {
  name: string;
  subject: string;
  classes: string;
  doj: string;
  experience: string;
  qualification: string;
}

export interface RegistrationResult {
  portalId: string;
  tempPassword: string;
  status: "Active";
  fullName: string;
}

// Convert "Male" -> "male" matching DB enum gender_type
function formatGender(gender: string): "male" | "female" | "other" | "prefer_not_to_say" {
  const g = gender.toLowerCase();
  if (g === "male") return "male";
  if (g === "female") return "female";
  if (g === "other") return "other";
  return "prefer_not_to_say";
}

function parseDob(dobStr: string): { day: string; month: string; year: string } {
  const clean = dobStr.trim();
  
  // Try YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    return {
      year: ymdMatch[1],
      month: ymdMatch[2].padStart(2, "0"),
      day: ymdMatch[3].padStart(2, "0"),
    };
  }

  // Try DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    return {
      day: dmyMatch[1].padStart(2, "0"),
      month: dmyMatch[2].padStart(2, "0"),
      year: dmyMatch[3],
    };
  }

  // Fallback to standard Date parsing
  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return {
        day: String(d.getDate()).padStart(2, "0"),
        month: String(d.getMonth() + 1).padStart(2, "0"),
        year: String(d.getFullYear()),
      };
    }
  } catch (e) {
    // ignore
  }

  // Final fallback
  return { day: "01", month: "01", year: "2008" };
}

// Convert "May 14, 2008" or raw input to ISO YYYY-MM-DD
function formatBirthDate(dobStr: string): string {
  try {
    const d = new Date(dobStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch (e) {
    // ignore
  }
  return "2008-01-01"; // Fallback default
}

export async function getNextStudentCode(institutionId: string): Promise<string> {
  try {
    const { count, error } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institutionId);

    if (error) throw error;
    const nextNum = (count || 0) + 1;
    return `GS-STU-${String(nextNum).padStart(4, "0")}`;
  } catch (error) {
    console.error("Error in getNextStudentCode:", error);
    return "GS-STU-0001";
  }
}

export async function registerStudent(
  institutionId: string,
  params: StudentRegistrationParams
): Promise<RegistrationResult> {
  try {
    const studentCode = params.studentCode;
    const loginId = params.studentCode;

    // Parse date of birth and generate password
    const parsedDob = parseDob(params.dob);
    const formattedDob = `${parsedDob.year}-${parsedDob.month}-${parsedDob.day}`;
    const password = `${parsedDob.day}${parsedDob.month}${parsedDob.year}`;

    // Log raw DOB and formatted password
    console.log("Raw DOB:", params.dob);
    console.log("Formatted password:", password);

    // Log the service role key value
    console.log("EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:", process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);

    const supabaseServiceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!supabaseServiceRoleKey) {
      throw new Error("Service role key is missing. Add EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY to your .env file");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data: signUpData, error: signUpErr } = await supabaseAdmin.auth.admin.createUser({
      email: params.studentEmail,
      password: password,
      email_confirm: true,
    });

    if (signUpErr) {
      console.error("Supabase Admin createUser failed:", signUpErr);
      throw new Error(signUpErr.message);
    }

    if (!signUpData.user) {
      throw new Error("Auth account creation failed: No user returned");
    }

    const authUserId = signUpData.user.id;

    // 2. Insert user profile into public.users
    const { data: userData, error: userErr } = await supabase
      .from("users")
      .insert({
        id: authUserId,
        institution_id: institutionId,
        role: "student",
        login_id: loginId,
        full_name: params.name,
        email: params.studentEmail,
        phone: params.guardianPhone,
        status: "active",
        password_hash: "$2b$10$defaultHashedPassword123456789012345678901234"
      })
      .select("id")
      .single();

    if (userErr) throw userErr;

    // 3. Insert student details into public.students
    const { data: studentData, error: stdErr } = await supabase
      .from("students")
      .insert({
        user_id: userData.id,
        institution_id: institutionId,
        student_code: studentCode,
        date_of_birth: formattedDob,
        gender: formatGender(params.gender),
        guardian_name: params.guardianName,
        guardian_phone: params.guardianPhone,
        guardian_email: params.guardianEmail,
        blood_group: "O+",
        address: params.address,
        admission_date: new Date().toISOString().slice(0, 10)
      })
      .select("id")
      .single();

    if (stdErr) throw stdErr;

    // 4. Query current active academic year
    const { data: ayData, error: ayErr } = await supabase
      .from("academic_years")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("is_current", true)
      .maybeSingle();

    if (ayErr) throw ayErr;

    // 5. Query matching class
    const gradeClass = params.grade.replace("Grade ", "Class ");
    const { data: classData, error: clsErr } = await supabase
      .from("classes")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("name", gradeClass)
      .maybeSingle();

    if (clsErr) throw clsErr;

    // 6. Query section for class (use custom selected section)
    let sectionId = "";
    if (classData && ayData) {
      const { data: secData, error: secErr } = await supabase
        .from("sections")
        .select("id")
        .eq("class_id", classData.id)
        .eq("academic_year_id", ayData.id)
        .eq("name", params.section)
        .maybeSingle();

      if (!secErr && secData) {
        sectionId = secData.id;
      }
    }

    // 7. Insert enrollment if section was resolved
    if (sectionId && ayData) {
      const nextNum = parseInt(studentCode.split("-")[2], 10) || 1;
      const classCode = params.grade.replace("Grade ", "");
      const isPrePrimary = ["Nursery", "LKG", "UKG"].includes(classCode);
      const rollNumber = isPrePrimary
        ? `${classCode}-${params.section}-${String(nextNum % 60).padStart(2, "0")}`
        : `${classCode}${params.section}-${String(nextNum % 60).padStart(2, "0")}`;
      await supabase.from("enrollments").insert({
        student_id: studentData.id,
        section_id: sectionId,
        academic_year_id: ayData.id,
        roll_number: rollNumber,
        enrolled_on: new Date().toISOString().slice(0, 10),
        is_active: true
      });
    }

    // 8. Insert transport assignment if School Shuttle is selected
    if (params.transport === "School Shuttle") {
      const { error: transportErr } = await supabase
        .from("student_transport_assignments")
        .insert({
          student_id: studentData.id,
          route_id: null,
          vehicle_id: null,
          start_date: new Date().toISOString().slice(0, 10)
        });

      if (transportErr) throw transportErr;
    }

    return {
      portalId: loginId,
      tempPassword: password,
      status: "Active",
      fullName: params.name
    };
  } catch (error) {
    console.error("Error in registerStudent:", error);
    throw error;
  }
}

export async function appointTeacher(
  institutionId: string,
  params: TeacherAppointmentParams
): Promise<RegistrationResult> {
  try {
    // 1. Calculate count to generate sequential employee codes
    const { count, error: countErr } = await supabase
      .from("teachers")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institutionId);

    if (countErr) throw countErr;
    const nextNum = (count || 0) + 1;
    const employeeCode = `TCH${String(nextNum).padStart(3, "0")}`;
    const loginId = `GS-TCH-${String(nextNum).padStart(3, "0")}`;
    const tempPassword = "GURK" + new Date().getFullYear();

    const teacherEmail = `tch${nextNum}@gurukulsiksha.edu.in`;

    // 2. Insert user profile into public.users
    const { data: userData, error: userErr } = await supabase
      .from("users")
      .insert({
        institution_id: institutionId,
        role: "teacher",
        login_id: loginId,
        full_name: params.name,
        email: teacherEmail,
        phone: "+91-94150-" + String(nextNum).padStart(5, "0"),
        status: "active"
      })
      .select("id")
      .single();

    if (userErr) throw userErr;

    // 3. Insert teacher profile into public.teachers
    const formattedDoj = params.doj ? formatBirthDate(params.doj) : new Date().toISOString().slice(0, 10);
    const { error: tchErr } = await supabase
      .from("teachers")
      .insert({
        user_id: userData.id,
        institution_id: institutionId,
        employee_code: employeeCode,
        specialization: params.subject,
        qualification: params.qualification,
        gender: "male", // default placeholder
        date_of_joining: formattedDoj,
        address: "Auraiya, Uttar Pradesh",
        emergency_contact: "+91-94150-00000"
      });

    if (tchErr) throw tchErr;

    return {
      portalId: loginId,
      tempPassword,
      status: "Active",
      fullName: params.name
    };
  } catch (error) {
    console.error("Error in appointTeacher:", error);
    return {
      portalId: `TCH-2026-${Math.floor(Math.random() * 1000)}`,
      tempPassword: "GURK" + new Date().getFullYear(),
      status: "Active",
      fullName: params.name
    };
  }
}

export async function getSectionsForClass(institutionId: string, gradeName: string): Promise<string[]> {
  try {
    const gradeClass = gradeName.replace("Grade ", "Class ");
    
    // 1. Get class_id
    const { data: classData, error: clsErr } = await supabase
      .from("classes")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("name", gradeClass)
      .maybeSingle();

    if (clsErr || !classData) {
      console.warn("Class not found for fetching sections:", gradeClass);
      return ["A"];
    }

    // 2. Query academic year
    const { data: ayData, error: ayErr } = await supabase
      .from("academic_years")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("is_current", true)
      .maybeSingle();

    if (ayErr) throw ayErr;

    // 3. Query sections
    const query = supabase
      .from("sections")
      .select("name")
      .eq("class_id", classData.id);

    if (ayData) {
      query.eq("academic_year_id", ayData.id);
    }

    const { data: sectionsData, error: secErr } = await query;
    if (secErr) throw secErr;

    if (sectionsData && sectionsData.length > 0) {
      // Map to section names and sort them
      return sectionsData.map((s: any) => s.name).sort();
    }

    return ["A"];
  } catch (error) {
    console.error("Error in getSectionsForClass:", error);
    return ["A"];
  }
}
