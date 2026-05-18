# Implementation Plan: ShikshaSetu - Digital Backbone of Institutions

## Context
ShikshaSetu is a professional educational platform (beyond a standard ERP) designed for schools. It aims to provide tailored dashboards and tools for three primary user roles: Administrators (Manage), Teachers, and Students. The immediate goal (Phase 1) is to build a high-quality demo website that outperforms local competitors in UI/UX and provides a seed-data-driven experience for the three main portals.

## Tech Stack
Based on the requirements in `AGENTS.md`, the following tech stack is required:

### Frontend & Styling
- **Framework**: React + Next.js (App Router)
- **Styling**: Tailwind CSS
- **Typography**: Poppins, Inter, Open Sans
- **Animations**: Framer Motion (Recommended for "modern and premium" feel)
- **Icons**: Lucide React or FontAwesome

### Data & State Management
- **Seed Data**: JSON-based mock database for Phase 1 (names/contact and other data should be genrated as for north indian people )
- **State Management**: React Context API or Zustand (for managing user sessions and school configuration)

### Deployment & Integration
- **Hosting**: Vercel
- **Forms**: FormSubmit or EmailJS (Initial implementation)
- **Analytics/Dashboards**: Power BI (Integration via embeds for the Manage portal)

### Infrastructure
- **Version Control**: Git
- **CI/CD**: Vercel Automatic Deployments

## Implementation Phases

### Phase 1: Core Demo & UI (Current Focus)
**Goal**: Build a premium landing page and three distinct portals with a dummy seed database.

#### 1. Project Setup & Architecture
- Initialize Next.js project with Tailwind CSS.
- Implement the recommended folder structure:
  - `.claude`,`app/(auth)/`, `app/(tabs)/`, `app/lesson/`
  - `components/`, `constants/`, `data/`, `hooks/`, `lib/`, `store/`, `types/`, `assets/`
- Setup global theme configurations (Orange, Yellow, Red for Home; Navy Blue/Gold for Portals).

#### 2. Data Layer Implementation
- Create `data/schoolData.js` to avoid hardcoding school names.
- Implement dummy seed databases for:
  - Institution details
  - Teacher profiles
  - Student performance metrics (Marks and Scores)
  - Circulars and Notices

#### 3. Homepage Development
- Build a premium landing page with:
  - Hero section with animations/spotlights.
  - "Our Expertises" section.
  - Navigation From `student login` to a new `student` portal,
               From `manage` to a new `school management` portal
           and From`teacher` to a new `teachers` portal.
  - Contact form (via FormSubmit/EmailJS).

#### 4. Portal Implementation (UI-First)
- **School Management Portal**: 
  - Navy Blue/Gold theme.
  - Growth Dashboard shells (Power BI placeholders).
  - Circular generator UI.
  - User management screens (Add Student/Teacher).
- **Teacher Portal**:
  - Light Navy Blue/Gold theme.
  - Student performance tracking view.
  - Homework generator UI.
- **Student Portal**:
  - Light Navy Blue/Gold theme with school logo background.
  - Performance analysis views.
  - Homework and Circulars access.

#### 5. Navigation & Basic Routing
- Implement clickable transitions between the Home page and the three login portals.
- Create simple active login simulations (dummy auth).

### Phase 2: Feature Expansion (Future)
- Implement actual authentication systems.
- Develop AI Homework Generation and Scoring.
- Build full Attendance and Fee Management systems.
- Develop the Mobile Application.

## Verification Plan
- **UI Review**: Verify color palettes (Home: Orange/Red/Yellow; Portals: Navy/Gold) and typography (Poppins/Inter).
- **Responsiveness**: Test all pages on mobile, tablet, and desktop views.
- **Data Integrity**: Ensure no school names are hardcoded and all are pulled from `schoolData`.
- **Performance**: Check loading speeds and animation smoothness.
- **End-to-End Flow**: Verify the flow from Homepage $\rightarrow$ Login $\rightarrow$ Portal Dashboard.