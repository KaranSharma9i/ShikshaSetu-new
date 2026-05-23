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
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Poppins
    fontSize: 20px
    fontWeight: '600'
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
    lineHeight: 20px
  label-sm:
    fontFamily: Open Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  caption:
    fontFamily: Open Sans
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
  headline-lg-mobile:
    fontFamily: Poppins
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  margin-mobile: 1rem
  gutter: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
  section-padding: 2rem
---

## Brand & Style

The design system is rooted in the "Corporate / Modern" style with a strong "Academic Traditionalist" influence. It targets students, parents, and educators, evoking a sense of prestige, heritage, and disciplined growth. 

The aesthetic balances the weight of institutional authority with modern mobile usability. It uses a high-contrast relationship between deep navy backgrounds and light cream surfaces to create a "digital campus" feel. Visual elements should feel grounded and reliable, using structured layouts and premium accents to signify quality and achievement.

## Colors

This design system utilizes a sophisticated palette that mirrors academic regalia and institutional crests.

- **Primary & Tertiary:** Navy Blue and Royal Blue are the foundation of the interface, used for navigation, headers, and high-impact actions.
- **Accent Gold:** Gold and Light Gold are reserved for "moments of achievement"—badges, primary outlines, and status indicators that signify excellence.
- **Neutrals:** Charcoal is used for maximum legibility of body text, while Steel Gray and Light Gray manage borders and disabled states.
- **Surfaces:** The interface primarily sits on Cream and White backgrounds to maintain a warm, scholarly atmosphere that is easier on the eyes than pure high-contrast white.

## Typography

The typography strategy employs a hierarchical scale to ensure academic content remains scannable and authoritative. 

**Poppins** is used for headings to provide a modern, geometric clarity that feels contemporary. **Inter** handles the heavy lifting of body text, chosen for its exceptional legibility on mobile screens at small sizes. **Open Sans** is utilized for captions and labels to provide a subtle humanist touch to technical data and metadata.

## Layout & Spacing

This design system follows a **fluid grid** model optimized for mobile-first consumption. 

- **Grid:** A 4-column grid for mobile devices with a standard 16px (1rem) margin and gutter.
- **Rhythm:** An 8px base unit drives all spacing. Elements should be stacked using `stack-md` (16px) for related content and `stack-lg` (24px) for distinct sections.
- **Reflow:** On tablets, the grid expands to 8 columns, increasing side margins to 32px to maintain a comfortable line length for educational reading.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** rather than aggressive shadows.

1. **Base:** The Cream (#F7F3EB) background acts as the canvas.
2. **Cards:** White (#FFFFFF) surfaces sit on top of the cream background with a subtle 1px border (#E5E7EB) or an extremely soft, low-opacity neutral shadow to suggest a slight lift.
3. **Overlays:** Side drawers and bottom navigation use the Navy Blue (#0D1B2A) to "anchor" the experience, appearing as the highest level of the Z-axis, effectively framing the light content areas.

## Shapes

The shape language is "Soft" (0.25rem / 4px to 8px). This creates a professional and structured appearance without being overly sharp (which feels aggressive) or overly rounded (which feels too casual). 

Buttons and Input fields specifically use an **8px (rounded-lg)** radius to provide a comfortable touch target while maintaining the system's architectural integrity.

## Components

- **Primary Button:** Navy Blue (#0D1B2A) fill with White text. 8px border radius. Used for the main call to action (e.g., "Enroll Now", "Submit Assignment").
- **Secondary Button:** Transparent background with a Gold (#D4AF37) 2px outline and Gold text. 8px border radius.
- **Input Fields:** Steel Gray (#6B7280) 1px border on a White background. Labels use Open Sans semi-bold.
- **Badges:** 
    - *Excellence:* Gold background, Navy text.
    - *Leadership:* Royal Blue background, White text.
    - *Global Mindset:* Steel Gray background, White text.
    - *Achievement:* Cream background, Gold text/border.
- **Bottom Navigation:** Solid Navy Blue background. Icons and active states should use Gold (#D4AF37) for high visibility.
- **Cards:** White background, 8px radius, 1px Light Gray border. Used for course modules, news updates, and student profiles.
- **Side Drawer:** Navy Blue background with Gold accents for the header section and White text for navigation links.