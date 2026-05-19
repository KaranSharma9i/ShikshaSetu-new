# Goal

Implement the full design system using NativeWind v4 based on the provided infographics (ShikshaSetu and Gurukul Shikshalaya). This includes setting up global CSS utilities, defining design tokens, and configuring custom fonts for the app.

## User Review Required

> [!IMPORTANT]
> The NativeWind setup files (`global.css`, `metro.config.js`, `postcss.config.mjs`) were found in a nested `ShikshaSetu/ShikshaSetu` folder. I will move them to the root project folder to ensure NativeWind works correctly.

> [!NOTE]
> To load fonts (Poppins, Inter, Open Sans), I plan to install the Expo Google Fonts packages: `@expo-google-fonts/poppins`, `@expo-google-fonts/inter`, and `@expo-google-fonts/open-sans`. Alternatively, if you already have custom font files (`.ttf` or `.otf`) you'd prefer to use, let me know!

## Open Questions

1.  **Multiple Themes:** Since we have two design infographics (ShikshaSetu and Gurukul Shikshalaya), do you want both color palettes available at once, or should we set up CSS variables that can be overridden to switch themes dynamically? For now, I will add both as distinct semantic color tokens.

## Proposed Changes

### Setup NativeWind correctly

#### [NEW] [metro.config.js](file:///c:/Users/mi/Desktop/ShikshaSetu/ShikshaSetu/metro.config.js)
Move the file from the nested directory to the root directory to properly wrap the Expo Metro config with NativeWind.

#### [NEW] [postcss.config.mjs](file:///c:/Users/mi/Desktop/ShikshaSetu/ShikshaSetu/postcss.config.mjs)
Move the file from the nested directory to the root directory.

#### [DELETE] Nested files
Delete the `ShikshaSetu/ShikshaSetu` nested directory after moving the config files.

### Design Tokens (CSS)

#### [MODIFY] [global.css](file:///c:/Users/mi/Desktop/ShikshaSetu/ShikshaSetu/global.css)
Move `global.css` to the root and populate it with the design tokens. We will define Tailwind v4 theme variables based on the infographics.

**Colors to add:**
*   **Primary (ShikshaSetu):** Sunshine Yellow (`#FFC107`), Bright Orange (`#FF8300`), Vermilion (`#FF5A1F`), Crimson Red (`#E53935`), Deep Red (`#B71C1C`)
*   **Primary (Gurukul):** Navy Blue (`#0D1B2A`), Royal Blue (`#162A56`), Gold (`#D4AF37`), Light Gold (`#F2C14E`)
*   **Neutrals:** Charcoal (`#333333`), Steel Gray (`#6B7280`), Silver/Light Gray (`#E5E7EB`), Warm Cream/Cream (`#FFF7ED` / `#F7F3E8`), White (`#FFFFFF`)

**Typography:**
*   `fontFamily`: Poppins (headings), Inter (body), Open Sans (captions).
*   `fontSize`: H1 (48px/32px), H2 (36px/24px), H3 (28px/20px), H4 (22px/16px), Body Large (16px), Body Medium (14px), Body Small (13px), Caption (12px).

### Font Loading

#### [MODIFY] [app/_layout.tsx](file:///c:/Users/mi/Desktop/ShikshaSetu/ShikshaSetu/app/_layout.tsx)
1.  Import `global.css`.
2.  Use `useFonts` hook to load the Poppins, Inter, and Open Sans fonts before rendering the app.
3.  Add `SplashScreen.preventAutoHideAsync()` and hide it once fonts are loaded.

## Verification Plan

### Automated Tests
*   Run the app (`expo start`) and ensure it compiles without errors.

### Manual Verification
*   Verify the fonts load successfully on the index screen.
*   Verify that Tailwind classes like `text-shiksha-orange` or `font-poppins` apply correctly on the screen.
