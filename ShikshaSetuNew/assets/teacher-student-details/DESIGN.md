---
name: Academic Excellence Portal
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
  tertiary-container: '#021945'
  on-tertiary-container: '#7183b4'
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
  tertiary-fixed: '#dae2ff'
  tertiary-fixed-dim: '#b3c5fb'
  on-tertiary-fixed: '#021945'
  on-tertiary-fixed-variant: '#334573'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  h1:
    fontFamily: Poppins
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
  h1-mobile:
    fontFamily: Poppins
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  h2:
    fontFamily: Poppins
    fontSize: 36px
    fontWeight: '600'
    lineHeight: '1.3'
  h2-mobile:
    fontFamily: Poppins
    fontSize: 26px
    fontWeight: '600'
    lineHeight: '1.3'
  h3:
    fontFamily: Poppins
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  h4:
    fontFamily: Poppins
    fontSize: 22px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.6'
  caption:
    fontFamily: Open Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
  label-caps:
    fontFamily: Open Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-margin-mobile: 16px
  container-margin-desktop: 32px
  gutter: 16px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
---

## Brand & Style
The brand personality for this design system is rooted in the "Modern Gurukul" philosophy: a synthesis of traditional academic prestige and forward-thinking digital efficiency. It is designed to evoke a sense of authority, trust, and professional empowerment for educators. 

The visual style follows a **Corporate/Modern** approach with academic accents. It utilizes a sophisticated contrast between deep, scholarly blues and illuminating golds to signify both stability and achievement. The interface prioritizes clarity and structured information density, ensuring that teachers can manage complex tasks—from grading to lesson planning—within a calm, focused environment.

## Colors
This design system employs a "High-Contrast Heritage" palette. The **Navy Blue (#0D1B2A)** serves as the foundational anchor for navigation and primary actions, representing institutional depth. **Gold (#D4AF37)** and its lighter variant are used purposefully for accents, indicators, and achievement-based elements to represent "Light and Knowledge."

The interface utilizes a **Cream (#F7F3EB)** canvas to reduce eye strain during long working hours, with **White (#FFFFFF)** surfaces for cards and content areas to provide crisp legibility. Semantic colors follow industry standards but are calibrated to maintain high visibility against both the light canvas and dark navigation elements.

## Typography
The typographic hierarchy is designed for maximum information retention. **Poppins** provides a geometric, modern confidence for headings, while **Inter** is the workhorse for body content, chosen for its exceptional legibility in data-heavy portal environments. 

**Open Sans** is reserved for metadata, captions, and secondary labels to provide a slight stylistic departure that aids in visual scanning. On mobile devices, H1 and H2 levels are scaled down to ensure titles do not overwhelm the smaller viewport while maintaining their Bold/SemiBold weight to preserve the brand’s authoritative voice.

## Layout & Spacing
This design system utilizes an **8px linear scale** for all spatial relationships. 

- **Mobile First:** The layout centers on a single-column fluid flow with 16px side margins. 
- **Desktop:** Scales to a 12-column grid with a max-width container of 1280px for the primary content area.
- **Navigation Model:** A persistent **Bottom Navigation** bar is the primary mobile driver, featuring the Navy Blue background. On Desktop, this transitions into a structured **Side Drawer** with Gold highlights to denote the active section.
- **Vertical Rhythm:** Use `stack-lg` for separating major content blocks and `stack-md` for elements within a card.

## Elevation & Depth
Hierarchy is established through **Tonal Layering** supplemented by subtle **Ambient Shadows**. 

1. **Level 0 (Canvas):** The Cream background (#F7F3EB).
2. **Level 1 (Surface):** White cards (#FFFFFF) with a very soft, 4% opacity Charcoal shadow (0px 2px 8px).
3. **Level 2 (Interaction):** Floating Action Buttons (FABs) or active dropdowns use a slightly more pronounced shadow (8% opacity) to signify their height above the content.
4. **Navigation:** Nav elements are "fixed" in elevation, using color (Navy Blue) rather than shadow to denote their structural permanence.

## Shapes
A **Rounded (0.5rem / 8px)** shape language is the standard across the design system. This radius provides a professional yet approachable feel that aligns with modern educational software. 

- **Primary Elements:** Buttons and Input fields use the standard 8px radius.
- **Large Surfaces:** Cards and Modals may use `rounded-lg` (16px) to create a softer container for dense information.
- **Badges:** Decorative achievement badges (Excellence, Leadership, etc.) use a fully pill-shaped (rounded-full) radius to distinguish them from functional UI components.

## Components

### Buttons
- **Primary:** Solid Navy (#0D1B2A) fill, White text, 8px radius. High emphasis.
- **Secondary:** Gold (#D4AF37) outline, Navy text, 8px radius. Medium emphasis.
- **Ghost:** No fill or border, Royal Blue text. Low emphasis/Utility.

### Input Fields
- **Default:** White background, Steel Gray (#6B7280) 1px border.
- **Focus State:** Royal Blue (#162A56) 2px border with a soft blue glow.
- **Labels:** Use Inter Medium (14px) in Charcoal.

### Navigation
- **Bottom Nav:** Navy background, Gold (#D4AF37) for the active icon and indicator line. 
- **Side Drawer:** Navy background, Gold vertical bar (4px wide) on the left side of the active list item.

### Achievement Badges
- **Style:** Pill-shaped with a light-tinted background (e.g., Light Gold for Excellence) and a 1px darker border of the same hue.
- **Icons:** Use the specific iconography from the brand sheet (Star for Excellence, Pillar for Leadership, Globe for Global Mindset, Wreath for Achievement).

### Cards
- **Structure:** White surface, 16px padding, 8px corner radius. Used for student profiles, class summaries, and lesson cards.