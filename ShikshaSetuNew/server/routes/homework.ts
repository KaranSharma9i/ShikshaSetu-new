import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { geminiService } from "../services/gemini";
import { pdfService } from "../services/pdf";
import { GenerateHomeworkRequest } from "../types/generation";

const router = Router();

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

router.post("/homework/generate", async (req: Request, res: Response) => {
  try {
    const requiredFields = [
      "grade",
      "subject",
      "title",
      "topic_description",
      "question_config",
      "teacher_id",
      "class_id",
      "section_id",
      "section_name",
      "subject_id",
      "institution_id",
      "academic_year_id",
      "due_date",
      "difficulty",
    ];

    // 1. Validate request body
    for (const field of requiredFields) {
      if (
        req.body[field] === undefined ||
        req.body[field] === null ||
        req.body[field] === ""
      ) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    const { question_config } = req.body as GenerateHomeworkRequest;

    // 2. Validate total questions > 0
    const mcq = question_config.mcq || 0;
    const very_short = question_config.very_short || 0;
    const short = question_config.short || 0;
    const long = question_config.long || 0;
    const case_study = question_config.case_study || 0;
    const assertion_reason = question_config.assertion_reason || 0;

    const totalQuestions =
      mcq + very_short + short + long + case_study + assertion_reason;

    if (totalQuestions === 0) {
      return res
        .status(400)
        .json({ error: "At least one question type must have count > 0" });
    }

    // 3. Call Gemini service
    let generatedContent;
    try {
      generatedContent = await geminiService.generateHomework(req.body);
    } catch (geminiError: any) {
      console.error("Gemini Generation Error:", geminiError);

      // Save a record of the failed attempt in the database
      try {
        await supabase.from("homework").insert({
          institution_id: req.body.institution_id,
          academic_year_id: req.body.academic_year_id,
          class_id: req.body.class_id,
          section_id: req.body.section_id,
          subject_id: req.body.subject_id,
          teacher_id: req.body.teacher_id,
          title: req.body.title,
          description: req.body.topic_description,
          due_date: req.body.due_date,
          assign_date: new Date().toISOString().split("T")[0],
          ai_generated: true,
          generated_content: null,
          generation_status: "failed",
          question_config: req.body.question_config,
          status: "draft",
          total_marks: null,
          difficulty: req.body.difficulty,
        });
      } catch (dbError) {
        console.error("Failed to insert failed homework row:", dbError);
      }

      return res
        .status(500)
        .json({ error: `AI generation failed: ${geminiError.message}` });
    }

    // 4. Insert new row with status 'generated'
    const { data: newHomeworkRow, error: insertError } = await supabase
      .from("homework")
      .insert({
        institution_id: req.body.institution_id,
        academic_year_id: req.body.academic_year_id,
        class_id: req.body.class_id,
        section_id: req.body.section_id,
        subject_id: req.body.subject_id,
        teacher_id: req.body.teacher_id,
        title: req.body.title,
        description: req.body.topic_description,
        due_date: req.body.due_date,
        assign_date: new Date().toISOString().split("T")[0],
        ai_generated: true,
        generated_content: generatedContent,
        generation_status: "generated",
        question_config: req.body.question_config,
        status: "draft",
        total_marks: null,
        difficulty: req.body.difficulty,
      })
      .select("id")
      .single();

    if (insertError || !newHomeworkRow) {
      console.error("Failed to insert homework row:", insertError);
      return res
        .status(500)
        .json({ error: `Failed to insert homework record: ${insertError?.message}` });
    }

    // 5. Generate and Upload PDF
    let pdfUrl: string | null = null;
    try {
      pdfUrl = await pdfService.generateAndUpload(
        generatedContent,
        newHomeworkRow.id,
        req.body
      );

      // 6. Update the homework row with PDF URL
      const { error: updateError } = await supabase
        .from("homework")
        .update({
          pdf_url: pdfUrl,
        })
        .eq("id", newHomeworkRow.id);

      if (updateError) {
        console.error("Failed to update homework row with PDF URL:", updateError);
      }
    } catch (pdfError: any) {
      console.error("PDF Generation/Upload Error:", pdfError);
      // Don't block the teacher from seeing questions: keep pdfUrl as null, return 200
    }

    // 7. Return response
    return res.status(200).json({
      homework_id: newHomeworkRow.id,
      generated_content: generatedContent,
      pdf_url: pdfUrl,
      generation_status: "generated",
    });
  } catch (error: any) {
    console.error("Uncaught Generate Homework Endpoint Error:", error);
    return res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
});

export default router;
