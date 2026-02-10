
# Rebuild Screens 4, 5, 6 to Match Reference Designs

## Overview

The existing PlanSelectionForm, BillingForm, and OnboardingCompletePage have functional logic but their UI doesn't match the reference screenshots. This plan redesigns all three screens to closely match the provided mockups while preserving the existing business logic, hooks, and data flow.

---

## Screen 4: Plan Selection (PlanSelectionForm.tsx + PlanSelectionPage.tsx)

### Current State
- Basic radio-group tier cards in a grid
- Billing cycle as radio buttons
- Cost summary as a simple info box
- No engagement model info banner
- No monthly/annual toggle

### Changes to Match Reference

**1. Engagement Models Info Banner (top of page)**
- Add a highlighted callout card (light teal/green border) with:
  - Lightbulb icon + "Understanding Engagement Models & Tier Rules" title + "NEW" badge
  - Description text about Marketplace vs Aggregator models
  - Three small pill badges: "Marketplace Model", "Aggregator Model", "Tier Comparison"
  - "Learn More" button (opens a dialog or external link)

**2. Monthly/Annual Toggle**
- Replace the separate billing cycle radio group with an inline toggle switch at the top
- Label: "Monthly" (toggle) "Annual (Save 17%)" with green savings text
- This controls the price shown on each tier card

**3. Tier Cards Redesign**
- Three cards side-by-side (Basic / Standard / Premium) matching reference:
  - Basic: grey/neutral border, `$199/mo`
  - Standard: blue border + "Most Popular" badge at top, `$299/mo`
  - Premium: orange/amber border + sparkle icon, `$399/mo`
- Each card shows:
  - Tier name as a colored badge (blue for Standard, orange for Premium)
  - Large price with `/mo` suffix
  - Tagline description
  - Feature list with green checkmarks for included, grey X for excluded
  - Per-challenge fee note at bottom (e.g., "+ $5 per additional challenge")
  - CTA button: "Select Basic" / "Select Standard" (filled blue) / "Contact Sales" (orange for Premium/Enterprise)

**4. Navigation Footer**
- "Back" button (outline, left) and "Step 4 of 5" + "Continue" button (right)

### Files Modified
- `src/components/registration/PlanSelectionForm.tsx` -- full UI redesign
- `src/pages/registration/PlanSelectionPage.tsx` -- minor: remove duplicate heading since form will include it

---

## Screen 5: Billing Setup (BillingForm.tsx + BillingPage.tsx)

### Current State
- Simple vertical form with all fields stacked
- Payment method as radio cards
- No order summary sidebar
- No billing cycle selection cards
- No credit card fields UI

### Changes to Match Reference

**1. Two-Column Layout**
- Left column (wider): Billing form
- Right column (narrower, sticky): Order Summary card

**2. Order Summary Card** (right sidebar)
- Shows: Plan name + billing cycle, Base Price, Est. Challenge Fees (challenges x per-challenge fee), Tax note, "Due Today" total
- "You can upgrade, downgrade, or cancel anytime" note at bottom
- Data pulled from registration context (step4 tier/cycle selection + pricing hooks)

**3. Billing Contact Section**
- "Billing Contact Name" and "Billing Email" fields (pre-filled from step 2)

**4. Billing Address Section**
- Street Address, City + State (side-by-side), ZIP Code + Country (side-by-side)
- Country uses existing `CountrySelector` component
- State uses existing state dropdown

**5. Billing Cycle Selection Cards**
- Three cards: Monthly / Quarterly / Annual
- Each shows: price per month, savings percentage in green, "Billed $X every Y" note
- "Recommended" badge on Annual card
- Radio selection with highlighted border

**6. Payment Method Tabs**
- Tab-style selector: "Credit/Debit Card" | "ACH Bank Transfer" | "Wire Transfer"
- Credit Card tab shows: Card Number (with card brand icons), Expiry + CVV side-by-side, Cardholder Name
- SSL security note: lock icon + "256-bit SSL encrypted. We never store your full card number."
- Note: These are UI-only mock fields (no real Stripe integration yet), stored as payment method type

**7. Navigation Footer**
- "Back" button (outline) left, "Step 5 of 5" + "Complete Registration" button (green, with lock icon) right

### Files Modified
- `src/components/registration/BillingForm.tsx` -- major UI redesign with two-column layout, order summary, billing cycle cards, payment method tabs
- `src/pages/registration/BillingPage.tsx` -- update heading text to "Billing Setup" with dynamic subtitle
- `src/lib/validations/billing.ts` -- add optional card fields (card_number, expiry, cvv, cardholder_name) for UI validation

---

## Screen 6: Onboarding Complete (OnboardingCompletePage.tsx)

### Current State
- Simple 2x2 card grid with generic CTAs
- "Welcome to CogniBlend!" hardcoded
- No checklist-style onboarding
- No tips or help section

### Changes to Match Reference

**1. Hero Section**
- Large green circle with animated checkmark icon and decorative confetti/sparkle dots
- "Welcome to Global Innovation Marketplace!" with party emoji
- Subtitle: "Your organization is now registered. Here's what to do next."

**2. Get Started Checklist**
- Three actionable items in a card, each with:
  - Unchecked circle (visual only, not interactive)
  - Icon (Users, FileText, Search)
  - Title + description
  - Action button (outline style) on right side
- Items:
  1. "Invite Seekers, Solution Managers, Solution Heads and Assessors" -- "Invite Users" button -> `/org/team`
  2. "Post your first challenge" -- "Create Challenge" button -> `/org/challenges/create`
  3. "Explore the solver network" -- "Browse Solvers" button -> `/org/solvers`

**3. Skip Link**
- "Skip for now and go to Dashboard ->" text link centered below checklist

**4. Tips Footer**
- Lightbulb icon + "Tip: You selected the [engagement model] model..." dynamic text
- Book icon + "Need help? Check our Getting Started Guide or contact support." with links

### Files Modified
- `src/pages/registration/OnboardingCompletePage.tsx` -- complete redesign

---

## Technical Details

### No New Dependencies
All UI built with existing Tailwind + shadcn/ui components (Tabs, Switch, Card, Badge, Button, Separator).

### Data Flow (Unchanged)
- PlanSelectionForm reads from existing hooks: `useSubscriptionTiers`, `useTierFeatures`, `useTierPricingForCountry`, `useBillingCycles`, `useEngagementModels`
- BillingForm reads from: `usePaymentMethods`, `useActivePlatformTerms`, `useSaveBillingInfo`, `useCreateSubscription`
- OnboardingCompletePage reads from `useRegistrationContext` for dynamic content (tier name, engagement model)
- All mutations and state transitions preserved as-is

### File Summary

| File | Action |
|------|--------|
| `src/components/registration/PlanSelectionForm.tsx` | Redesign UI to match reference |
| `src/pages/registration/PlanSelectionPage.tsx` | Minor heading adjustment |
| `src/components/registration/BillingForm.tsx` | Major redesign: 2-column, order summary, payment tabs |
| `src/pages/registration/BillingPage.tsx` | Update heading/subtitle |
| `src/lib/validations/billing.ts` | Add optional card UI fields |
| `src/pages/registration/OnboardingCompletePage.tsx` | Complete redesign with checklist pattern |
| `src/components/layouts/RegistrationWizardLayout.tsx` | Widen max-w for billing 2-column layout |
