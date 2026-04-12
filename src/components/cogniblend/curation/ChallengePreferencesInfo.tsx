/**
 * ChallengePreferencesInfo — Read-only display of creator challenge preferences
 * in the Curator's Organization tab.
 *
 * Shows: Creator Approval, Community Creation, Anonymous Challenge.
 */

import { Shield, Users, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ChallengePreferencesInfoProps {
  operatingModel: string | null;
  creatorApprovalRequired: boolean;
  communityCreationAllowed: boolean;
  isAnonymous: boolean;
}

interface PreferenceBadgeProps {
  icon: React.ElementType;
  label: string;
  value: string;
  isActive: boolean;
}

function PreferenceBadge({ icon: Icon, label, value, isActive }: PreferenceBadgeProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <Badge
        variant={isActive ? 'default' : 'secondary'}
        className="text-xs"
      >
        {value}
      </Badge>
    </div>
  );
}

export function ChallengePreferencesInfo({
  operatingModel,
  creatorApprovalRequired,
  communityCreationAllowed,
  isAnonymous,
}: ChallengePreferencesInfoProps) {
  const isMp = operatingModel === 'MP';
  const approvalLabel = isMp
    ? 'Mandatory (Marketplace)'
    : creatorApprovalRequired
      ? 'Required'
      : 'Not Required';

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Challenge Preferences</h4>

      <div className="space-y-2">
        <PreferenceBadge
          icon={Shield}
          label="Creator Approval"
          value={approvalLabel}
          isActive={isMp || creatorApprovalRequired}
        />
        <PreferenceBadge
          icon={Users}
          label="Community Creation"
          value={communityCreationAllowed ? 'Allowed' : 'Not Allowed'}
          isActive={communityCreationAllowed}
        />
        <PreferenceBadge
          icon={EyeOff}
          label="Anonymous Challenge"
          value={isAnonymous ? 'Yes' : 'No'}
          isActive={isAnonymous}
        />
      </div>
    </div>
  );
}
