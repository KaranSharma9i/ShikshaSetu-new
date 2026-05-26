---
name: Academic Excellence
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
  headline-xl:
    fontFamily: Poppins
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Poppins
    fontSize: 36px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Poppins
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
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
  label-md:
    fontFamily: Open Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Poppins
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system embodies the prestige, heritage, and forward-thinking nature of a modern educational institution. The brand personality is **authoritative yet nurturing**, aiming to evoke a sense of trust, tradition, and global ambition. 

The visual style is **Corporate / Modern** with a focus on high-end editorial clarity. It utilizes a structured hierarchy, generous whitespace to facilitate learning, and sophisticated gold accents to signify achievement and excellence. The aesthetic balances the weight of deep navy tones with the approachability of a warm cream background, creating an environment that feels both elite and welcoming.

## Colors

The palette is anchored by **Navy Blue**, representing stability and intelligence. **Gold** is used strategically as an accent color for interactive elements, badges, and highlights to signify value and success.

- **Primary (Navy Blue):** Used for navigation backgrounds, primary buttons, and headings.
- **Secondary (Gold):** Used for call-to-action borders, active states in navigation, and iconography.
- **Surface & Background:** The main content area utilizes **Cream** for a softer, more sophisticated reading experience than pure white, while **White** is reserved for card surfaces and input backgrounds to provide crisp contrast.
- **Neutrals:** Charcoal and Steel Gray manage the hierarchy of secondary text and borders.

## Typography

The typographic system uses **Poppins** for headlines to provide a modern, geometric, and confident look. **Inter** is the workhorse for body content, chosen for its exceptional legibility in academic and data-heavy contexts. **Open Sans** is used for labels and captions to provide a clear, neutral secondary voice.

- Use **Bold/SemiBold** Poppins for primary titles to establish clear section breaks.
- Maintain a generous line height (1.6) for body text to reduce cognitive load.
- Labels and captions should be used for metadata, form hints, and badge text.

## Layout & Spacing

The design system utilizes a **Fixed Grid** for desktop views (12 columns) and a **Fluid Grid** for mobile devices (4 columns). 

- **Desktop:** 1280px max-width container centered with 48px side margins.
- **Tablet:** 8-column grid with 24px margins.
- **Mobile:** 4-column grid with 16px margins.
- **Rhythm:** A base 8px spacing system guides all internal padding and vertical stack heights to ensure a disciplined, mathematical layout. Content should reflow vertically on mobile, with side-by-side cards stacking into a single column.

## Elevation & Depth

Hierarchy is established primarily through **Tonal Layers** and subtle **Ambient Shadows**.

- **Level 0 (Background):** The Cream (#F7F3EB) base layer.
- **Level 1 (Cards/Surfaces):** White (#FFFFFF) surfaces with a very soft, diffused shadow (0px 4px 20px rgba(13, 27, 42, 0.05)) to create a "lifted" appearance without looking heavy.
- **Level 2 (Dropdowns/Modals):** White surfaces with a more pronounced shadow (0px 10px 30px rgba(13, 27, 42, 0.1)) to indicate clear separation from the content layer.
- **Outlines:** Use Steel Gray (#6B7280) for low-contrast borders on input fields and secondary elements.

## Shapes

The shape language is **Rounded**, reflecting a modern and approachable institution. 

- **Standard Radius:** 8px (0.5rem) for buttons, input fields, and small cards.
- **Large Radius:** 16px (1rem) for containers and primary information sections.
- **Pill:** Reserved exclusively for Badges and Chips to differentiate them from interactive button elements.

## Components

### Buttons
- **Primary:** Navy Blue (#0D1B2A) fill, White text, 8px radius. Use for main actions like "Enroll Now" or "Submit".
- **Secondary:** Gold (#D4AF37) 2px outline, Navy Blue text, 8px radius. Use for alternative actions.
- **Text Button:** Navy Blue text with a Gold arrow icon. Use for "Learn More" or "View All" links.

### Navigation
- **Top App Bar:** White background, Logo on left, Notification and User Avatar on right. Uses a thin Light Gray (#E5E7EB) bottom border.
- **Bottom Nav:** Dark Navy (#0D1B2A) background. Active icons use Gold (#D4AF37), while inactive icons use Steel Gray (#6B7280).

### Cards & Badges
- **Cards:** White background, 16px radius, subtle shadow. Titles in Poppins SemiBold.
- **Badges:** Pill-shaped with light tints of the primary colors. Icons should accompany the label (e.g., a Star for Excellence, a Laurel for Achievement).

### Input Fields
- **Fields:** White background, Steel Gray (#6B7280) 1px border, 8px radius. Active/Focus state uses a Royal Blue (#162A56) border.