/**
 * EngagementModelSelector — Side-by-side card selector for Marketplace vs Aggregator models.
 * Displays capabilities, communication mode, and feature badges.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getEngagementModelRules, getModelDisplayInfo } from '@/services/engagementModelRulesService';
import { Eye, EyeOff, MessageSquare, MessageSquareOff, Users, ShieldCheck } from 'lucide-react';

interface EngagementModel {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

interface EngagementModelSelectorProps {
  models: EngagementModel[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function EngagementModelSelector({ models, selectedId, onSelect }: EngagementModelSelectorProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {models.map((model) => {
        const rules = getEngagementModelRules(model.code);
        const display = getModelDisplayInfo(model.code);
        const isSelected = selectedId === model.id;

        return (
          <Card
            key={model.id}
            className={cn(
              'cursor-pointer transition-all border-2 hover:shadow-md',
              isSelected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border hover:border-primary/40'
            )}
            onClick={() => onSelect(model.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{model.name}</CardTitle>
                <Badge variant={display.badgeVariant} className="text-xs">
                  {display.label}
                </Badge>
              </div>
              {model.description && (
                <p className="text-sm text-muted-foreground">{model.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{rules.flowDescription}</p>
              <div className="flex flex-wrap gap-2">
                <CapabilityBadge
                  enabled={rules.providerContactVisible}
                  enabledIcon={<Eye className="h-3 w-3" />}
                  disabledIcon={<EyeOff className="h-3 w-3" />}
                  label="Provider contacts"
                />
                <CapabilityBadge
                  enabled={rules.directMessagingEnabled}
                  enabledIcon={<MessageSquare className="h-3 w-3" />}
                  disabledIcon={<MessageSquareOff className="h-3 w-3" />}
                  label="Direct messaging"
                />
                <CapabilityBadge
                  enabled={rules.providerBrowsingEnabled}
                  enabledIcon={<Users className="h-3 w-3" />}
                  disabledIcon={<ShieldCheck className="h-3 w-3" />}
                  label={rules.providerBrowsingEnabled ? 'Browse providers' : 'Platform-matched'}
                />
              </div>
              {isSelected && (
                <div className="text-xs font-medium text-primary pt-1">✓ Selected</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CapabilityBadge({
  enabled,
  enabledIcon,
  disabledIcon,
  label,
}: {
  enabled: boolean;
  enabledIcon: React.ReactNode;
  disabledIcon: React.ReactNode;
  label: string;
}) {
  return (
    <Badge
      variant={enabled ? 'default' : 'secondary'}
      className="text-xs gap-1 font-normal"
    >
      {enabled ? enabledIcon : disabledIcon}
      {label}
    </Badge>
  );
}
