'use client'

import React, { createContext, useContext } from 'react'

export interface InstitutionTheme {
  colors: {
    primary: string
    primaryAlt: string
    secondary: string
    secondaryLight: string
    charcoal: string
    steelGray: string
    lightGray: string
    cream: string
    white: string
    success: string
    warning: string
    danger: string
  }
  fonts: {
    heading: string
    body: string
    caption: string
  }
}

interface InstitutionContextType {
  institutionName: string
  tagline: string | null
  logoUrl: string | null
  theme: InstitutionTheme | null
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined)

export function InstitutionProvider({
  children,
  institutionName,
  tagline,
  logoUrl,
  theme,
}: {
  children: React.ReactNode
  institutionName: string
  tagline: string | null
  logoUrl: string | null
  theme: InstitutionTheme | null
}) {
  const getFontVar = (fontName: string | undefined, fallback: string) => {
    if (!fontName) return `var(--font-${fallback})`
    const normalized = fontName.toLowerCase().replace(/\s+/g, '')
    if (normalized === 'poppins') return 'var(--font-poppins)'
    if (normalized === 'inter') return 'var(--font-inter)'
    if (normalized === 'opensans' || normalized === 'open-sans') return 'var(--font-open-sans)'
    return `var(--font-${fallback})`
  }

  // Map theme colors and fonts to CSS Custom Properties
  const themeStyles = {
    '--primary': theme?.colors?.primary ?? '#0D1B2A',
    '--primary-alt': theme?.colors?.primaryAlt ?? '#162A56',
    '--secondary': theme?.colors?.secondary ?? '#D4AF37',
    '--secondary-light': theme?.colors?.secondaryLight ?? '#F2C14E',
    '--charcoal': theme?.colors?.charcoal ?? '#333333',
    '--steel-gray': theme?.colors?.steelGray ?? '#6B7280',
    '--light-gray': theme?.colors?.lightGray ?? '#E5E7EB',
    '--cream': theme?.colors?.cream ?? '#F7F3EB',
    '--white': theme?.colors?.white ?? '#FFFFFF',
    '--success': theme?.colors?.success ?? '#22C55E',
    '--warning': theme?.colors?.warning ?? '#EAB308',
    '--danger': theme?.colors?.danger ?? '#EF4444',

    '--font-heading': getFontVar(theme?.fonts?.heading, 'poppins'),
    '--font-body': getFontVar(theme?.fonts?.body, 'inter'),
    '--font-caption': getFontVar(theme?.fonts?.caption, 'open-sans'),
  } as React.CSSProperties

  return (
    <InstitutionContext.Provider value={{ institutionName, tagline, logoUrl, theme }}>
      <div style={themeStyles} className="contents">
        {children}
      </div>
    </InstitutionContext.Provider>
  )
}

export function useInstitution() {
  const context = useContext(InstitutionContext)
  if (context === undefined) {
    throw new Error('useInstitution must be used within an InstitutionProvider')
  }
  return context
}
