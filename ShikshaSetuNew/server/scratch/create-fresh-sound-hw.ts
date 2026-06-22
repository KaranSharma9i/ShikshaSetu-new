import "../config";
import { supabase } from "../config";
import { geminiService } from "../services/gemini";
import { GenerateHomeworkRequest } from "../types/generation";

async function run() {
  console.log("Fetching original Sound homework metadata...");
  const { data: orig, error: fetchErr } = await supabase
    .from("homework")
    .select("*")
    .eq("id", "bf9f5535-345c-4461-b91a-8d75bc8b0cbd")
    .single();

  if (fetchErr || !orig) {
    throw new Error(`Failed to fetch original Sound homework: ${fetchErr?.message}`);
  }

  const detailedTopic = `Please generate exactly these questions:
1. MCQ: A person shouts near a cliff and hears the echo after 3 seconds. Speed of sound in air is 340 m/s. What is the distance between the person and the cliff? Options must include A. 170 m, B. 340 m, C. 510 m, D. 1020 m. Correct answer is C.
2. MCQ: Which of the following statements is true regarding speed of sound? Options must include B. Speed of sound is highest in solids and lowest in gases. Correct answer is B.
3. VERY_SHORT: Why do astronauts on the moon not hear each other directly, even if they are in close proximity?
4. VERY_SHORT: Name two practical applications of ultrasound technology in daily life or industry.
5. SHORT: Explain why the curtains, carpets, and furniture in a room help in reducing reverberation.
6. SHORT: A ship sends out ultrasound that returns from the seabed in 4 seconds. If the speed of ultrasound in seawater is 1531 m/s, what is the depth of the seabed from the ship? (Expected answer is 3062 m).
7. LONG: Describe the process of echo formation. What are the essential conditions required for a distinct echo to be heard by a human? (Include 0.1s persistence of hearing and 17m distance).
8. CASE_STUDY: Rakesh was exploring a deep cave. He noticed that when he shouted, the sound seemed to linger for a long time. Sub-questions:
   8.1 MCQ: What phenomenon is Rakesh experiencing when the sound seems to linger? Options: A. Echo, B. Reverberation, C. Refraction, D. Diffraction. Correct is B.
   8.2 MCQ: Why can bats effectively use sound to navigate in the dark? Options must include C. Bats emit sounds in the ultrasonic range which reflect off objects and help them locate obstacles. Correct is C.
   8.3 MCQ: If Rakesh shouts and hears an echo after 2 seconds, and sound speed is 340 m/s, what is the distance? Options must include B. 340 m. Correct is B.
9. ASSERTION_REASON: Assertion (A): Sound cannot propagate through a vacuum. Reason (R): Sound waves are mechanical waves and require a material medium for their propagation. Correct is A.`;

  const req: GenerateHomeworkRequest = {
    grade: "Class 9",
    subject: "Physics",
    title: "Sound (Fresh Live)",
    topic_description: detailedTopic,
    difficulty: "Medium",
    question_config: {
      mcq: 2,
      very_short: 2,
      short: 2,
      long: 1,
      case_study: 1,
      assertion_reason: 1
    },
    teacher_id: orig.teacher_id,
    class_id: orig.class_id,
    section_id: orig.section_id,
    section_name: "A",
    subject_id: orig.subject_id,
    institution_id: orig.institution_id,
    academic_year_id: orig.academic_year_id,
    due_date: "2026-06-30"
  };

  console.log("Generating fresh homework via Gemini fallback chain...");
  const newHomework = await geminiService.generateHomework(req);

  console.log("Inserting new homework into the database...");
  const { data: inserted, error: insertErr } = await supabase
    .from("homework")
    .insert({
      institution_id: orig.institution_id,
      academic_year_id: orig.academic_year_id,
      class_id: orig.class_id,
      section_id: orig.section_id,
      subject_id: orig.subject_id,
      teacher_id: orig.teacher_id,
      title: "Sound (Fresh Live)",
      description: "Nature of sound and its propagation in various media, speed of sound, range of hearing in humans; ultrasound; reflection of sound; echo.",
      assign_date: new Date().toISOString().split("T")[0],
      due_date: "2026-06-30",
      total_marks: 10,
      difficulty: "Medium",
      status: "active",
      ai_generated: true,
      generated_content: newHomework,
      generation_status: "published",
      question_config: req.question_config
    })
    .select("id, title, status, generation_status")
    .single();

  if (insertErr || !inserted) {
    throw new Error(`Failed to insert fresh Sound homework: ${insertErr?.message}`);
  }

  console.log("=== FRESH SOUND HOMEWORK INSERTED ===");
  console.log("ID:", inserted.id);
  console.log("Title:", inserted.title);
  console.log("Status:", inserted.status);
  console.log("Generation Status:", inserted.generation_status);
}

run().catch((err) => {
  console.error("Failed to create fresh Sound homework:", err);
  process.exit(1);
});
