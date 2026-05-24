# Clerk → Supabase Auth Migration
### React Native + Expo — Claude Code Prompt

---

## Project Context

You are a principal full-stack engineer migrating a **React Native + Expo** application from **Clerk** authentication to **Supabase Auth**, and connecting the entire frontend to an already-configured Supabase backend.

### Current Backend Status

| Item | Status |
|------|--------|
| Supabase project | ✅ Configured |
| Database tables | ✅ Created |
| Foreign key relations | ✅ Configured |
| RLS policies | ✅ Configured |
| Enums | ✅ Configured |

**Existing enums:** `account_status`, `attendance_status`, `day_of_week`, `gender_type`, `leave_status`, `teacher_attendance_status`, `user_role`

**Existing roles:** `institution_admin`, `teacher`, `student`, `driver`

### Environment Variables (already set)

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

---

## Hard Constraints

- Remove Clerk **completely** — no partial remnants
- Use **only** Supabase Auth
- **Preserve** all existing UI, navigation, animations, and responsiveness — do not redesign anything visually
- Do **not** modify the database schema unless absolutely necessary
- Do **not** hardcode secrets
- Do **not** use deprecated Supabase APIs
- Architecture must be **startup-production ready**

---

## Execution Rules

Work in **strict sequential phases**. After each phase you must:

1. Summarize what was completed
2. List every modified or created file
3. Confirm the app still compiles
4. **Stop and wait for approval** before proceeding

Do not perform multiple phases at once. Do not skip verification steps.

---

## Phase 1 — Full Project Analysis (No Code)

> **Do not write any code in this phase.**

Inspect the complete project and produce a detailed analysis covering:

1. Navigation / routing architecture
2. Existing auth implementation
3. All Clerk integration points
4. Protected routes and screens
5. Existing providers and context
6. State management approach
7. Existing API / service layer
8. Mock / static data usage
9. Forms and validation libraries
10. Current folder structure
11. Reusable UI systems and components
12. Existing role-handling logic
13. Environment variable configuration
14. Files tightly coupled to Clerk
15. Areas likely to break during migration

Then provide:

- **Migration strategy** — high-level approach
- **Safest implementation order** — which files to touch first
- **Dependency cleanup plan** — what to remove and in what order
- **Auth replacement strategy** — how Supabase Auth maps to current Clerk usage
- **Suggested scalable architecture** — folder structure and patterns going forward

**Stop after Phase 1. Wait for approval.**

---

## Phase 2 — Remove Clerk Safely

Only begin after Phase 1 approval.

**Tasks:**
- Uninstall all Clerk npm/yarn dependencies
- Remove Clerk providers from the component tree
- Remove all Clerk hooks and imports
- Remove Clerk wrappers and HOCs
- Remove any Clerk middleware or config files
- Delete obsolete auth utilities
- Clean up dead imports throughout the codebase

**Requirements:**
- App must still boot after cleanup
- No broken imports
- No dead providers left in the tree
- No UI changes whatsoever

**Stop after Phase 2. Wait for approval.**

---

## Phase 3 — Supabase Client Setup

**Install:**
```bash
npx expo install @supabase/supabase-js
npx expo install react-native-url-polyfill
npx expo install @react-native-async-storage/async-storage
```

**Create `src/lib/supabase.ts`** with the following implementation:

