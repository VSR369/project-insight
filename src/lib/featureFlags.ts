/**
 * Centralized client-side feature flags driven by Vite env vars.
 *
 * Conventions:
 *  - Flags are env-driven booleans, never read from DB on the client.
 *  - Defaults are SAFE for development (less friction) and STRICT for prod
 *    via the production cutover checklist (docs/runbooks/production-cutover.md).
 */

/**
 * Registration OTP gate.
 *
 * When enabled (true), the registration Primary Contact form requires the
 * user to verify their email via OTP before submitting Step 2.
 *
 * Default: disabled (development convenience). MUST be set to "true" in
 * production via VITE_ENABLE_REGISTRATION_OTP=true.
 */
export const isRegistrationOtpEnabled = (): boolean =>
  import.meta.env.VITE_ENABLE_REGISTRATION_OTP === 'true';
