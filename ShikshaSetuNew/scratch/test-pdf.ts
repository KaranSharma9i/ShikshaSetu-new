import { pdfService } from "../server/services/pdf";
import { GeneratedContent, GenerateHomeworkRequest } from "../server/types/generation";
import fs from "fs";
import path from "path";

const mockContent: GeneratedContent = {
  questions: [
    {
      question_number: 1,
      type: "MCQ",
      question: "विद्युत धारा (Electric Current) का SI मात्रक क्या है?",
      options: [
        "A. एम्पीयर (Ampere)",
        "B. वोल्ट (Volt)",
        "C. ओम (Ohm)",
        "D. वाट (Watt)"
      ]
    },
    {
      question_number: 2,
      type: "SHORT",
      question: "यदि किसी परिपथ में प्रतिरोध $2 \\Omega$ है और विभवांतर 10 V है, तो धारा का मान ज्ञात कीजिए। ($I = \\frac{V}{R}$)",
      options: null
    },
    {
      question_number: 3,
      type: "LONG",
      question: "ओम का नियम (Ohm's Law) लिखिए और इसे गणितीय रूप में व्यक्त कीजिए। व्याख्या कीजिए कि तापमान बदलने पर प्रतिरोध पर क्या प्रभाव पड़ता है।",
      options: null
    }
  ],
  metadata: {
    subject: "Science (Physics)",
    grade: "Class 10",
    title: "विद्युत (Electricity) - Chapter 12",
    topic: "विद्युत धारा, ओम का नियम और प्रतिरोध पर प्रश्न",
    total_questions: 3,
    generated_at: new Date().toISOString(),
    difficulty: "Medium"
  }
};

const mockReq: GenerateHomeworkRequest = {
  grade: "Class 10",
  subject: "Science",
  title: "विद्युत (Electricity) - Assignment 1",
  topic_description: "विद्युत धारा और प्रतिरोध से संबंधित प्रश्न",
  question_config: {
    mcq: 1,
    very_short: 0,
    short: 1,
    long: 1,
    case_study: 0,
    assertion_reason: 0
  },
  teacher_id: "teacher-123",
  class_id: "class-10-a",
  section_id: "sec-a",
  section_name: "A",
  subject_id: "sub-science",
  institution_id: "inst-gurukul",
  academic_year_id: "ay-2026",
  due_date: "2026-06-15",
  difficulty: "Medium"
};

async function test() {
  console.log("Generating PDF...");
  try {
    // We can call generatePdf directly if we expose it or test via generateAndUpload
    // Since generateAndUpload uploads to Supabase, we want a local test for the buffer.
    // Let's modify pdfService to export generatePdf or temporarily test generatePdf
    const buffer = await (pdfService as any).generatePdf(mockContent, mockReq);
    const outputPath = path.resolve(__dirname, "test-output.pdf");
    fs.writeFileSync(outputPath, buffer);
    console.log(`PDF successfully generated at: ${outputPath}`);
  } catch (error) {
    console.error("Failed to generate PDF:", error);
  }
}

test();
