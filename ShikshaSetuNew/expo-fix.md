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

## Quick Diagnostic Checklist

| Symptom | Likely Cause | Fix |
|---|---|---|
| `useX must be used within Provider` | Provider not in `_layout.tsx` | Wrap `<Stack>` with the provider |
| All styles missing / unstyled UI | `global.css` not imported | Add `import "../global.css"` to `_layout.tsx` |
| Custom fonts not rendering | Fonts not loaded via `useFonts` | Load fonts in `_layout.tsx` with `expo-font` |
| Styles partially broken after changes | Stale Metro cache | Restart with `npx expo start --clear` |
