import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getReportCardData } from '@/lib/repositories/results'
import { getEnrollmentsForSectionMove } from '@/lib/repositories/student'
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
    const studentId = searchParams.get('studentId')
    const sectionId = searchParams.get('sectionId')
    const academicYearId = searchParams.get('academicYearId')
    const termId = searchParams.get('termId')

    if (!academicYearId) {
      return new NextResponse('Bad Request: academicYearId is required.', { status: 400 })
    }

    const termParam = termId === 'null' || termId === 'legacy' ? null : termId

    // 4. Fetch report cards
    let reportCards: any[] = []

    if (studentId) {
      // Single student report card
      const rc = await getReportCardData(supabase, institutionId, studentId, academicYearId, termParam)
      if (rc) {
        reportCards.push(rc)
      } else {
        return new NextResponse('Student record not found or access denied.', { status: 404 })
      }
    } else if (sectionId) {
      // Whole section report cards
      // First verify section belongs to this institution
      const { data: sectionData, error: sectionErr } = await supabase
        .from('sections')
        .select(`
          id,
          class:classes!inner (
            institution_id
          )
        `)
        .eq('id', sectionId)
        .single()

      if (sectionErr || !sectionData || (sectionData.class as any)?.institution_id !== institutionId) {
        return new NextResponse('Section not found or access denied.', { status: 404 })
      }

      // Fetch active enrollments in the section
      const enrollments = await getEnrollmentsForSectionMove(supabase, institutionId, academicYearId, sectionId)
      
      if (enrollments.length > 0) {
        const fetchPromises = enrollments.map(e =>
          getReportCardData(supabase, institutionId, e.student_id, academicYearId, termParam)
        )
        const results = await Promise.all(fetchPromises)
        reportCards = results.filter(Boolean)
      }
    } else {
      return new NextResponse('Bad Request: Either studentId or sectionId must be provided.', { status: 400 })
    }

    if (reportCards.length === 0) {
      return new NextResponse('No report card data found for generation.', { status: 404 })
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

    // Fetch Academic Year label
    const { data: yearData } = await supabase
      .from('academic_years')
      .select('label')
      .eq('id', academicYearId)
      .single()

    const academicYearLabel = yearData?.label || 'Unknown Session'

    // Fetch Term Name
    let termName = 'Ungrouped (legacy)'
    if (termParam) {
      const { data: termData } = await supabase
        .from('exam_terms')
        .select('name')
        .eq('id', termParam)
        .single()
      termName = termData?.name || termName
    }

    // 6. Generate HTML content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Report Card Roster</title>
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
      .page-break {
        page-break-after: always;
      }
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
<body class="bg-white p-8">
  ${reportCards.map((rc, idx) => {
    const coreSubjects = rc.subjects.filter((s: any) => !s.is_elective)
    const electiveSubjects = rc.subjects.filter((s: any) => s.is_elective)
    const isLast = idx === reportCards.length - 1

    return `
    <div class="max-w-4xl mx-auto border border-light-gray/80 rounded-2xl p-8 space-y-6 ${!isLast ? 'page-break mb-8' : ''}">
      <!-- Header Section -->
      <div class="flex justify-between items-center border-b border-light-gray/60 pb-5">
        <div class="flex items-center gap-4">
          ${instData?.logo_url ? `
            <img src="${instData.logo_url}" class="w-16 h-16 object-contain rounded-2xl border border-primary/20 p-1 shadow-sm" alt="Logo" />
          ` : `
            <div class="w-16 h-16 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-center text-primary font-bold text-xl font-heading shadow-sm">
              ${instData?.name ? instData.name.split(' ').map((w: string) => w[0]).join('').slice(0, 3) : 'SS'}
            </div>
          `}
          <div>
            <h2 class="text-2xl font-black text-primary tracking-tight font-heading leading-tight">${instData?.name || 'GURUKUL SHIKSHALAYA'}</h2>
            <p class="text-[11px] text-steel-gray font-caption tracking-wider uppercase font-semibold mt-0.5">${instData?.tagline || 'Sow the seeds of character, reap a harvest of wisdom'}</p>
            <p class="text-[10px] text-steel-gray/80 font-caption">${instData?.address || 'Main Campus, Sector 12, Dwarka, New Delhi'}</p>
          </div>
        </div>
        <div class="text-right">
          <span class="inline-block px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg font-caption uppercase tracking-wider">
            REPORT CARD
          </span>
          <p class="text-xs text-charcoal font-bold mt-2 font-heading">${termName}</p>
          <p class="text-[10px] text-steel-gray font-caption">Session: ${academicYearLabel}</p>
        </div>
      </div>

      <!-- Student Profile Grid -->
      <div class="bg-cream/10 border border-light-gray/40 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <p class="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Student Name</p>
          <p class="font-bold text-charcoal mt-1 text-sm">${rc.student.full_name}</p>
        </div>
        <div>
          <p class="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Roll Number</p>
          <p class="font-semibold text-charcoal mt-1">${rc.student.roll_number || '—'}</p>
        </div>
        <div>
          <p class="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Class & Section</p>
          <p class="font-semibold text-charcoal mt-1">${rc.student.class_name} - ${rc.student.section_name}</p>
        </div>
        <div>
          <p class="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Student Code</p>
          <p class="font-semibold text-charcoal mt-1 font-mono">${rc.student.student_code}</p>
        </div>
      </div>

      <!-- Core Subjects Table -->
      <div class="space-y-3">
        <h3 class="text-xs font-bold text-steel-gray uppercase tracking-wider font-caption border-b border-light-gray/40 pb-1.5">Core Subjects</h3>
        <div class="overflow-x-auto border border-light-gray/60 rounded-xl">
          <table class="min-w-full divide-y divide-light-gray/60 text-left text-xs">
            <thead class="bg-cream/10 text-charcoal font-semibold">
              <tr>
                <th scope="col" class="px-4 py-3">Subject</th>
                <th scope="col" class="px-4 py-3">Code</th>
                <th scope="col" class="px-4 py-3">Exam Name</th>
                <th scope="col" class="px-4 py-3 text-center">Max Marks</th>
                <th scope="col" class="px-4 py-3 text-center">Passing Marks</th>
                <th scope="col" class="px-4 py-3 text-center">Obtained</th>
                <th scope="col" class="px-4 py-3 text-center">Grade</th>
                <th scope="col" class="px-4 py-3 text-center">Result</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-light-gray/40 text-charcoal">
              ${coreSubjects.length > 0 ? coreSubjects.map((sub: any) => `
                <tr class="hover:bg-cream/5 transition-colors">
                  <td class="px-4 py-2.5 font-semibold">${sub.subject_name}</td>
                  <td class="px-4 py-2.5 font-mono">${sub.subject_code || '—'}</td>
                  <td class="px-4 py-2.5 text-steel-gray">${sub.exam_name || '—'}</td>
                  <td class="px-4 py-2.5 text-center font-semibold">${sub.total_marks ?? '—'}</td>
                  <td class="px-4 py-2.5 text-center text-steel-gray">${sub.passing_marks ?? '—'}</td>
                  <td class="px-4 py-2.5 text-center font-bold">
                    ${sub.marks_obtained !== null ? sub.marks_obtained : '<span class="text-steel-gray/60">—</span>'}
                  </td>
                  <td class="px-4 py-2.5 text-center">
                    <span class="inline-block px-1.5 py-0.5 rounded font-mono font-bold ${sub.grade === 'F' ? 'text-red-600 bg-red-50' : 'text-charcoal'}">
                      ${sub.grade || '—'}
                    </span>
                  </td>
                  <td class="px-4 py-2.5 text-center">
                    ${sub.status === 'Pass' ? '<span class="text-green-600 font-bold font-caption text-[10px] bg-green-50 px-2 py-0.5 rounded-full">PASS</span>' : ''}
                    ${sub.status === 'Fail' ? '<span class="text-red-600 font-bold font-caption text-[10px] bg-red-50 px-2 py-0.5 rounded-full">FAIL</span>' : ''}
                    ${sub.status === 'Pending' ? '<span class="text-steel-gray font-bold font-caption text-[10px] bg-light-gray/30 px-2 py-0.5 rounded-full">PENDING</span>' : ''}
                    ${sub.status === 'No Exam' ? '<span class="text-steel-gray font-bold font-caption text-[10px]">NO EXAM</span>' : ''}
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="8" class="px-4 py-6 text-center text-steel-gray font-caption">No core subjects configured.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Elective Subjects Table -->
      ${electiveSubjects.length > 0 ? `
        <div class="space-y-3">
          <h3 class="text-xs font-bold text-steel-gray uppercase tracking-wider font-caption border-b border-light-gray/40 pb-1.5">Elective Subjects</h3>
          <div class="overflow-x-auto border border-light-gray/60 rounded-xl">
            <table class="min-w-full divide-y divide-light-gray/60 text-left text-xs">
              <thead class="bg-cream/10 text-charcoal font-semibold">
                <tr>
                  <th scope="col" class="px-4 py-3">Subject</th>
                  <th scope="col" class="px-4 py-3">Code</th>
                  <th scope="col" class="px-4 py-3">Exam Name</th>
                  <th scope="col" class="px-4 py-3 text-center">Max Marks</th>
                  <th scope="col" class="px-4 py-3 text-center">Passing Marks</th>
                  <th scope="col" class="px-4 py-3 text-center">Obtained</th>
                  <th scope="col" class="px-4 py-3 text-center">Grade</th>
                  <th scope="col" class="px-4 py-3 text-center">Result</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-light-gray/40 text-charcoal">
                ${electiveSubjects.map((sub: any) => `
                  <tr class="hover:bg-cream/5 transition-colors">
                    <td class="px-4 py-2.5 font-semibold">${sub.subject_name}</td>
                    <td class="px-4 py-2.5 font-mono">${sub.subject_code || '—'}</td>
                    <td class="px-4 py-2.5 text-steel-gray">${sub.exam_name || '—'}</td>
                    <td class="px-4 py-2.5 text-center font-semibold">${sub.total_marks ?? '—'}</td>
                    <td class="px-4 py-2.5 text-center text-steel-gray">${sub.passing_marks ?? '—'}</td>
                    <td class="px-4 py-2.5 text-center font-bold">
                      ${sub.marks_obtained !== null ? sub.marks_obtained : '<span class="text-steel-gray/60">—</span>'}
                    </td>
                    <td class="px-4 py-2.5 text-center">
                      <span class="inline-block px-1.5 py-0.5 rounded font-mono font-bold ${sub.grade === 'F' ? 'text-red-600 bg-red-50' : 'text-charcoal'}">
                        ${sub.grade || '—'}
                      </span>
                    </td>
                    <td class="px-4 py-2.5 text-center">
                      ${sub.status === 'Pass' ? '<span class="text-green-600 font-bold font-caption text-[10px] bg-green-50 px-2 py-0.5 rounded-full">PASS</span>' : ''}
                      ${sub.status === 'Fail' ? '<span class="text-red-600 font-bold font-caption text-[10px] bg-red-50 px-2 py-0.5 rounded-full">FAIL</span>' : ''}
                      ${sub.status === 'Pending' ? '<span class="text-steel-gray font-bold font-caption text-[10px] bg-light-gray/30 px-2 py-0.5 rounded-full">PENDING</span>' : ''}
                      ${sub.status === 'No Exam' ? '<span class="text-steel-gray font-bold font-caption text-[10px]">NO EXAM</span>' : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- Footer Summary Band -->
      <div class="border border-primary/20 bg-primary/5 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
        <div class="text-center border-r border-light-gray/40 last:border-r-0 py-1">
          <p class="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Total (Core)</p>
          <p class="text-base font-bold text-charcoal mt-1">
            ${rc.aggregates ? `${rc.aggregates.total_obtained} / ${rc.aggregates.total_max}` : '—'}
          </p>
        </div>
        <div class="text-center border-r border-light-gray/40 last:border-r-0 py-1">
          <p class="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Percentage</p>
          <p class="text-base font-bold text-charcoal mt-1">
            ${rc.aggregates ? `${rc.aggregates.percentage}%` : '—'}
          </p>
        </div>
        <div class="text-center border-r border-light-gray/40 last:border-r-0 py-1">
          <p class="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Overall Grade</p>
          <p class="text-base font-black text-primary mt-1 font-heading">
            ${rc.aggregates ? rc.aggregates.overall_grade : '—'}
          </p>
        </div>
        <div class="text-center border-r border-light-gray/40 last:border-r-0 py-1">
          <p class="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Section Rank</p>
          <p class="text-base font-bold text-charcoal mt-1">
            ${rc.rank.position === 'Pending' ? '<span class="text-steel-gray font-medium text-xs font-caption">Rank Pending</span>' : `${rc.rank.position} / ${rc.rank.total_students}`}
          </p>
        </div>
        <div class="text-center py-1 col-span-2 md:col-span-1">
          <p class="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Status</p>
          <div class="mt-1">
            ${rc.aggregates ? (
              rc.aggregates.is_passed ? (
                '<span class="inline-block px-4 py-1.5 bg-green-600 text-white text-xs font-black rounded-lg font-caption tracking-wider">PASSED</span>'
              ) : (
                '<span class="inline-block px-4 py-1.5 bg-red-600 text-white text-xs font-black rounded-lg font-caption tracking-wider">FAILED</span>'
              )
            ) : (
              '<span class="inline-block px-4 py-1.5 bg-light-gray text-steel-gray text-xs font-semibold rounded-lg font-caption">PENDING</span>'
            )}
          </div>
        </div>
      </div>

      <!-- Remarks & Signatures -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-light-gray/40 pt-6">
        <div class="col-span-2">
          <p class="text-[10px] text-steel-gray uppercase font-semibold tracking-wider font-caption">Class Teacher's Remarks</p>
          <div class="mt-2 p-3 bg-cream/10 border border-light-gray/60 rounded-xl h-20 text-xs text-charcoal/80 flex items-start">
            <span>${rc.aggregates?.is_passed ? 'Demonstrates a strong understanding of core concepts. Keeps up with coursework and participates actively. Consistent effort shown.' : 'Needs improvement in core subjects. Encouraged to pay closer attention to class assignments and seek help in weaker areas.'}</span>
          </div>
        </div>
        <div class="col-span-1 flex flex-col justify-end space-y-8 font-caption text-xs text-steel-gray text-center font-medium">
          <div class="space-y-1">
            <div class="w-full border-b border-light-gray/80 pb-1 h-8"></div>
            <p>Class Teacher Signature</p>
          </div>
          <div class="space-y-1">
            <div class="w-full border-b border-light-gray/80 pb-1 h-8"></div>
            <p>Principal Signature</p>
          </div>
        </div>
      </div>
    </div>
    `
  }).join('')}
</body>
</html>
    `

    // 7. Render PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' as any })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      }
    })
    await browser.close()

    // 8. Output PDF stream/buffer
    const filename = studentId 
      ? `report-card-${reportCards[0].student.full_name.replace(/\s+/g, '_')}-${termName.replace(/\s+/g, '_')}.pdf`
      : `report-cards-section-${sectionId}-${termName.replace(/\s+/g, '_')}.pdf`

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error: any) {
    console.error('Error generating PDF:', error)
    return new NextResponse(`Internal Server Error: ${error.message || 'Failed to generate PDF.'}`, { status: 500 })
  }
}
