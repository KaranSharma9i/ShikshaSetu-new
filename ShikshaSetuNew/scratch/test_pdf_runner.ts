import express from "express";
import path from "path";
import { pdfService } from "../server/services/pdf";
import fs from "fs";

const PORT = 3002;
process.env.PORT = "3002"; // Ensure pdfService connects to 3002

const app = express();
// Serve local fonts and KaTeX distribution files statically
app.use("/assets", express.static(path.join(process.cwd(), "server/assets")));
app.use("/katex", express.static(path.join(path.dirname(require.resolve("katex/package.json")), "dist")));

async function runTest() {
  console.log(`Starting standalone test Express server on http://127.0.0.1:${PORT}...`);
  const server = app.listen(PORT, "127.0.0.1", async () => {
    console.log("Test server successfully started.");
    
    try {
      const mockContent = {
        questions: [
          {
            question_number: 1,
            type: "MCQ" as const,
            question: "What is the value of $x$ if $2x + 5 = 15$?",
            options: ["$x = 5$", "$x = 10$", "$x = 15$", "$x = 20$"]
          },
          {
            question_number: 2,
            type: "SHORT" as const,
            question: "Explain the Pythagorean theorem: $a^2 + b^2 = c^2$. Also, write some Hindi text here: 'नमस्कार, यह गणित का गृहकार्य है।'",
            options: null
          }
        ],
        metadata: {
          subject: "Mathematics",
          grade: "Class 8",
          title: "Equations and Geometry",
          topic: "Algebra & Right Triangles",
          total_questions: 2,
          generated_at: new Date().toISOString(),
          difficulty: "Medium" as const
        }
      };

      const mockRequest = {
        grade: "Class 8",
        subject: "Mathematics",
        title: "Equations and Geometry",
        topic_description: "Algebra & Right Triangles",
        question_config: {
          mcq: 1,
          very_short: 0,
          short: 1,
          long: 0,
          case_study: 0,
          assertion_reason: 0
        },
        teacher_id: "teacher-123",
        class_id: "class-123",
        section_id: "section-123",
        section_name: "A",
        subject_id: "subj-123",
        institution_id: "inst-123",
        academic_year_id: "ay-123",
        due_date: "2026-06-30",
        difficulty: "Medium" as const,
        logoUrl: null,
        institutionName: "Shiksha Setu Academy"
      };

      console.log(`1. Generating PDF on http://127.0.0.1:${PORT} with local fallback watermark logo...`);
      let startTime = Date.now();
      const pdfBuffer = await (pdfService as any).generatePdf(mockContent, mockRequest);
      const outputPath = path.resolve(__dirname, "test_output.pdf");
      fs.writeFileSync(outputPath, pdfBuffer);
      console.log(`-> Success! PDF generated and saved to ${outputPath} (${(pdfBuffer.length / 1024).toFixed(2)} KB) in ${((Date.now() - startTime) / 1000).toFixed(2)}s\n`);

      console.log("2. Testing with a non-responsive remote logo URL to verify 6s AbortController timeout...");
      startTime = Date.now();
      const mockRequestWithSlowLogo = {
        ...mockRequest,
        logoUrl: "http://10.255.255.1/logo.png" // non-routable IP, will hang without abort
      };
      
      const slowPdfBuffer = await (pdfService as any).generatePdf(mockContent, mockRequestWithSlowLogo);
      const slowOutputPath = path.resolve(__dirname, "test_slow_logo_output.pdf");
      fs.writeFileSync(slowOutputPath, slowPdfBuffer);
      console.log(`-> Success! PDF generated with fallback watermark despite slow logo fetch in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
      console.log(`Saved to ${slowOutputPath} (${(slowPdfBuffer.length / 1024).toFixed(2)} KB)`);

      console.log("\nAll tests completed successfully!");
    } catch (err) {
      console.error("\nTest failed with error:", err);
    } finally {
      console.log("Closing test server...");
      server.close(() => {
        console.log("Test server closed. Exiting.");
        process.exit(0);
      });
    }
  });
}

runTest();
