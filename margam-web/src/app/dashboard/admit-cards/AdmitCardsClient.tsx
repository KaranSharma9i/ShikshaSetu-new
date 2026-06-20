'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { saveAdmitCardSettingsAction } from './actions'
import { DEFAULT_ADMIT_CARD_CONFIG } from '@/lib/repositories/admitCardSettings'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas-pro'

interface ClassItem {
  id: string
  name: string
  grade_number: number
}

interface SectionItem {
  id: string
  name: string
}

interface StudentListItem {
  id: string
  student_code: string
  full_name: string
  profile_photo_url: string | null
  status: string
  email: string
  phone: string
  roll_number: string
  guardian_name: string
}

interface ExamDatesheetRow {
  id: string
  subject_name: string
  exam_date: string
  start_time: string | null
  end_time: string | null
}

interface AdmitCardSettingsRow {
  institution_id: string
  selected_template: string
  template_config: any
}

interface AdmitCardsClientProps {
  classes: ClassItem[]
  activeAcademicYear: any
  initialSettings: AdmitCardSettingsRow | null
  institution: any
  institutionId: string
}

// Timezone safe date formatter
const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A'
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const year = parts[0]
  const monthNum = parseInt(parts[1], 10) - 1
  const day = parts[2]
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[monthNum] || 'Jan'
  return `${day}-${month}-${year}`
}

// 12-hour format time formatter
const formatTime = (timeStr: string | null | undefined) => {
  if (!timeStr) return 'N/A'
  const parts = timeStr.split(':')
  if (parts.length < 2) return timeStr
  let hours = parseInt(parts[0], 10)
  const minutes = parts[1]
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12 // the hour '0' should be '12'
  return `${hours}:${minutes} ${ampm}`
}

// Image component with CORS handling & initials fallback
function AdmitCardPhoto({
  src,
  name,
  borderColor,
}: {
  src: string | null | undefined
  name: string
  borderColor: string
}) {
  const [error, setError] = useState(false)

  const getInitials = (n: string) => {
    const parts = n.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }

  const borderStyle = { borderColor }

  if (src && !error) {
    return (
      <div
        className="w-[110px] h-[130px] border-2 shadow-sm rounded-lg relative overflow-hidden"
        style={borderStyle}
      >
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <img
          src={src}
          alt={name}
          onError={() => setError(true)}
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        />
      </div>
    )
  }

  return (
    <div
      className="w-[110px] h-[130px] flex flex-col items-center justify-center text-xl font-bold text-white shadow-sm border-2 rounded-lg"
      style={{
        backgroundColor: borderColor || '#0D1B2A',
        ...borderStyle,
      }}
    >
      <span className="text-2xl">{getInitials(name)}</span>
      <span className="text-[10px] font-normal opacity-85 mt-1">NO PHOTO</span>
    </div>
  )
}

interface AdmitCardProps {
  student: any
  examName: string
  sessionLabel: string
  datesheet: ExamDatesheetRow[]
  institution: any
  templateConfig: any
}

