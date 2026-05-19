---
name: debug-session-expo-nativewind-v4
description: Technical summary of the debugging session to stabilize Expo SDK 51 and NativeWind v4
metadata: 
  node_type: memory
  type: project
  originSessionId: 6972f8a2-b1a3-4072-99b2-a6257521e76a
---

# Stabilization of Expo & NativeWind v4

## Issues Resolved
- **Metro Config Error**: Fixed `ERR_UNSUPPORTED_ESM_URL_SCHEME` by switching `metro.config.cjs` to `metro.config.js` using CommonJS.
- **Dependency Conflicts**: Resolved severe version mismatches by pinning to Expo SDK 51 (RN 0.74.5) and using `npm install --legacy-peer-deps` after a clean wipe of `node_modules`.
- **NativeWind v4 Setup**: 
  - Added `presets: [require("nativewind/preset")]` to `tailwind.config.js`.
  - Removed `nativewind/babel` from `babel.config.js` (deprecated in v4).
  - Configured `metro.config.js` with `withNativeWind` pointing to `./global.css`.
- **Babel/Transform Errors**: 
  - Disabled `reactCompiler: true` in `app.json` to stop `expo-router` plugin crashes.
  - Changed web `output` from `static` to `single` to resolve static rendering internal errors.

## Current State
- The application successfully boots and loads the `index.tsx` page.
- **Known Issue**: Web styles are not currently applying (plain text renders). A diagnostic test (background-red) has been implemented in `global.css` to determine if the CSS is being ignored or if Tailwind compilation is failing.

**Why:** These changes were necessary to move from an unstable/experimental environment to a production-ready stable baseline.
**How to apply:** If similar "Plugin not valid" or "ESM URL" errors recur, refer to the transition from `.cjs` to `.js` and the removal of the NativeWind Babel plugin.
