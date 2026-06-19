'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-white/60 group-hover:text-white'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"
          />
        </svg>
      ),
    },
    {
      name: 'Students',
      path: '/dashboard/students',
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-white/60 group-hover:text-white'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      name: 'Teachers',
      path: '/dashboard/teachers',
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-white/60 group-hover:text-white'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      name: 'Fees',
      path: '/dashboard/fees',
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-white/60 group-hover:text-white'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      name: 'Circulars',
      path: '/dashboard/circulars',
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-white/60 group-hover:text-white'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
          />
        </svg>
      ),
    },
    {
      name: 'Attendance',
      path: '/dashboard/attendance',
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-white/60 group-hover:text-white'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
    },
    {
      name: 'ID Cards',
      path: '/dashboard/id-cards',
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-white/60 group-hover:text-white'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.333 0 4 .667 4 2v1H5v-1c0-1.333 2.667-2 4-2z"
          />
        </svg>
      ),
    },
    {
      name: 'Admit Cards',
      path: '/dashboard/admit-cards',
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-white/60 group-hover:text-white'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
  ]

  return (
    <aside className="w-64 bg-primary border-r border-black/5 hidden md:flex flex-col py-6 font-body text-white">
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.path
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold font-body transition-all ${
                active
                  ? 'bg-white/15 text-white border-l-4 border-white pl-3'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon(active)}
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
