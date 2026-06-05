# Margam — Session Context
> Resume from here. Do not start from scratch.

---

## What This File Is

This captures a planning session (June 2026) about making Margam a proper **multi-tenant app**. Use this to brief Claude Code before starting work.

---

## Project Summary

- **App name:** Margam — *"Digital Backbone of Institutions"*
- **Stack:** React Native + Expo, NativeWind, Supabase
- **Folder:** `ShikshaSetu/ShikshaSetuNew/`
- **Three portals:** Student, Teacher, Institution (admin)

---

## The Core Question That Was Answered

> "Is this a tenant project — can I add a new institution with their name, logo and theme easily?"

**Answer: Backend YES, Frontend NO (yet).**

### What's already working (multi-tenant ready)
- Every DB table (`institutions`, `students`, `teachers`, `homework`, etc.) has `institution_id`
- `AuthProvider.tsx` extracts `institution_id` on login
- All repositories filter queries by `institution_id`
- The hard architectural work is done

### What's NOT done yet (frontend)
- `schoolData.ts` has "Gurukul Shikshalaya" hardcoded
- Colors like `#0D1B2A` and `#D4AF37` are scattered across **32+ screens** as raw Tailwind classes
- Logo is loaded from local bundle: `require("../assets/gurukul.png")`
- There is no `ThemeContext` or dynamic theme provider
- No `theme` JSONB column in the `institutions` table yet

---

## Brand System (Gurukul Shikshalaya — Current Demo Institution)

This is the complete design system from the official brand infographic. Use this as the reference for all theming work.

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#0D1B2A` | Navy Blue — main background, primary text |
| `primaryAlt` | `#162A56` | Royal Blue — hover states, secondary backgrounds |
| `secondary` | `#D4AF37` | Gold — CTAs, highlights, accent |
| `secondaryLight` | `#F2C14E` | Light Gold — chips, soft highlights |
| `charcoal` | `#333333` | Body text on light backgrounds |
| `steelGray` | `#6B7280` | Subtext, placeholders |
| `lightGray` | `#E5E7EB` | Borders, dividers |
| `cream` | `#F7F3EB` | Page backgrounds, card backgrounds |
| `white` | `#FFFFFF` | Card surfaces, input fields |
| `success` | `#22C55E` | Success states, passing grades |
| `warning` | `#EAB308` | Warnings, pending status |
| `danger` | `#EF4444` | Errors, failed, overdue |

### Typography

Three fonts are used — all available via `expo-google-fonts`.

| Font | Role |
|------|------|
| **Poppins** | All headings (H1–H4) |
| **Inter** | Body text (Large, Medium, Small) |
| **Open Sans** | Captions and labels |

#### Type Scale

| Level | Font | Weight | Size | Line Height |
|-------|------|--------|------|-------------|
| H1 | Poppins | Bold (700) | 48px | 1.2 |
| H2 | Poppins | SemiBold (600) | 36px | 1.3 |
| H3 | Poppins | SemiBold (600) | 28px | 1.3 |
| H4 | Poppins | Medium (500) | 22px | 1.4 |
| Body Large | Inter | Regular (400) | 16px | 1.6 |
| Body Medium | Inter | Regular (400) | 14px | 1.6 |
| Body Small | Inter | Regular (400) | 13px | 1.6 |
| Caption | Open Sans | Regular (400) | 12px | 1.4 |

---

## Theme JSON Structure (for `institutions` table)

This is what gets stored in the `theme` JSONB column per institution. Fonts are stored as font family names — the app loads them via `expo-google-fonts`.

```json
{
  "colors": {
    "primary": "#0D1B2A",
    "primaryAlt": "#162A56",
    "secondary": "#D4AF37",
    "secondaryLight": "#F2C14E",
    "charcoal": "#333333",
    "steelGray": "#6B7280",
    "lightGray": "#E5E7EB",
    "cream": "#F7F3EB",
    "white": "#FFFFFF",
    "success": "#22C55E",
    "warning": "#EAB308",
    "danger": "#EF4444"
  },
  "fonts": {
    "heading": "Poppins",
    "body": "Inter",
    "caption": "OpenSans"
  }
}
```

**Why JSONB (not individual columns):** Adding a new color for any institution = just update the JSON. No migration needed. Different institutions can have completely different palettes.

---

## The Plan (Do In Batches — Save Tokens)

---

### Batch 1 — Fix `seed_database.js` (Do After Meeting)

**Why first:** Before any schema changes,I need a seed file that matches my *actual current schema* so you can safely reset the DB if needed.

