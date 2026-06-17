import { supabase } from "../lib/supabase";
import Constants from "expo-constants";
import { deriveInstitutionPrefix } from "../utils/deriveInstitutionPrefix";

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
  subjects: string[]; // array of selected subject names
  classes: string[]; // array of selected class-section strings e.g. ["Class 10-A", "Class 9-B"]
  dob: string; // ISO date string YYYY-MM-DD
  gender: string; // "Male" | "Female" | "Other"
  contactNumber: string;
  email: string;
  address: string;
  doj: string;
  experience: string;
  qualification: string;
  emergencyContact: string;
  sections: string[]; // array of selected section labels
}

export interface RegistrationResult {
  portalId: string;
  tempPassword: string;
  status: "Active";
  fullName: string;
}

function getServerUrl(): string {
  if (process.env.EXPO_PUBLIC_SERVER_URL) {
    return process.env.EXPO_PUBLIC_SERVER_URL;
  }
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(":")[0];
      return `http://${host}:3001`;
    }
  }
  return "http://localhost:3001";
}

export async function getNextStudentCode(institutionId: string): Promise<string> {
  try {
    const { count, error } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institutionId);

    if (error) throw error;

    // Fetch institution name to derive prefix
    const { data: instData } = await supabase
      .from("institutions")
      .select("name")
      .eq("id", institutionId)
      .single();

    const prefix = deriveInstitutionPrefix(instData?.name || "");
    const nextNum = (count || 0) + 1;
    return `${prefix}-STU-${String(nextNum).padStart(4, "0")}`;
  } catch (error) {
    console.error("Error in getNextStudentCode:", error);
    return "SCH-STU-0001";
  }
}

export async function registerStudent(
  institutionId: string,
  params: StudentRegistrationParams
): Promise<RegistrationResult> {
  try {
    const serverUrl = getServerUrl();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || "";

    const response = await fetch(`${serverUrl}/api/students/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        institutionId,
        params,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `Student registration failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error in registerStudent client repository:", error);
    throw error;
  }
}

export async function getSubjectsForTeacherForm(
  institutionId: string
): Promise<{ id: string; name: string }[]> {
  try {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("institution_id", institutionId)
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching subjects for teacher form:", error);
    return [];
  }
}

export async function getClassesWithSectionsForTeacherForm(
  institutionId: string
): Promise<{ class_name: string; section_name: string; label: string }[]> {
  try {
    // 1. Get current academic year
    const { data: ayData, error: ayErr } = await supabase
      .from("academic_years")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("is_current", true)
      .maybeSingle();

    if (ayErr) throw ayErr;

    // 2. Get all classes for this institution
    const { data: classesData, error: clsErr } = await supabase
      .from("classes")
      .select("id, name")
      .eq("institution_id", institutionId)
      .order("grade_number", { ascending: true });

    if (clsErr) throw clsErr;
    if (!classesData || classesData.length === 0) return [];

    // 3. Get sections for these classes
    const classIds = classesData.map((c: any) => c.id);
    let sectionsQuery = supabase
      .from("sections")
      .select("id, name, class_id")
      .in("class_id", classIds);

    if (ayData) {
      sectionsQuery = sectionsQuery.eq("academic_year_id", ayData.id);
    }

    const { data: sectionsData, error: secErr } = await sectionsQuery;
    if (secErr) throw secErr;

    // 4. Build class-section combinations
    const classMap: Record<string, string> = {};
    classesData.forEach((c: any) => { classMap[c.id] = c.name; });

    const results = (sectionsData || []).map((s: any) => ({
      class_name: classMap[s.class_id] || "",
      section_name: s.name,
      label: `${classMap[s.class_id] || ""}-${s.name}`,
    }));

    return results.sort((a, b) => a.label.localeCompare(b.label));
  } catch (error) {
    console.error("Error fetching classes with sections for teacher form:", error);
    return [];
  }
}

export async function appointTeacher(
  institutionId: string,
  params: TeacherAppointmentParams
): Promise<RegistrationResult> {
  try {
    const serverUrl = getServerUrl();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || "";

    const response = await fetch(`${serverUrl}/api/teachers/appoint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        institutionId,
        params,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `Teacher appointment failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error in appointTeacher client repository:", error);
    throw error;
  }
}

export async function getSectionsForClass(institutionId: string, gradeName: string): Promise<string[]> {
  try {
    // 1. Get class_id
    let { data: classData, error: clsErr } = await supabase
      .from("classes")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("name", gradeName)
      .maybeSingle();

    if (clsErr || !classData) {
      const gradeClass = gradeName.replace(/^(Grade|Class)\s+/i, "").trim();
      const { data: fallbackData } = await supabase
        .from("classes")
        .select("id")
        .eq("institution_id", institutionId)
        .eq("name", gradeClass)
        .maybeSingle();
      
      classData = fallbackData;
    }

    if (!classData) {
      console.warn("Class not found for fetching sections:", gradeName);
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
      return sectionsData.map((s: any) => s.name).sort();
    }

    return ["A"];
  } catch (error) {
    console.error("Error in getSectionsForClass:", error);
    return ["A"];
  }
}
