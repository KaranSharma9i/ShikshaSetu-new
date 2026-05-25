---
name: Modern Gurukul
colors:
  surface: '#fef9f1'
  surface-dim: '#ded9d2'
  surface-bright: '#fef9f1'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f3eb'
  surface-container: '#f2ede5'
  surface-container-high: '#ece8e0'
  surface-container-highest: '#e7e2da'
  on-surface: '#1d1c17'
  on-surface-variant: '#44474c'
  inverse-surface: '#32302b'
  inverse-on-surface: '#f5f0e8'
  outline: '#74777d'
  outline-variant: '#c4c6cc'
  surface-tint: '#525f71'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#0f1c2c'
  on-primary-container: '#778598'
  inverse-primary: '#bac8dc'
  secondary: '#755b00'
  on-secondary: '#ffffff'
  secondary-container: '#fed977'
  on-secondary-container: '#785d00'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002020'
  on-tertiary-container: '#009393'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e4f9'
  primary-fixed-dim: '#bac8dc'
  on-primary-fixed: '#0f1c2c'
  on-primary-fixed-variant: '#3a4859'
  secondary-fixed: '#ffe08f'
  secondary-fixed-dim: '#e6c364'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#584400'
  tertiary-fixed: '#72f6f6'
  tertiary-fixed-dim: '#51dad9'
  on-tertiary-fixed: '#002020'
  on-tertiary-fixed-variant: '#004f50'
  background: '#fef9f1'
  on-background: '#1d1c17'
  surface-variant: '#e7e2da'
typography:
  display:
    fontFamily: Poppins
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
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
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 14px
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 13px
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
  margin-mobile: 16px
  gutter-mobile: 12px
---

## Brand & Style

The design system embodies a "Modern Academic" aesthetic, bridging the gap between traditional educational prestige and contemporary digital efficiency. It is designed for students, parents, and educators who value discipline, growth, and clarity. 

The visual language uses a **Corporate / Modern** base, characterized by structured layouts and clear hierarchies. To differentiate from standard enterprise software, it incorporates heritage-inspired accents—specifically the use of gold and navy—to evoke a sense of an established institution. The interface feels trustworthy and authoritative yet remains approachable through the use of soft-edged cards and warm background tones.

**Key Visual Principles:**
- **Prestige:** Deep navy and metallic gold reinforce a tradition of excellence.
- **Clarity:** Heavy focus on information architecture to manage complex academic data (grades, schedules, attendance).
- **Nurturing:** A warm cream base prevents the "clinical" feel of typical SaaS, making the digital environment feel more like a physical campus.

## Colors

The palette is anchored by institutional heritage colors balanced against modern functional accents.

- **Primary (Navy Blue):** Used for top-level navigation, headers, and core structural elements. It conveys stability and authority.
- **Secondary (Gold):** Reserved for primary actions, active navigation states, and high-achievement badges. It should be used sparingly as a "halo" accent to maintain its premium feel.
- **Tertiary (Teal):** Dedicated to positive performance metrics, growth indicators, and "success" notifications.
- **Page Background (Cream):** A warm, low-strain alternative to pure white that provides a soft canvas for the elevated white cards.
- **Surface (White):** Used exclusively for interactive cards and data containers to create a "layered" effect against the cream background.
- **Functional Red:** Used for low performance, alerts, or absent statuses to provide immediate visual friction.

## Typography

This design system utilizes a dual-typeface system to balance character with readability.

**Poppins** is used for all headings and emphasized text. Its geometric construction feels modern, while its bold weights provide the "boldness" required for an academic brand.

**Inter** is the workhorse for all body text, labels, and data-heavy tables. Its high legibility at small sizes is critical for mobile screens where student records and schedules are viewed.

**Hierarchy Rules:**
- Use **Display** styles for dashboard greetings or big numerical scores.
- Use **Label-lg** for navigation items and button text.
- Maintain a minimum of 20px line height for body text to ensure readability for longer-form academic descriptions.

## Layout & Spacing

The system follows a **4px baseline grid** to ensure consistency across all components.

**Mobile Layout:**
- **Margins:** A fixed 16px outer margin on mobile devices.
- **Grid:** A 4-column fluid layout for vertical feeds.
- **Vertical Rhythm:** Use 24px (lg) spacing between distinct sections or card groups, and 16px (md) spacing between elements within a group.

**Component Spacing:**
- Cards should utilize 16px internal padding for standard content.
- List items within cards should use 12px vertical padding to maintain a dense but breathable information density.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** supplemented by **Ambient Shadows**.

- **Level 0 (Background):** The warm cream (`#F5F0E8`) background is the base.
- **Level 1 (Cards):** White surfaces (`#FFFFFF`) sitting on the cream background. They feature a subtle, diffused shadow: `0px 4px 12px rgba(13, 27, 42, 0.05)`. This shadow uses a navy tint rather than pure black to keep the depth feeling natural.
- **Level 2 (Active/Floating):** Used for modals or floating action buttons. These use a more pronounced shadow: `0px 8px 24px rgba(13, 27, 42, 0.12)`.

**Headers:** The Navy top-nav is traditionally flat but uses a gold border (1px) at the bottom to define the edge against the page content.

## Shapes

The shape language is friendly and approachable, utilizing significant corner rounding to soften the "strict" academic feel.

- **Cards:** Use `rounded-2xl` (1rem / 16px) as the standard for all primary content containers.
- **Inputs & Search Bars:** Fully rounded (pill-shaped) to distinguish them from content cards and signal interactivity.
- **Badges & Chips:** Pill-shaped (`rounded-full`) to clearly differentiate them from buttons or data points.
- **Buttons:** Medium rounding (0.5rem) to provide a solid, clickable surface area while remaining consistent with the overall system.

## Components

### Buttons
- **Primary:** Navy background with white text. High emphasis.
- **Secondary:** Gold border with gold text. Used for secondary actions within a card.
- **Ghost:** Teal text with no background. Used for "View All" or "Details" links.

### Data Displays
- **Specialized Tables:** Use a clean, row-based layout with 1px cream dividers. Header rows should be Navy with tiny white Poppins Bold text.
- **Pill Badges:** 
  - *Academic Excellence:* Gold background, Navy text.
  - *Present/Active:* Teal tint background, dark teal text.
  - *Absent/Low:* Red tint background, dark red text.

### Inputs & Filters
- **Search Bars:** White background, pill-shaped, with a subtle Navy icon.
- **Filter Chips:** Light cream background with Navy text; when active, they switch to a Navy background with White text.

### Cards
- **Student/Subject Cards:** Feature a Poppins Bold title, an Inter body description, and a bottom-aligned metadata row using Caption styles.
- **Shadows:** Always apply the subtle Navy-tinted shadow to white cards.