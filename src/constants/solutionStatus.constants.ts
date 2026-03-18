/**
 * Solution status mapping, display labels, colors, and transition rules.
 *
 * Maps solutions.current_phase + phase_status to a display status.
 * Transition validation enforces forward-only movement.
 */

/* ─── Display Status Enum ────────────────────────────────── */

export const SOLUTION_DISPLAY_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_SCREENING: 'UNDER_SCREENING',
  SHORTLISTED: 'SHORTLISTED',
  REJECTED: 'REJECTED',
  FULL_SOLUTION_REQUESTED: 'FULL_SOLUTION_REQUESTED',
  FULL_SOLUTION_UPLOADED: 'FULL_SOLUTION_UPLOADED',
  UNDER_EVALUATION: 'UNDER_EVALUATION',
  SELECTED: 'SELECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

export type SolutionDisplayStatus = (typeof SOLUTION_DISPLAY_STATUS)[keyof typeof SOLUTION_DISPLAY_STATUS];

/* ─── Status Metadata ────────────────────────────────────── */

export interface SolutionStatusMeta {
  label: string;
  /** Tailwind classes using design-system tokens / HSL variables */
  colorClass: string;
  /** Ordinal rank for forward-only validation */
  rank: number;
  strikethrough?: boolean;
}

export const SOLUTION_STATUS_META: Record<SolutionDisplayStatus, SolutionStatusMeta> = {
  DRAFT: {
    label: 'Draft',
    colorClass: 'bg-muted text-muted-foreground border-transparent',
    rank: 0,
  },
  SUBMITTED: {
    label: 'Submitted',
    colorClass: 'bg-[hsl(210,80%,92%)] text-[hsl(210,70%,35%)] border-transparent',
    rank: 1,
  },
  UNDER_SCREENING: {
    label: 'Under Screening',
    colorClass: 'bg-[hsl(270,60%,92%)] text-[hsl(270,55%,35%)] border-transparent',
    rank: 2,
  },
  SHORTLISTED: {
    label: 'Shortlisted',
    colorClass: 'bg-[hsl(145,55%,90%)] text-[hsl(145,50%,30%)] border-transparent',
    rank: 3,
  },
  REJECTED: {
    label: 'Rejected',
    colorClass: 'bg-[hsl(0,70%,93%)] text-[hsl(0,60%,40%)] border-transparent',
    rank: 3, // same rank as shortlisted — terminal branch
  },
  FULL_SOLUTION_REQUESTED: {
    label: 'Full Solution Requested',
    colorClass: 'bg-[hsl(38,80%,90%)] text-[hsl(38,65%,32%)] border-transparent',
    rank: 4,
  },
  FULL_SOLUTION_UPLOADED: {
    label: 'Full Solution Uploaded',
    colorClass: 'bg-[hsl(175,50%,88%)] text-[hsl(175,50%,28%)] border-transparent',
    rank: 5,
  },
  UNDER_EVALUATION: {
    label: 'Under Evaluation',
    colorClass: 'bg-[hsl(270,60%,92%)] text-[hsl(270,55%,35%)] border-transparent',
    rank: 6,
  },
  SELECTED: {
    label: 'Selected',
    colorClass: 'bg-[hsl(45,85%,88%)] text-[hsl(45,70%,28%)] border-transparent',
    rank: 7,
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    colorClass: 'bg-muted text-muted-foreground border-transparent',
    rank: -1, // terminal — reachable from any state
    strikethrough: true,
  },
};

/* ─── Phase/Status → Display Status Mapping ──────────────── */

/**
 * Derives display status from solutions.current_phase + phase_status + selection_status.
 */
