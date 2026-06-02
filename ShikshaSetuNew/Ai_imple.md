# Codebase Audit and Expo Testing Guide

This document lists the findings from the codebase audit of **ShikshaSetu (Margam)**, details the errors identified, explains how to fix them without writing code directly into the source files, and provides a step-by-step guide on how to test the application via Expo using the provided test account.

---

## 1. Codebase Audit Results

The entire codebase was audited using TypeScript compile-time analysis, script execution tests, and configuration reviews.

### Compile-Time Check Summary
- **TypeScript Compilation:** Run using `npx tsc --noEmit` on `tsconfig.json`. The codebase **compiles successfully with zero type errors**.
- **Syntax and Structure:** High compliance with React Native, Expo Router, and Supabase client-side integrations.

### Identified Configuration & Runtime Errors

We have identified three configuration/environment-related errors that will cause issues during development, linting, or mobile device testing.

---

### Error 1: ESLint Flat Config Crash
* **File:** `eslint.config.js` (Lines 2–3)
* **Symptom:** Running ESLint (via `npm run lint` or `npx expo lint`) crashes immediately with the error:
  ```bash
  Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './config' is not defined by "exports" in .../node_modules/eslint/package.json
  ```
* **Root Cause:** ESLint v8.57.1 (which is installed in this project) does not export `./config` or `defineConfig`. This is a feature of ESLint v9+.
* **How to Fix:** Replace the `defineConfig` utility with a standard flat configuration array export in `eslint.config.js`:
  ```javascript
  const expoConfig = require('eslint-config-expo/flat');

  module.exports = [
    ...expoConfig,
    {
      ignores: ['dist/*'],
    },
  ];
  ```

---

### Error 2: Localhost Server URL configuration for Mobile/Expo Go testing (FIXED)
* **File:** `.env` (Line 8) / `src/repositories/teacherRepository.ts` (Line 846)
* **Symptom:** When testing the app on a physical mobile device or Android emulator via Expo Go, the app will fail to communicate with the Express backend server (e.g., when generating homework) and throw network errors.
* **Status:** **Fixed**. The server URL has been updated to your desktop IP: `http://192.168.1.6:3001`.

---

### Error 3: Empty API Key in Test Script
* **File:** `open_router.ts` (Line 5)
* **Symptom:** Running `npx tsx open_router.ts` fails with an authentication error.
* **Root Cause:** `apiKey` is hardcoded as an empty string: `apiKey: ""`.
* **How to Fix:** Use the environment variable loaded by dotenv in `open_router.ts`:
  ```typescript
  const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPEN_ROUTER_API_KEY || "",
  });
  ```

---

## 2. Step-by-Step Guide: How to Test via Expo

Below is a step-by-step walkthrough to get the application running on Expo Go using your physical mobile device.

### Test Credentials
* **Email:** `amir@mumbai.com`
* **Password:** `Password123!`

---

### Step 1: Install Dependencies
Open a terminal in your project directory (`c:\Users\mi\Desktop\ShikshaSetu\ShikshaSetuNew`) and ensure all packages are installed:
```bash
npm install
```

### Step 2: Verification of Environment Variables
Verify that `.env` contains the correct desktop IP:
```env
EXPO_PUBLIC_SERVER_URL=http://192.168.1.6:3001
```

### Step 3: Start the Backend Server
Start the Express backend in a separate terminal:
```bash
npm run server:start
```
You should see:
```text
Margam server running on port 3001
```

### Step 4: Start the Expo Dev Server
In your main terminal, start the Expo packager:
```bash
npx expo start
```
This will open the Expo developer CLI and print a QR code.

### Step 5: Launch the Client App on your Physical Mobile Device
1. Connect both your mobile phone and your desktop computer to the **same Wi-Fi network** (e.g., your home Wi-Fi network).
2. Open the **Expo Go** app on your phone.
3. Scan the QR code:
   - **Android:** Tap "Scan QR code" in the Expo Go app.
   - **iOS:** Open your phone's camera, scan the QR code, and tap the link to open in Expo Go.
4. Wait for the app bundle to download and build (this may take a minute).

### Step 6: Log In with the Test Account
Once the app loads in Expo Go:
1. Tap the **Get Started** button on the home screen.
2. Select **Login** (or it will redirect to the signin portal `/auth/signin`).
3. Enter the test credentials:
   - **Email:** `amir@mumbai.com`
   - **Password:** `Password123!`
4. Tap **Sign In**.
5. Once signed in, you will be redirected to the student dashboard.
