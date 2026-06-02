---
name: Gurukul Shikshalay Digital Design System
colors:
  surface: '#fbf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#44474c'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#74777d'
  outline-variant: '#c4c6cc'
  surface-tint: '#525f71'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#0f1c2c'
  on-primary-container: '#778598'
  inverse-primary: '#bac8dc'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1c1c15'
  on-tertiary-container: '#86847b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e4f9'
  primary-fixed-dim: '#bac8dc'
  on-primary-fixed: '#0f1c2c'
  on-primary-fixed-variant: '#3a4859'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#e6e2d8'
  tertiary-fixed-dim: '#cac6bc'
  on-tertiary-fixed: '#1c1c15'
  on-tertiary-fixed-variant: '#48473f'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  headline-xl:
    fontFamily: Poppins
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  headline-lg:
    fontFamily: Poppins
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Poppins
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.5px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 1px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
---

## Brand & Style

The design system is rooted in the "Gurukul" philosophy—modernizing traditional academic excellence. The brand personality is **authoritative, prestigious, and nurturing**. It targets students, educators, and parents who value disciplined growth and structured learning.

The visual style is **Modern Academic**. It blends the prestige of a traditional institution with the clarity of contemporary SaaS. It uses a clean, light-filled interface with strong structural elements. Key characteristics include:
- **Professionalism:** High-contrast typography and a restrained palette of Navy and Gold.
- **Modernity:** Generous whitespace and high-quality, functional components.
- **Trust:** A structured layout that feels reliable and stable, mirroring the school's heritage.

## Colors

The palette is derived from traditional academic regalia.
- **Navy Blue (Primary):** Used for primary actions, headers, and navigation to establish authority and depth.
- **Gold (Secondary):** Used sparingly for accents, icons, and status highlights to signify excellence and achievement.
- **Cream (Background):** Replaces pure white to provide a softer, more "premium paper" feel that reduces eye strain during long study sessions.
- **Charcoal (Neutral):** Used for primary body text to ensure maximum legibility without the harshness of pure black.
- **Status Colors:** Use "Light Gold" for info/active states and a subtle "Success Green" (#2ECC71) for completed tasks, always keeping the saturation low to match the sophisticated palette.

## Typography

This design system uses a dual-font approach to balance character with functionality.
- **Poppins** handles all headings. Its geometric nature provides a modern, friendly, yet structured look. 
- **Inter** is the workhorse for body text and data-heavy interfaces. It is chosen for its exceptional legibility at small sizes.
- **Case Styling:** Use UPPERCASE with increased letter spacing for "label-sm" (e.g., subject categories or status tags) to create a distinct hierarchy from body text.

## Layout & Spacing

The layout follows a **4px base grid** with a fluid 4-column system for mobile and a 12-column system for desktop.
- **Mobile:** 20px side margins ensure content does not feel cramped against the screen edges.
- **Vertical Rhythm:** Elements within a card use `sm` (8px) spacing, while cards themselves are separated by `md` (16px) or `lg` (24px) depending on content density.
- **Containers:** Content is primarily housed in white cards against a Cream background to create distinct, digestible sections.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Soft Shadows**.
- **Surface 0 (Background):** Cream (#F7F3E8).
- **Surface 1 (Cards/Elements):** Pure White (#FFFFFF).
- **Shadows:** Use extremely soft, low-opacity Navy-tinted shadows (e.g., `rgba(13, 27, 42, 0.05)`) to lift cards off the background without creating visual noise.
- **Dividers:** Use 1px solid borders in "Light Gray" (#E5E7EB) for secondary separation inside cards, rather than additional shadows.

## Shapes

The shape language is **Rounded (0.5rem base)**. 
- **Cards & Input Fields:** Use `rounded-lg` (1rem) to create a friendly, approachable feel that softens the "academic" rigidity.
- **Buttons:** Primary buttons use `rounded-lg` to maintain consistency with cards.
- **Badges:** Status badges use a "Pill" shape (full rounding) to clearly distinguish them from interactive buttons.
- **Selection States:** Use a subtle 2px border in Gold to indicate focus or selection.

## Components

### Buttons
- **Primary:** Navy Blue background with White text. High emphasis.
- **Secondary:** White background with Gold border and Navy text. Medium emphasis.
- **FAB (Floating Action Button):** Navy Blue with a Gold "+" icon, used for creating new assignments or entries.

### Cards (Homework/Lessons)
- **Structure:** Top-aligned subject tag in uppercase Gold text, followed by a bold Headline-sm title. Meta-data (due date, student count) should use Body-sm with small, monochromatic Navy icons.
- **Corner Accent:** A subtle vertical Gold bar on the left edge can be used to indicate "High Priority" items.

### Status Badges
- **Active:** Pale green background with darker green text.
- **Pending:** Pale Gold background with Navy text.
- **Completed:** Navy background with White text.

### Inputs
- **Style:** White background, 1px Light Gray border, 16px horizontal padding. On focus, the border transitions to Gold.

### Banners
- **Dashboard:** Use a Navy Blue background with a subtle Gold geometric pattern (referencing the logo's heraldry) for the student profile/summary area at the top of the screen.