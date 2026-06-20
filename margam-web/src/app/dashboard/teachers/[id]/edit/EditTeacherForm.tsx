'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { editTeacherAction } from '../../actions'

interface TeacherProfile {
  id: string
  user_id: string
  employee_code: string
  full_name: string
  email: string | null
  phone: string | null
  status: string
  date_of_birth: string | null
  gender: string | null
  qualification: string | null
  specialization: string | null
  date_of_joining: string | null
  address: string | null
  emergency_contact: string | null
  profile_photo_url: string | null
}

interface EditTeacherFormProps {
  profile: TeacherProfile
  institutionId: string
}

export default function EditTeacherForm({ profile, institutionId }: EditTeacherFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states populated from profile
  const [name, setName] = useState(profile.full_name)
  const [email, setEmail] = useState(profile.email || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [qualification, setQualification] = useState(profile.qualification || '')
  const [specialization, setSpecialization] = useState(profile.specialization || '')
  const [dob, setDob] = useState(profile.date_of_birth || '')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say'>((profile.gender as any) || 'prefer_not_to_say')
  const [dateOfJoining, setDateOfJoining] = useState(profile.date_of_joining || '')
  const [emergencyContact, setEmergencyContact] = useState(profile.emergency_contact || '')
  const [address, setAddress] = useState(profile.address || '')
  const [status, setStatus] = useState<any>(profile.status?.toLowerCase() === 'active' ? 'active' : 'inactive')

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

    try {
      const res = await editTeacherAction(institutionId, profile.id, profile.user_id, {
        fullName: name,
        phone,
        email,
        status,
        gender,
        dateOfBirth: dob,
        qualification,
        specialization,
        dateOfJoining,
        address,
        emergencyContact,
        originalEmail: profile.email || ''
      })

      if (!res.success) {
        setError(res.error || 'Failed to update teacher profile.')
        setLoading(false)
      } else {
        router.push(`/dashboard/teachers/${profile.id}`)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-light-gray/60 rounded-2xl shadow-sm overflow-hidden">
      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        <h2 className="text-xl font-bold text-charcoal font-heading border-b border-light-gray/40 pb-3">
          Teacher Details (Code: {profile.employee_code})
        </h2>

        {error && (
          <div className="p-4 bg-danger/10 text-danger border border-danger/25 rounded-xl text-sm font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        {/* Fields grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
              Full Name <span className="text-danger">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
              Email Address <span className="text-danger">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all"
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
              Account Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e: any) => setStatus(e.target.value)}
              className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all cursor-pointer"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Qualification */}
          <div>
            <label htmlFor="qualification" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
              Qualification
            </label>
            <input
              id="qualification"
              type="text"
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
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all"
            />
          </div>

          {/* DOB */}
          <div>
            <label htmlFor="dob" className="block text-xs font-semibold text-steel-gray uppercase tracking-wider mb-2 font-caption">
              Date of Birth
            </label>
            <input
              id="dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
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
              onChange={(e) => setGender(e.target.value as any)}
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
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-cream/35 border border-light-gray/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm font-body text-charcoal outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-light-gray/40">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/teachers/${profile.id}`)}
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
                Saving Changes...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
