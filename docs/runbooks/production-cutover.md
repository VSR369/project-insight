# Production Cutover Checklist

This is the canonical list of environment changes required before a production
release. Each item is a switch that is intentionally relaxed in dev/preview
to keep iteration friction low — and MUST be flipped before going live.

## Required environment variables (production)

| Variable | Production value | Dev default | Owner |
|---|---|---|---|
| `VITE_ENABLE_REGISTRATION_OTP` | `true` | `false` | Auth / Registration |

### `VITE_ENABLE_REGISTRATION_OTP`
- **Effect when `true`**: Step 2 of the seeker registration wizard (Primary
  Contact) requires the user to verify their corporate email address via OTP
  before they can submit the step. The Zod schema enforces
  `is_email_verified === true`, the email input becomes read-only after
  verification, and the OTP UI block is rendered.
- **Effect when `false` (dev/preview)**: OTP UI is hidden, the email field
  stays editable, and the schema accepts any boolean (defaults to `true`).
  No OTP is sent. Use ONLY in non-production environments.
- **Where it's read**: `src/lib/featureFlags.ts` →
  `isRegistrationOtpEnabled()`. Consumers: `primaryContactSchema` and
  `PrimaryContactForm`.
- **Reference**: BR-REG-006.

## Verification after cutover
1. Open the registration wizard in production.
2. Reach Step 2 (Primary Contact).
3. Confirm: an OTP block is visible under the email field, the Save & Continue
   button stays disabled until OTP is verified, and the email input becomes
   read-only after verification.