**Prompt :**
```
Read all migration files in supabase/migrations/ from 0001 to 0036 in order.
Build a complete picture of the current schema.
Then rewrite seed_database.js to match that schema exactly.
Seed: 1 institution, 3 institution_admins, 17 teachers, 130 students.
Keep data realistic but minimal. Do NOT drop any tables.
```

**Scale:** 150 users total (not 1400). 130 students + 17 teachers + 3 admins.

**Warning3
:** Do not recreate tables. Use INSERT only. The schema already exists.

---

### Batch 2 — Add Theme Column to `institutions` Table

Create a new migration file: `0035_add_theme_to_institutions.sql`

```sql
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{}'::jsonb;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS tagline TEXT;
```

Then seed the Gurukul Shikshalaya institution row with the full theme JSON above.

**Safe — `ALTER TABLE ADD COLUMN` does not drop data.**

> NOTE: Do NOT use individual color columns (`primary_color`, `secondary_color` etc.).
> Use a single `theme JSONB` column. This was a deliberate decision made in the planning session.

---

### Batch 3 — Update `AuthProvider.tsx`

After login, fetch the institution's theme details and store in context.

- Modify `fetchUserProfile` to also query the `institutions` table for: `name`, `tagline`, `logo_url`, `theme`
- Parse the `theme` JSON and store colors + fonts in `AuthContext`
- Always use fallback defaults in case a key is missing:
  ```ts
  const primaryColor = institution.theme?.colors?.primary ?? '#0D1B2A';
  ```

---

### Batch 4 — Create `ThemeContext` + Load Fonts

- Add a `ThemeContext` (or extend `AuthContext`) that exposes theme values
- Map colors to CSS variables in `global.css`
- Wire up in `tailwind.config.js` so `text-primary`, `bg-primary`, `text-secondary` etc. work
- Load **Poppins, Inter, Open Sans** via `expo-google-fonts` at the root layout
- Font loading is async — use the `useFonts` hook and block render until fonts are ready (prevents flash of unstyled text)

---

### Batch 5 — Replace Hardcoded Colors (Do in Sub-batches)

Search and replace `#0D1B2A`, `#D4AF37`, `#162A56`, `#F2C14E` across screens.

Do portal by portal to keep sessions short:
- Sub-batch 5a: Student portal screens
- Sub-batch 5b: Teacher portal screens
- Sub-batch 5c: Institution portal screens
- Sub-batch 5d: Shared components (`Header.tsx`, `BottomNavBar.tsx`, etc.)

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `constants/schoolData.ts` | Hardcoded branding — needs to become dynamic |
| `constants/theme.ts` | Static theme colors — will be replaced by ThemeContext |
| `src/providers/AuthProvider.tsx` | Login + user profile fetch — extend for institution theme |
| `src/context/AuthContext.tsx` | Auth context — extend to include institution branding |
| `components/student/Header.tsx` | Uses `require("../assets/gurukul.png")` — needs dynamic logo |
| `supabase/migrations/` | Source of truth for schema (0001–0036) |
| `scripts/seed_database.js` | Needs rewrite to match current schema |

---

## Warnings / Gotchas

1. **Migration vs live DB sync:** Check if your actual Supabase DB matches the migration files. Sometimes queries were run directly on Supabase without a migration file. Tell Claude Code to treat migration files as source of truth.

2. **Logo loading:** Switching from `require()` (local) to `{ uri: logoUrl }` (remote) means the logo depends on network. Add image caching to avoid blank space on boot.

3. **Font loading is async:** `expo-google-fonts` requires the `useFonts` hook. Wire this at the root layout level (`app/_layout.tsx`), not inside individual screens.

4. **JSONB fallbacks are mandatory:** Every place that reads `theme.colors.*` or `theme.fonts.*` must have a hardcoded fallback. Never assume the JSON key exists.

---

## Terminology (Project-Specific)

- **Marks** = actual exam score (set by teacher, entered manually)
- **Score** = AI homework score (out of 10, generated by AI after student uploads) (From homework_submission.ai_score)
- These are different fields. Don't confuse them in prompts to Claude Code.

---

## Current Status (as of this session)

- [x] Backend multi-tenancy: complete
- [x] Auth scoped by institution_id: complete
- [x] Student / Teacher / Institution portals: built
- [x] AI homework generation + scoring: built
- [x] Brand system defined (colors, typography, fonts): complete
- [ ] `seed_database.js` updated to current schema: **pending**
- [ ] `theme` JSONB column in `institutions` table: **pending**
- [ ] `AuthProvider.tsx` fetches institution theme on login: **pending**
- [ ] ThemeContext created and wired up: **pending**
- [ ] Poppins / Inter / Open Sans loaded via expo-google-fonts: **pending**
- [ ] Logo loaded from Supabase Storage: **pending**
- [ ] Hardcoded colors replaced across 32+ screens: **pending**