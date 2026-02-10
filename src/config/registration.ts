/**
 * Registration Configuration Constants
 * 
 * All magic numbers, file limits, and config values for the
 * Seeker Registration Wizard. Never hardcode these in components.
 */

// ============================================================
// Step Configuration
// ============================================================
export const REGISTRATION_STEP_COUNT = 5;

// ============================================================
// File Upload Limits
// ============================================================
export const FILE_LIMITS = {
  LOGO: {
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    maxSizeMB: 5,
    allowedTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.svg'],
    label: 'Organization Logo',
  },
  PROFILE_DOCUMENT: {
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    maxSizeMB: 10,
    allowedTypes: ['application/pdf'],
    allowedExtensions: ['.pdf'],
    label: 'Organization Profile Document',
  },
  VERIFICATION_DOCUMENT: {
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    maxSizeMB: 10,
    allowedTypes: ['application/pdf'],
    allowedExtensions: ['.pdf'],
    label: 'Verification Document',
  },
} as const;

// ============================================================
// Company Size Options
// ============================================================
export const COMPANY_SIZE_OPTIONS = [
  { value: '1-10', label: '1–10 employees' },
  { value: '11-50', label: '11–50 employees' },
  { value: '51-200', label: '51–200 employees' },
  { value: '201-1000', label: '201–1,000 employees' },
  { value: '1001-5000', label: '1,001–5,000 employees' },
  { value: '5001+', label: '5,001+ employees' },
] as const;

// ============================================================
// Annual Revenue Options
// ============================================================
export const ANNUAL_REVENUE_OPTIONS = [
  { value: '<1M', label: 'Under $1M' },
  { value: '1M-10M', label: '$1M – $10M' },
  { value: '10M-50M', label: '$10M – $50M' },
  { value: '50M-250M', label: '$50M – $250M' },
  { value: '250M-1B', label: '$250M – $1B' },
  { value: '>1B', label: 'Over $1B' },
] as const;

// ============================================================
// OTP Configuration (BR-REG-006)
// ============================================================
export const OTP_CONFIG = {
  VALIDITY_MINUTES: 10,
  MAX_ATTEMPTS_PER_OTP: 3,
  MAX_OTP_PER_HOUR: 5,
  LOCKOUT_HOURS: 24,
  LOCKOUT_THRESHOLD: 5, // total failed attempts before lockout
  CODE_LENGTH: 6,
} as const;

// ============================================================
// Storage Bucket Configuration
// ============================================================
export const STORAGE_BUCKETS = {
  ORG_DOCUMENTS: 'org-documents',
} as const;

// ============================================================
// Startup Eligibility
// ============================================================
export const STARTUP_CONFIG = {
  MAX_YEARS_SINCE_FOUNDED: 5,
  MAX_EMPLOYEES: 50, // company_size_range '1-10' or '11-50'
  ELIGIBLE_SIZE_RANGES: ['1-10', '11-50'] as string[],
} as const;
