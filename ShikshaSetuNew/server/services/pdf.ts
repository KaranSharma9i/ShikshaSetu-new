import PDFDocument from "pdfkit";
import { createClient } from "@supabase/supabase-js";
import { GeneratedContent, GenerateHomeworkRequest } from "../types/generation";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey =
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase URL or Service Role Key in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export class PdfService {
  async generateAndUpload(
    content: GeneratedContent,
    homeworkId: string,
    req: GenerateHomeworkRequest
  ): Promise<string> {
    const pdfBuffer = await this.generatePdf(content, req);

    const bucketName = "homework-pdfs";

    // Ensure storage bucket exists
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === bucketName);

      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          allowedMimeTypes: ["application/pdf"],
        });
        if (createError) {
          console.error("Error creating bucket:", createError);
        }
      }
    } catch (err) {
      console.warn("Storage bucket checks/creation failed or skipped:", err);
    }

    const filePath = `${req.institution_id}/${req.class_id}/${homeworkId}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF to Supabase: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  }

  private generatePdf(content: GeneratedContent, req: GenerateHomeworkRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
        const chunks: Buffer[] = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", (err) => reject(err));

        const ensureSpace = (needed: number) => {
          if (doc.y + needed > doc.page.height - 50) {
            doc.addPage();
          }
        };

        // Header Section
        doc.fontSize(10).fillColor("#1a1a2e").font("Helvetica").text("Institution: ____________________", 50, 50);
        doc.fontSize(10).fillColor("#1a1a2e").text(`Due Date: ${req.due_date}`, 50, 50, {
          align: "right",
          width: doc.page.width - 100,
        });

        doc.moveDown(1.5);
        doc.fontSize(18).font("Helvetica-Bold").fillColor("#1a1a2e").text("HOMEWORK ASSIGNMENT", { align: "center" });

        doc.moveDown(0.5);
        const gradeSectionText = req.section_name ? `${req.grade} - ${req.section_name}` : req.grade;
        doc.fontSize(12).font("Helvetica").fillColor("#4a5568").text(`${gradeSectionText}  |  Subject: ${req.subject}  |  Title: ${req.title}`, {
          align: "center",
        });

        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#1a1a2e").text(`Topic: ${content.metadata.topic || req.topic_description}`, {
          align: "left",
        });

        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke("#cbd5e0");
        doc.moveDown(1.5);

        // Sections configuration
        const sectionConfig = [
          { type: "MCQ", title: "Section A — Multiple Choice Questions (MCQ)" },
          { type: "VERY_SHORT", title: "Section B — Very Short Answer Questions" },
          { type: "SHORT", title: "Section C — Short Answer Questions" },
          { type: "LONG", title: "Section D — Long Answer Questions" },
          { type: "CASE_STUDY", title: "Section E — Case Study Based Questions" },
          { type: "ASSERTION_REASON", title: "Section F — Assertion-Reason Questions" },
        ];

        for (const section of sectionConfig) {
          const sectionQuestions = content.questions.filter((q) => q.type === section.type);
          if (sectionQuestions.length === 0) continue;

          ensureSpace(60);
          doc.moveDown(1);
          doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a1a2e").text(section.title);
          doc.moveDown(0.5);

          for (const q of sectionQuestions) {
            // Rough estimation of space needed
            const questionLines = Math.ceil(q.question.length / 80) + 1;
            const optionsHeight = q.options ? q.options.length * 18 : 0;
            const estimatedHeight = questionLines * 15 + optionsHeight + 25;

            ensureSpace(estimatedHeight);

            doc.fontSize(10).font("Helvetica").fillColor("#2d3748");
            doc.text(`${q.question_number}. ${q.question}`);

            if (q.options && q.options.length > 0) {
              doc.moveDown(0.3);
              q.options.forEach((opt) => {
                doc.fontSize(10).font("Helvetica").fillColor("#4a5568").text(`   ${opt}`, { indent: 15 });
              });
            }
            doc.moveDown(0.8);
          }
        }

        // Draw page numbers on all pages
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(9).font("Helvetica").fillColor("#a0aec0").text(
            `Page ${i + 1} of ${range.count}`,
            50,
            doc.page.height - 40,
            { align: "center", width: doc.page.width - 100 }
          );
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const pdfService = new PdfService();
