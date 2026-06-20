'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addTeacherAction } from '../actions'

interface AddTeacherFormProps {
  defaultEmployeeCode: string
  institutionId: string
}

export default function AddTeacherForm({ defaultEmployeeCode, institutionId }: AddTeacherFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [createdTeacher, setCreatedTeacher] = useState<{
    fullName: string
    employeeCode: string
    tempPassword: string
  } | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [employeeCode, setEmployeeCode] = useState(defaultEmployeeCode)
  const [qualification, setQualification] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('prefer_not_to_say')
  const [dateOfJoining, setDateOfJoining] = useState(new Date().toISOString().split('T')[0])
  const [emergencyContact, setEmergencyContact] = useState('')
  const [address, setAddress] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Basic validation
    if (!name.trim()) {
      setError('Full Name is required')
      setLoading(false)
      return
    }
    if (!email.trim()) {
      setError('Email is required')
      setLoading(false)
      return
    }
    if (!dob) {
      setError('Date of Birth is required')
      setLoading(false)
      return
    }
    if (!employeeCode.trim()) {
      setError('Employee Code is required')
      setLoading(false)
      return
    }

    try {
      const res = await addTeacherAction(institutionId, {
        name,
        email,
        phone,
        employeeCode,
        qualification,
        specialization,
        dob,
        gender,
        dateOfJoining,
        emergencyContact,
        address
      })

      if (!res.success) {
        setError(res.error || 'Failed to create teacher account.')
        setLoading(false)
      } else {
        setCreatedTeacher({
          fullName: res.data?.fullName || name,
          employeeCode: res.data?.employeeCode || employeeCode,
          tempPassword: res.data?.tempPassword || ''
        })
        setShowSuccessModal(true)
        setLoading(false)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  const handleCopyPassword = () => {
    if (createdTeacher?.tempPassword) {
      navigator.clipboard.writeText(createdTeacher.tempPassword)
      alert('Password copied to clipboard!')
    }
  }

  const handleCloseModal = () => {
    setShowSuccessModal(false)
    router.push('/dashboard/teachers')
  }

  return (
    <div className="space-y-6">
      {/* Form Container */}
      <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-charcoal font-heading border-b border-light-gray/40 pb-3">
            Teacher Information
          </h2>

          {error && (
            <div className="p-4 bg-danger/10 text-danger border border-danger/25 rounded-xl text-sm font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="Enter full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all"
              />
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Email Address <span className="text-danger">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="teacher@institution.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all"
              />
            </div>

            {/* Employee Code */}
            <div>
              <label htmlFor="employeeCode" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Employee Code <span className="text-danger">*</span>
              </label>
              <input
                id="employeeCode"
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                required
                className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all"
              />
            </div>

            {/* Qualification */}
            <div>
              <label htmlFor="qualification" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Qualification
              </label>
              <input
                id="qualification"
                type="text"
                placeholder="e.g. M.Sc, B.Ed"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all"
              />
            </div>

            {/* Specialization */}
            <div>
              <label htmlFor="specialization" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Specialization / Subject
              </label>
              <input
                id="specialization"
                type="text"
                placeholder="e.g. Mathematics, Science"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dob" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Date of Birth <span className="text-danger">*</span>
              </label>
              <input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all"
              />
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Gender
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all cursor-pointer"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer Not to Say</option>
              </select>
            </div>

            {/* Date of Joining */}
            <div>
              <label htmlFor="doj" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Date of Joining
              </label>
              <input
                id="doj"
                type="date"
                value={dateOfJoining}
                onChange={(e) => setDateOfJoining(e.target.value)}
                className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all"
              />
            </div>

            {/* Emergency Contact */}
            <div>
              <label htmlFor="emergencyContact" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Emergency Contact Number
              </label>
              <input
                id="emergencyContact"
                type="tel"
                placeholder="Enter emergency contact number"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
                Residential Address
              </label>
              <textarea
                id="address"
                placeholder="Enter residential address"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-light-gray/40">
            <button
              type="button"
              onClick={() => router.push('/dashboard/teachers')}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-steel-gray hover:text-primary bg-white hover:bg-cream/20 border border-light-gray rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Registering...
                </>
              ) : (
                'Register Teacher'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && createdTeacher && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-light-gray max-w-md w-full shadow-2xl p-6 md:p-8 space-y-6 animate-scale-up">
            <div className="text-center space-y-2">
              <div className="p-3 bg-success/10 text-success rounded-full w-fit mx-auto border border-success/20">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-charcoal font-heading">Registration Successful</h3>
              <p className="text-steel-gray text-xs font-caption">
                The teacher credentials and profile have been created.
              </p>
            </div>

            <div className="bg-cream/40 border border-light-gray/60 rounded-xl p-4 space-y-3 font-body text-sm">
              <div className="flex justify-between">
                <span className="text-steel-gray text-xs font-caption">Name:</span>
                <span className="font-bold text-charcoal">{createdTeacher.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel-gray text-xs font-caption">Employee Code:</span>
                <span className="font-semibold text-charcoal">{createdTeacher.employeeCode}</span>
              </div>
              <div className="border-t border-light-gray/40 pt-2 flex flex-col gap-1.5">
                <span className="text-steel-gray text-xs font-caption">Temporary Password:</span>
                <div className="flex items-center justify-between bg-white border border-light-gray/60 rounded-lg px-3 py-2">
                  <span className="font-mono font-bold text-primary tracking-wider">{createdTeacher.tempPassword}</span>
                  <button
                    onClick={handleCopyPassword}
                    className="text-xs font-bold text-secondary hover:text-secondary-light transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy
                  </button>
                </div>
                <span className="text-[10px] text-steel-gray/80 italic font-body">
                  Password is generated automatically based on DOB (DDMMYYYY).
                </span>
              </div>
            </div>

            <button
              onClick={handleCloseModal}
              className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-bold text-primary bg-secondary hover:bg-secondary-light border border-secondary/20 rounded-xl transition-all cursor-pointer"
            >
              Done & Return to Directory
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
