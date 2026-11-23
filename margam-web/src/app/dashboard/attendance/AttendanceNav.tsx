'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/dashboard/attendance/mark', label: 'Mark Students' },
  { href: '/dashboard/attendance/staff', label: 'Mark Staff' },
  { href: '/dashboard/attendance/leaves', label: 'Leave Requests' },
  { href: '/dashboard/attendance', label: 'Reports & Analytics' },
]

export default function AttendanceNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Attendance sections" className="flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const active = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold border transition-all ${
              active
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white text-steel-gray border-light-gray/60 hover:text-primary hover:border-primary/40'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
