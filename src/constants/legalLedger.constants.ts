/**
 * Constants for the admin Legal Acceptance Ledger viewer.
 */

export const LEDGER_DOC_CODE_OPTIONS = [
  { value: 'all', label: 'All documents' },
  { value: 'SPA', label: 'SPA — Solution Provider Platform Agreement' },
  { value: 'SKPA', label: 'SKPA — Seeker Org Platform Agreement' },
  { value: 'PWA', label: 'PWA — Role Agreement (Prize & Work)' },
  { value: 'CPA', label: 'CPA — Challenge Participation Agreement' },
] as const;

export const LEDGER_TRIGGER_OPTIONS = [
  { value: 'all', label: 'All triggers' },
  { value: 'USER_REGISTRATION', label: 'User registration' },
  { value: 'FIRST_LOGIN', label: 'First login' },
  { value: 'ROLE_ACCEPTANCE', label: 'Role acceptance' },
  { value: 'ENROLLMENT', label: 'Enrollment' },
  { value: 'CHALLENGE_SUBMIT', label: 'Challenge submit' },
] as const;

export const LEDGER_PAGE_SIZE = 25;
