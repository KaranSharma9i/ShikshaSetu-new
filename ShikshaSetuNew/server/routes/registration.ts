import { Router, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { deriveInstitutionPrefix } from "../utils/deriveInstitutionPrefix";

const router = Router();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase URL or Service Role Key on the server.");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Helper: Format gender matching db enum gender_type
function formatGender(gender: string): "male" | "female" | "other" | "prefer_not_to_say" {
  const g = (gender || "").toLowerCase();
  if (g === "male") return "male";
  if (g === "female") return "female";
  if (g === "other") return "other";
  return "prefer_not_to_say";
}

// Helper: Parse DOB / DOJ to extract day, month, year
function parseDob(dobStr: string): { day: string; month: string; year: string } {
  const clean = (dobStr || "").trim();
  const ymdMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    return {
      year: ymdMatch[1],
      month: ymdMatch[2].padStart(2, "0"),
      day: ymdMatch[3].padStart(2, "0"),
    };
  }
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    return {
      day: dmyMatch[1].padStart(2, "0"),
      month: dmyMatch[2].padStart(2, "0"),
      year: dmyMatch[4],
    };
  }
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
  return { day: "01", month: "01", year: "2008" };
}

// Helper: Format birth/joining dates to ISO date YYYY-MM-DD
function formatBirthDate(dobStr: string): string {
  try {
    const d = new Date(dobStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch (e) {
    // ignore
  }
  return "2008-01-01";
}

// Helper: Authorization & validation function
async function validateAdminCaller(req: AuthenticatedRequest, res: Response, targetInstitutionId: string) {
  if (!req.user || !req.user.id) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const { data: userData, error: userErr } = await supabaseAdmin
    .from("users")
    .select("role, institution_id")
    .eq("id", req.user.id)
    .single();

  if (userErr || !userData) {
    res.status(403).json({ error: "Access denied: Caller profile not found." });
    return null;
  }

  if (userData.role !== "institution_admin") {
    res.status(403).json({ error: "Access denied: Required role is institution_admin." });
    return null;
  }

  if (userData.institution_id !== targetInstitutionId) {
    res.status(403).json({ error: "Access denied: institution_id mismatch." });
    return null;
  }

  return userData;
}

// Helper: Find next available teacher number by scanning current employee_codes
async function getNextTeacherNum(institutionId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("teachers")
    .select("employee_code")
    .eq("institution_id", institutionId);

  if (error || !data || data.length === 0) return 1;

  let max = 0;
  for (const row of data) {
    const match = (row.employee_code || "").match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (!isNaN(num) && num > max) {
        max = num;
      }
    }
  }
  return max + 1;
}

/**
 * POST /api/students/register
 */
router.post("/students/register", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { institutionId, params } = req.body;

  if (!institutionId || !params) {
    return res.status(400).json({ error: "Missing required fields: institutionId and params" });
  }

  // 1. Verify caller authorization
  const caller = await validateAdminCaller(req, res, institutionId);
  if (!caller) return; // validateAdminCaller already sent response

  let attempts = 0;
  const maxAttempts = 5;
  let authUserId: string | null = null;
  let currentStudentCode = params.studentCode;

  // 2. Generate temp password based on DOB
  const parsedDob = parseDob(params.dob);
  const formattedDob = `${parsedDob.year}-${parsedDob.month}-${parsedDob.day}`;
  const password = `${parsedDob.day}${parsedDob.month}${parsedDob.year}`;

  while (attempts < maxAttempts) {
    try {
      // 3. Create the Supabase Auth User ONLY if not already created in a previous attempt
      if (!authUserId) {
        const { data: signUpData, error: signUpErr } = await supabaseAdmin.auth.admin.createUser({
          email: params.studentEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            is_admin_registered: true,
          },
        });

        if (signUpErr || !signUpData.user) {
          const msg = signUpErr?.message || "Auth user creation failed";
          return res.status(400).json({ error: msg });
        }

        authUserId = signUpData.user.id;
      }

      // 4. Call the SQL RPC function to perform all inserts atomically
      const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc("register_student_transaction", {
        p_auth_user_id: authUserId,
        p_institution_id: institutionId,
        p_student_code: currentStudentCode,
        p_name: params.name,
        p_email: params.studentEmail,
        p_guardian_name: params.guardianName,
        p_guardian_phone: params.guardianPhone,
        p_guardian_email: params.guardianEmail,
        p_gender: params.gender,
        p_date_of_birth: formattedDob,
        p_address: params.address,
        p_grade: params.grade,
        p_section: params.section,
        p_transport: params.transport,
      });

      if (rpcErr) {
        console.error(`Student SQL transaction error. Code: ${rpcErr.code}, Message: ${rpcErr.message}`);
        throw rpcErr;
      }

      // 5. Respond with exact success shape expected by client
      return res.status(200).json({
        portalId: rpcData.portalId || currentStudentCode,
        tempPassword: password,
        status: rpcData.status || "Active",
        fullName: rpcData.fullName || params.name,
      });
    } catch (err: any) {
      // If it's a unique constraint violation (Code: 23505) and we have retries left, retry with same authUserId
      if (err.code === "23505" && attempts < maxAttempts - 1) {
        const matched = currentStudentCode.match(/^(.*?)(\d+)$/);
        let nextStudentCode = currentStudentCode;
        if (matched) {
          const prefix = matched[1];
          const numStr = matched[2];
          const nextNum = parseInt(numStr, 10) + 1;
          nextStudentCode = `${prefix}${String(nextNum).padStart(numStr.length, "0")}`;
        } else {
          nextStudentCode = currentStudentCode + "-1";
        }
        console.warn(`Student unique constraint collision (Code: 23505) for code ${currentStudentCode}. Retrying with code ${nextStudentCode} reusing auth user ${authUserId}. Attempt ${attempts + 1}/${maxAttempts}...`);
        currentStudentCode = nextStudentCode;
        attempts++;
        continue;
      }

      // 6. Rollback: Clean up Auth user on final failure
      if (authUserId) {
        console.warn(`Rolling back created auth user ${authUserId} due to final database write failure.`);
        await supabaseAdmin.auth.admin.deleteUser(authUserId).catch((deleteErr) => {
          console.error(`Failed to clean up Auth user ${authUserId}:`, deleteErr.message || deleteErr);
        });
      }

      const errorMsg = err.message || "Student registration failed";
      const errorCode = err.code || "UNKNOWN_DB_ERROR";
      return res.status(400).json({ error: `${errorMsg} (Code: ${errorCode})` });
    }
  }

  return res.status(400).json({ error: "Student registration failed: unique code resolution limit reached." });
});

