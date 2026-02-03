/**
 * Expertise Upgrade Policy Constants
 * 
 * For certified providers who want to change their expertise level
 * and go through re-certification process.
 */

export const EXPERTISE_UPGRADE_POLICY = {
  /** What can be changed after certification */
  CHANGEABLE_FIELDS: {
    industry_segment_id: false,    // NEVER changeable
    expertise_level_id: true,      // Can upgrade/change
    proficiency_areas: true,       // Must re-select (user-selected)
  },
  
  /** Data handling during upgrade */
  DATA_HANDLING: {
    proficiency_areas: 'clear',    // Must re-select for new level
    specialities: 'auto',          // Auto-derived, no action needed
    proof_points: 'retain',        // Keep existing
    proof_point_tags: 'retain',    // Keep with proof points
  },
  
  /** Status reset target */
  RESET_TO_STATUS: 'expertise_selected' as const,
  RESET_TO_RANK: 50,
  
  /** No cooling-off for voluntary upgrade */
  COOLING_OFF_REQUIRED: false,
} as const;

// Note: EXPERTISE_UPGRADE_ELIGIBLE_STATES is defined in lifecycle.constants.ts
// to keep all lifecycle-related constants together