function AdmitCard({
  student,
  examName,
  sessionLabel,
  datesheet,
  institution,
  templateConfig,
}: AdmitCardProps) {
  const theme = institution?.theme || {}
  const primaryColor = theme?.colors?.primary ?? '#0D1B2A'
  const secondaryColor = theme?.colors?.secondary ?? '#D4AF37'
  const whiteColor = theme?.colors?.white ?? '#FFFFFF'

  const instName = institution?.name || 'Institution Name'
  const instAddress = institution?.address || 'Institution Address'
  const instTagline = institution?.tagline || ''

  // Config fallbacks
  const instructions = templateConfig?.instructions && templateConfig.instructions.length > 0
    ? templateConfig.instructions
    : DEFAULT_ADMIT_CARD_CONFIG.instructions
  const footerNote = templateConfig?.footerNote || DEFAULT_ADMIT_CARD_CONFIG.footerNote
  const title = templateConfig?.title || DEFAULT_ADMIT_CARD_CONFIG.title || 'ADMIT CARD'

  return (
    <div
      className="w-[794px] h-[1123px] bg-white p-8 flex flex-col justify-between border border-gray-200 box-border text-black select-none font-body relative"
      style={{
        fontFamily: 'var(--font-body)',
      }}
    >
      <div>
        {/* HEADER BAND */}
        <div
          className="rounded-2xl p-6 flex items-center justify-between shadow-sm relative overflow-hidden"
          style={{
            backgroundColor: primaryColor,
            color: whiteColor,
          }}
        >
          <div className="flex items-center gap-4 relative z-10">
            {institution?.logo_url ? (
              <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-white p-1 overflow-hidden">
                <img
                  src={institution.logo_url}
                  alt={instName}
                  crossOrigin="anonymous"
                  className="max-w-full max-h-full w-auto h-auto"
                />
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold font-heading shadow-md"
                style={{ backgroundColor: secondaryColor, color: primaryColor }}
              >
                {instName.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tight font-heading leading-tight uppercase">
                {instName}
              </h1>
              {instTagline && (
                <p className="text-xs opacity-95 font-medium italic mt-0.5 tracking-wide">
                  {instTagline}
                </p>
              )}
            </div>
          </div>

          <div className="text-right max-w-[280px] relative z-10 flex flex-col justify-center">
            <p className="text-xs opacity-80 leading-relaxed font-semibold">
              {instAddress}
            </p>
          </div>
        </div>

        {/* PILL BADGE */}
        <div className="my-6 flex justify-center">
          <span
            className="text-base font-extrabold tracking-widest px-8 py-2.5 rounded-full shadow-md font-heading uppercase"
            style={{
              backgroundColor: secondaryColor,
              color: primaryColor,
            }}
          >
            {title}
          </span>
        </div>

        {/* INFO BLOCK */}
        <div className="grid grid-cols-4 gap-6 items-start border border-gray-200 rounded-2xl p-6 bg-gray-50/50 shadow-sm">
          <div className="col-span-3 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Session</span>
              <span className="font-extrabold text-gray-800 mt-0.5">{sessionLabel}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Valid For</span>
              <span className="font-extrabold text-gray-800 mt-0.5">{examName}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Reg No.</span>
              <span className="font-extrabold text-gray-800 mt-0.5">{student.student_code}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Roll No.</span>
              <span className="font-extrabold text-gray-800 mt-0.5">{student.roll_number}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Class</span>
              <span className="font-extrabold text-gray-800 mt-0.5">{student.class_name || 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Section</span>
              <span className="font-extrabold text-gray-800 mt-0.5">{student.section_name || 'N/A'}</span>
            </div>

            <div className="flex flex-col col-span-2 border-t border-gray-100 pt-3">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Student Name</span>
              <span className="font-black text-gray-900 mt-0.5 text-base font-heading tracking-wide uppercase">{student.full_name}</span>
            </div>
            <div className="flex flex-col col-span-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Father's Name</span>
              <span className="font-extrabold text-gray-800 mt-0.5 uppercase">{student.guardian_name || 'N/A'}</span>
            </div>
          </div>

          <div className="flex justify-end">
            <AdmitCardPhoto
              src={student.profile_photo_url}
              name={student.full_name}
              borderColor={primaryColor}
            />
          </div>
        </div>

        {/* EXAM SCHEDULE */}
        <div className="mt-6">
          <h2
            className="text-xs font-black tracking-widest uppercase mb-3 flex items-center gap-1.5"
            style={{ color: primaryColor }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Exam Schedule
          </h2>
          <table className="w-full border-collapse border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <thead>
              <tr style={{ backgroundColor: primaryColor, color: whiteColor }}>
                <th className="py-3.5 px-4 text-left text-xs font-bold uppercase tracking-wider border-b border-gray-200 w-[8%]">S.No</th>
                <th className="py-3.5 px-4 text-left text-xs font-bold uppercase tracking-wider border-b border-gray-200 w-[34%]">Subject</th>
                <th className="py-3.5 px-4 text-left text-xs font-bold uppercase tracking-wider border-b border-gray-200 w-[18%]">Date</th>
                <th className="py-3.5 px-4 text-left text-xs font-bold uppercase tracking-wider border-b border-gray-200 w-[15%]">Start</th>
                <th className="py-3.5 px-4 text-left text-xs font-bold uppercase tracking-wider border-b border-gray-200 w-[15%]">End</th>
                <th className="py-3.5 px-4 text-left text-xs font-bold uppercase tracking-wider border-b border-gray-200 w-[10%]">Invigilator</th>
              </tr>
            </thead>
            <tbody>
              {datesheet && datesheet.length > 0 ? (
                datesheet.map((row, idx) => (
                  <tr key={row.id} className="odd:bg-white even:bg-gray-50/50 hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4 text-xs font-bold text-gray-700 border-b border-gray-200">{idx + 1}</td>
                    <td className="py-3 px-4 text-xs font-extrabold text-gray-900 border-b border-gray-200 uppercase">{row.subject_name}</td>
                    <td className="py-3 px-4 text-xs font-bold text-gray-700 border-b border-gray-200">{formatDate(row.exam_date)}</td>
                    <td className="py-3 px-4 text-xs font-bold text-gray-700 border-b border-gray-200">{formatTime(row.start_time)}</td>
                    <td className="py-3 px-4 text-xs font-bold text-gray-700 border-b border-gray-200">{formatTime(row.end_time)}</td>
                    <td className="py-3 px-4 border-b border-gray-200 min-w-[70px]"></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs font-medium text-gray-450 italic bg-white">
                    No scheduled exams found for this class and exam name.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER & INSTRUCTIONS */}
      <div>
        <div className="grid grid-cols-2 gap-8 items-end border-t border-gray-100 pt-6 pb-4">
          <div className="flex flex-col">
            <h3 className="text-xs font-black tracking-wider uppercase text-gray-500 mb-2.5">
              Important Instructions
            </h3>
            <ul className="space-y-1.5 text-[11px] font-semibold text-gray-600 leading-relaxed">
              {instructions.map((inst: string, idx: number) => (
                <li key={idx} className="flex items-start gap-1">
                  <span className="text-gray-400">→</span>
                  <span>{inst}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-center justify-end h-full pb-2">
            <div className="w-[180px] border-t-2 border-gray-300 mb-1.5"></div>
            <span
              className="text-[10px] font-black uppercase tracking-wider"
              style={{ color: primaryColor }}
            >
              Authorised Signatory
            </span>
          </div>
        </div>

        <div
          className="rounded-xl py-3 px-4 text-center text-[10px] font-bold tracking-wide shadow-sm"
          style={{
            backgroundColor: primaryColor,
            color: whiteColor,
          }}
        >
          {footerNote}
        </div>
      </div>
    </div>
  )
}

export default function AdmitCardsClient({
  classes,
  activeAcademicYear,
  initialSettings,
  institution,
  institutionId,
}: AdmitCardsClientProps) {
  const supabase = createClient()

  // Template Picker State
  const [selectedTemplate, setSelectedTemplate] = useState<'template_1' | 'template_2' | 'template_3'>(
    (initialSettings?.selected_template as any) || 'template_1'
  )
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Selector Flow State
  const [examNames, setExamNames] = useState<string[]>([])
  const [selectedExam, setSelectedExam] = useState<string>('')
  
  const [classesForExam, setClassesForExam] = useState<ClassItem[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')

  const [sectionsForClass, setSectionsForClass] = useState<SectionItem[]>([])
  const [selectedSection, setSelectedSection] = useState<string>('')

  // Students & Datesheet State
  const [students, setStudents] = useState<StudentListItem[]>([])
  const [datesheet, setDatesheet] = useState<ExamDatesheetRow[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null)

  // Loaders
  const [isLoadingExams, setIsLoadingExams] = useState(false)
  const [isLoadingClasses, setIsLoadingClasses] = useState(false)
  const [isLoadingSections, setIsLoadingSections] = useState(false)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)

  // PDF Generation State
  const [isGenerating, setIsGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [genError, setGenError] = useState<string | null>(null)
  const [generatingIds, setGeneratingIds] = useState<string[] | null>(null)

  const theme = institution?.theme || {}
  const primaryColor = theme?.colors?.primary ?? '#0D1B2A'
  const secondaryColor = theme?.colors?.secondary ?? '#D4AF37'
  const charcoalColor = theme?.colors?.charcoal ?? '#333333'
  const whiteColor = theme?.colors?.white ?? '#FFFFFF'

  // Fetch unique exam names on mount
  useEffect(() => {
    if (!activeAcademicYear?.id) return
    const fetchExamNames = async () => {
      setIsLoadingExams(true)
      try {
        const { data, error } = await supabase
          .from('exams')
          .select('exam_name')
          .eq('institution_id', institutionId)
          .eq('academic_year_id', activeAcademicYear.id)

        if (error) throw error

        const uniqueExams = Array.from(new Set((data || []).map(item => item.exam_name))).sort()
        setExamNames(uniqueExams)
      } catch (err) {
        console.error('Error fetching exams:', err)
      } finally {
        setIsLoadingExams(false)
      }
    }
    fetchExamNames()
  }, [activeAcademicYear, institutionId])

  // Fetch classes with scheduled exams for selected exam name
  useEffect(() => {
    if (!selectedExam) {
      setClassesForExam([])
      return
    }
    const fetchClassesForExam = async () => {
      setIsLoadingClasses(true)
      try {
        const { data, error } = await supabase
          .from('exams')
          .select(`
            class_id,
            class:classes!inner (
              id,
              name,
              grade_number
            )
          `)
          .eq('institution_id', institutionId)
          .eq('academic_year_id', activeAcademicYear?.id)
          .eq('exam_name', selectedExam)

        if (error) throw error

        const uniqueClasses = Array.from(
          new Map(
            (data || [])
              .map((item: any) => item.class)
              .filter(Boolean)
              .map((c: any) => [c.id, c])
          ).values()
        ).sort((a: any, b: any) => a.grade_number - b.grade_number)

        setClassesForExam(uniqueClasses)
      } catch (err) {
        console.error('Error fetching classes for exam:', err)
      } finally {
        setIsLoadingClasses(false)
      }
    }
    fetchClassesForExam()
  }, [selectedExam])

  // Fetch sections for selected class
  useEffect(() => {
    if (!selectedClass) {
      setSectionsForClass([])
      return
    }
    const fetchSectionsForClass = async () => {
      setIsLoadingSections(true)
      try {
        const { data, error } = await supabase
          .from('sections')
          .select('id, name')
          .eq('class_id', selectedClass)
          .eq('academic_year_id', activeAcademicYear?.id)
          .order('name', { ascending: true })

        if (error) throw error
        setSectionsForClass(data || [])
      } catch (err) {
        console.error('Error fetching sections:', err)
      } finally {
        setIsLoadingSections(false)
      }
    }
    fetchSectionsForClass()
  }, [selectedClass])

  // Fetch students enrolled and the exam datesheet details in parallel
  useEffect(() => {
    if (!selectedSection || !selectedClass || !selectedExam) {
      setStudents([])
      setDatesheet([])
      setSelectedStudentIds(new Set())
      setHighlightedStudentId(null)
      return
    }
    const fetchStudentsAndDatesheet = async () => {
      setIsLoadingStudents(true)
      try {
        // Parallel queries: Students & Datesheet
        const [enrollmentResult, examResult] = await Promise.all([
          supabase
            .from('enrollments')
            .select(`
              roll_number,
              student:students!inner (
                id,
                student_code,
                guardian_name,
                user:users!inner (
                  full_name,
                  profile_photo_url,
                  status,
                  email,
                  phone
                )
              )
            `)
            .eq('section_id', selectedSection)
            .eq('academic_year_id', activeAcademicYear?.id)
            .eq('is_active', true)
            .eq('student.institution_id', institutionId),

          supabase
            .from('exams')
            .select(`
              id,
              exam_date,
              start_time,
              end_time,
              subject:subjects!inner (
                name
              )
            `)
            .eq('institution_id', institutionId)
            .eq('academic_year_id', activeAcademicYear?.id)
            .eq('class_id', selectedClass)
            .eq('exam_name', selectedExam)
            .order('exam_date', { ascending: true })
        ])

        if (enrollmentResult.error) throw enrollmentResult.error
        if (examResult.error) throw examResult.error

        // Map students
        const mappedStudents = (enrollmentResult.data || []).map((e: any) => ({
          id: e.student.id,
          student_code: e.student.student_code,
          full_name: e.student.user?.full_name || '',
          profile_photo_url: e.student.user?.profile_photo_url || null,
          roll_number: e.roll_number || 'N/A',
          guardian_name: e.student.guardian_name || '',
          status: e.student.user?.status || 'active',
          email: e.student.user?.email || '',
          phone: e.student.user?.phone || ''
        })).sort((a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true, sensitivity: 'base' }))

        // Map datesheet
        const mappedDatesheet = (examResult.data || []).map((ex: any) => ({
          id: ex.id,
          subject_name: ex.subject?.name || 'Unknown Subject',
          exam_date: ex.exam_date,
          start_time: ex.start_time,
          end_time: ex.end_time
        }))

        setStudents(mappedStudents)
        setDatesheet(mappedDatesheet)

        // Select all by default
        setSelectedStudentIds(new Set(mappedStudents.map(s => s.id)))

        // Highlight first student
        if (mappedStudents.length > 0) {
          setHighlightedStudentId(mappedStudents[0].id)
        } else {
          setHighlightedStudentId(null)
        }
      } catch (err) {
        console.error('Error in fetchStudentsAndDatesheet:', err)
      } finally {
        setIsLoadingStudents(false)
      }
    }
    fetchStudentsAndDatesheet()
  }, [selectedSection, selectedClass, selectedExam])

  // Select all / Deselect all handler
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(new Set(students.map(s => s.id)))
    } else {
      setSelectedStudentIds(new Set())
    }
  }

  // Toggle single student checkbox
  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Handle template selection
  const handleTemplateChange = async (tpl: 'template_1' | 'template_2' | 'template_3') => {
    if (tpl !== 'template_1') {
      showToast('This template is coming soon!')
      return
    }
    setSelectedTemplate(tpl)
    setIsSavingTemplate(true)
    try {
      const res = await saveAdmitCardSettingsAction(institutionId, tpl)
      if (!res.success) {
        console.error('Failed to save default template:', res.error)
      }
    } catch (err) {
      console.error('Error saving template:', err)
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  // Resets for cascading selectors
  const handleExamChange = (examName: string) => {
    setSelectedExam(examName)
    setSelectedClass('')
    setSelectedSection('')
    setStudents([])
    setDatesheet([])
    setSelectedStudentIds(new Set())
    setClassesForExam([])
    setSectionsForClass([])
  }

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId)
    setSelectedSection('')
    setStudents([])
    setDatesheet([])
    setSelectedStudentIds(new Set())
    setSectionsForClass([])
  }

  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId)
  }

  // Trigger PDF Download Flow
  const triggerPdfDownload = () => {
    const selectedIds = Array.from(selectedStudentIds)
    if (selectedIds.length === 0) return

    setIsGenerating(true)
    setGenProgress(0)
    setGenError(null)
    setGeneratingIds(selectedIds)
  }

  // Effect capturing hidden-DOM for jsPDF A4 pages
  useEffect(() => {
    if (!generatingIds || generatingIds.length === 0) return

    const runRenderFlow = async () => {
      try {
        // Wait a frame for React to render the hidden elements
        await new Promise(resolve => setTimeout(resolve, 600))

        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        })

        const total = generatingIds.length

        for (let i = 0; i < total; i++) {
          const id = generatingIds[i]
          setGenProgress(Math.round((i / total) * 100))

          const element = document.getElementById(`export-admit-card-${id}`)
          if (!element) {
            console.error(`Export DOM element not found for student ID: ${id}`)
            continue
          }

          const canvas = await html2canvas(element, {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#FFFFFF',
            logging: false,
          })

          const imgData = canvas.toDataURL('image/jpeg', 1.0)

          if (i > 0) {
            doc.addPage()
          }

          // A4 dimensions: 210 x 297 mm
          // Render with 10mm margins on all sides (width 190mm, height 277mm)
          doc.addImage(imgData, 'JPEG', 10, 10, 190, 277)
        }

        const examLabel = selectedExam.replace(/\s+/g, '-').toLowerCase()
        const classLabel = classes.find(c => c.id === selectedClass)?.name.replace(/\s+/g, '-').toLowerCase() || 'class'
        const sectionLabel = sectionsForClass.find(s => s.id === selectedSection)?.name.replace(/\s+/g, '-').toLowerCase() || 'section'

        doc.save(`admit-cards-${examLabel}-${classLabel}-${sectionLabel}.pdf`)

        setGenProgress(100)
        await new Promise(resolve => setTimeout(resolve, 800))
      } catch (err: any) {
        console.error('Error generating PDF:', err)
        setGenError(err?.message || 'An error occurred during PDF rendering. Make sure all images have valid CORS headers.')
      } finally {
        setIsGenerating(false)
        setGeneratingIds(null)
      }
    }

    runRenderFlow()
  }, [generatingIds])

  const templateConfig = initialSettings?.template_config || DEFAULT_ADMIT_CARD_CONFIG
  const activeStudent = students.find(s => s.id === highlightedStudentId)
  const isAllSelected = students.length > 0 && selectedStudentIds.size === students.length

  const activeClassName = classes.find(c => c.id === selectedClass)?.name || ''
  const activeSectionName = sectionsForClass.find(s => s.id === selectedSection)?.name || ''

  const highlightedStudentData = activeStudent ? {
    ...activeStudent,
    class_name: activeClassName,
    section_name: activeSectionName
  } : null

  return (
    <div className="space-y-6 font-body pb-24 relative">
      {/* Toast alert popup */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-charcoal text-white px-5 py-3 rounded-2xl shadow-xl border border-light-gray/10 animate-fade-in text-sm font-semibold tracking-wide flex items-center gap-2">
          <svg className="w-5 h-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {toast}
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-gray/60 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">Admit Cards Generator</h1>
          <p className="text-steel-gray mt-1 text-sm font-caption">
            Manage layout templates, select exams, classes, and sections, and download bulk printable Admit Card PDFs.
          </p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left 2 columns: Selector, templates, list */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Template Picker */}
          <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-charcoal font-heading">Choose Layout Template</h2>
              {isSavingTemplate && (
                <span className="text-xs text-steel-gray flex items-center gap-1.5 font-caption animate-pulse">
                  <svg className="animate-spin h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving template...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Template 1 (Active) */}
              <button
                onClick={() => handleTemplateChange('template_1')}
                className={`border rounded-2xl p-4 text-left transition-all hover:shadow-md cursor-pointer flex flex-col items-center justify-center space-y-2 relative ${
                  selectedTemplate === 'template_1'
                    ? 'border-primary ring-2 ring-primary bg-primary/[0.02]'
                    : 'border-light-gray hover:border-steel-gray/40'
                }`}
              >
                <div
                  className="w-full h-12 rounded-lg bg-cover bg-center flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider relative overflow-hidden"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="relative z-10 font-heading">A4 Portrait Grid</span>
                </div>
                <div className="text-center">
                  <span className="block text-xs font-bold text-charcoal">Portrait A4 Template</span>
                  <span className="block text-[10px] text-steel-gray mt-0.5">Classic band & table layout</span>
                </div>
              </button>

              {/* Template 2 (Coming Soon) */}
              <button
                onClick={() => handleTemplateChange('template_2')}
                className="border border-dashed border-light-gray rounded-2xl p-4 text-left flex flex-col items-center justify-center space-y-2 relative overflow-hidden bg-gray-50/50 cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gray-900/5 backdrop-blur-[0.5px] rounded-2xl flex items-center justify-center z-20">
                  <span className="bg-charcoal text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Coming Soon</span>
                </div>
                <div className="w-full h-12 rounded-lg bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Solid Accent
                </div>
                <div className="text-center opacity-50">
                  <span className="block text-xs font-bold text-gray-600">Template 2</span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">Circular logo & sidebar</span>
                </div>
              </button>

              {/* Template 3 (Coming Soon) */}
              <button
                onClick={() => handleTemplateChange('template_3')}
                className="border border-dashed border-light-gray rounded-2xl p-4 text-left flex flex-col items-center justify-center space-y-2 relative overflow-hidden bg-gray-50/50 cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gray-900/5 backdrop-blur-[0.5px] rounded-2xl flex items-center justify-center z-20">
                  <span className="bg-charcoal text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Coming Soon</span>
                </div>
                <div className="w-full h-12 rounded-lg bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Minimal Border
                </div>
                <div className="text-center opacity-50">
                  <span className="block text-xs font-bold text-gray-600">Template 3</span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">Dual signature blocks</span>
                </div>
              </button>
            </div>
          </div>

          {/* Cascading Selectors Panel */}
          <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-charcoal font-heading">Select Scope</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Exam Name Selector */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-steel-gray">1. Select Exam</label>
                {isLoadingExams ? (
                  <div className="h-10 rounded-xl bg-gray-100 animate-pulse border border-light-gray/60"></div>
                ) : (
                  <select
                    value={selectedExam}
                    onChange={(e) => handleExamChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-light-gray/60 bg-white font-medium text-sm text-charcoal shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="">-- Select Exam Name --</option>
                    {examNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Class Selector */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-steel-gray">2. Select Class</label>
                {isLoadingClasses ? (
                  <div className="h-10 rounded-xl bg-gray-100 animate-pulse border border-light-gray/60"></div>
                ) : (
                  <select
                    value={selectedClass}
                    disabled={!selectedExam}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-light-gray/60 bg-white font-medium text-sm text-charcoal shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Select Class --</option>
                    {classesForExam.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Section Selector */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-steel-gray">3. Select Section</label>
                {isLoadingSections ? (
                  <div className="h-10 rounded-xl bg-gray-100 animate-pulse border border-light-gray/60"></div>
                ) : (
                  <select
                    value={selectedSection}
                    disabled={!selectedClass}
                    onChange={(e) => handleSectionChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-light-gray/60 bg-white font-medium text-sm text-charcoal shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Select Section --</option>
                    {sectionsForClass.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                )}
              </div>

            </div>
          </div>

          {/* Student Checklist Table */}
          {selectedSection && (
            <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-light-gray/30 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-charcoal font-heading">Students Checklist</h3>
                  <p className="text-xs text-steel-gray font-caption mt-0.5">
                    Select students to generate and include in the downloaded Admit Card PDF bundle.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/5 text-primary">
                    {selectedStudentIds.size} / {students.length} Selected
                  </span>
                </div>
              </div>

              {isLoadingStudents ? (
                <div className="space-y-3 py-6">
                  <div className="h-8 bg-gray-100 rounded-lg animate-pulse"></div>
                  <div className="h-8 bg-gray-100 rounded-lg animate-pulse"></div>
                  <div className="h-8 bg-gray-100 rounded-lg animate-pulse"></div>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-12 text-sm text-steel-gray font-medium italic">
                  No enrolled students found in this section for the active academic year.
                </div>
              ) : (
                <div className="overflow-hidden border border-light-gray/50 rounded-xl">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-light-gray/50 text-xs font-bold text-steel-gray uppercase">
                        <th className="p-3 text-left w-12">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                          />
                        </th>
                        <th className="p-3 text-left">Roll No</th>
                        <th className="p-3 text-left">Student Name</th>
                        <th className="p-3 text-left">Registration No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const isChecked = selectedStudentIds.has(student.id)
                        const isHighlighted = highlightedStudentId === student.id
                        return (
                          <tr
                            key={student.id}
                            onClick={() => setHighlightedStudentId(student.id)}
                            className={`border-b border-light-gray/30 text-sm cursor-pointer transition-colors ${
                              isHighlighted ? 'bg-primary/[0.03]' : 'hover:bg-gray-50/50'
                            }`}
                          >
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleStudent(student.id)}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-bold text-charcoal">{student.roll_number}</td>
                            <td className="p-3 font-semibold text-charcoal">{student.full_name}</td>
                            <td className="p-3 text-steel-gray font-caption">{student.student_code}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right column: Live Preview Panel */}
        <div className="space-y-6">
          <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-charcoal font-heading">Live Preview</h2>

            {!selectedSection || !highlightedStudentData ? (
              <div className="h-[674px] border-2 border-dashed border-light-gray rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-gray-50/50">
                <svg className="w-12 h-12 text-steel-gray opacity-40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-sm font-semibold text-steel-gray">No Preview Available</span>
                <p className="text-xs text-steel-gray/80 mt-1 font-caption max-w-[200px]">
                  Select an exam, class, and section to view a student's admit card.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                
                {/* 60% Scale Live Preview Card */}
                <div className="w-[476px] h-[674px] overflow-hidden border border-gray-200 rounded-2xl shadow-md bg-white">
                  <div style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: '794px', height: '1123px' }}>
                    <AdmitCard
                      student={highlightedStudentData}
                      examName={selectedExam}
                      sessionLabel={activeAcademicYear?.label || 'N/A'}
                      datesheet={datesheet}
                      institution={institution}
                      templateConfig={templateConfig}
                    />
                  </div>
                </div>

                {/* PDF generation action button */}
                <button
                  onClick={triggerPdfDownload}
                  disabled={selectedStudentIds.size === 0 || isGenerating}
                  style={{
                    backgroundColor: selectedStudentIds.size > 0 && !isGenerating ? primaryColor : undefined,
                    color: whiteColor,
                  }}
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold shadow-md hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating ({genProgress}%)
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Admit Cards ({selectedStudentIds.size})
                    </>
                  )}
                </button>

                {genError && (
                  <p className="text-xs text-red-500 font-semibold text-center leading-relaxed">
                    {genError}
                  </p>
                )}

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Offscreen Container for PDF Export */}
      {generatingIds && generatingIds.length > 0 && (
        <div style={{ position: 'fixed', left: -9999, top: 0, zIndex: -1000, overflow: 'hidden' }}>
          {generatingIds.map(id => {
            const student = students.find(s => s.id === id)
            if (!student) return null

            const studentData = {
              ...student,
              class_name: activeClassName,
              section_name: activeSectionName
            }

            return (
              <div key={id} id={`export-admit-card-${id}`} style={{ width: '794px', height: '1123px', backgroundColor: '#FFFFFF' }}>
                <AdmitCard
                  student={studentData}
                  examName={selectedExam}
                  sessionLabel={activeAcademicYear?.label || 'N/A'}
                  datesheet={datesheet}
                  institution={institution}
                  templateConfig={templateConfig}
                />
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
