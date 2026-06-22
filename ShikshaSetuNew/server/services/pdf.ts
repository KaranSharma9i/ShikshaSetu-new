import { Browser } from "puppeteer-core";
import fs from "fs";
import path from "path";
import { supabase } from "../config";
import { GeneratedContent, GenerateHomeworkRequest, SECTION_ORDER, QuestionType } from "../types/generation";
import { normalizeType } from "../utils/questionAssembler";


let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    const isProd = process.env.NODE_ENV === "production" || process.env.RENDER;
    if (isProd) {
      // Dynamic require to prevent loading on local dev environments where these are devDependencies
      const puppeteerCore = require("puppeteer-core");
      const chromium = require("@sparticuz/chromium");
      browserInstance = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      const puppeteer = require("puppeteer");
      browserInstance = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
  }
  return browserInstance!;
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(req.logoUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

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
      const logoPath = path.resolve(process.cwd(), "assets/gurukul.png");
      try {
        if (fs.existsSync(logoPath)) {
          const logoBase64 = fs.readFileSync(logoPath).toString("base64");
          logoDataUri = `data:image/png;base64,${logoBase64}`;
        } else {
          console.warn(`Local logo watermark fallback not found at ${logoPath}`);
        }
      } catch (err) {
        console.error(`Failed to read logo watermark from ${logoPath}:`, err);
      }
    }

    const browser = await getBrowser();
    const page = await browser.newPage();

    page.on("console", (msg) => console.log("PUPPETEER CONSOLE:", msg.text()));
    page.on("pageerror", (err: any) => console.error("PUPPETEER PAGE ERROR:", err.message || err));
    page.on("requestfailed", (request) =>
      console.error("PUPPETEER REQUEST FAILED:", request.url(), request.failure()?.errorText)
    );

    try {
      const port = process.env.PORT || process.env.SERVER_PORT || 3001;
      const baseUrl = `http://127.0.0.1:${port}`;
      const html = this.buildHtmlTemplate(content, req, logoDataUri, baseUrl);

      await page.setContent(html, { waitUntil: "load", timeout: 30000 });

      // Wait for KaTeX JS bundle to load and execute
      await page.waitForFunction(() => typeof (globalThis as any).renderMathInElement === "function", { timeout: 10000 });

      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          const win = globalThis as any;
          const doc = win.document;
          // Wait for custom fonts to load completely
          doc.fonts.ready.then(() => {
            if (win.renderMathInElement) {
              win.renderMathInElement(doc.body, {
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
    logoDataUri: string,
    baseUrl: string
  ): string {
    const gradeSectionText = req.section_name ? `${req.grade} - ${req.section_name}` : req.grade;
    const topicText = content.metadata.topic || req.topic_description;

    const normalizedQuestions = content.questions.map((q) => {
      const qCopy = { ...q, type: normalizeType(q.type) };
      if (q.sub_questions && Array.isArray(q.sub_questions)) {
        qCopy.sub_questions = q.sub_questions.map((subQ) => ({
          ...subQ,
          type: normalizeType(subQ.type),
        }));
      }
      return qCopy;
    });

    let questionsHtml = "";

    const SECTION_TITLES: Record<typeof SECTION_ORDER[number], string> = {
      MCQ: "Section A — Multiple Choice Questions (MCQ)",
      VERY_SHORT: "Section B — Very Short Answer Questions",
      SHORT: "Section C — Short Answer Questions",
      LONG: "Section D — Long Answer Questions",
      CASE_STUDY: "Section E — Case Study Based Questions",
      ASSERTION_REASON: "Section F — Assertion-Reason Questions"
    };

    const sectionConfig = SECTION_ORDER.map(type => ({
      type,
      title: SECTION_TITLES[type]
    }));

    for (const section of sectionConfig) {
      const sectionQuestions = normalizedQuestions.filter((q) => q.type === section.type);
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
  
  <!-- Local Fonts (Noto Sans Devanagari and Poppins) -->
  <style>
    /* Noto Sans Devanagari 400 */
    @font-face {
      font-family: 'Noto Sans Devanagari';
      font-style: normal;
      font-weight: 400;
      src: url('${baseUrl}/assets/fonts/NotoSansDevanagari-400-devanagari.woff2') format('woff2');
      unicode-range: U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B09;
    }
    /* Noto Sans Devanagari 700 */
    @font-face {
      font-family: 'Noto Sans Devanagari';
      font-style: normal;
      font-weight: 700;
      src: url('${baseUrl}/assets/fonts/NotoSansDevanagari-700-devanagari.woff2') format('woff2');
      unicode-range: U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B09;
    }
    /* Poppins 400 Latin */
    @font-face {
      font-family: 'Poppins';
      font-style: normal;
      font-weight: 400;
      src: url('${baseUrl}/assets/fonts/Poppins-400-latin.woff2') format('woff2');
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
    }
    /* Poppins 400 Devanagari */
    @font-face {
      font-family: 'Poppins';
      font-style: normal;
      font-weight: 400;
      src: url('${baseUrl}/assets/fonts/Poppins-400-devanagari.woff2') format('woff2');
      unicode-range: U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B09;
    }
    /* Poppins 500 Latin */
    @font-face {
      font-family: 'Poppins';
      font-style: normal;
      font-weight: 500;
      src: url('${baseUrl}/assets/fonts/Poppins-500-latin.woff2') format('woff2');
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
    }
    /* Poppins 500 Devanagari */
    @font-face {
      font-family: 'Poppins';
      font-style: normal;
      font-weight: 500;
      src: url('${baseUrl}/assets/fonts/Poppins-500-devanagari.woff2') format('woff2');
      unicode-range: U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B09;
    }
    /* Poppins 700 Latin */
    @font-face {
      font-family: 'Poppins';
      font-style: normal;
      font-weight: 700;
      src: url('${baseUrl}/assets/fonts/Poppins-700-latin.woff2') format('woff2');
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
    }
    /* Poppins 700 Devanagari */
    @font-face {
      font-family: 'Poppins';
      font-style: normal;
      font-weight: 700;
      src: url('${baseUrl}/assets/fonts/Poppins-700-devanagari.woff2') format('woff2');
      unicode-range: U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B09;
    }
  </style>
  
  <!-- KaTeX CSS served locally -->
  <link rel="stylesheet" href="${baseUrl}/katex/katex.min.css">
  
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
  ${logoDataUri ? `
  <div class="watermark-container">
    <img class="watermark-img" src="${logoDataUri}" />
  </div>
  ` : ""}

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
  
  <!-- KaTeX JavaScript served locally -->
  <script defer src="${baseUrl}/katex/katex.min.js"></script>
  <script defer src="${baseUrl}/katex/contrib/auto-render.min.js"></script>
</body>
</html>
    `;
  }
}

export const pdfService = new PdfService();