```typescript
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

Also implement:
- Environment variable validation (throw early if missing)
- Typed env helpers
- Centralized config export
- Error-safe client initialization

Verify Expo compatibility and confirm the app compiles.

**Stop after Phase 3. Wait for approval.**

---

## Phase 4 — Authentication Foundation

Implement **only** the auth foundation. Do not connect any screens yet.

**Create:**
- `AuthContext` and `AuthProvider`
- Auth hooks (`useAuth`, `useSession`, etc.)
- Supabase `onAuthStateChange` session listener
- Protected route wrapper component
- Auth loading state handling

**Auth features to implement:**
- Sign in (email + password)
- Sign out / logout
- Forgot password (password reset email)
- Session persistence via AsyncStorage
- Auto session restore on app launch
- Centralized auth error handling

> **Do not implement sign-up.** Institution accounts are created manually by us. Teacher and student accounts are created by institution admins through the app — those flows will be handled in a later phase.

**Role system:**

After login, fetch the user's role from the database and store it in auth context. Roles: `institution_admin`, `teacher`, `student`, `driver`.

Implement:
- Role-aware navigation (redirect to correct home screen based on role)
- Protected screens that block unauthenticated access
- Role-based conditional rendering helpers

**Architecture requirements:**
- Minimal unnecessary re-renders
- Scalable, composable provider structure
- Strongly typed auth state (TypeScript)

**Stop after Phase 4. Wait for approval.**

---

## Phase 5 — Database Layer

Build the scalable data architecture. Do not connect any screens yet.

**Target folder structure:**
```
src/
├── lib/            # Supabase client, config
├── repositories/   # Raw DB query functions
├── services/       # Business logic layer
├── hooks/          # Reusable async data hooks
├── providers/      # React context providers
├── context/        # Context definitions
├── types/          # TypeScript types and DB types
└── utils/          # Shared async/error utilities
```

**Implement:**
- Typed Supabase query repositories per domain (users, institutions, attendance, etc.)
- Centralized database helper utilities
- Consistent async error handling pattern
- Reusable data-fetching hooks with loading/error/data states
- Pagination-ready query architecture

Generate Supabase database types using the Supabase CLI if possible:
```bash
npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
```

**Stop after Phase 5. Wait for approval.**

---

## Phase 6 — Screen Integration

Incrementally connect frontend screens to live Supabase data.

**Requirements:**
- Replace all mock/static data carefully, one screen at a time
- Preserve all existing UI, styling, animations, and navigation behavior exactly
- Do not modify visual layout or component structure

For each screen you integrate, document:
1. What data is being fetched and from which table(s)
2. The query or repository function used
3. How loading and error states are handled

Proceed screen by screen. Do not batch multiple screens into one step.

**Stop after Phase 6. Wait for approval.**

---

## Phase 7 — Production Hardening

**Implement:**
- Centralized error handling utility
- Toast / error notification system
- Null safety and defensive rendering throughout
- Retry-safe async request patterns
- Loading skeletons and spinners for async states
- TypeScript strict mode compliance
- Secure auth session persistence
- Request cleanup on component unmount (cancel async operations)
- Memory leak prevention (abort controllers, cleanup effects)

**Optimize:**
- Eliminate unnecessary re-renders (memoization where appropriate)
- Remove duplicated queries across screens
- Review and simplify provider nesting

**Stop after Phase 7. Wait for approval.**

---

## Phase 8 — Final Verification

Perform a complete end-to-end verification of:

- [ ] Auth flow (sign in → role fetch → navigation)
- [ ] Role-based routing (each role lands on the correct screen)
- [ ] Protected routes (unauthenticated users redirected)
- [ ] Session persistence (app close → reopen → still logged in)
- [ ] Logout flow (session cleared, redirected to login)
- [ ] Database queries (all screens loading live data)
- [ ] Screen rendering (no visual regressions)
- [ ] Loading states (all async states handled gracefully)
- [ ] Expo compatibility (no native module conflicts)
- [ ] TypeScript (no type errors, strict mode passing)

**Deliver a final report containing:**

1. All created files with paths
2. All modified files with a summary of changes
3. Installation commands (copy-paste ready)
4. Architecture explanation (how the layers fit together)
5. Auth flow explanation (sequence from login to authorized screen)
6. Supabase dashboard requirements (any config needed on the backend)
7. Expo / `app.json` configuration changes
8. Environment setup steps for new developers
9. Run instructions
10. Remaining technical debt
11. Future scalability recommendations

---

## Notes for Claude

- Ask clarifying questions **before starting Phase 1** if anything in this prompt is ambiguous.
- Treat this as a production codebase — be deliberate, conservative, and incremental.
- When in doubt, preserve existing behavior over introducing new patterns.
- Every phase must end with a working, compilable app.
