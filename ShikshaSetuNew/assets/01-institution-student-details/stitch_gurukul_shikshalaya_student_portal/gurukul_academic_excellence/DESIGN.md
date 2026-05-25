---
name: Gurukul Academic Excellence
colors:
  surface: '#fbf8fa'
  surface-dim: '#dcd9db'
  surface-bright: '#fbf8fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f5'
  surface-container: '#f0edef'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e3'
  on-surface: '#1b1b1d'
  on-surface-variant: '#45474c'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
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
  background: '#fbf8fa'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e3'
typography:
  h1:
    fontFamily: Poppins
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  h2:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  h3:
    fontFamily: Poppins
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  h4:
    fontFamily: Poppins
    fontSize: 18px
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
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  margin-mobile: 20px
  gutter-mobile: 12px
---

## Brand & Style

The design system is rooted in the "Nurture, Inspire, Empower" philosophy, blending the prestige of traditional academic heritage with modern, accessible digital interfaces. It targets students, educators, and administrators, demanding a visual language that is both authoritative and welcoming.

The style is **Corporate / Modern** with a **Tactile** twist. It utilizes the depth and richness of traditional institutional colors while employing modern spacing and simplified geometry. The emotional response is one of trust, stability, and high-quality educational standards. Layouts are clean and structured, using subtle shadows to create a sense of physical layering, reminiscent of premium parchment on a solid academic foundation.

## Colors

The palette is anchored by **Navy Blue** and **Royal Blue**, used for core branding, headers, and primary actions to establish authority. **Gold** and **Light Gold** serve as high-prestige accents for achievement markers, iconography, and decorative borders.

The background is predominantly **Cream**, providing a softer, more intellectual alternative to pure white, reducing eye strain for long reading sessions. **Charcoal** is utilized for body text to ensure high legibility against the cream background, while secondary text uses a desaturated blue-gray to maintain the cool-toned professional hierarchy.

## Typography

Typography follows a clear functional split: **Poppins** is reserved for headlines and structural titles, offering a geometric yet friendly modern-classical feel. **Inter** is the workhorse for all body content, data, and interface labels, chosen for its exceptional clarity on mobile displays.

Headlines should use the Primary Navy Blue to maintain brand strength. Mobile headlines scale down to ensure they do not break across too many lines, with `h1` set at 32px to remain impactful on compact screens. Use capitalization sparingly—mainly for small labels and category tags to differentiate them from long-form content.

## Layout & Spacing

This design system uses a **Fluid Grid** for mobile, based on a 4-column structure. A standard 20px margin is applied to the left and right of the screen to prevent content from touching the edges of the device.

The vertical rhythm is based on a **4px baseline**, with 16px (md) being the standard spacing between related elements and 24px (lg) being used between distinct sections. Cards in the dashboard layout should utilize the gutter-mobile (12px) to allow for 2-up layouts that maximize screen real estate for data points.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Ambient Shadows**.

1.  **Base Layer:** The Cream (#F7F3E8) surface acts as the canvas.
2.  **Raised Layer:** Cards and UI elements are pure White (#FFFFFF) or very light Cream, using a soft, diffused shadow.
3.  **Shadow Specs:** `0px 4px 12px rgba(13, 24, 42, 0.08)` — Note the use of the Navy Blue in the shadow tint rather than pure black to keep the palette sophisticated and "warm."
4.  **Interaction:** Buttons use a tighter, darker shadow upon hover/active states to imply physical depression.

## Shapes

The shape language is defined as **Rounded**, striking a balance between the rigidity of a traditional institution and the approachability of a modern app. 

Standard components like buttons and cards use a `0.5rem` (8px) radius. Larger containers or "Quick Action" dashboard tiles may use `1rem` (16px) to appear more prominent and friendly. Achievement badges and notification pips use a full pill-shape (circular ends) to contrast against the more structured rectangular cards.

## Components

### Buttons
*   **Primary:** Solid Navy Blue background with White text. Bold, 8px corner radius.
*   **Secondary:** Ghost style with a Gold (#D4AF37) 1.5px border and Gold text. 
*   **Tertiary/Text:** Royal Blue text with a small trailing chevron.

### Cards
*   **Dashboard Tiles:** White background, 12px padding, subtle 8px shadow. Icons within cards should be Gold to signify value.
*   **Academic Cards:** Cream background with a thin Navy Blue top-border (2px) to denote "institutional" sections.

### Navigation
*   **Bottom Bar:** Navy Blue background with Gold active states. Icons are linear for inactive and solid/filled for active.
*   **Header:** Royal Blue with the school crest center-aligned or top-left.

### Inputs & Selection
*   **Input Fields:** White background with a 1px Light Gray border. On focus, the border transitions to Royal Blue.
*   **Chips/Badges:** Soft Light Gold background with Navy Blue text for status or categories (e.g., "Excellence", "Academics").

### Feedback Elements
*   **Success:** Emerald Green (used sparingly, outside primary palette).
*   **Alert:** A deep brick red, consistent with academic "grading" aesthetics.