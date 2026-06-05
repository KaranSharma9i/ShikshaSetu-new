---
name: Academic Excellence
colors:
  surface: '#fdf9ee'
  surface-dim: '#dddacf'
  surface-bright: '#fdf9ee'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3e8'
  surface-container: '#f2eee3'
  surface-container-high: '#ece8dd'
  surface-container-highest: '#e6e2d8'
  on-surface: '#1c1c15'
  on-surface-variant: '#45474c'
  inverse-surface: '#313129'
  inverse-on-surface: '#f4f1e6'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#111c2e'
  on-primary-container: '#79849b'
  inverse-primary: '#bcc7df'
  secondary: '#4b5d8c'
  on-secondary: '#ffffff'
  secondary-container: '#b6c8fe'
  on-secondary-container: '#415381'
  tertiary: '#735c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cba72f'
  on-tertiary-container: '#4e3d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fc'
  primary-fixed-dim: '#bcc7df'
  on-primary-fixed: '#111c2e'
  on-primary-fixed-variant: '#3c475b'
  secondary-fixed: '#dae2ff'
  secondary-fixed-dim: '#b3c5fb'
  on-secondary-fixed: '#021945'
  on-secondary-fixed-variant: '#334573'
  tertiary-fixed: '#ffe088'
  tertiary-fixed-dim: '#e9c349'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#574500'
  background: '#fdf9ee'
  on-background: '#1c1c15'
  surface-variant: '#e6e2d8'
typography:
  headline-xl:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Montserrat
    fontSize: 36px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Montserrat
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
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  headline-xl-mobile:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The design system embodies a premium academic identity, blending traditional prestige with modern digital clarity. It targets a scholarly audience—students, educators, and administrators—evoking feelings of trust, heritage, and high aspiration.

The visual style is **Corporate / Modern** with subtle **Academic Traditionalism**. It utilizes a sophisticated "Cream and Navy" foundation, accented by "Royal Gold" to signify achievement and excellence. The aesthetic is characterized by ample whitespace, structured grid systems, and refined ornamentation that mirrors classical institutional branding.

## Colors
The palette is rooted in a deep "Navy Blue" and "Royal Blue" base to convey authority and intelligence. "Gold" is used sparingly for high-impact accents, calls to action, and decorative flourishes.

The background strategy relies on a soft "Cream" (#F7F3E8) rather than pure white to soften the reading experience and lean into a "parchment" or "classic paper" aesthetic. Pure white is reserved for internal card surfaces to create subtle elevation through color contrast. Status colors should be derived from the core palette: Gold for warnings/achievements and Navy for primary information.

## Typography
Typography is a mix of high-impact geometric headers and highly legible sans-serif body text. 

- **Headlines:** Uses Montserrat (as a robust web-safe alternative to Poppins) to provide a clean, modern, yet authoritative presence. Large titles should use "Navy Blue."
- **Body & Labels:** Uses Inter for its exceptional readability in data-heavy academic environments. 
- **Hierarchy:** Maintain a clear vertical rhythm. Captions and small labels should utilize slightly increased letter spacing and the "Steel Gray" color to establish secondary hierarchy.

## Layout & Spacing
The layout follows a **Fixed Grid** system for desktop to maintain the "contained" and "structured" feel of an official institution, transitioning to a fluid model for mobile.

- **Grid:** A 12-column grid with 24px gutters.
- **Sectioning:** Large vertical padding (80px+) between major page sections to emphasize whitespace and premium feel.
- **Mobile:** Scale margins down to 16px. Use single-column layouts for cards and stacked orientations for navigation elements.
- **Rhythm:** All margins and paddings must be multiples of 8px to ensure a consistent, mathematical balance across the UI.

## Elevation & Depth
Depth is achieved through **Tonal Layers** and **Soft Ambient Shadows** rather than heavy skeuomorphism.

- **Surfaces:** The primary background is "Cream." Active containers (cards, modals) use "White" to lift them visually.
- **Shadows:** Use extremely soft, blurred shadows with a slight Navy tint (e.g., `rgba(13, 24, 42, 0.08)`) to avoid a "dirty" gray look.
- **Outlines:** Low-contrast borders in "Light Gray" (#E5E7EB) or "Gold" define boundaries for inputs and secondary buttons without adding visual noise.

## Shapes
The shape language is **Rounded**, reflecting the "nurturing" aspect of the brand values.

- **General:** Standard components (Inputs, Cards) use a 0.5rem (8px) radius.
- **Buttons & Badges:** Use a more pronounced `rounded-lg` (16px) or full pill-shape to make interactive elements feel approachable and distinct from layout containers.
- **Icons:** Should feature rounded terminals and consistent stroke weights to match the Inter typeface.

## Components
- **Buttons:**
    - *Primary:* Navy Blue background, White text, 8px-16px corner radius.
    - *Secondary:* Gold outline, Navy text, 8px-16px corner radius.
    - *Tertiary:* Navy text with a Gold arrow icon; no background.
- **Cards:** White background, 1px Light Gray border, soft Navy shadow. Headers within cards should use the Navy Blue color.
- **Badges/Chips:** Light Gold or Light Navy backgrounds with high-contrast text. Use for categories like "Excellence" or "Leadership."
- **Input Fields:** White background, Light Gray border (Gold on focus), 8px corner radius.
- **Navigation:** Horizontal top bar with Navy Blue icons and text. Use Gold for the active state underline or indicator.
- **Patterning:** Incorporate the "Gold Diamond" pattern (shown in the brand guide) as a subtle background texture for footers or header banners to reinforce the institutional heritage.