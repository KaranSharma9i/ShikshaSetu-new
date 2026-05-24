# Expo + NativeWind Troubleshooting Log

> **Project:** Margam (ShikshaSetu)  
> **Date:** 2026-05-24  
> **Affected:** Localhost (Web) + Android Expo Go  

---

## Bug 1: `useAuth must be used within MockAuthProvider`

### Symptom
Red error screen on both localhost and Expo Go:
```
Uncaught Error: useAuth must be used within MockAuthProvider
```
Component stack pointed to `app/index.tsx` → `useAuth()` call in `utils/mockAuth.tsx`.

### Root Cause
The root layout (`app/_layout.tsx`) rendered `<Stack>` **without wrapping it** in `<MockAuthProvider>`. Since all auth hooks (`useAuth`, `useUser`, `useClerk`, `useSignIn`, `useSignUp`) depend on the `AuthContext` from `MockAuthProvider`, any screen calling these hooks crashed immediately.

### Fix
Wrap `<Stack>` with `<MockAuthProvider>` in `app/_layout.tsx`:

```tsx
import { MockAuthProvider } from "@/utils/mockAuth";

export default function RootLayout() {
  return (
    <MockAuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </MockAuthProvider>
  );
}
```

### Rule of Thumb
> Any React Context provider (Auth, Theme, etc.) **must** be placed in `app/_layout.tsx` so all child routes can access it.

---

## Bug 2: NativeWind / Tailwind Styles Not Applied (Unstyled UI)

### Symptom
After fixing Bug 1, the app loaded but rendered **completely unstyled** — no colors, no rounded corners, no spacing, no fonts. All `className` props were ignored. The page looked like raw HTML with plain text.

### Root Cause
**`global.css` was never imported** in the root layout. NativeWind v4 requires:

```tsx
import "../global.css";
```

at the top of `app/_layout.tsx`. Without this import, NativeWind has no CSS to inject, so all Tailwind utility classes (`bg-[#FDF9F1]`, `rounded-3xl`, `font-poppins-bold`, etc.) are silently ignored.

Additionally, custom fonts (Poppins, Inter, OpenSans) referenced in `tailwind.config.js` were never loaded via `expo-font`.

### Fix
Updated `app/_layout.tsx` to:

```tsx
import "../global.css";                        // ← CRITICAL for NativeWind
import { Stack } from "expo-router";
import { MockAuthProvider } from "@/utils/mockAuth";
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { OpenSans_400Regular } from "@expo-google-fonts/open-sans";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Poppins-Regular": Poppins_400Regular,
    "Poppins-Medium": Poppins_500Medium,
    "Poppins-SemiBold": Poppins_600SemiBold,
    "Poppins-Bold": Poppins_700Bold,
    "Inter-Regular": Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "OpenSans-Regular": OpenSans_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <MockAuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </MockAuthProvider>
  );
}
```

### After fixing, restart with cache clear:
```bash
npx expo start --clear
```

### Rule of Thumb
> **NativeWind v4 checklist** — all 4 must be in place:
> 1. `global.css` has `@tailwind base; @tailwind components; @tailwind utilities;`
> 2. `app/_layout.tsx` has `import "../global.css"` at the top
> 3. `metro.config.js` uses `withNativeWind(config, { input: "./global.css" })`
> 4. `babel.config.js` has `["babel-preset-expo", { jsxImportSource: "nativewind" }]` and `"nativewind/babel"` preset

---

## Bug 3: Metro Resolution Error in `buildSubgraph.js`

### Symptom
Red error screen on start-up showing:
```
\node_modules\metro\src\DeltaBundler\buildSubgraph.js:42:25
at visit (\node_modules\metro\src\DeltaBundler\buildSubgraph.js:83:30)
```

### Root Cause
`unstable_enablePackageExports` was enabled in `metro.config.js`. This option tells Metro to resolve the `"exports"` fields in package JSON files. When using Node-based or web-compatible packages like `@supabase/supabase-js`, Metro tries to resolve dependencies meant for Node.js (e.g. `stream`, `https`, `tls`), which do not exist in React Native, leading to bundler crashes.

### Fix
Set `unstable_enablePackageExports` to `false` in `metro.config.js`:

```javascript
config.resolver.unstable_enablePackageExports = false;
```

Restart Expo with a cleared cache:
```bash
npx expo start --clear
```

---

## Bug 4: Supabase Auth RLS Infinite Recursion (3-minute Hang)

### Symptom
When a user logged in (particularly as `institution_admin`), the app would hang indefinitely on a loading spinner (taking 3+ minutes) and eventually timeout.

### Root Cause
The database Row-Level Security (RLS) policies on the `users` table relied on custom SQL helper functions (`is_admin()` and `auth_institution_id()`). Because these functions were created as `SECURITY INVOKER`, they executed under the context of the active user, triggering the same RLS policy checks recursively. This resulted in an infinite recursion loop, exhausting the database connection pool.

### Fix
Redefined the database functions to run as `SECURITY DEFINER` (which bypasses RLS policies during query execution):
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- ← Key fix
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'institution_admin'
  );
END;
$$;
```

---

## Bug 5: Deprecated Tab Layout & Switcher Conflicts

### Symptom
The root route (`app/index.tsx`) previously rendered a "School / Manage" tab and switcher bar that duplicated the new, fully-featured Gurukul dashboard layout at `/institution`. This caused visual clutter, confusion, and state conflicts for non-admin users.

### Fix
- Removed the brand portal switcher and all HTML/TS elements representing the old `school` portal.
- Trimmed unused imports (`FlatList`, `Feather`) and the deprecated `school` seed data block from `app/index.tsx`.
- Updated `app/auth/signin.tsx` and `app/auth/signup.tsx` to correctly map the `institution_admin` role parameters to the "School Portal" badges.

---

## Quick Diagnostic Checklist

| Symptom | Likely Cause | Fix |
|---|---|---|
| `useX must be used within Provider` | Provider not in `_layout.tsx` | Wrap `<Stack>` with the provider |
| All styles missing / unstyled UI | `global.css` not imported | Add `import "../global.css"` to `_layout.tsx` |
| Custom fonts not rendering | Fonts not loaded via `useFonts` | Load fonts in `_layout.tsx` with `expo-font` |
| Styles partially broken after changes | Stale Metro cache | Restart with `npx expo start --clear` |
| Metro crash in `buildSubgraph.js` | `unstable_enablePackageExports` enabled | Disable it in `metro.config.js` |
| Login / Queries hang indefinitely (3+ mins) | RLS Infinite Recursion in helper functions | Redefine database functions as `SECURITY DEFINER` |
