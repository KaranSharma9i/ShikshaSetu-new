import puppeteer, { Browser } from "puppeteer";
import fs from "fs";
import path from "path";
import { supabase } from "../config";
import { GeneratedContent, GenerateHomeworkRequest } from "../types/generation";

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserInstance;
}

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

  private async generatePdf(content: GeneratedContent, req: GenerateHomeworkRequest): Promise<Buffer> {
    let logoDataUri = "";
    let remoteLogoLoaded = false;

    if (req.logoUrl) {
      try {
        const response = await fetch(req.logoUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mimeType = response.headers.get("content-type") || "image/png";
          logoDataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
          remoteLogoLoaded = true;
        }
      } catch (err) {
        console.error(`Failed to fetch remote logo from ${req.logoUrl}:`, err);
      }
    }

    if (!remoteLogoLoaded) {
      const logoPath = path.resolve(__dirname, "../../assets/gurukul.png");
      try {
        const logoBase64 = fs.readFileSync(logoPath).toString("base64");
        logoDataUri = `data:image/png;base64,${logoBase64}`;
      } catch (err) {
        console.error(`Failed to read logo watermark from ${logoPath}:`, err);
      }
    }

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      const html = this.buildHtmlTemplate(content, req, logoDataUri);

      await page.setContent(html, { waitUntil: "networkidle0" as any, timeout: 30000 });

      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          // @ts-ignore
          if (window.renderMathInElement) {
            // @ts-ignore
            window.renderMathInElement(document.body, {
              delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false },
                { left: "\\(", right: "\\)", display: false },
              ],
            });
          }
          resolve();
        });
      });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20mm",
          bottom: "20mm",
          left: "20mm",
          right: "20mm",
        },
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate: `
          <div style="font-family: 'Poppins', sans-serif; font-size: 9px; width: 100%; text-align: center; color: #a0aec0;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  private buildHtmlTemplate(
    content: GeneratedContent,
    req: GenerateHomeworkRequest,
    logoDataUri: string
  ): string {
    const gradeSectionText = req.section_name ? `${req.grade} - ${req.section_name}` : req.grade;
    const topicText = content.metadata.topic || req.topic_description;

    let questionsHtml = "";

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

      questionsHtml += `<div class="section-title">${section.title}</div>`;

      for (const q of sectionQuestions) {
        if (q.type === "CASE_STUDY") {
          questionsHtml += `
            <div class="question-block">
              <div class="question-text">
                <strong>${q.question_number}.</strong> ${q.question}
              </div>
          `;

          if (q.sub_questions && q.sub_questions.length > 0) {
            q.sub_questions.forEach((subQ) => {
              questionsHtml += `
                <div class="sub-question-block" style="margin-left: 20px; margin-top: 8px; page-break-inside: avoid;">
                  <div class="question-text">
                    <strong>${subQ.question_number}.</strong> ${subQ.question}
                  </div>
              `;
              if (subQ.options && subQ.options.length > 0) {
                questionsHtml += `<div class="options-grid">`;
                subQ.options.forEach((opt) => {
                  questionsHtml += `<div class="option-item">${opt}</div>`;
                });
                questionsHtml += `</div>`;
              }
              questionsHtml += `</div>`;
            });
          }

          questionsHtml += `</div>`;
        } else if (q.type === "ASSERTION_REASON") {
          const cleanAssertion = q.question.replace(/^(Assertion\s*\(?[AR]?\)?\s*:\s*)/i, "");
          const cleanReason = q.reason ? q.reason.replace(/^(Reason\s*\(?[AR]?\)?\s*:\s*)/i, "") : "";

          questionsHtml += `
            <div class="question-block">
              <div class="question-text">
                <strong>${q.question_number}.</strong> Assertion (A): ${cleanAssertion}
              </div>
              ${cleanReason ? `
              <div class="question-text" style="margin-top: 4px;">
                Reason (R): ${cleanReason}
              </div>
              ` : ""}
          `;

          if (q.options && q.options.length > 0) {
            questionsHtml += `<div class="options-list" style="margin-left: 20px; margin-top: 6px;">`;
            q.options.forEach((opt) => {
              questionsHtml += `<div class="option-item" style="margin-bottom: 4px;">${opt}</div>`;
            });
            questionsHtml += `</div>`;
          }

          questionsHtml += `</div>`;
        } else {
          questionsHtml += `
            <div class="question-block">
              <div class="question-text">
                <strong>${q.question_number}.</strong> ${q.question}
              </div>
          `;

          if (q.options && q.options.length > 0) {
            questionsHtml += `<div class="options-grid">`;
            q.options.forEach((opt) => {
              questionsHtml += `<div class="option-item">${opt}</div>`;
            });
            questionsHtml += `</div>`;
          }

          questionsHtml += `</div>`;
        }
      }
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${req.title}</title>
  
  <!-- Google Fonts for Poppins and Noto Sans Devanagari -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&family=Poppins:wght@400;500;700&display=swap" rel="stylesheet">
  
  <!-- KaTeX CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  
  <style>
    body {
      font-family: 'Poppins', 'Noto Sans Devanagari', sans-serif;
      color: #2d3748;
      background-color: #ffffff;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    
    /* Fixed watermark so it repeats on every PDF page */
    .watermark-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      opacity: 0.15;
      z-index: 0;
      pointer-events: none;
      width: 420px;
      height: 420px;
    }
    .watermark-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* Content wrapper rendered above watermark */
    .content-wrapper {
      position: relative;
      z-index: 1;
    }

    /* Header Styling */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .header-cell-left {
      font-size: 11px;
      color: #1a1a2e;
      text-align: left;
    }
    .header-cell-right {
      font-size: 11px;
      color: #1a1a2e;
      text-align: right;
    }
    .title-banner {
      text-align: center;
      margin: 20px 0;
    }
    .title-banner h1 {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 0 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .subtitle {
      font-size: 12px;
      color: #4a5568;
      margin: 0;
    }
    .topic-desc {
      font-size: 11px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 12px 0;
    }
    .divider {
      border: 0;
      border-top: 1px solid #cbd5e0;
      margin: 10px 0 20px 0;
    }

    /* Section Styling */
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #1a1a2e;
      margin-top: 25px;
      margin-bottom: 12px;
      border-bottom: 1px dashed #cbd5e0;
      padding-bottom: 4px;
      page-break-after: avoid;
    }
    .question-block {
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    .question-text {
      font-size: 11px;
      font-weight: 500;
      color: #2d3748;
      margin-bottom: 6px;
    }
    .options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-left: 20px;
      margin-top: 4px;
    }
    .option-item {
      font-size: 10.5px;
      color: #4a5568;
    }
    
    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
    }
  </style>
</head>
<body>
  <!-- Watermark -->
  <div class="watermark-container">
    <img class="watermark-img" src="${logoDataUri}" />
  </div>

  <div class="content-wrapper">
    <!-- Header Block -->
    <table class="header-table">
      <tr>
        <td class="header-cell-left"><strong>Institution:</strong> ${req.institutionName || "Gurukul Shikshalaya"}</td>
        <td class="header-cell-right"><strong>Due Date:</strong> ${req.due_date}</td>
      </tr>
    </table>

    <div class="title-banner">
      <h1>HOMEWORK ASSIGNMENT</h1>
      <p class="subtitle">
        ${gradeSectionText} &nbsp;|&nbsp; <strong>Subject:</strong> ${req.subject} &nbsp;|&nbsp; <strong>Title:</strong> ${req.title}
      </p>
    </div>

    <div class="topic-desc">
      <strong>Topic:</strong> ${topicText}
    </div>

    <hr class="divider" />

    <!-- Content Sections -->
    ${questionsHtml}
  </div>
  
  <!-- KaTeX JavaScript dependencies -->
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
</body>
</html>
    `;
  }
}

export const pdfService = new PdfService();
