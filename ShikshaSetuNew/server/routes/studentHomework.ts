import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { getPlanLimit } from "../utils/planResolver";
import { scoreHomework } from "../services/scoringService";

const router = Router();

// Correction 3 — Initialize Supabase Client Inline
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey =
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Helper: Get date string in YYYY-MM-DD format (local timezone)
function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * POST /homework/submit-evaluate
 * 
 * Request body: { student_id, assignment_id, base64_image }
 */
router.post("/homework/submit-evaluate", async (req: Request, res: Response) => {
  try {
    const { student_id, assignment_id, base64_image } = req.body;

    // Step 1 — Validate fields
    if (!student_id || !assignment_id || !base64_image) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    // Step 2 — Fetch student plan
    let student: any = null;
    try {
      const { data, error } = await supabase
        .from("students")
        .select("id, institution_id, plan_tier, tier_expires_at")
        .eq("id", student_id)
        .single();

      if (error || !data) {
        console.error("Error fetching student:", error);
        return res.status(404).json({ error: 'STUDENT_NOT_FOUND' });
      }
      student = data;
    } catch (dbErr) {
      console.error("Database error fetching student:", dbErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const planTier = student.plan_tier || 'FREE';
    if (planTier === 'FREE') {
      return res.status(403).json({ error: 'AI_NOT_AVAILABLE' });
    }

    if (student.tier_expires_at) {
      const expiry = new Date(student.tier_expires_at);
      if (expiry < new Date()) {
        return res.status(403).json({ error: 'SUBSCRIPTION_EXPIRED' });
      }
    }

    // Step 3 — Check daily quota
    const todayStr = getTodayDateString();
    let currentCount = 0;
    const planLimit = getPlanLimit(planTier);

    try {
      const { data: quotaRow, error: quotaErr } = await supabase
        .from("ai_daily_quotas")
        .select("count, plan_limit")
        .eq("student_id", student_id)
        .eq("submission_date", todayStr)
        .maybeSingle();

      if (quotaErr) {
        console.error("Error checking daily quota:", quotaErr);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      if (quotaRow) {
        currentCount = quotaRow.count || 0;
      }
    } catch (dbErr) {
      console.error("Database error checking daily quota:", dbErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (currentCount >= planLimit) {
      return res.status(429).json({ error: 'DAILY_LIMIT_REACHED', remaining_today: 0 });
    }

    // Step 4 — Fetch homework context
    let homeworkContext: any = null;
    try {
      const { data: hw, error: hwErr } = await supabase
        .from("homework")
        .select(`
          title,
          description,
          generated_content,
          subjects ( name ),
          classes ( name )
        `)
        .eq("id", assignment_id)
        .single();

      if (hwErr || !hw) {
        console.error("Error fetching homework context:", hwErr);
        return res.status(404).json({ error: 'HOMEWORK_NOT_FOUND' });
      }
      homeworkContext = hw;
    } catch (dbErr) {
      console.error("Database error fetching homework context:", dbErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const title = homeworkContext.title || "General homework";
    const topic = homeworkContext.description || title;
    const subjectName = homeworkContext.subjects?.name || "General";
    const className = homeworkContext.classes?.name || "Unknown Grade";

    // Extract questions from generated_content if available
    let questions: any[] = [];
    if (homeworkContext.generated_content) {
      try {
        const content = typeof homeworkContext.generated_content === 'string'
          ? JSON.parse(homeworkContext.generated_content)
          : homeworkContext.generated_content;
        if (content && Array.isArray(content.questions)) {
          questions = content.questions;
        }
      } catch (parseErr) {
        console.error("Failed to parse homework generated_content:", parseErr);
      }
    }

    // Step 5 — Call scoreHomework()
    let evaluation;
    try {
      evaluation = await scoreHomework({
        base64Image: base64_image,
        subject: subjectName,
        grade: className,
        title,
        topicDescription: topic,
        planTier,
        questions,
      });
    } catch (aiErr) {
      console.error("AI Scoring error:", aiErr);
      return res.status(500).json({ error: 'AI_ERROR' });
    }

    // Step 6 — Build ai_feedback JSONB
    let aiFeedback: any = {
      completeness: evaluation.completeness,
      concept_clarity: evaluation.concept_clarity,
      presentation: evaluation.presentation,
    };

    if (planTier === 'PRO') {
      aiFeedback.insights = evaluation.insights || [];
      aiFeedback.wrong_answers = evaluation.wrong_answers || [];
      aiFeedback.partial_answers = evaluation.partial_answers || [];
    }

    // Step 7 — Upsert homework_submissions
    let submissionResult: any = null;
    try {
      const { data, error } = await supabase
        .from("homework_submissions")
        .upsert(
          {
            homework_id: assignment_id,
            student_id: student_id,
            ai_score: evaluation.overall_score,
            ai_feedback: aiFeedback,
            scored_at: new Date().toISOString(),
            status: "scored",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "homework_id,student_id",
          }
        )
        .select("id, scored_at")
        .single();

      if (error || !data) {
        console.error("Error upserting homework submission:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      submissionResult = data;
    } catch (dbErr) {
      console.error("Database error upserting homework submission:", dbErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    // Step 8 — Upsert ai_daily_quotas
    const nextCount = currentCount + 1;
    try {
      const { error: quotaUpsertErr } = await supabase
        .from("ai_daily_quotas")
        .upsert(
          {
            student_id,
            institution_id: student.institution_id,
            submission_date: todayStr,
            count: nextCount,
            plan_limit: planLimit,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "student_id,submission_date",
          }
        );

      if (quotaUpsertErr) {
        console.error("Error updating daily quota:", quotaUpsertErr);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    } catch (dbErr) {
      console.error("Database error updating daily quota:", dbErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    // Step 9 — Return response
    return res.status(200).json({
      success: true,
      submission_id: submissionResult.id,
      ai_score: evaluation.overall_score,
      ai_feedback: aiFeedback,
      plan_tier: planTier,
      used_today: nextCount,
      remaining_today: Math.max(0, planLimit - nextCount),
      scored_at: submissionResult.scored_at,
    });
  } catch (err: any) {
    console.error("Uncaught Submit-Evaluate Endpoint Error:", err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /student/subscription
 * 
 * Query param: student_id
 */
router.get("/student/subscription", async (req: Request, res: Response) => {
  try {
    const { student_id } = req.query;
    if (!student_id || typeof student_id !== 'string') {
      return res.status(400).json({ error: 'student_id is required' });
    }

    let student: any = null;
    try {
      const { data, error } = await supabase
        .from("students")
        .select("plan_tier, tier_expires_at")
        .eq("id", student_id)
        .single();

      if (error || !data) {
        console.error("Error fetching student subscription:", error);
        return res.status(404).json({ error: 'STUDENT_NOT_FOUND' });
      }
      student = data;
    } catch (dbErr) {
      console.error("Database error fetching student subscription:", dbErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const planTier = student.plan_tier || 'FREE';
    const expiresAt = student.tier_expires_at;

    const isActive = planTier !== 'FREE' && (expiresAt === null || new Date(expiresAt) > new Date());
    const dailyLimit = getPlanLimit(planTier);

    const todayStr = getTodayDateString();
    let usedToday = 0;

    try {
      const { data: quotaRow, error: quotaErr } = await supabase
        .from("ai_daily_quotas")
        .select("count")
        .eq("student_id", student_id)
        .eq("submission_date", todayStr)
        .maybeSingle();

      if (quotaErr) {
        console.error("Error fetching daily quota:", quotaErr);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      if (quotaRow) {
        usedToday = quotaRow.count || 0;
      }
    } catch (dbErr) {
      console.error("Database error fetching daily quota:", dbErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const remainingToday = Math.max(0, dailyLimit - usedToday);

    return res.status(200).json({
      plan_tier: planTier,
      tier_expires_at: expiresAt,
      is_active: isActive,
      daily_limit: dailyLimit,
      used_today: usedToday,
      remaining_today: remainingToday,
    });
  } catch (err: any) {
    console.error("Uncaught Subscription Endpoint Error:", err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
