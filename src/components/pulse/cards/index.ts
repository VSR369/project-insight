/**
 * PulseCards Components Barrel Export
 */

// Core components
export { PulseCard } from './PulseCard';
export { PulseCardStack } from './PulseCardStack';
export { PulseCardLayer } from './PulseCardLayer';
export { CardVoteButton } from './CardVoteButton';
export { ReputationBadge } from './ReputationBadge';
export { TopicSelector } from './TopicSelector';

// Dual-view components
export { ViewModeToggle, type ViewMode } from './ViewModeToggle';
export { CompiledView } from './CompiledView';
export { ContributorsView } from './ContributorsView';
export { ContributorAvatars, type Contributor } from './ContributorAvatars';

// Dialogs
export { CreateCardDialog } from './CreateCardDialog';
export { CreateLayerDialog } from './CreateLayerDialog';
export { FlagCardDialog } from './FlagCardDialog';

// Admin/Moderation
export { TrustCouncilDashboard } from './TrustCouncilDashboard';
export { StrikeTracker, StrikeIndicator } from './StrikeTracker';

// Re-export types for convenience
export type { PulseCard as PulseCardType } from '@/hooks/queries/usePulseCards';
export type { PulseCardLayer as PulseCardLayerType } from '@/hooks/queries/usePulseCardLayers';
