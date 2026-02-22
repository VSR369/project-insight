

# Temporarily Bypass OTP Email Verification

## Problem
The OTP email verification on the Primary Contact page (Step 2) is blocking testing because emails are not being received. The "Send Verification Code" button must be clicked and a valid OTP entered before the form can be submitted.

## Changes (2 files)

### 1. Validation Schema (`src/lib/validations/primaryContact.ts`)
- Change `is_email_verified` from `z.literal(true)` (which requires exactly `true`) to `z.boolean().default(true)` so it accepts any value and defaults to true
- Add a `// TODO: TEMP BYPASS` comment so it's easy to find and revert later

### 2. Primary Contact Form (`src/components/registration/PrimaryContactForm.tsx`)
- Initialize `emailVerified` state to `true` instead of checking context
- Set default value of `is_email_verified` to `true`
- Hide the OTP verification section (the "Send Verification Code" block) by wrapping it in a `false &&` condition
- Remove the `!emailVerified` disable condition on the Submit button
- Add `// TODO: TEMP BYPASS` comments on all changes for easy revert

## What stays the same
- The OTP edge functions remain deployed and untouched
- The form structure and all other validations remain intact
- The `OtpVerification` component code is unchanged

## Reverting later
Search the codebase for `TEMP BYPASS` to find and revert all changes when email delivery is working.

