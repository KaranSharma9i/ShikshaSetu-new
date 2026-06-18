'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { admitStudentAction } from '../actions'

interface ClassItem {
  id: string
  name: string
}

interface SectionItem {
  id: string
  name: string
  class_id: string
  class_name: string
}

interface AdmissionFormProps {
  classes: ClassItem[]
  allSections: SectionItem[]
  defaultStudentCode: string
  institutionId: string
}

export default function AdmissionForm({
  classes,
  allSections,
  defaultStudentCode,
  institutionId
}: AdmissionFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{
    portalId: string
    tempPassword: string
    fullName: string
  } | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [classId, setClassId] = useState('')
  const [sectionName, setSectionName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('Male')
  const [address, setAddress] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  const [studentCode, setStudentCode] = useState(defaultStudentCode)
  const [transport, setTransport] = useState('Self')

  // Filter sections by selected class
  const filteredSections = allSections.filter((sec) => sec.class_id === classId)

  // Determine password preview based on DOB (DDMMYYYY)
  const getPasswordPreview = () => {
    if (!dob) return 'DDMMYYYY'
    const parts = dob.split('-') // YYYY-MM-DD
    if (parts.length === 3) {
      return `${parts[2]}${parts[1]}${parts[0]}`
    }
    return 'DDMMYYYY'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    // Find selected class name
    const selectedClass = classes.find(c => c.id === classId)
    if (!selectedClass) {
      setErrorMsg('Please select a Class')
      setLoading(false)
      return
    }

    if (!sectionName) {
      setErrorMsg('Please select a Section')
      setLoading(false)
      return
    }

    try {
      const res = await admitStudentAction(institutionId, {
        name,
        grade: selectedClass.name,
        dob,
        gender,
        address,
        guardianName,
        guardianPhone,
        guardianEmail,
        studentCode,
        studentEmail,
        transport,
        section: sectionName,
      })

      if (res.success && res.data) {
        setSuccessData(res.data)
      } else {
        setErrorMsg(res.error || 'Admissions transaction failed. Make sure student email is unique.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // Success screen
  if (successData) {
    return (
      <div className="bg-white border border-light-gray/60 rounded-2xl p-8 max-w-xl mx-auto shadow-xl text-center space-y-6 animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-success" />
        
        {/* Success checkmark */}
        <div className="mx-auto w-16 h-16 bg-success/10 border border-success/20 text-success rounded-full flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-charcoal font-heading">Admission Successful!</h2>
          <p className="text-sm text-steel-gray font-caption">
            {successData.fullName} has been registered and active enrollment generated.
          </p>
        </div>

        <div className="bg-cream/35 border border-light-gray/60 rounded-xl p-5 text-left space-y-3 font-body">
          <div className="flex justify-between border-b border-light-gray/40 pb-2.5">
            <span className="text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Student Code / Login ID</span>
            <span className="text-sm font-bold text-primary font-heading">{successData.portalId}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-xs font-bold text-steel-gray uppercase tracking-wider font-caption">Temporary Password</span>
            <span className="text-sm font-extrabold text-charcoal font-heading select-all bg-white px-2 py-0.5 border border-light-gray/50 rounded">{successData.tempPassword}</span>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => {
              // Reset state to admit another
              setSuccessData(null)
              setName('')
              setStudentEmail('')
              setClassId('')
              setSectionName('')
              setDob('')
              setGender('Male')
              setAddress('')
              setGuardianName('')
              setGuardianPhone('')
              setGuardianEmail('')
              setStudentCode('')
              setTransport('Self')
              router.refresh()
            }}
            className="px-5 py-2.5 rounded-xl border border-light-gray hover:bg-cream/15 text-charcoal text-sm font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            Admit Another
          </button>
          <button
            onClick={() => {
              router.push('/dashboard/students')
              router.refresh()
            }}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-alt text-white text-sm font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            Go to Directory
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-light-gray/60 rounded-2xl p-6 md:p-8 max-w-4xl mx-auto shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm leading-relaxed font-body">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 font-body">
        {/* SECTION 1: Personal Details */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-primary font-heading border-b border-light-gray/40 pb-2">1. Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Student Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal"
              />
            </div>
            <div>
              <label htmlFor="studentEmail" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Student Contact Email
              </label>
              <input
                id="studentEmail"
                type="email"
                required
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="e.g. rahul.sharma@gmail.com"
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal"
              />
            </div>
            <div>
              <label htmlFor="dob" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Date of Birth
              </label>
              <input
                id="dob"
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal"
              />
            </div>
            <div>
              <label htmlFor="gender" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Gender
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Residential Address
              </label>
              <textarea
                id="address"
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 104, Green Avenue, Auraiya"
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Guardian Info */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-primary font-heading border-b border-light-gray/40 pb-2">2. Guardian Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="guardianName" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Guardian Name
              </label>
              <input
                id="guardianName"
                type="text"
                required
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="e.g. Amit Sharma"
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal"
              />
            </div>
            <div>
              <label htmlFor="guardianPhone" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Guardian Contact Phone
              </label>
              <input
                id="guardianPhone"
                type="tel"
                required
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal"
              />
            </div>
            <div>
              <label htmlFor="guardianEmail" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Guardian Email Address
              </label>
              <input
                id="guardianEmail"
                type="email"
                required
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                placeholder="e.g. amit.sharma@gmail.com"
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Academic Settings */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-primary font-heading border-b border-light-gray/40 pb-2">3. Academic & Registration Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label htmlFor="classSelect" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Select Class
              </label>
              <select
                id="classSelect"
                required
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value)
                  setSectionName('')
                }}
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal cursor-pointer"
              >
                <option value="">Choose Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    Class {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sectionSelect" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Select Section
              </label>
              <select
                id="sectionSelect"
                required
                disabled={!classId}
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Choose Section</option>
                {filteredSections.map((sec) => (
                  <option key={sec.id} value={sec.name}>
                    Section {sec.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="studentCode" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Student Code (Admission No)
              </label>
              <input
                id="studentCode"
                type="text"
                required
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal font-semibold"
              />
            </div>
            <div>
              <label htmlFor="transport" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Transport Mode
              </label>
              <select
                id="transport"
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal cursor-pointer"
              >
                <option value="Self">Self/Private</option>
                <option value="School Shuttle">School Shuttle</option>
              </select>
            </div>
          </div>
        </div>

        {/* Informative credentials note */}
        <div className="p-4 bg-cream/25 border border-light-gray/40 rounded-xl space-y-2">
          <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider font-heading">Credentials Policy</h4>
          <p className="text-xs text-steel-gray leading-relaxed font-caption">
            Login ID will be the <strong>Student Code</strong>. The student&apos;s temporary password will be auto-generated based on the Date of Birth in the format <strong>{getPasswordPreview()}</strong> (DDMMYYYY, e.g. 14052008 for 14th May 2008).
          </p>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-light-gray/40 flex justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => router.push('/dashboard/students')}
            className="px-5 py-2.5 rounded-xl border border-light-gray hover:bg-cream/15 text-charcoal text-sm font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-alt text-white text-sm font-bold shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing Admission...
              </span>
            ) : (
              'Complete Admission'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