export function deriveSolutionDisplayStatus(
  currentPhase: number | null,
  phaseStatus: string | null,
  selectionStatus: string | null,
): SolutionDisplayStatus {
  const ps = (phaseStatus ?? '').toUpperCase();
  const ss = (selectionStatus ?? '').toUpperCase();

  // Withdrawn is universal
  if (ps === 'WITHDRAWN') return SOLUTION_DISPLAY_STATUS.WITHDRAWN;

  // Selection outcomes
  if (ss === 'SELECTED' || ss === 'AWARDED') return SOLUTION_DISPLAY_STATUS.SELECTED;
  if (ss === 'REJECTED') return SOLUTION_DISPLAY_STATUS.REJECTED;
  if (ss === 'SHORTLISTED') return SOLUTION_DISPLAY_STATUS.SHORTLISTED;

  // Phase-based mapping
  switch (currentPhase) {
    case 7: // Submission phase
      if (ps === 'DRAFT') return SOLUTION_DISPLAY_STATUS.DRAFT;
      if (ps === 'ACTIVE') return SOLUTION_DISPLAY_STATUS.SUBMITTED;
      return SOLUTION_DISPLAY_STATUS.DRAFT;

    case 8: // Screening phase
      return SOLUTION_DISPLAY_STATUS.UNDER_SCREENING;

    case 9: // Full-solution request phase
      if (ps === 'ACTIVE' || ps === 'REQUESTED')
        return SOLUTION_DISPLAY_STATUS.FULL_SOLUTION_REQUESTED;
      if (ps === 'UPLOADED' || ps === 'COMPLETE')
        return SOLUTION_DISPLAY_STATUS.FULL_SOLUTION_UPLOADED;
      return SOLUTION_DISPLAY_STATUS.FULL_SOLUTION_REQUESTED;

    case 10: // Evaluation phase
      return SOLUTION_DISPLAY_STATUS.UNDER_EVALUATION;

    case 11: // Selection phase
      return SOLUTION_DISPLAY_STATUS.SELECTED;

    default:
      if (ps === 'DRAFT') return SOLUTION_DISPLAY_STATUS.DRAFT;
      if (ps === 'ACTIVE') return SOLUTION_DISPLAY_STATUS.SUBMITTED;
      return SOLUTION_DISPLAY_STATUS.DRAFT;
  }
}

/* ─── Forward-Only Transition Validation ─────────────────── */

/**
 * Valid forward transitions. Key = from status, value = allowed destinations.
 */
const VALID_TRANSITIONS: Record<SolutionDisplayStatus, SolutionDisplayStatus[]> = {
  DRAFT: ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['UNDER_SCREENING', 'WITHDRAWN'],
  UNDER_SCREENING: ['SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED: ['FULL_SOLUTION_REQUESTED', 'WITHDRAWN'],
  REJECTED: [], // terminal
  FULL_SOLUTION_REQUESTED: ['FULL_SOLUTION_UPLOADED', 'WITHDRAWN'],
  FULL_SOLUTION_UPLOADED: ['UNDER_EVALUATION', 'WITHDRAWN'],
  UNDER_EVALUATION: ['SELECTED', 'REJECTED', 'WITHDRAWN'],
  SELECTED: [], // terminal
  WITHDRAWN: [], // terminal
};

export interface TransitionValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates whether a status transition is allowed (forward-only).
 */
export function validateSolutionTransition(
  fromStatus: SolutionDisplayStatus,
  toStatus: SolutionDisplayStatus,
): TransitionValidationResult {
  if (fromStatus === toStatus) {
    return { valid: false, reason: 'Status is already the target state.' };
  }

  const allowed = VALID_TRANSITIONS[fromStatus];
  if (!allowed || allowed.length === 0) {
    return { valid: false, reason: `Cannot transition from terminal state "${SOLUTION_STATUS_META[fromStatus].label}".` };
  }

  if (!allowed.includes(toStatus)) {
    return {
      valid: false,
      reason: `Invalid transition: "${SOLUTION_STATUS_META[fromStatus].label}" → "${SOLUTION_STATUS_META[toStatus].label}" is not allowed.`,
    };
  }

  return { valid: true };
}
