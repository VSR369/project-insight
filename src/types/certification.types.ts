/**
 * Certification Types
 * 
 * TypeScript types and display configuration for certification levels.
 */

/** Certification levels awarded based on composite score */
export type CertificationLevel = 'proven' | 'acclaimed' | 'eminent';

/** Registration mode for solution providers */
export type RegistrationMode = 'self_registered' | 'invitation';

/** Provider invitation types */
export type InvitationType = 'standard' | 'vip_expert';

/** Display configuration for certification levels */
export const CERTIFICATION_LEVEL_DISPLAY: Record<CertificationLevel, {
  label: string;
  description: string;
  stars: number;
  colorClass: string;
  bgClass: string;
  textClass: string;
}> = {
  proven: {
    label: 'Proven',
    description: 'Certified Proven',
    stars: 1,
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
  },
  acclaimed: {
    label: 'Acclaimed',
    description: 'Certified Acclaimed',
    stars: 2,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
  },
  eminent: {
    label: 'Eminent',
    description: 'Certified Eminent',
    stars: 3,
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
  },
};

/**
 * Map star rating to certification level
 */
export function starRatingToLevel(starRating: number | null): CertificationLevel | null {
  if (starRating === null || starRating === 0) return null;
  if (starRating === 1) return 'proven';
  if (starRating === 2) return 'acclaimed';
  return 'eminent';
}

/**
 * Get display configuration for a star rating
 */
export function getStarRatingDisplay(starRating: number | null) {
  const level = starRatingToLevel(starRating);
  if (!level) return null;
  return CERTIFICATION_LEVEL_DISPLAY[level];
}

/**
 * Get display configuration for a certification level
 */
export function getCertificationLevelDisplay(level: CertificationLevel | null) {
  if (!level) return null;
  return CERTIFICATION_LEVEL_DISPLAY[level] || null;
}
