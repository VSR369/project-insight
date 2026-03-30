/**
 * Centralized maturity level labels.
 * DB values (blueprint/poc/prototype/pilot) are unchanged.
 * Only user-facing display labels are defined here.
 */

export const MATURITY_LABELS: Record<string, string> = {
  blueprint: 'An idea or concept',
  poc: 'Proof it can work',
  prototype: 'A working demo',
  pilot: 'A real-world test',
};

/** Short descriptions for maturity level selector cards */
export const MATURITY_DESCRIPTIONS: Record<string, string> = {
  blueprint: 'You have a concept, architecture, or design you want explored',
  poc: 'You need feasibility demonstrated with working evidence',
  prototype: 'You want a functional demo that proves the approach end-to-end',
  pilot: 'You need a real-world deployment test with measurable outcomes',
};

/** Resolve a DB maturity_level value to its user-facing label */
export function getMaturityLabel(level: string | null | undefined): string {
  if (!level) return '—';
  return MATURITY_LABELS[level] ?? MATURITY_LABELS[level.toLowerCase()] ?? level;
}
