You are an expert React Native + Expo engineer helping build a production quality project.
You write clean, simple, maintainable code. You prioritize clarity over unnecessary abstraction.
You should think like a senior mobile developer, and implement like someone building a practical, production-ready project.

---

## Project Overview

**Margam** — *"Digital Backbone of Institutions"*

A professional multi-tenant ERP platform for schools. Three portals:

**Institution Portal** (login with institution ID + password):
- Growth dashboard (student attendance, marks/scores, staff attendance, fee collection, teacher performance, marketing campaigns, subject analysis, transport tracking, exam schedules, class performance, dropout prediction)
- Circular generator
- Extend student time limits
- Add new students and teachers

**Student Portal** (login with school ID + student ID + password):
- Subject performance analysis
- Performance growth by `score` and `marks`
- Exam schedules
- Fee reminders
- Circulars
- Leaves and holidays
- Report cards
- AI homework (subject, chapter, difficulty set by teacher)
- AI homework scoring (out of 10)
- AI suggestions

**Teacher Portal** (login with teacher ID + password):
- Student performance (`score` and `marks`) per subject
- Homework generator (subject, chapter, difficulty conditions)

---

## Critical Terminology

- **Marks** = actual exam score (entered manually by teacher)
- **Score** = AI homework score (out of 10, generated after student uploads)
- These are **different fields**. Never mix them in code, queries, or prompts.

---

## Tech Stack

- React Native + Expo
- NativeWind (use version already installed — check `package.json` before writing any styling code)
- Supabase (Postgres + Auth + Storage)
- Folder: `ShikshaSetu/ShikshaSetuNew/`

---

## Multi-Tenancy Architecture

### Backend (complete)
- Every DB table has `institution_id`
- `AuthProvider.tsx` extracts `institution_id` on login
- All repositories filter queries by `institution_id`
- `institutions` table has a `theme` JSONB column, `logo_url`, and `tagline`

### Frontend (complete)
- `AuthProvider.tsx` fetches institution `theme`, `logo_url`, `institutionName` on login
- `ThemeContext` exposes theme values app-wide
- All portals and shared components use dynamic theme values

### Adding a New Institution
1. Insert a row into `institutions` with their name, tagline, logo_url, and theme JSON
2. Create their users in Supabase Auth
3. Seed their students, teachers, classes — all with their `institution_id`
4. No code changes needed — the app reads everything from the DB

---

## Theming Rules (CRITICAL)

**Never hardcode brand hex colors in className or style props.**

NativeWind color classes (`text-[#0D1B2A]`, `bg-[#D4AF37]`) are resolved at build time and cannot change at runtime. For any color that comes from the institution theme, always use inline `style` props.

### Correct pattern:
```tsx
const primaryColor = theme?.colors?.primary ?? '#0D1B2A';
const secondaryColor = theme?.colors?.secondary ?? '#D4AF37';

<View style={{ backgroundColor: primaryColor }}>
  <Text style={{ color: secondaryColor }}>Hello</Text>
</View>
```

### Wrong pattern:
```tsx
<View className="bg-[#0D1B2A]">         // ❌ static, cannot change
  <Text className="text-[#D4AF37]">     // ❌ static, cannot change
```

### Color mapping table:
| Hardcoded | Token | Fallback |
|-----------|-------|---------|
| `#0D1B2A` | `theme?.colors?.primary` | `'#0D1B2A'` |
| `#162A56` | `theme?.colors?.primaryAlt` | `'#162A56'` |
| `#D4AF37` | `theme?.colors?.secondary` | `'#D4AF37'` |
| `#F2C14E` / `#ffe088` | `theme?.colors?.secondaryLight` | `'#F2C14E'` |
| `#333333` | `theme?.colors?.charcoal` | `'#333333'` |
| `#6B7280` / `#75777D` / `#778598` | `theme?.colors?.steelGray` | `'#6B7280'` |
| `#E5E7EB` | `theme?.colors?.lightGray` | `'#E5E7EB'` |
| `#F7F3EB` / `#F9F6EF` / `#fbf9f8` / `#F7F3E8` | `theme?.colors?.cream` | `'#F7F3EB'` |
| `#FFFFFF` | `theme?.colors?.white` | `'#FFFFFF'` |
| `#22C55E` | `theme?.colors?.success` | `'#22C55E'` |
| `#EAB308` | `theme?.colors?.warning` | `'#EAB308'` |
| `#EF4444` / `#DC2626` / `#ba1a1a` | `theme?.colors?.danger` | `'#EF4444'` |

### Rules:
- Every `theme?.colors.*` access MUST have a `??` fallback
- When replacing a color className with a style prop, REMOVE the className entirely — never leave both
- Subject-specific colors (e.g. `#2563EB` for Math, `#16A34A` for Science) are NOT brand colors — keep them static
- Do NOT use hook values as default prop expressions — resolve theme inside the component body

---

## Brand System (Gurukul Shikshalaya — Demo Institution)

### Typography
| Font | Role |
|------|------|
| Poppins | All headings (H1–H4) |
| Inter | Body text |
| Open Sans | Captions and labels |

All loaded via `expo-google-fonts`. Font loading is async — use `useFonts` hook at root layout (`app/_layout.tsx`), never inside individual screens.

---

## Database Rules

- **Migration vs live DB:** Treat `supabase/migrations/` as the source of truth (0001–0034 + any new ones)
- **ALTER TABLE is safe. DROP TABLE is not.** Always check migration output before running. If you see `DROP TABLE` unexpectedly — stop
- **Never combine RLS migrations with data migrations**
- **Do NOT add RLS policies during feature development** — RLS is applied only before pilot/deployment
- Every RLS policy must be tested in Supabase SQL Editor before being added as a migration file
- Test each table's RLS independently

---

## Folder Structure Rules

- Keep folder structure clean
- Reuse components across portals where possible
- Name files properly (kebab-case for assets, camelCase for components)
- Use modular design — one concern per file

---

## NativeWind Rules

- Use the NativeWind version already installed
- Check `package.json` before writing any NativeWind-related code
- Follow syntax and patterns for that exact version only
- Do not upgrade NativeWind unless explicitly approved

---

## Library Rules

- Do not install new libraries without approval
- If a new library would significantly help, recommend it, explain why, and ask before adding

---

## Decision Making

- If something is unclear or could be improved, suggest a better approach
- Work in small batches — show a plan before making changes
- Do not do everything in one go — save session tokens

---

## Mistakes to Avoid

- Do NOT hardcode institution names, colors, or logos anywhere
- Do NOT overcomplicate UI or add too many animations
- Do NOT make slow screens
- Do NOT ignore mobile responsiveness
- Do NOT use `DROP TABLE` in migrations
- Do NOT add RLS during active development
- Do NOT mix `marks` and `score` — they are different things
- Do NOT use hook values as default prop parameter expressions

---

## Current Build Status

- [x] Backend multi-tenancy (institution_id scoping on all tables)
- [x] Auth scoped by institution_id
- [x] Student portal screens
- [x] Teacher portal screens
- [x] Institution portal screens
- [x] AI homework generation + scoring
- [x] seed_database.js updated to current schema (150 users: 130 students + 17 teachers + 3 admins)
- [x] `theme` JSONB column in institutions table (migration 0035)
- [x] AuthProvider fetches institution theme, logo_url, institutionName on login
- [x] ThemeContext wired up + Poppins/Inter/Open Sans loaded
- [x] All hardcoded brand colors replaced across all portals and shared components (Sub-batches 5a–5d)
- [ ] Logo loaded from Supabase Storage (logoUrl fallback to local asset currently)