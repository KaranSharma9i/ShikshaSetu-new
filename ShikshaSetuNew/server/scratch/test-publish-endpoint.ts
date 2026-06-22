import "../config";
import { supabase } from "../config";
import { assignDisplayNumbers } from "../utils/questionAssembler";
import { pdfService } from "../services/pdf";

async function run() {
  const homework_id = "ba6f7d2d-0d99-41cb-8250-a277fa5b874d";

  // 1. Fetch current homework
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
      generated_content,
      class:classes ( name ),
      section:sections ( name ),
      subject:subjects ( name )
    `)
    .eq("id", homework_id)
    .single();

  if (fetchError || !hw) {
    console.error("Fetch error:", fetchError);
    return;
  }

  const generated_content = typeof hw.generated_content === "string"
    ? JSON.parse(hw.generated_content)
    : hw.generated_content;

  console.log("Before simulation questions count:", generated_content.questions.length);

  // 2. Renumber and sort
  if (generated_content.questions && Array.isArray(generated_content.questions)) {
    generated_content.questions = assignDisplayNumbers(generated_content.questions);
  }

  const classObj = Array.isArray(hw.class) ? hw.class[0] : hw.class;
  const sectionObj = Array.isArray(hw.section) ? hw.section[0] : hw.section;
  const subjectObj = Array.isArray(hw.subject) ? hw.subject[0] : hw.subject;

  const gradeName = (classObj as any)?.name || "";
  const sectionName = (sectionObj as any)?.name || "";
  const subjectName = (subjectObj as any)?.name || "";

  const { data: institution } = await supabase
    .from("institutions")
    .select("logo_url, name")
    .eq("id", hw.institution_id)
    .single();

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

  // 3. Generate PDF
  console.log("Generating PDF...");
  const pdfUrl = await pdfService.generateAndUpload(
    generated_content,
    homework_id,
    pdfReq as any
  );
  console.log("PDF generated:", pdfUrl);

  // 4. Update DB
  console.log("Updating DB...");
  const { error: updateError } = await supabase
    .from("homework")
    .update({
      generated_content,
      pdf_url: pdfUrl,
      generation_status: "published",
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", homework_id);

  if (updateError) {
    console.error("Update error:", updateError);
  } else {
    console.log("DB update successful!");
  }
}

run();