/**
 * POST /api/teachers/appoint
 */
router.post("/teachers/appoint", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { institutionId, params } = req.body;

  if (!institutionId || !params) {
    return res.status(400).json({ error: "Missing required fields: institutionId and params" });
  }

  // 1. Verify caller authorization
  const caller = await validateAdminCaller(req, res, institutionId);
  if (!caller) return; // validateAdminCaller already sent response

  // 2. Fetch institution name to derive prefix
  const { data: instData, error: instErr } = await supabaseAdmin
    .from("institutions")
    .select("name")
    .eq("id", institutionId)
    .single();

  if (instErr || !instData) {
    return res.status(400).json({ error: "Institution details not found." });
  }

  const prefix = deriveInstitutionPrefix(instData.name || "");
  const parsedDoj = parseDob(params.doj);
  const tempPassword = `${parsedDoj.day}${parsedDoj.month}${parsedDoj.year}`;
  const formattedDoj = params.doj ? formatBirthDate(params.doj) : new Date().toISOString().slice(0, 10);
  const formattedDob = params.dob ? formatBirthDate(params.dob) : null;

  let attempts = 0;
  const maxAttempts = 5;
  let authUserId: string | null = null;

  while (attempts < maxAttempts) {
    try {
      // 3. Resolve next sequence teacher employee code and login_id
      const nextNum = await getNextTeacherNum(institutionId);
      const employeeCode = `TCH${String(nextNum).padStart(3, "0")}`;
      const loginId = `${prefix}-TCH-${String(nextNum).padStart(3, "0")}`;

      // 4. Create the Supabase Auth User
      const { data: signUpData, error: signUpErr } = await supabaseAdmin.auth.admin.createUser({
        email: params.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          is_admin_registered: true,
        },
      });

      if (signUpErr || !signUpData.user) {
        const msg = signUpErr?.message || "Auth user creation failed";
        return res.status(400).json({ error: msg });
      }

      authUserId = signUpData.user.id;

      // 5. Insert user profile into public.users
      const { data: userData, error: userErr } = await supabaseAdmin
        .from("users")
        .insert({
          id: authUserId,
          institution_id: institutionId,
          role: "teacher",
          login_id: loginId,
          full_name: params.name,
          email: params.email,
          phone: params.contactNumber,
          status: "active"
        })
        .select("id")
        .single();

      if (userErr) {
        // Handle duplicate email directly
        const msg = (userErr.message || "").toLowerCase();
        if (msg.includes("unique") || msg.includes("already exists") || msg.includes("duplicate") || msg.includes("users_email_key")) {
          return res.status(400).json({ error: `The email address "${params.email}" is already registered. Please use a different email.` });
        }
        throw userErr;
      }

      // 6. Insert teacher profile into public.teachers
      const { error: tchErr } = await supabaseAdmin
        .from("teachers")
        .insert({
          user_id: userData.id,
          institution_id: institutionId,
          employee_code: employeeCode,
          specialization: params.subjects.join(", "),
          qualification: params.qualification,
          gender: formatGender(params.gender),
          date_of_birth: formattedDob,
          date_of_joining: formattedDoj,
          address: params.address,
          emergency_contact: params.emergencyContact
        });

      if (tchErr) throw tchErr;

      // Success! Respond and break out of loop
      return res.status(200).json({
        portalId: loginId,
        tempPassword,
        status: "Active",
        fullName: params.name
      });

    } catch (err: any) {
      // 7. Clean up Auth user on fail
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId).catch((deleteErr) => {
          console.error(`Failed to clean up Auth user ${authUserId}:`, deleteErr.message || deleteErr);
        });
        authUserId = null; // Reset for next iteration
      }

      // If it's a unique constraint violation (Code: 23505), increment attempts and retry
      if (err.code === "23505") {
        console.warn(`Teacher unique constraint collision (Code: 23505). Retrying attempt ${attempts + 1}/${maxAttempts}...`);
        attempts++;
        continue;
      }

      // Otherwise, return error immediately
      console.error(`Teacher appointment error. Code: ${err.code || "UNKNOWN"}, Message: ${err.message}`);
      return res.status(400).json({ error: err.message || "Teacher appointment failed" });
    }
  }

  return res.status(400).json({ error: "Teacher appointment failed: unique code resolution limit reached." });
});

export default router;
