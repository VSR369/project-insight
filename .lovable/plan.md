

# Plan: Form Data Persistence + AI/Manual Path Enforcement

## Two Problems

1. **Form data vanishes** on navigation/tab-switch because all forms use in-memory React state only (no persistence). The existing `useSessionRecovery` hook was built but never wired into any form.
2. **AI vs Manual path mixing** — after selecting "AI-Assisted" on the demo login page, users can still navigate to the Manual Editor via URL params or the landing page cards, and vice versa.

## Solution

### A. Create a reusable `useFormPersistence` hook

A new generic hook that auto-saves any `react-hook-form` form data to `sessionStorage` on every change, and restores it on mount. Works across navigation and tab-switches.

**File: `src/hooks/useFormPersistence.ts`**

- Accepts a unique `storageKey` string and a `react-hook-form` instance
- On mount: reads `sessionStorage[storageKey]`, calls `form.reset(savedData)` to restore
- On every form change: debounced `watch()` subscriber writes current values to `sessionStorage`
- Provides a `clearPersistedData()` function to call after successful submission
- Expiry: ignores saved data older than 24 hours

### B. Wire persistence into all lifecycle forms

| Form | Storage Key | File |
|------|-------------|------|
| SimpleIntakeForm (RQ/AM) | `cogni_intake_simple` | `SimpleIntakeForm.tsx` |
| ConversationalIntakePage (CR/CA) | `cogni_intake_conversational` | `ConversationalIntakePage.tsx` |
| CogniSubmitRequestPage | `cogni_submit_request` | `CogniSubmitRequestPage.tsx` |
| SolutionSubmitPage | `cogni_solution_submit_{challengeId}` | `SolutionSubmitPage.tsx` |
| ChallengeWizardPage | `cogni_wizard_{challengeId}` | `ChallengeWizardPage.tsx` |
| EscrowManagementPage | `cogni_escrow` | `EscrowManagementPage.tsx` |

For each form:
1. Import and call `useFormPersistence(key, form)`
2. Call `clearPersistedData()` in the `onSuccess` callback after submission
3. For template selector in SimpleIntakeForm, also persist `selectedTemplate` state

### C. Enforce AI vs Manual path separation

**File: `src/pages/cogniblend/ChallengeCreatePage.tsx`**

- Read `cogni_demo_path` from sessionStorage on mount
- If path is `'ai'`: hide the "Build Spec Manually" card and block `?tab=editor` URL param — force redirect to `?tab=ai`
- If path is `'manual'`: hide the "Describe Your Problem" card and block `?tab=ai` URL param — force redirect to `?tab=editor`
- The landing page shows only the valid track card, or auto-navigates directly to the correct view if path is already set

```tsx
const demoPath = sessionStorage.getItem('cogni_demo_path');

// Auto-route based on locked path
useEffect(() => {
  if (demoPath === 'ai' && activeView === 'editor') setView('ai');
  if (demoPath === 'manual' && activeView === 'ai') setView('editor');
}, [demoPath, activeView]);
```

On the landing view, filter visible track cards:
```tsx
{(!demoPath || demoPath === 'ai') && <TrackCard ... onClick={() => setView('ai')} />}
{(!demoPath || demoPath === 'manual') && <TrackCard ... onClick={() => setView('editor')} />}
```

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useFormPersistence.ts` | **New** — generic form persistence hook |
| `src/components/cogniblend/SimpleIntakeForm.tsx` | Wire persistence, clear on submit |
| `src/pages/cogniblend/ConversationalIntakePage.tsx` | Wire persistence, clear on submit |
| `src/pages/cogniblend/CogniSubmitRequestPage.tsx` | Wire persistence, clear on submit |
| `src/pages/cogniblend/SolutionSubmitPage.tsx` | Wire persistence, clear on submit |
| `src/pages/cogniblend/ChallengeWizardPage.tsx` | Wire persistence, clear on submit |
| `src/pages/cogniblend/EscrowManagementPage.tsx` | Wire persistence, clear on submit |
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Enforce AI/Manual path lock |

