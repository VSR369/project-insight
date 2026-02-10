/**
 * Engagement Model Runtime Rules Service (BR-EMF-002/003)
 * 
 * Defines runtime behavior differences between Marketplace and Aggregator models.
 * Marketplace: provider contacts visible, direct messaging enabled
 * Aggregator: provider contacts hidden, messaging disabled, platform-mediated
 */

export type EngagementModelCode = 'marketplace' | 'aggregator';

interface EngagementModelRules {
  /** Whether seekers can see provider contact details */
  providerContactVisible: boolean;
  /** Whether direct messaging between seeker and provider is enabled */
  directMessagingEnabled: boolean;
  /** Whether the platform mediates all communication */
  platformMediated: boolean;
  /** Whether seekers can browse and select providers directly */
  providerBrowsingEnabled: boolean;
  /** Label shown in UI for the communication mode */
  communicationLabel: string;
  /** Description of the engagement flow */
  flowDescription: string;
}

const MODEL_RULES: Record<EngagementModelCode, EngagementModelRules> = {
  marketplace: {
    providerContactVisible: true,
    directMessagingEnabled: true,
    platformMediated: false,
    providerBrowsingEnabled: true,
    communicationLabel: 'Direct Communication',
    flowDescription: 'You can browse providers, view their profiles, and communicate directly.',
  },
  aggregator: {
    providerContactVisible: false,
    directMessagingEnabled: false,
    platformMediated: true,
    providerBrowsingEnabled: false,
    communicationLabel: 'Platform-Mediated',
    flowDescription: 'The platform manages provider matching and all communication on your behalf.',
  },
};

/**
 * Get runtime rules for a given engagement model code.
 * Returns marketplace rules as default fallback.
 */
export function getEngagementModelRules(modelCode: string): EngagementModelRules {
  const normalized = modelCode.toLowerCase() as EngagementModelCode;
  return MODEL_RULES[normalized] ?? MODEL_RULES.marketplace;
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
