import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getSectionSummaryData } from '@/lib/repositories/results'
import puppeteer from 'puppeteer'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized: No active session.', { status: 401 })
    }

    // 2. Fetch profile to verify role and institution_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.institution_id) {
      return new NextResponse('Unauthorized: Invalid user profile.', { status: 401 })
    }

    if (userData.role !== 'institution_admin') {
      return new NextResponse('Unauthorized: Admin access required.', { status: 403 })
    }

    const institutionId = userData.institution_id

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url)
    const sectionId = searchParams.get('sectionId')
    const academicYearId = searchParams.get('academicYearId')
    const termId = searchParams.get('termId')

    if (!sectionId || !academicYearId) {
      return new NextResponse('Bad Request: sectionId and academicYearId are required.', { status: 400 })
    }

    const termParam = termId === 'null' || termId === 'legacy' ? null : termId

    // 4. Fetch section summary data
    const summary = await getSectionSummaryData(
      supabase,
      institutionId,
      academicYearId,
      termParam,
      sectionId
    )

    if (!summary) {
      return new NextResponse('Summary data not found or access denied.', { status: 404 })
    }

    // 5. Fetch Institution metadata (Name, tagline, logo, colors/theme)
    const { data: instData } = await supabase
      .from('institutions')
      .select('name, tagline, logo_url, theme, address')
      .eq('id', institutionId)
      .single()

    const theme = instData?.theme as any
    const primaryColor = theme?.colors?.primary ?? '#0D1B2A'
    const secondaryColor = theme?.colors?.secondary ?? '#D4AF37'
    const creamColor = theme?.colors?.cream ?? '#F7F3EB'
    const charcoalColor = theme?.colors?.charcoal ?? '#333333'
    const steelGrayColor = theme?.colors?.steelGray ?? '#6B7280'
    const whiteColor = theme?.colors?.white ?? '#FFFFFF'
    const lightGrayColor = theme?.colors?.lightGray ?? '#E5E7EB'

    // Sort students by Rank if finalized, else Roll Number
    const sortedStudents = [...summary.students].sort((a, b) => {
      if (summary.isRankFinalized) {
        const rankA = typeof a.rank === 'number' ? a.rank : 99999
        const rankB = typeof b.rank === 'number' ? b.rank : 99999
        return rankA - rankB
      } else {
        const rollA = Number(a.roll_number) || 99999
        const rollB = Number(b.roll_number) || 99999
        return rollA - rollB
      }
    })

    const totalStudents = summary.students.length
    const passedStudents = summary.students.filter(s => !s.is_incomplete && s.is_passed).length
    const failedStudents = summary.students.filter(s => !s.is_incomplete && !s.is_passed).length
    const pendingStudents = summary.students.filter(s => s.is_incomplete).length

    // 6. Generate HTML content for Landscape PDF Roster
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Class Result Summary Sheet</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700;900&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '${primaryColor}',
            secondary: '${secondaryColor}',
            cream: '${creamColor}',
            charcoal: '${charcoalColor}',
            'steel-gray': '${steelGrayColor}',
            'light-gray': '${lightGrayColor}',
          },
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            heading: ['Poppins', 'sans-serif'],
          }
        }
      }
    }
  </script>
  <style>
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    body {
      font-family: 'Inter', sans-serif;
      color: ${charcoalColor};
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: 'Poppins', sans-serif;
    }
  </style>
