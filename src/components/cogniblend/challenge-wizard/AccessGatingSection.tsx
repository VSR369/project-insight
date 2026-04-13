/**
 * AccessGatingSection — Challenge access type + min star tier controls.
 * Used in StepProviderEligibility (Step 5).
 */

import { UseFormReturn, Controller } from 'react-hook-form';
import { Shield, Globe, Star, Lock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CHALLENGE_ACCESS_TYPES } from '@/constants/enrollment.constants';
import type { ChallengeFormValues } from './challengeFormSchema';

interface AccessGatingSectionProps {
  form: UseFormReturn<ChallengeFormValues>;
}

const ACCESS_ICONS: Record<string, typeof Globe> = {
  open_all: Globe,
  certified_only: Shield,
  star_gated: Star,
  invite_only: Lock,
};

export function AccessGatingSection({ form }: AccessGatingSectionProps) {
  const { control, watch } = form;
  const accessType = watch('access_type') ?? 'open_all';

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-foreground">Challenge Access Type</h4>
        <p className="text-xs text-muted-foreground">
          Control who can discover and submit solutions to this challenge.
        </p>
      </div>

      {/* Access Type selector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Controller
          name="access_type"
          control={control}
          render={({ field }) => (
            <>
              {CHALLENGE_ACCESS_TYPES.map((type) => {
                const Icon = ACCESS_ICONS[type.value] ?? Globe;
                const isSelected = field.value === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => field.onChange(type.value)}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                      isSelected
                        ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border bg-background hover:bg-muted/50',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    <div>
                      <span className="text-sm font-semibold text-foreground">{type.label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        />
      </div>

      {/* Min Star Tier — only shown for star_gated */}
      {accessType === 'star_gated' && (
        <div className="space-y-1.5 pl-1">
          <Label className="text-sm font-medium">Minimum Star Tier</Label>
          <Controller
            name="min_star_tier"
            control={control}
            render={({ field }) => (
              <Select
                value={String(field.value ?? 1)}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                <SelectTrigger className="w-48 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">⭐ Proven (1 star)</SelectItem>
                  <SelectItem value="2">⭐⭐ Acclaimed (2 stars)</SelectItem>
                  <SelectItem value="3">⭐⭐⭐ Eminent (3 stars)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Only providers with this tier or higher can participate.
          </p>
        </div>
      )}

      {/* Info badges */}
      <div className="flex flex-wrap gap-2">
        {accessType === 'open_all' && (
          <Badge variant="outline" className="text-xs">All registered providers can participate</Badge>
        )}
        {accessType === 'certified_only' && (
          <Badge variant="outline" className="text-xs">Requires any active certification</Badge>
        )}
        {accessType === 'invite_only' && (
          <Badge variant="outline" className="text-xs">Invitation required — provider cannot self-enroll</Badge>
        )}
      </div>
    </div>
  );
}
