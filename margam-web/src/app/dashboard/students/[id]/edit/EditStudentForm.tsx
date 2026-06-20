'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { editStudentAction } from '../../actions'
import { StudentProfile } from '@/lib/repositories/student'

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

interface EditStudentFormProps {
  profile: StudentProfile
  classes: ClassItem[]
  allSections: SectionItem[]
  institutionId: string
}

export default function EditStudentForm({
  profile,
  classes,
  allSections,
  institutionId
}: EditStudentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form states prefilled from profile
  const [fullName, setFullName] = useState(profile.full_name)
  const [email, setEmail] = useState(profile.email)
  const [phone, setPhone] = useState(profile.phone || '')
  
  // Resolve current class ID based on class_name
  const initialClass = classes.find(c => c.name === profile.class_name)
  const [classId, setClassId] = useState(initialClass?.id || '')
  
  // Filter sections by selected class
  const filteredSections = allSections.filter((sec) => sec.class_id === classId)
  
  // Resolve current section ID based on section_name and classId
  const initialSection = allSections.find(s => s.class_id === classId && s.name === profile.section_name)
  const [sectionId, setSectionId] = useState(initialSection?.id || '')

  const [dob, setDob] = useState(profile.date_of_birth || '')
  const [gender, setGender] = useState(profile.gender || 'male')
  const [bloodGroup, setBloodGroup] = useState(profile.blood_group || 'O+')
  const [address, setAddress] = useState(profile.address || '')
  const [guardianName, setGuardianName] = useState(profile.guardian_name || '')
  const [guardianPhone, setGuardianPhone] = useState(profile.guardian_phone || '')
  const [guardianEmail, setGuardianEmail] = useState(profile.guardian_email || '')
  const [rollNumber, setRollNumber] = useState(profile.roll_number)
  const [status, setStatus] = useState<'active' | 'suspended' | 'inactive'>(
    (profile.status as any) || 'active'
  )

  // Sync sectionId when classId changes
  useEffect(() => {
    if (classId !== initialClass?.id) {
      setSectionId('') // Reset section when class changes
    }
  }, [classId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    if (!classId) {
      setErrorMsg('Please select a Class')
      setLoading(false)
      return
    }

    if (!sectionId) {
      setErrorMsg('Please select a Section')
      setLoading(false)
      return
    }

    try {
      const res = await editStudentAction(institutionId, profile.id, profile.user_id, {
        fullName,
        phone,
        email,
        status,
        gender: gender as any,
        dateOfBirth: dob,
        bloodGroup,
        address,
        guardianName,
        guardianPhone,
        guardianEmail,
        sectionId,
        rollNumber,
        originalEmail: profile.email,
      })

      if (res.success) {
        setSuccessMsg('Student profile updated successfully!')
        setTimeout(() => {
          router.push(`/dashboard/students/${profile.id}`)
          router.refresh()
        }, 1500)
      } else {
        setErrorMsg(res.error || 'Failed to update student profile. Check details.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-light-gray/60 rounded-2xl p-6 md:p-8 max-w-4xl mx-auto shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm leading-relaxed font-body">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm leading-relaxed font-body">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 font-body">
        {/* SECTION 1: Personal Details */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-primary font-heading border-b border-light-gray/40 pb-2">1. Personal Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Student Full Name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Student Email (Auth ID)
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label htmlFor="phone" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Contact Phone
              </label>
              <input
                id="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 99999 88888"
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal"
              />
            </div>
            <div>
              <label htmlFor="bloodGroup" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Blood Group
              </label>
              <input
                id="bloodGroup"
                type="text"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                placeholder="e.g. O+, A-, B+"
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal"
              />
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
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Academic Settings */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-primary font-heading border-b border-light-gray/40 pb-2">3. Academic & Enrolment Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label htmlFor="classSelect" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Select Class
              </label>
              <select
                id="classSelect"
                required
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
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
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Choose Section</option>
                {filteredSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Section {sec.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="rollNumber" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Roll Number
              </label>
              <input
                id="rollNumber"
                type="text"
                required
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal"
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-xs font-bold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Enrolment Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-cream/25 border border-light-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-charcoal cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-light-gray/40 flex justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => router.push(`/dashboard/students/${profile.id}`)}
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
                Saving Changes...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
