import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { geminiService } from "../services/gemini";
import { pdfService } from "../services/pdf";
import { GenerateHomeworkRequest } from "../types/generation";
import { assignDisplayNumbers } from "../utils/questionAssembler";

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
      generatedContent.questions = assignDisplayNumbers(generatedContent.questions);
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
      const { data: institution } = await supabase
        .from("institutions")
        .select("logo_url, name")
        .eq("id", req.body.institution_id)
        .single();

      pdfUrl = await pdfService.generateAndUpload(
        generatedContent,
        newHomeworkRow.id,
        {
          ...req.body,
          logoUrl: institution?.logo_url || null,
          institutionName: institution?.name || null,
        }
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
      
      // Update generation_status to failed in the database
      try {
        await supabase
          .from("homework")
          .update({ generation_status: "failed" })
          .eq("id", newHomeworkRow.id);
      } catch (dbError) {
        console.error("Failed to update homework generation_status to failed:", dbError);
      }

      return res.status(500).json({
        error: `PDF generation/upload failed: ${pdfError.message}`
      });
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

router.post("/homework/publish", async (req: Request, res: Response) => {
  try {
    const { homework_id, generated_content } = req.body;

    if (!homework_id) {
      return res.status(400).json({ error: "Missing required field: homework_id" });
    }

    if (!generated_content) {
      return res.status(400).json({ error: "Missing required field: generated_content" });
    }

    let missingAnswerKeyCount = 0;
    const missingKeysWarningList: string[] = [];

    // Renumber questions before publishing (in case teacher reordered/deleted questions in client)
    if (generated_content.questions && Array.isArray(generated_content.questions)) {
      generated_content.questions = assignDisplayNumbers(generated_content.questions);

      generated_content.questions.forEach((q: any, idx: number) => {
        if (!q.question_id) {
          q.question_id = `q_${idx + 1}`;
        }

        if (q.type === 'CASE_STUDY') {
          if (q.sub_questions && Array.isArray(q.sub_questions)) {
            q.sub_questions.forEach((sub: any, subIdx: number) => {
              if (!sub.question_id) {
                sub.question_id = `q_${idx + 1}_${subIdx + 1}`;
              }
              if (!sub.answer_key) {
                missingAnswerKeyCount++;
                const warningMsg = `Sub-question ${sub.question_number} (Type: ${sub.type}) of Case Study ${q.question_number} is missing an answer_key.`;
                console.warn(`[WARNING] ${warningMsg}`);
                missingKeysWarningList.push(warningMsg);
              }
            });
          }
        } else {
          if (!q.answer_key) {
            missingAnswerKeyCount++;
            const warningMsg = `Question ${q.question_number} (Type: ${q.type}) is missing an answer_key.`;
            console.warn(`[WARNING] ${warningMsg}`);
            missingKeysWarningList.push(warningMsg);
          }
        }
      });
    }

    // 1. Fetch existing homework details
    const { data: hw, error: fetchError } = await supabase
      .from("homework")
      .select(`
        institution_id,
        academic_year_id,
        class_id,
        section_id,
        subject_id,
        teacher_id,
        title,
        description,
        due_date,
        difficulty,
        question_config,
        class:classes ( name ),
        section:sections ( name ),
        subject:subjects ( name )
      `)
      .eq("id", homework_id)
      .single();

    if (fetchError || !hw) {
      console.error("Failed to fetch homework for publishing:", fetchError);
      return res.status(404).json({ error: "Homework record not found." });
    }

    const classObj = Array.isArray(hw.class) ? hw.class[0] : hw.class;
    const sectionObj = Array.isArray(hw.section) ? hw.section[0] : hw.section;
    const subjectObj = Array.isArray(hw.subject) ? hw.subject[0] : hw.subject;

    const gradeName = (classObj as any)?.name || "";
    const sectionName = (sectionObj as any)?.name || "";
    const subjectName = (subjectObj as any)?.name || "";

    // 2. Fetch institution details for dynamic header/logo
    const { data: institution } = await supabase
      .from("institutions")
      .select("logo_url, name")
      .eq("id", hw.institution_id)
      .single();

    // 3. Build PDF generation request payload
    const pdfReq = {
      grade: gradeName,
      subject: subjectName,
      title: hw.title,
      topic_description: hw.description || "",
      question_config: hw.question_config,
      teacher_id: hw.teacher_id,
      class_id: hw.class_id,
      section_id: hw.section_id,
      section_name: sectionName,
      subject_id: hw.subject_id,
      institution_id: hw.institution_id,
      academic_year_id: hw.academic_year_id,
      due_date: hw.due_date,
      difficulty: hw.difficulty,
      logoUrl: institution?.logo_url || null,
      institutionName: institution?.name || null,
    };

    // 4. Generate and Upload PDF
    let pdfUrl: string | null = null;
    try {
      pdfUrl = await pdfService.generateAndUpload(
        generated_content,
        homework_id,
        pdfReq as any
      );
    } catch (pdfError: any) {
      console.error("PDF Regeneration/Upload Error on Publish:", pdfError);

      // Update database status to 'failed'
      try {
        await supabase
          .from("homework")
          .update({ generation_status: "failed" })
          .eq("id", homework_id);
      } catch (dbError) {
        console.error("Failed to update homework generation_status to failed on publish:", dbError);
      }

      return res.status(500).json({
        error: `PDF generation/upload failed on publish: ${pdfError.message}`
      });
    }

    // 5. Update the homework row in database (only runs if PDF succeeded)
    const updatePayload: any = {
      generated_content: generated_content,
      generation_status: "published",
      status: "active",
      pdf_url: pdfUrl,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("homework")
      .update(updatePayload)
      .eq("id", homework_id);

    if (updateError) {
      console.error("Publish homework error:", updateError);
      return res.status(500).json({ error: `Failed to publish: ${updateError.message}` });
    }

    return res.status(200).json({
      success: true,
      warning_missing_keys: missingAnswerKeyCount > 0,
      missing_keys_warnings: missingKeysWarningList
    });
  } catch (error: any) {
    console.error("Uncaught Publish Homework Error:", error);
    return res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
});

export default router;
