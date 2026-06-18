'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import StudentFilterBar from '../students/StudentFilterBar'
import { saveIdCardSettingsAction } from './actions'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas-pro'

interface ClassItem {
  id: string
  name: string
}

interface SectionItem {
  id: string
  name: string
  class_id: string
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
  class_name: string
  section_name: string
  class_id: string
  section_id: string
  blood_group?: string | null
  guardian_phone?: string | null
  date_of_birth?: string | null
}

interface TeacherListItem {
  id: string
  user_id: string
  employee_code: string
  full_name: string
  profile_photo_url: string | null
  specialization: string
  qualification: string
  status: string
  email: string
  phone: string
  date_of_joining?: string | null
  address?: string | null
}

interface IDCardSettingsRow {
  institution_id: string
  selected_template: string
  template_config: any
}

interface IDCardsClientProps {
  classes: ClassItem[]
  allSections: SectionItem[]
  initialStudents: StudentListItem[]
  initialTeachers: TeacherListItem[]
  initialSettings: IDCardSettingsRow | null
  institution: any
  institutionId: string
}

// Inline component to render image with graceful initials fallback
function CardPhoto({
  src,
  name,
  isCircle,
  borderColor,
}: {
  src: string | null | undefined
  name: string
  isCircle: boolean
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
  const shapeClass = isCircle ? 'rounded-full' : 'rounded-xl'

  if (src && !error) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setError(true)}
        crossOrigin="anonymous"
        className={`w-[60px] h-[60px] object-cover border-2 shadow-sm ${shapeClass}`}
        style={borderStyle}
      />
    )
  }

  return (
    <div
      className={`w-[60px] h-[60px] flex items-center justify-center text-sm font-bold text-white shadow-sm border-2 ${shapeClass}`}
      style={{
        backgroundColor: 'var(--primary)',
        ...borderStyle,
      }}
    >
      {getInitials(name)}
    </div>
  )
}

