/**
 * Engagement Model Runtime Rules Service (BR-EMF-002/003)
 *
 * Defines runtime behavior differences between Marketplace and Aggregator models.
 * Marketplace: provider contacts visible, direct messaging enabled, Platform legal templates.
 * Aggregator: provider contacts hidden, messaging disabled, platform-mediated, Org legal templates.
 *
 * All component-level branching on engagement model MUST go through this service —
 * no `engagementModel === 'AGG'` literals scattered through components.
 */

export type EngagementModelCode = 'marketplace' | 'aggregator';
export type EngagementShortCode = 'MP' | 'AGG';

interface EngagementModelRules {
  /** Whether seekers can see provider contact details */
  providerContactVisible: boolean;
  /** Whether direct messaging between seeker and provider is enabled */
  directMessagingEnabled: boolean;
  /** Whether the platform mediates all communication */
  platformMediated: boolean;
  /** Whether seekers can browse and select providers directly */
  providerBrowsingEnabled: boolean;
  /** Whether the creator can choose the solver audience (MP fixed to ALL) */
  audienceSelectable: boolean;
  /** Where the CPA legal template is sourced from */
  legalTemplateSource: 'PLATFORM' | 'ORG';
  /** Label shown in UI for the communication mode */
  communicationLabel: string;
  /** Description of the engagement flow */
  flowDescription: string;
  /** Short label used in chips/badges */
  shortLabel: string;
}

const MODEL_RULES: Record<EngagementModelCode, EngagementModelRules> = {
  marketplace: {
    providerContactVisible: true,
    directMessagingEnabled: true,
    platformMediated: false,
    providerBrowsingEnabled: true,
    audienceSelectable: false,
    legalTemplateSource: 'PLATFORM',
    communicationLabel: 'Direct Communication',
    flowDescription: 'You can browse providers, view their profiles, and communicate directly.',
    shortLabel: 'Marketplace',
  },
  aggregator: {
    providerContactVisible: false,
    directMessagingEnabled: false,
    platformMediated: true,
    providerBrowsingEnabled: false,
    audienceSelectable: true,
    legalTemplateSource: 'ORG',
    communicationLabel: 'Platform-Mediated',
    flowDescription: 'The platform manages provider matching and all communication on your behalf.',
    shortLabel: 'Aggregator',
  },
};

/** Normalize either short ('MP'/'AGG') or long codes to the canonical key. */
function normalize(modelCode: string): EngagementModelCode {
  const upper = (modelCode ?? '').toUpperCase().trim();
  if (upper === 'MP' || upper === 'MARKETPLACE') return 'marketplace';
  if (upper === 'AGG' || upper === 'AGGREGATOR') return 'aggregator';
  return 'marketplace';
}

/**
 * Get runtime rules for a given engagement model code.
 * Returns marketplace rules as default fallback.
 */
export function getEngagementModelRules(modelCode: string): EngagementModelRules {
  return MODEL_RULES[normalize(modelCode)];
}

/**
 * Check if a specific capability is enabled for the given model.
 */
export function isCapabilityEnabled(
  modelCode: string,
  capability: keyof EngagementModelRules,
): boolean {
  const rules = getEngagementModelRules(modelCode);
  return !!rules[capability];
}

/**
 * Get UI display info for the engagement model.
 */
export function getModelDisplayInfo(modelCode: string): {
  label: string;
  description: string;
  badgeVariant: 'default' | 'secondary';
} {
  const rules = getEngagementModelRules(modelCode);
  return {
    label: rules.communicationLabel,
    description: rules.flowDescription,
    badgeVariant: rules.platformMediated ? 'secondary' : 'default',
  };
}

/* ─── Centralized helpers (replace inline literals in components) ─── */

/**
 * True if the creator must be allowed to pick a solver audience
 * (today: AGG only; MP can be unlocked here later via config).
 */
export function audienceSelectable(modelCode: string): boolean {
  return getEngagementModelRules(modelCode).audienceSelectable;
}

/**
 * Where the CPA template should be loaded from for this engagement model.
 * - MP  → 'PLATFORM' (Platform Admin templates)
 * - AGG → 'ORG'      (Seeking-Org Admin templates)
 */
export function legalTemplateSource(modelCode: string): 'PLATFORM' | 'ORG' {
  return getEngagementModelRules(modelCode).legalTemplateSource;
}

/**
 * True if direct seeker ↔ provider contact is allowed in this model.
 */
export function directContactEnabled(modelCode: string): boolean {
  return getEngagementModelRules(modelCode).directMessagingEnabled;
}

/** Short label ('Marketplace' / 'Aggregator'). */
export function modelShortLabel(modelCode: string): string {
  return getEngagementModelRules(modelCode).shortLabel;
}
