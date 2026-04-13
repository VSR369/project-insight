/**
 * Certification Service
 * 
 * Business logic for multi-path certification resolution.
 * Implements the MAX rule: provider's effective cert = highest star tier across all active paths.
 */

import type { CertificationLevel } from '@/types/certification.types';
import { PERFORMANCE_CERT_THRESHOLDS } from '@/constants/enrollment.constants';

/** A single certification record from provider_certifications */
export interface CertificationRecord {
  id: string;
  provider_id: string;
  cert_path: 'experience' | 'performance' | 'vip';
  star_tier: number;
  cert_label: CertificationLevel;
  composite_score: number | null;
  status: 'active' | 'revoked' | 'expired' | 'superseded';
  awarded_at: string;
  enrollment_id: string | null;
}

/** Resolved certification result across all paths */
export interface ResolvedCertification {
  /** Highest star tier across all active certs (0 if none) */
  resolvedStarTier: number;
  /** Label for the resolved tier (null if uncertified) */
  resolvedLabel: CertificationLevel | null;
  /** All active certification paths */
  activePaths: string[];
  /** Highest composite score across paths */
  highestComposite: number | null;
  /** Whether provider has any active certification */
  isCertified: boolean;
}

/**
 * Resolve the effective certification from multiple path records.
 * Uses MAX star_tier rule — the highest active cert wins.
 */
export function resolveProviderCertification(
  certifications: CertificationRecord[]
): ResolvedCertification {
  const activeCerts = certifications.filter((c) => c.status === 'active');

  if (activeCerts.length === 0) {
    return {
      resolvedStarTier: 0,
      resolvedLabel: null,
      activePaths: [],
      highestComposite: null,
      isCertified: false,
    };
  }

  const maxStarTier = Math.max(...activeCerts.map((c) => c.star_tier));
  const highestComposite = Math.max(
    ...activeCerts.map((c) => c.composite_score ?? 0)
  );
  const activePaths = [...new Set(activeCerts.map((c) => c.cert_path))];

  return {
    resolvedStarTier: maxStarTier,
    resolvedLabel: starTierToLabel(maxStarTier),
    activePaths,
    highestComposite,
    isCertified: true,
  };
}

/**
 * Map star tier number to certification label.
 */
export function starTierToLabel(starTier: number): CertificationLevel | null {
  if (starTier === 1) return 'proven';
  if (starTier === 2) return 'acclaimed';
  if (starTier >= 3) return 'eminent';
  return null;
}

/**
 * Map composite score to star tier for performance path.
 */
export function scoreToStarTier(compositeScore: number): { starTier: number; label: CertificationLevel } | null {
  if (compositeScore >= PERFORMANCE_CERT_THRESHOLDS.EMINENT) {
    return { starTier: 3, label: 'eminent' };
  }
  if (compositeScore >= PERFORMANCE_CERT_THRESHOLDS.ACCLAIMED) {
    return { starTier: 2, label: 'acclaimed' };
  }
  if (compositeScore >= PERFORMANCE_CERT_THRESHOLDS.PROVEN) {
    return { starTier: 1, label: 'proven' };
  }
  return null;
}

/**
 * Check if a provider meets the minimum star tier for a challenge.
 */
export function meetsStarGate(
  resolvedStarTier: number,
  challengeAccessType: string,
  challengeMinStarTier: number
): boolean {
  if (challengeAccessType === 'open_all') return true;
  if (challengeAccessType === 'certified_only') return resolvedStarTier >= 1;
  if (challengeAccessType === 'star_gated') return resolvedStarTier >= challengeMinStarTier;
  if (challengeAccessType === 'invite_only') return false; // handled separately
  return false;
}
