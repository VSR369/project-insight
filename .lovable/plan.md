

## Plan: Enhance Separate Admin Section with Country Selector & Working Location

### Changes

#### 1. `src/types/registration.ts` — Update `separate_admin` type
Add `country_id`, `phone_country_code`, and `working_location` fields to the `separate_admin` interface.

#### 2. `src/components/registration/PrimaryContactForm.tsx` — Three changes

**A. Fix primary contact country code auto-population (lines 138-142)**
Remove the `!form.getValues('phone_country_code')` guard so the phone code always syncs when `localeInfo` changes (i.e., when user changes HQ country in Step 1 and returns).

**B. Expand `separateAdmin` state (lines 91-95)**
Add `country_id` (default: `state.step1?.hq_country_id`), `phone_country_code` (default: `state.localeInfo?.phone_code`), and `working_location` fields.

**C. Replace the Separate Admin section (lines 524-549)**
Current: Name, Email, Phone (3 plain inputs).
New layout:
- **Full Name** — text input (existing)
- **Email** — email input (existing)
- **Country** — `<Select>` dropdown populated from `useCountries()`, defaulting to HQ country. On change, auto-update the admin's `phone_country_code` from the selected country's `phone_code`.
- **Country Code + Phone** — grid layout `[120px, 1fr]`: read-only-ish code input (auto-populated from country selection) + phone input
- **Working Location / Address** — optional `<Textarea>` for address

**D. Import additions**
- Import `useCountries` from `@/hooks/queries/useCountries`
- Import `Textarea` from `@/components/ui/textarea`

**E. Update `handleSubmit` setStep2Data (lines 224-226)**
Pass through the new `country_id`, `phone_country_code`, and `working_location` fields in `separate_admin`.