</head>
<body class="bg-white p-4">
  <div class="w-full mx-auto space-y-6">
    <!-- Header Section -->
    <div class="flex justify-between items-center border-b border-light-gray/60 pb-4">
      <div class="flex items-center gap-4">
        ${instData?.logo_url ? `
          <img src="${instData.logo_url}" class="w-14 h-14 object-contain rounded-xl border border-primary/20 p-0.5 shadow-sm" alt="Logo" />
        ` : `
          <div class="w-14 h-14 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center text-primary font-bold text-lg font-heading shadow-sm">
            ${instData?.name ? instData.name.split(' ').map((w: string) => w[0]).join('').slice(0, 3) : 'SS'}
          </div>
        `}
        <div>
          <h2 class="text-xl font-black text-primary tracking-tight font-heading leading-tight">${instData?.name || 'GURUKUL SHIKSHALAYA'}</h2>
          <p class="text-[9px] text-steel-gray font-caption tracking-wider uppercase font-semibold mt-0.5">${instData?.tagline || 'Sow the seeds of character, reap a harvest of wisdom'}</p>
          <p class="text-[8px] text-steel-gray/80 font-caption">${instData?.address || 'Main Campus, Sector 12, Dwarka, New Delhi'}</p>
        </div>
      </div>
      <div class="text-right">
        <span class="inline-block px-2.5 py-0.5 bg-primary text-white text-[10px] font-bold rounded-md font-caption uppercase tracking-wider">
          CLASS RESULT SUMMARY
        </span>
        <p class="text-xs text-charcoal font-bold mt-1.5 font-heading">Term: ${summary.termName}</p>
        <p class="text-[9px] text-steel-gray font-caption">Session: ${summary.academicYearLabel}</p>
      </div>
    </div>

    <!-- Stats Ribbon -->
    <div class="grid grid-cols-6 gap-3 text-xs bg-cream/5 border border-light-gray/50 rounded-xl p-3 text-center">
      <div class="border-r border-light-gray/30">
        <p class="text-[9px] text-steel-gray font-semibold uppercase tracking-wider font-caption">Class & Section</p>
        <p class="font-bold text-charcoal mt-0.5">${summary.className} - Section ${summary.sectionName}</p>
      </div>
      <div class="border-r border-light-gray/30">
        <p class="text-[9px] text-steel-gray font-semibold uppercase tracking-wider font-caption">Core Exams</p>
        <p class="font-bold text-charcoal mt-0.5">${summary.examsCount}</p>
      </div>
      <div class="border-r border-light-gray/30">
        <p class="text-[9px] text-steel-gray font-semibold uppercase tracking-wider font-caption">Total Students</p>
        <p class="font-bold text-primary mt-0.5">${totalStudents}</p>
      </div>
      <div class="border-r border-light-gray/30">
        <p class="text-[9px] text-steel-gray font-semibold uppercase tracking-wider font-caption">Passed</p>
        <p class="font-bold text-green-600 mt-0.5">${passedStudents}</p>
      </div>
      <div class="border-r border-light-gray/30">
        <p class="text-[9px] text-steel-gray font-semibold uppercase tracking-wider font-caption">Failed</p>
        <p class="font-bold text-red-600 mt-0.5">${failedStudents}</p>
      </div>
      <div>
        <p class="text-[9px] text-steel-gray font-semibold uppercase tracking-wider font-caption">Pending</p>
        <p class="font-bold text-amber-600 mt-0.5">${pendingStudents}</p>
      </div>
    </div>

    <!-- Rank warning banner if not finalized -->
    ${!summary.isRankFinalized ? `
      <div class="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-[10px] rounded-lg leading-relaxed font-semibold">
        ⚠️ **Ranks Pending:** Ranks are marked as PENDING because one or more students have missing results in core subjects.
      </div>
    ` : ''}

    <!-- Roster Summary Table -->
    <div class="border border-light-gray/60 rounded-xl overflow-hidden">
      <table class="min-w-full divide-y divide-light-gray/60 text-left text-[10px]">
        <thead class="bg-cream/10 text-charcoal font-bold">
          <tr>
            <th scope="col" class="px-4 py-2.5 text-center">Roll No</th>
            <th scope="col" class="px-4 py-2.5">Student Name</th>
            <th scope="col" class="px-4 py-2.5">Student Code</th>
            <th scope="col" class="px-4 py-2.5 text-center font-bold">Total Core Obtained</th>
            <th scope="col" class="px-4 py-2.5 text-center">Max Core Marks</th>
            <th scope="col" class="px-4 py-2.5 text-center">Percentage</th>
            <th scope="col" class="px-4 py-2.5 text-center">Grade</th>
            <th scope="col" class="px-4 py-2.5 text-center">Rank</th>
            <th scope="col" class="px-4 py-2.5 text-center">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-light-gray/40 text-charcoal">
          ${sortedStudents.map((st) => `
            <tr class="${st.is_incomplete ? 'bg-amber-50/20' : ''}">
              <td class="px-4 py-2 text-center font-semibold">${st.roll_number || '—'}</td>
              <td class="px-4 py-2 font-bold">
                ${st.full_name} 
                ${st.is_incomplete ? '<span class="text-[8px] text-amber-700 bg-amber-100 font-medium px-1 rounded ml-1 font-caption">PENDING</span>' : ''}
              </td>
              <td class="px-4 py-2 font-mono text-steel-gray">${st.student_code}</td>
              <td class="px-4 py-2 text-center font-semibold">${st.total_obtained !== null ? st.total_obtained : '—'}</td>
              <td class="px-4 py-2 text-center text-steel-gray">${st.total_max !== null ? st.total_max : '—'}</td>
              <td class="px-4 py-2 text-center font-bold">${st.percentage !== null ? `${st.percentage}%` : '—'}</td>
              <td class="px-4 py-2 text-center">
                <span class="inline-block px-1 rounded font-mono font-bold ${st.overall_grade === 'F' ? 'text-red-600 bg-red-50' : 'text-charcoal'}">
                  ${st.overall_grade || '—'}
                </span>
              </td>
              <td class="px-4 py-2 text-center font-bold">
                ${st.rank === 'Pending' ? 'PENDING' : st.rank}
              </td>
              <td class="px-4 py-2 text-center font-bold">
                ${st.is_incomplete ? '<span class="text-steel-gray">PENDING</span>' : (st.is_passed ? '<span class="text-green-600">PASS</span>' : '<span class="text-red-600">FAIL</span>')}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Signatures -->
    <div class="grid grid-cols-2 gap-8 border-t border-light-gray/40 pt-6">
      <div class="text-center font-medium font-caption text-xs text-steel-gray">
        <div class="w-48 mx-auto border-b border-light-gray/80 pb-1 h-6"></div>
        <p class="mt-1.5">Class Teacher Signature</p>
      </div>
      <div class="text-center font-medium font-caption text-xs text-steel-gray">
        <div class="w-48 mx-auto border-b border-light-gray/80 pb-1 h-6"></div>
        <p class="mt-1.5">Principal Signature</p>
      </div>
    </div>
  </div>
</body>
</html>
    `

    // 7. Launch Puppeteer and render Landscape PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' as any })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '8mm',
        bottom: '8mm',
        left: '8mm',
        right: '8mm'
      }
    })
    await browser.close()

    // 8. Return PDF download stream
    const termClean = summary.termName.replace(/\s+/g, '_')
    const filename = `class_summary_${summary.className.replace(/\s+/g, '_')}_sec_${summary.sectionName}_term_${termClean}.pdf`

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error: any) {
    console.error('Error generating Class Summary PDF:', error)
    return new NextResponse(`Internal Server Error: ${error.message || 'Failed to generate PDF.'}`, { status: 500 })
  }
}
