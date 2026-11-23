import { NextResponse } from 'next/server'

/** Escapes a value for safe interpolation into HTML templates. */
export function esc(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Content-Disposition value that is safe for non-ASCII (e.g. Devanagari) filenames. */
function contentDisposition(filename: string, disposition: 'attachment' | 'inline' = 'attachment') {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

interface PdfOptions {
  landscape?: boolean
  margin?: { top: string; bottom: string; left: string; right: string }
}

/**
 * Renders HTML to a PDF with Puppeteer when a Chromium binary is available (local/dev servers).
 *
 * Serverless hosts such as Vercel do not ship Chromium, so `puppeteer.launch()` fails there and the
 * route used to return a 500. In that case we return the same document as a print-ready HTML page
 * that opens the browser's print dialog, where the admin can choose "Save as PDF".
 */
export async function renderPdfResponse(html: string, filename: string, options: PdfOptions = {}) {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  const forceHtml = isServerless && !process.env.PUPPETEER_EXECUTABLE_PATH

  if (!forceHtml) {
    try {
      const { default: puppeteer } = await import('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      try {
        const page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'load', timeout: 30000 })
        // Wait for the Tailwind CDN script and web fonts to finish loading
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 15000 }).catch(() => undefined)
        const pdfBuffer = await page.pdf({
          format: 'A4',
          landscape: options.landscape ?? false,
          printBackground: true,
          margin: options.margin ?? { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
        })
        return new NextResponse(Buffer.from(pdfBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': contentDisposition(filename),
          },
        })
      } finally {
        await browser.close()
      }
    } catch (error) {
      console.warn('Puppeteer PDF rendering unavailable, falling back to printable HTML:', error)
    }
  }

  return printableHtmlResponse(html, filename, options)
}

function printableHtmlResponse(html: string, filename: string, options: PdfOptions) {
  const title = esc(filename.replace(/\.pdf$/i, ''))
  const pageCss = `@page { size: A4 ${options.landscape ? 'landscape' : 'portrait'}; margin: ${options.margin?.top ?? '10mm'}; }
    .print-toolbar { position: sticky; top: 0; z-index: 50; display: flex; gap: 12px; align-items: center; justify-content: center;
      padding: 10px 16px; background: #111827; color: #fff; font: 600 13px system-ui, sans-serif; }
    .print-toolbar button { background: #fff; color: #111827; border: 0; border-radius: 8px; padding: 6px 14px; font-weight: 700; cursor: pointer; }
    @media print { .print-toolbar { display: none !important; } }`
  const toolbar = `<div class="print-toolbar">Choose “Save as PDF” in the print dialog to download this document.
    <button type="button" onclick="window.print()">Print / Save as PDF</button></div>`
  const script = `<script>
    window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 600); });
  </script>`

  let doc = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
  doc = doc.replace(/<\/head>/i, `<style>${pageCss}</style></head>`)
  doc = doc.replace(/<body([^>]*)>/i, `<body$1>${toolbar}`)
  doc = doc.replace(/<\/body>/i, `${script}</body>`)

  return new NextResponse(doc, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
