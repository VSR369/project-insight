

# Enable Email Field While Keeping OTP Bypassed

## Problem
The email input field is currently disabled because `emailVerified` is set to `true` (from the OTP bypass), and the input has `disabled={emailVerified}`. This prevents users from entering their email address.

## Change (1 file)

### `src/components/registration/PrimaryContactForm.tsx`
- Remove `disabled={emailVerified}` from the email `<Input>` element (around line 292)
- The email field will be editable again while OTP verification remains bypassed
- Add a `// TODO: TEMP BYPASS` comment noting the original condition

## What stays the same
- OTP section remains hidden
- `emailVerified` remains `true` (form submits without OTP)
- All other bypass changes remain intact

