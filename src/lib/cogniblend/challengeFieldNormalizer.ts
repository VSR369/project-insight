/**
 * challengeFieldNormalizer.ts
 *
 * Centralized normalization for all constrained challenge fields before DB write.
 * Maps UI/AI aliases to exact DB-trigger-accepted values:
 *   maturity_level:           BLUEPRINT | POC | PROTOTYPE | PILOT
 *   ip_model:                 IP-EA | IP-NEL | IP-EL | IP-JO | IP-NONE
 *   complexity_level:         L1 | L2 | L3 | L4 | L5
 *   rejection_fee_percentage: clamped 5–20
 */

/* ─── Valid DB values ───────────────────────────────── */

const VALID_MATURITY = ['BLUEPRINT', 'POC', 'PROTOTYPE', 'PILOT'] as const;

const VALID_IP_MODELS = ['IP-EA', 'IP-NEL', 'IP-EL', 'IP-JO', 'IP-NONE'] as const;

const VALID_COMPLEXITY = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;

/* ─── IP alias map (lowercase key → DB code) ────────── */

const IP_ALIAS_MAP: Record<string, string> = {
  // AI-generated aliases
  full_transfer: 'IP-EA',
  license: 'IP-NEL',
  shared: 'IP-JO',
  solver_retains: 'IP-NONE',
  exclusive_license: 'IP-EL',
  // UI form aliases
  exclusive_assignment: 'IP-EA',
  non_exclusive_license: 'IP-NEL',
  joint_ownership: 'IP-JO',
  no_transfer: 'IP-NONE',
  // Already-correct codes (lowercase for lookup)
  'ip-ea': 'IP-EA',
  'ip-nel': 'IP-NEL',
  'ip-el': 'IP-EL',
  'ip-jo': 'IP-JO',
  'ip-none': 'IP-NONE',
};

/* ─── Public normalizer ─────────────────────────────── */

export function normalizeChallengeFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...fields };
  const errors: string[] = [];

  // 1. maturity_level
  if (out.maturity_level != null && out.maturity_level !== '') {
    const upper = String(out.maturity_level).toUpperCase();
    if ((VALID_MATURITY as readonly string[]).includes(upper)) {
      out.maturity_level = upper;
    } else {
      errors.push(
        `Invalid maturity_level "${out.maturity_level}". Expected: ${VALID_MATURITY.join(', ')}`,
      );
    }
  }

  // 2. ip_model
  if (out.ip_model != null && out.ip_model !== '') {
    const raw = String(out.ip_model);
    const mapped = IP_ALIAS_MAP[raw.toLowerCase()];
    if (mapped) {
      out.ip_model = mapped;
    } else if ((VALID_IP_MODELS as readonly string[]).includes(raw.toUpperCase())) {
      out.ip_model = raw.toUpperCase();
    } else {
      errors.push(
        `Invalid ip_model "${out.ip_model}". Expected: ${VALID_IP_MODELS.join(', ')} or aliases.`,
      );
    }
  }

  // 3. complexity_level
  if (out.complexity_level != null && out.complexity_level !== '') {
    const upper = String(out.complexity_level).toUpperCase();
    if ((VALID_COMPLEXITY as readonly string[]).includes(upper)) {
      out.complexity_level = upper;
    } else {
      errors.push(
        `Invalid complexity_level "${out.complexity_level}". Expected: ${VALID_COMPLEXITY.join(', ')}`,
      );
    }
  }

  // 4. rejection_fee_percentage — clamp to 5–20
  if (out.rejection_fee_percentage != null && out.rejection_fee_percentage !== '') {
    const fee = parseFloat(String(out.rejection_fee_percentage));
    if (!isNaN(fee)) {
      out.rejection_fee_percentage = Math.max(5, Math.min(20, fee));
    } else {
      errors.push(
        `Invalid rejection_fee_percentage "${out.rejection_fee_percentage}". Must be a number between 5 and 20.`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Challenge field validation failed: ${errors.join('; ')}`);
  }

  return out;
}