function IDCard({
  person,
  type,
  side,
  template,
  theme,
  institution,
}: {
  person: any
  type: 'student' | 'teacher'
  side: 'front' | 'back'
  template: 'template_1' | 'template_2' | 'template_3'
  theme: any
  institution: any
}) {
  const primaryColor = theme?.colors?.primary ?? '#0D1B2A'
  const secondaryColor = theme?.colors?.secondary ?? '#D4AF37'
  const creamColor = theme?.colors?.cream ?? '#F7F3EB'
  const charcoalColor = theme?.colors?.charcoal ?? '#333333'
  const steelGrayColor = theme?.colors?.steelGray ?? '#6B7280'
  const whiteColor = theme?.colors?.white ?? '#FFFFFF'
  const lightGrayColor = theme?.colors?.lightGray ?? '#E5E7EB'

  const name = person?.full_name || 'Name Placeholder'
  const code = type === 'student' ? person?.student_code : person?.employee_code
  
  // Format subtitle
  const subtitle = type === 'student'
    ? `Class ${person?.class_name || 'N/A'} - Sec ${person?.section_name || 'N/A'}`
    : (person?.specialization || 'Teacher')

  const logoUrl = institution?.logo_url
  const instName = institution?.name || 'Institution Name'
  const instAddress = institution?.address || 'Institution Address'

  // Initials fallback
  const getInitials = (n: string) => {
    const parts = n.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return n.slice(0, 2).toUpperCase()
  }

  const renderLogoSection = (isLight: boolean) => {
    const textColor = isLight ? primaryColor : whiteColor
    return (
      <div className="flex items-center gap-1.5">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={instName}
            crossOrigin="anonymous"
            className="w-6 h-6 object-contain rounded-md bg-white p-0.5"
          />
        ) : (
          <div
            style={{ backgroundColor: isLight ? primaryColor : secondaryColor, color: isLight ? whiteColor : primaryColor }}
            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
          >
            {getInitials(instName)}
          </div>
        )}
        <span className="text-[10px] font-bold tracking-tight truncate max-w-[120px]" style={{ color: textColor }}>
          {instName}
        </span>
      </div>
    )
  }

  // --- TEMPLATE 1: Diagonal Block ---
  if (template === 'template_1') {
    if (side === 'front') {
      return (
        <div
          className="w-[324px] h-[204px] border border-gray-200 rounded-2xl shadow-sm relative overflow-hidden bg-white flex flex-col justify-between p-3 select-none"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {/* Angled header background */}
          <div
            className="absolute top-0 left-0 w-full h-[54px] z-0"
            style={{
              backgroundColor: primaryColor,
              clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0 100%)',
            }}
          />
          {/* Header content */}
          <div className="relative z-10 flex items-start justify-between">
            {renderLogoSection(false)}
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/20 text-white leading-none">
              {type === 'student' ? 'Student' : 'Staff'}
            </span>
          </div>

          {/* Photo & Basic Details */}
          <div className="flex items-center gap-3 mt-4 relative z-10 px-1">
            <CardPhoto
              src={person?.profile_photo_url}
              name={name}
              isCircle={true}
              borderColor={whiteColor}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold truncate" style={{ color: charcoalColor, fontFamily: 'var(--font-heading)' }}>
                {name}
              </h3>
              <p className="text-[10px] font-semibold truncate" style={{ color: steelGrayColor }}>
                {subtitle}
              </p>
            </div>
          </div>

          {/* Stacked Details Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 relative z-10 mt-1">
            <div>
              <span className="block text-[8px] uppercase tracking-wider" style={{ color: steelGrayColor }}>
                ID Number
              </span>
              <span className="block text-[10px] font-bold truncate" style={{ color: charcoalColor }}>
                {code || 'N/A'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] uppercase tracking-wider" style={{ color: steelGrayColor }}>
                {type === 'student' ? 'DOB' : 'Joined'}
              </span>
              <span className="block text-[10px] font-bold truncate" style={{ color: charcoalColor }}>
                {type === 'student'
                  ? (person?.date_of_birth ? new Date(person.date_of_birth).toLocaleDateString('en-GB') : 'N/A')
                  : (person?.date_of_joining ? new Date(person.date_of_joining).toLocaleDateString('en-GB') : 'N/A')
                }
              </span>
            </div>
            <div>
              <span className="block text-[8px] uppercase tracking-wider" style={{ color: steelGrayColor }}>
                Phone
              </span>
              <span className="block text-[10px] font-bold truncate" style={{ color: charcoalColor }}>
                {type === 'student' ? (person?.guardian_phone || 'N/A') : (person?.phone || 'N/A')}
              </span>
            </div>
          </div>
        </div>
      )
    } else {
      // Back side
      return (
        <div
          className="w-[324px] h-[204px] border border-gray-200 rounded-2xl shadow-sm relative overflow-hidden bg-white flex flex-col justify-between p-3 select-none text-center"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {/* Angled header background */}
          <div
            className="absolute top-0 left-0 w-full h-[36px] z-0"
            style={{
              backgroundColor: primaryColor,
              clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)',
            }}
          />
          <div className="relative z-10 h-6 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white tracking-wide">{instName}</span>
          </div>

          {/* Institution Address */}
          <p className="text-[9px] px-4 mt-3 leading-tight" style={{ color: steelGrayColor }}>
            {instAddress}
          </p>

          {/* Details */}
          <div className="flex-1 flex flex-col justify-center gap-1 my-1 px-6">
            {type === 'student' ? (
              <>
                <div className="flex justify-between items-center text-[9px] border-b border-gray-100 pb-0.5">
                  <span style={{ color: steelGrayColor }}>Blood Group</span>
                  <span className="font-bold" style={{ color: charcoalColor }}>{person?.blood_group || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] border-b border-gray-100 pb-0.5">
                  <span style={{ color: steelGrayColor }}>Guardian Name</span>
                  <span className="font-bold truncate max-w-[120px]" style={{ color: charcoalColor }}>{person?.guardian_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] border-b border-gray-100 pb-0.5">
                  <span style={{ color: steelGrayColor }}>Guardian Phone</span>
                  <span className="font-bold" style={{ color: charcoalColor }}>{person?.guardian_phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] border-b border-gray-100 pb-0.5">
                  <span style={{ color: steelGrayColor }}>Address</span>
                  <span className="font-bold truncate max-w-[120px]" style={{ color: charcoalColor }} title={person?.address || ''}>{person?.address || 'N/A'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center text-[9px] border-b border-gray-100 pb-0.5">
                  <span style={{ color: steelGrayColor }}>Qualification</span>
                  <span className="font-bold" style={{ color: charcoalColor }}>{person?.qualification || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] border-b border-gray-100 pb-0.5">
                  <span style={{ color: steelGrayColor }}>Address</span>
                  <span className="font-bold truncate max-w-[120px]" style={{ color: charcoalColor }} title={person?.address || ''}>{person?.address || 'N/A'}</span>
                </div>
              </>
            )}
          </div>

          {/* Signature Line */}
          <div className="flex flex-col items-center justify-end mt-1">
            <div className="w-24 border-t border-gray-300 mb-0.5"></div>
            <span className="text-[8px] uppercase tracking-wider font-semibold" style={{ color: steelGrayColor }}>
              Authorized Signatory
            </span>
          </div>
        </div>
      )
    }
  }

  // --- TEMPLATE 2: Circular Accent ---
  if (template === 'template_2') {
    if (side === 'front') {
      return (
        <div
          className="w-[324px] h-[204px] border border-gray-200 rounded-2xl shadow-sm relative overflow-hidden bg-white flex flex-col justify-between select-none"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {/* Header band */}
          <div
            className="w-full h-[40px] px-3 flex items-center justify-between"
            style={{ backgroundColor: primaryColor }}
          >
            {renderLogoSection(false)}
            <span
              className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded leading-none"
              style={{ backgroundColor: secondaryColor, color: primaryColor }}
            >
              {type === 'student' ? 'Student' : 'Staff'}
            </span>
          </div>

          {/* Main content body */}
          <div className="flex-1 p-3 flex gap-3 items-center">
            <div className="flex-shrink-0">
              <CardPhoto
                src={person?.profile_photo_url}
                name={name}
                isCircle={true}
                borderColor={secondaryColor}
              />
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
              <h3 className="text-sm font-bold truncate" style={{ color: charcoalColor, fontFamily: 'var(--font-heading)' }}>
                {name}
              </h3>
              <p className="text-[10px] font-semibold text-secondary mb-2 leading-none">
                {subtitle}
              </p>

              {/* soft rounded panel for details */}
              <div className="p-2 rounded-xl border border-gray-100 flex flex-col gap-1" style={{ backgroundColor: creamColor }}>
                <div className="flex justify-between items-center text-[9px]">
                  <span style={{ color: steelGrayColor }}>ID No:</span>
                  <span className="font-bold truncate max-w-[80px]" style={{ color: charcoalColor }}>{code || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-[9px]">
                  <span style={{ color: steelGrayColor }}>{type === 'student' ? 'DOB:' : 'Joined:'}</span>
                  <span className="font-bold truncate" style={{ color: charcoalColor }}>
                    {type === 'student'
                      ? (person?.date_of_birth ? new Date(person.date_of_birth).toLocaleDateString('en-GB') : 'N/A')
                      : (person?.date_of_joining ? new Date(person.date_of_joining).toLocaleDateString('en-GB') : 'N/A')
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Thin accent footer band */}
          <div className="w-full h-[8px]" style={{ backgroundColor: secondaryColor }} />
        </div>
      )
    } else {
      // Back side
      return (
        <div
          className="w-[324px] h-[204px] border border-gray-200 rounded-2xl shadow-sm relative overflow-hidden bg-white flex flex-col justify-between select-none"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {/* Header band */}
          <div
            className="w-full h-[40px] px-3 flex items-center justify-center"
            style={{ backgroundColor: primaryColor }}
          >
            <span className="text-[10px] font-bold text-white tracking-wide truncate">{instName}</span>
          </div>

          {/* Address panel */}
          <div className="flex-1 p-3 flex flex-col justify-between">
            <p className="text-[9px] text-center leading-tight px-2" style={{ color: steelGrayColor }}>
              {instAddress}
            </p>

            {/* Details panel */}
            <div className="p-2 rounded-xl border border-gray-100 flex flex-col gap-0.5 mt-0.5 mx-2" style={{ backgroundColor: creamColor }}>
              {type === 'student' ? (
                <>
                  <div className="flex justify-between items-center text-[9px]">
                    <span style={{ color: steelGrayColor }}>Blood Group:</span>
                    <span className="font-bold" style={{ color: charcoalColor }}>{person?.blood_group || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px]">
                    <span style={{ color: steelGrayColor }}>Guardian Name:</span>
                    <span className="font-bold truncate max-w-[120px]" style={{ color: charcoalColor }}>{person?.guardian_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px]">
                    <span style={{ color: steelGrayColor }}>Guardian Phone:</span>
                    <span className="font-bold" style={{ color: charcoalColor }}>{person?.guardian_phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px]">
                    <span style={{ color: steelGrayColor }}>Address:</span>
                    <span className="font-bold truncate max-w-[120px]" style={{ color: charcoalColor }} title={person?.address || ''}>{person?.address || 'N/A'}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center text-[9px]">
                    <span style={{ color: steelGrayColor }}>Qualification:</span>
                    <span className="font-bold" style={{ color: charcoalColor }}>{person?.qualification || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px]">
                    <span style={{ color: steelGrayColor }}>Address:</span>
                    <span className="font-bold truncate max-w-[120px]" style={{ color: charcoalColor }} title={person?.address || ''}>{person?.address || 'N/A'}</span>
                  </div>
                </>
              )}
            </div>

            {/* Signature */}
            <div className="flex flex-col items-center justify-end mt-2">
              <div className="w-20 border-t border-gray-300 mb-0.5"></div>
              <span className="text-[8px] uppercase tracking-wider font-semibold" style={{ color: steelGrayColor }}>
                Authorized Signatory
              </span>
            </div>
          </div>

          {/* Thin accent footer band */}
          <div className="w-full h-[8px]" style={{ backgroundColor: secondaryColor }} />
        </div>
      )
    }
  }

  // --- TEMPLATE 3: Minimal Band ---
  if (template === 'template_3') {
    if (side === 'front') {
      return (
        <div
          className="w-[324px] h-[204px] border border-gray-200 rounded-2xl shadow-sm relative overflow-hidden bg-white flex flex-col justify-between p-3 select-none"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {/* Thin top accent band */}
          <div className="absolute top-0 left-0 w-full h-[6px]" style={{ backgroundColor: secondaryColor }} />

          {/* Header */}
          <div className="flex items-center justify-between mt-1 pb-2 border-b border-gray-100">
            {renderLogoSection(true)}
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md leading-none bg-gray-50" style={{ color: primaryColor }}>
              {type === 'student' ? 'Student' : 'Staff'}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center gap-3.5 my-2">
            <div className="flex-shrink-0">
              <CardPhoto
                src={person?.profile_photo_url}
                name={name}
                isCircle={false}
                borderColor={lightGrayColor}
              />
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="text-sm font-bold truncate" style={{ color: charcoalColor, fontFamily: 'var(--font-heading)' }}>
                {name}
              </h3>
              <p className="text-[10px] font-semibold" style={{ color: primaryColor }}>
                {subtitle}
              </p>

              <div className="mt-2 space-y-0.5">
                <div className="text-[9px] flex items-center gap-1">
                  <span className="w-12 text-gray-400">ID No:</span>
                  <span className="font-bold" style={{ color: charcoalColor }}>{code || 'N/A'}</span>
                </div>
                <div className="text-[9px] flex items-center gap-1">
                  <span className="w-12 text-gray-400">Phone:</span>
                  <span className="font-bold" style={{ color: charcoalColor }}>
                    {type === 'student' ? (person?.guardian_phone || 'N/A') : (person?.phone || 'N/A')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Thin bottom band */}
          <div className="absolute bottom-0 left-0 w-full h-[6px]" style={{ backgroundColor: primaryColor }} />
        </div>
      )
    } else {
      // Back side
      return (
        <div
          className="w-[324px] h-[204px] border border-gray-200 rounded-2xl shadow-sm relative overflow-hidden bg-white flex flex-col justify-between p-3 select-none"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {/* Thin top accent band */}
          <div className="absolute top-0 left-0 w-full h-[6px]" style={{ backgroundColor: secondaryColor }} />

          {/* Header */}
          <div className="text-center mt-1 pb-1 border-b border-gray-100">
            <span className="text-[10px] font-bold tracking-tight" style={{ color: primaryColor }}>{instName}</span>
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col justify-center gap-1 py-1 px-4 mt-1">
            <p className="text-[8px] text-center leading-tight mb-2" style={{ color: steelGrayColor }}>
              {instAddress}
            </p>
            
            {type === 'student' ? (
              <>
                <div className="flex justify-between items-center text-[9px] border-b border-gray-50 pb-0.5">
                  <span style={{ color: steelGrayColor }}>Blood Group</span>
                  <span className="font-bold" style={{ color: charcoalColor }}>{person?.blood_group || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] border-b border-gray-50 pb-0.5">
                  <span style={{ color: steelGrayColor }}>Guardian Name</span>
                  <span className="font-bold truncate max-w-[120px]" style={{ color: charcoalColor }}>{person?.guardian_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] border-b border-gray-50 pb-0.5">
                  <span style={{ color: steelGrayColor }}>Guardian Phone</span>
                  <span className="font-bold" style={{ color: charcoalColor }}>{person?.guardian_phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] border-b border-gray-50 pb-0.5">
                  <span style={{ color: steelGrayColor }}>Address</span>
                  <span className="font-bold truncate max-w-[120px]" style={{ color: charcoalColor }} title={person?.address || ''}>{person?.address || 'N/A'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center text-[9px] border-b border-gray-50 pb-0.5">
                  <span style={{ color: steelGrayColor }}>Qualification</span>
                  <span className="font-bold" style={{ color: charcoalColor }}>{person?.qualification || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] border-b border-gray-50 pb-0.5">
                  <span style={{ color: steelGrayColor }}>Address</span>
                  <span className="font-bold truncate max-w-[120px]" style={{ color: charcoalColor }} title={person?.address || ''}>{person?.address || 'N/A'}</span>
                </div>
              </>
            )}
          </div>

          {/* Signature */}
          <div className="flex flex-col items-center mt-1 pb-1">
            <div className="w-20 border-t border-gray-300 mb-0.5"></div>
            <span className="text-[8px] uppercase tracking-wider font-semibold" style={{ color: steelGrayColor }}>
              Authorized Signatory
            </span>
          </div>

          {/* Thin bottom band */}
          <div className="absolute bottom-0 left-0 w-full h-[6px]" style={{ backgroundColor: primaryColor }} />
        </div>
      )
    }
  }

  return null
}

export default function IDCardsClient({
  classes,
  allSections,
  initialStudents,
  initialTeachers,
  initialSettings,
  institution,
  institutionId,
}: IDCardsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<'students' | 'staff'>('students')
  const [selectedTemplate, setSelectedTemplate] = useState<'template_1' | 'template_2' | 'template_3'>(
    (initialSettings?.selected_template as any) || 'template_1'
  )
  
  // Selections
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set())

  // Previews
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null)
  const [highlightedTeacherId, setHighlightedTeacherId] = useState<string | null>(null)

  // Statuses
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [genError, setGenError] = useState<string | null>(null)

  // Staff search
  const [teacherSearch, setTeacherSearch] = useState('')

  // Theme colors
  const theme = institution?.theme
  const primaryColor = theme?.colors?.primary ?? '#0D1B2A'
  const secondaryColor = theme?.colors?.secondary ?? '#D4AF37'
  const charcoalColor = theme?.colors?.charcoal ?? '#333333'
  const whiteColor = theme?.colors?.white ?? '#FFFFFF'

  // Set default highlighted item
  useEffect(() => {
    if (initialStudents.length > 0 && !highlightedStudentId) {
      setHighlightedStudentId(initialStudents[0].id)
    }
  }, [initialStudents, highlightedStudentId])

  useEffect(() => {
    if (initialTeachers.length > 0 && !highlightedTeacherId) {
      setHighlightedTeacherId(initialTeachers[0].id)
    }
  }, [initialTeachers, highlightedTeacherId])

  // Filter teachers client-side to prevent URL search param collision
  const filteredTeachers = initialTeachers.filter(t => 
    t.full_name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.employee_code.toLowerCase().includes(teacherSearch.toLowerCase())
  )

  // Handle template selection & persistence
  const handleTemplateChange = async (tpl: 'template_1' | 'template_2' | 'template_3') => {
    setSelectedTemplate(tpl)
    setIsSavingTemplate(true)
    try {
      const res = await saveIdCardSettingsAction(institutionId, tpl)
      if (!res.success) {
        console.error('Failed to save default template:', res.error)
      }
    } catch (err) {
      console.error('Error saving template:', err)
    } finally {
      setIsSavingTemplate(false)
    }
  }

  // Get active highlighted person
  const activeStudent = initialStudents.find(s => s.id === highlightedStudentId) || initialStudents[0]
  const activeTeacher = filteredTeachers.find(t => t.id === highlightedTeacherId) || filteredTeachers[0]

  // Checkbox handlers
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

  const handleToggleTeacher = (id: string) => {
    setSelectedTeacherIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Select all visible items
  const handleSelectAllStudents = (checked: boolean) => {
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev)
      initialStudents.forEach(s => {
        if (checked) {
          newSet.add(s.id)
        } else {
          newSet.delete(s.id)
        }
      })
      return newSet
    })
  }

  const handleSelectAllTeachers = (checked: boolean) => {
    setSelectedTeacherIds(prev => {
      const newSet = new Set(prev)
      filteredTeachers.forEach(t => {
        if (checked) {
          newSet.add(t.id)
        } else {
          newSet.delete(t.id)
        }
      })
      return newSet
    })
  }

  const clearSelection = () => {
    if (activeTab === 'students') {
      setSelectedStudentIds(new Set())
    } else {
      setSelectedTeacherIds(new Set())
    }
  }

  // Reference for off-screen cards rendering
  const exportContainerRef = useRef<HTMLDivElement>(null)
  const [generatingIds, setGeneratingIds] = useState<string[] | null>(null)

  // Trigger PDF Generation
  const generatePDF = async () => {
    const selectedIds = activeTab === 'students' ? Array.from(selectedStudentIds) : Array.from(selectedTeacherIds)
    if (selectedIds.length === 0) return

    setIsGenerating(true)
    setGenProgress(0)
    setGenError(null)
    setGeneratingIds(selectedIds)
  }

  // Effect to capture rendered DOM elements after they're mounted off-screen
  useEffect(() => {
    if (!generatingIds || generatingIds.length === 0) return

    const runRenderFlow = async () => {
      try {
        // Wait a frame for React to render the hidden elements
        await new Promise(resolve => setTimeout(resolve, 300))

        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        })

        const total = generatingIds.length
        
        // A4 Dimensions: 210mm x 297mm
        // CR80 Sizing: 85.6mm x 54mm
        const cardWidth = 85.6
        const cardHeight = 54
        const gapY = 4 // gap between rows
        const startX = (210 - (cardWidth * 2)) / 2 // Center the pair: ~19.4mm margin
        const startY = 10 // top margin
        const cardsPerPage = 5

        for (let i = 0; i < total; i++) {
          const id = generatingIds[i]
          
          setGenProgress(Math.round((i / total) * 100))

          // Retrieve DOM elements
          const frontEl = document.getElementById(`export-front-${id}`)
          const backEl = document.getElementById(`export-back-${id}`)

          if (!frontEl || !backEl) {
            console.error(`Export DOM elements not found for ID: ${id}`)
            continue
          }

          // Render front & back using html2canvas
          // scale: 2 double resolution for professional print look
          const frontCanvas = await html2canvas(frontEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false,
          })

          const backCanvas = await html2canvas(backEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false,
          })

          const frontData = frontCanvas.toDataURL('image/jpeg', 1.0)
          const backData = backCanvas.toDataURL('image/jpeg', 1.0)

          // Page maths
          const pageIndex = Math.floor(i / cardsPerPage)
          const slotIndex = i % cardsPerPage

          if (i > 0 && slotIndex === 0) {
            doc.addPage()
          }

          const currentY = startY + slotIndex * (cardHeight + gapY)

          // Draw dashed fold & outer cut lines
          doc.setDrawColor(180, 180, 180)
          doc.setLineWidth(0.1)
          
          // Outer cut lines (dashed)
          doc.setLineDashPattern([2, 1.5], 0)
          doc.rect(startX, currentY, cardWidth * 2, cardHeight, 'S')
          
          // Center fold line (finer dash/dotted)
          doc.setLineDashPattern([1, 1.5], 0)
          doc.line(startX + cardWidth, currentY, startX + cardWidth, currentY + cardHeight)

          // Add images
          doc.addImage(frontData, 'JPEG', startX, currentY, cardWidth, cardHeight)
          doc.addImage(backData, 'JPEG', startX + cardWidth, currentY, cardWidth, cardHeight)
        }

        const roleName = activeTab === 'students' ? 'students' : 'staff'
        const dateStr = new Date().toISOString().split('T')[0]
        doc.save(`id-cards-${roleName}-${dateStr}.pdf`)

        // Finish
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

  // Helpers
  const selectedCount = activeTab === 'students' ? selectedStudentIds.size : selectedTeacherIds.size
  const isAllStudentsSelected = initialStudents.length > 0 && initialStudents.every(s => selectedStudentIds.has(s.id))
  const isAllTeachersSelected = filteredTeachers.length > 0 && filteredTeachers.every(t => selectedTeacherIds.has(t.id))

  const getInitials = (n: string) => {
    const parts = n.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-6 font-body pb-24">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-gray/60 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading">ID Cards Generator</h1>
          <p className="text-steel-gray mt-1 text-sm font-caption">
            Configure templates, select students or staff records, and generate double-sided printable ID Card PDFs.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Column: Template Selection + Filter List */}
        <div className="xl:col-span-2 space-y-6">
          {/* Template Selection Panel */}
          <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-charcoal font-heading">Choose Layout Template</h2>
              {isSavingTemplate && (
                <span className="text-xs text-steel-gray flex items-center gap-1.5 font-caption animate-pulse">
                  <svg className="animate-spin h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving default...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Template 1 Selector */}
              <button
                onClick={() => handleTemplateChange('template_1')}
                className={`border rounded-2xl p-3 text-left transition-all hover:shadow-md cursor-pointer flex flex-col items-center justify-center space-y-2 relative ${
                  selectedTemplate === 'template_1'
                    ? 'border-primary ring-2 ring-primary bg-primary/[0.02]'
                    : 'border-light-gray hover:border-steel-gray/40'
                }`}
              >
                <div
                  className="w-full h-12 rounded-lg bg-cover bg-center flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider relative overflow-hidden"
                  style={{ backgroundColor: primaryColor }}
                >
                  <div
                    className="absolute inset-0 z-0"
                    style={{
                      backgroundColor: primaryColor,
                      clipPath: 'polygon(0 0, 100% 0, 100% 75%, 0 100%)',
                    }}
                  />
                  <span className="relative z-10 font-heading">Diagonal Block</span>
                </div>
                <div className="text-center">
                  <span className="block text-xs font-bold text-charcoal">Template 1</span>
                  <span className="block text-[10px] text-steel-gray mt-0.5">Angled blocks & circle photo</span>
                </div>
              </button>

              {/* Template 2 Selector */}
              <button
                onClick={() => handleTemplateChange('template_2')}
                className={`border rounded-2xl p-3 text-left transition-all hover:shadow-md cursor-pointer flex flex-col items-center justify-center space-y-2 relative ${
                  selectedTemplate === 'template_2'
                    ? 'border-primary ring-2 ring-primary bg-primary/[0.02]'
                    : 'border-light-gray hover:border-steel-gray/40'
                }`}
              >
                <div
                  className="w-full h-12 rounded-lg bg-cover bg-center flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider relative overflow-hidden border-b-4"
                  style={{ backgroundColor: primaryColor, borderBottomColor: secondaryColor }}
                >
                  <span className="font-heading">Circular Accent</span>
                </div>
                <div className="text-center">
                  <span className="block text-xs font-bold text-charcoal">Template 2</span>
                  <span className="block text-[10px] text-steel-gray mt-0.5">Solid header & accent border</span>
                </div>
              </button>

              {/* Template 3 Selector */}
              <button
                onClick={() => handleTemplateChange('template_3')}
                className={`border rounded-2xl p-3 text-left transition-all hover:shadow-md cursor-pointer flex flex-col items-center justify-center space-y-2 relative ${
                  selectedTemplate === 'template_3'
                    ? 'border-primary ring-2 ring-primary bg-primary/[0.02]'
                    : 'border-light-gray hover:border-steel-gray/40'
                }`}
              >
                <div className="w-full h-12 rounded-lg flex flex-col justify-between border-y-2 relative overflow-hidden bg-white" style={{ borderColor: secondaryColor }}>
                  <div className="w-full h-1" style={{ backgroundColor: secondaryColor }} />
                  <div className="flex-1 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider" style={{ color: primaryColor }}>
                    Minimal Band
                  </div>
                  <div className="w-full h-1" style={{ backgroundColor: primaryColor }} />
                </div>
                <div className="text-center">
                  <span className="block text-xs font-bold text-charcoal">Template 3</span>
                  <span className="block text-[10px] text-steel-gray mt-0.5">Square-rounded photo frame</span>
                </div>
              </button>
            </div>
          </div>

          {/* Toggle Tab */}
          <div className="flex border-b border-light-gray/60 gap-4">
            <button
              onClick={() => {
                setActiveTab('students')
                clearSelection()
              }}
              style={{
                borderBottomColor: activeTab === 'students' ? primaryColor : 'transparent',
                color: activeTab === 'students' ? primaryColor : 'var(--steel-gray)',
              }}
              className="px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer font-heading"
            >
              Students
            </button>
            <button
              onClick={() => {
                setActiveTab('staff')
                clearSelection()
              }}
              style={{
                borderBottomColor: activeTab === 'staff' ? primaryColor : 'transparent',
                color: activeTab === 'staff' ? primaryColor : 'var(--steel-gray)',
              }}
              className="px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer font-heading"
            >
              Staff
            </button>
          </div>

          {/* Filter bars */}
          {activeTab === 'students' ? (
            <StudentFilterBar classes={classes} allSections={allSections} />
          ) : (
            <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm">
              <label htmlFor="teacherSearch" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Search Staff
              </label>
              <div className="relative">
                <input
                  id="teacherSearch"
                  type="text"
                  placeholder="Search staff by name or employee code..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="w-full bg-cream/35 border border-light-gray/60 hover:border-steel-gray/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 pl-10 pr-4 text-sm font-body text-charcoal placeholder-steel-gray/50 transition-all outline-none"
                />
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-steel-gray/50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* List Directory Table */}
          <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
            {activeTab === 'students' ? (
              initialStudents.length === 0 ? (
                <div className="py-16 text-center text-steel-gray/60 text-sm font-body max-w-md mx-auto space-y-3">
                  <h3 className="text-base font-bold text-charcoal font-heading">No Students Found</h3>
                  <p className="text-xs text-steel-gray/80 px-4">
                    Adjust filters above or check the inputs.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-light-gray/60 bg-cream/15">
                        <th className="py-4 px-6 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={isAllStudentsSelected}
                            onChange={(e) => handleSelectAllStudents(e.target.checked)}
                            className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                          />
                        </th>
                        <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Name</th>
                        <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Student Code</th>
                        <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Roll No</th>
                        <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Class & Section</th>
                        <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-gray/40">
                      {initialStudents.map((student) => {
                        const isSelected = selectedStudentIds.has(student.id)
                        const isHighlighted = highlightedStudentId === student.id
                        return (
                          <tr
                            key={student.id}
                            onClick={() => setHighlightedStudentId(student.id)}
                            className={`hover:bg-cream/10 transition-colors cursor-pointer ${
                              isHighlighted ? 'bg-primary/[0.03] font-medium' : ''
                            }`}
                          >
                            <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleStudent(student.id)}
                                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                              />
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                {student.profile_photo_url ? (
                                  <img
                                    src={student.profile_photo_url}
                                    alt={student.full_name}
                                    crossOrigin="anonymous"
                                    className="w-8 h-8 rounded-full object-cover border border-light-gray/60"
                                  />
                                ) : (
                                  <div
                                    style={{ backgroundColor: primaryColor }}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                                  >
                                    {getInitials(student.full_name)}
                                  </div>
                                )}
                                <span className="text-sm text-charcoal">{student.full_name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-sm text-charcoal font-semibold">
                              {student.student_code}
                            </td>
                            <td className="py-4 px-6 text-sm text-steel-gray">
                              {student.roll_number}
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-sm font-bold text-primary mr-1.5">
                                Class {student.class_name}
                              </span>
                              <span className="text-xs text-steel-gray px-1.5 py-0.5 bg-cream/40 border border-light-gray/40 rounded-md">
                                {student.section_name}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                style={{ color: primaryColor }}
                                className="text-xs font-bold hover:underline cursor-pointer"
                              >
                                Preview
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              filteredTeachers.length === 0 ? (
                <div className="py-16 text-center text-steel-gray/60 text-sm font-body max-w-md mx-auto space-y-3">
                  <h3 className="text-base font-bold text-charcoal font-heading">No Staff Found</h3>
                  <p className="text-xs text-steel-gray/80 px-4">
                    Clear the search term and try again.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-light-gray/60 bg-cream/15">
                        <th className="py-4 px-6 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={isAllTeachersSelected}
                            onChange={(e) => handleSelectAllTeachers(e.target.checked)}
                            className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                          />
                        </th>
                        <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Name</th>
                        <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Employee Code</th>
                        <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Role/Specialization</th>
                        <th className="py-4 px-6 text-xs font-bold text-steel-gray uppercase tracking-wider font-caption text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-gray/40">
                      {filteredTeachers.map((teacher) => {
                        const isSelected = selectedTeacherIds.has(teacher.id)
                        const isHighlighted = highlightedTeacherId === teacher.id
                        return (
                          <tr
                            key={teacher.id}
                            onClick={() => setHighlightedTeacherId(teacher.id)}
                            className={`hover:bg-cream/10 transition-colors cursor-pointer ${
                              isHighlighted ? 'bg-primary/[0.03] font-medium' : ''
                            }`}
                          >
                            <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleTeacher(teacher.id)}
                                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                              />
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                {teacher.profile_photo_url ? (
                                  <img
                                    src={teacher.profile_photo_url}
                                    alt={teacher.full_name}
                                    crossOrigin="anonymous"
                                    className="w-8 h-8 rounded-full object-cover border border-light-gray/60"
                                  />
                                ) : (
                                  <div
                                    style={{ backgroundColor: primaryColor }}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                                  >
                                    {getInitials(teacher.full_name)}
                                  </div>
                                )}
                                <span className="text-sm text-charcoal">{teacher.full_name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-sm text-charcoal font-semibold">
                              {teacher.employee_code}
                            </td>
                            <td className="py-4 px-6 text-sm text-steel-gray">
                              {teacher.specialization || 'Teacher'}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                style={{ color: primaryColor }}
                                className="text-xs font-bold hover:underline cursor-pointer"
                              >
                                Preview
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Column: Sticky Live Preview Panel */}
        <div className="space-y-6 lg:sticky lg:top-6">
          <div className="bg-white border border-light-gray/60 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="border-b border-light-gray/40 pb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-charcoal font-heading">Card Preview</h2>
              <span className="text-[10px] uppercase font-bold text-steel-gray bg-cream py-0.5 px-2 rounded">
                CR80 size
              </span>
            </div>

            <div className="flex flex-col items-center gap-5">
              {/* Front Side */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-steel-gray block text-center">Front Side</span>
                <IDCard
                  person={activeTab === 'students' ? activeStudent : activeTeacher}
                  type={activeTab === 'students' ? 'student' : 'teacher'}
                  side="front"
                  template={selectedTemplate}
                  theme={theme}
                  institution={institution}
                />
              </div>

              {/* Back Side */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-steel-gray block text-center">Back Side</span>
                <IDCard
                  person={activeTab === 'students' ? activeStudent : activeTeacher}
                  type={activeTab === 'students' ? 'student' : 'teacher'}
                  side="back"
                  template={selectedTemplate}
                  theme={theme}
                  institution={institution}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Panel */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-light-gray/60 px-6 py-4 flex items-center justify-between z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] animate-slide-up">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-xs font-semibold text-steel-gray block font-caption">Selected Count</span>
            <span className="text-base font-bold text-primary font-heading">
              {selectedCount} {activeTab === 'students' ? 'Student' : 'Staff'} Card{selectedCount !== 1 ? 's' : ''}
            </span>
          </div>
          {selectedCount > 0 && (
            <button
              onClick={clearSelection}
              className="text-xs font-bold text-danger hover:underline cursor-pointer"
            >
              Clear Selection
            </button>
          )}
        </div>

        <button
          onClick={generatePDF}
          disabled={selectedCount === 0 || isGenerating}
          style={{
            backgroundColor: selectedCount > 0 ? primaryColor : 'var(--light-gray)',
            color: selectedCount > 0 ? whiteColor : 'var(--steel-gray)',
          }}
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-5 w-5 mr-3 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating PDF ({genProgress}%)
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate ID Cards
            </>
          )}
        </button>
      </div>

      {/* Hidden container for PDF capture (rendered off-screen, absolute positioning) */}
      {generatingIds && generatingIds.length > 0 && (
        <div
          ref={exportContainerRef}
          style={{ position: 'absolute', left: '-9999px', top: '0px', pointerEvents: 'none' }}
          className="bg-transparent flex flex-col gap-2"
        >
          {generatingIds.map((id) => {
            const person = activeTab === 'students'
              ? initialStudents.find(s => s.id === id)
              : initialTeachers.find(t => t.id === id)
            return (
              <div key={`export-wrapper-${id}`} className="flex gap-0 border border-transparent bg-white">
                <div id={`export-front-${id}`}>
                  <IDCard
                    person={person}
                    type={activeTab === 'students' ? 'student' : 'teacher'}
                    side="front"
                    template={selectedTemplate}
                    theme={theme}
                    institution={institution}
                  />
                </div>
                <div id={`export-back-${id}`}>
                  <IDCard
                    person={person}
                    type={activeTab === 'students' ? 'student' : 'teacher'}
                    side="back"
                    template={selectedTemplate}
                    theme={theme}
                    institution={institution}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Error display */}
      {genError && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-danger text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 max-w-md">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium">{genError}</span>
          <button onClick={() => setGenError(null)} className="ml-auto text-white hover:text-gray-200 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
