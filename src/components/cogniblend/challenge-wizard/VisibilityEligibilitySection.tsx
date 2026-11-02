/**
 * VisibilityEligibilitySection — BR-CHL-P10 visibility picklist
 * (Eligible certified providers / Invite only / Public) plus the
 * Minimum expertise level (L1–L4). Rendered in StepProviderEligibility.
 */

import { Controller, type UseFormReturn } from 'react-hook-form';
import { Globe, Lock, UserCheck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  VISIBILITY_OPTIONS,
  VISIBILITY_ELIGIBLE_CERTIFIED,
} from '@/constants/challengeOptions.constants';
import type { ChallengeFormValues } from './challengeFormSchema';

interface VisibilityEligibilitySectionProps {
  form: UseFormReturn<ChallengeFormValues>;
}

const VISIBILITY_ICONS: Record<string, typeof Globe> = {
  eligible_certified: UserCheck,
  invite_only: Lock,
  public: Globe,
};

const EXPERTISE_LEVELS = [
  { value: 1, label: 'L1 — Foundation' },
  { value: 2, label: 'L2 — Practitioner' },
  { value: 3, label: 'L3 — Expert' },
  { value: 4, label: 'L4 — Authority' },
];

export function VisibilityEligibilitySection({ form }: VisibilityEligibilitySectionProps) {
  const { control, watch } = form;
  const visibility = watch('visibility') ?? VISIBILITY_ELIGIBLE_CERTIFIED;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-foreground">Visibility</h4>
        <p className="text-xs text-muted-foreground">
          Who may see and join this challenge.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <Controller
          name="visibility"
          control={control}
          render={({ field }) => (
            <>
              {VISIBILITY_OPTIONS.map((option) => {
                const Icon = VISIBILITY_ICONS[option.value] ?? Globe;
                const isSelected = field.value === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => field.onChange(option.value)}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                      isSelected
                        ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border bg-background hover:bg-muted/50',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    <div>
                      <span className="text-sm font-semibold text-foreground">{option.label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        />
      </div>

      {visibility === VISIBILITY_ELIGIBLE_CERTIFIED && (
        <div className="space-y-1.5 pl-1">
          <Label className="text-sm font-medium" htmlFor="min-expertise-level">
            Minimum expertise level
          </Label>
          <Controller
            name="min_expertise_level"
            control={control}
            render={({ field }) => (
              <Select
                value={String(field.value ?? 1)}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                <SelectTrigger id="min-expertise-level" className="w-48 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPERTISE_LEVELS.map((lvl) => (
                    <SelectItem key={lvl.value} value={String(lvl.value)}>
                      {lvl.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Only providers certified in the challenge's industry segment at this level or higher can see and join.
          </p>
        </div>
      )}
    </div>
  );
}
