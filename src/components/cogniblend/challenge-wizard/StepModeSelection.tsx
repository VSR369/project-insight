/**
 * Step 0 — Mode & Model Selection
 *
 * Allows per-challenge governance mode selection:
 *   QUICK / STRUCTURED / CONTROLLED
 * Plus operating model selector (MP / AGG).
 */

import { Controller } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { Info, Zap, Settings2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GovernanceMode } from '@/lib/governanceMode';
import { GOVERNANCE_MODE_CONFIG } from '@/lib/governanceMode';
import type { ChallengeFormValues } from './challengeFormSchema';

/* ─── Mode card config ───────────────────────────────── */

const MODE_CARDS: Array<{
  mode: GovernanceMode;
  icon: typeof Zap;
  features: string[];
}> = [
  {
    mode: 'QUICK',
    icon: Zap,
    features: [
      'Simplified workflow with fewer required fields',
      'Auto-completion & merged roles',
      'Auto-attached legal defaults',
      'Ideal for fast experiments & small challenges',
    ],
  },
  {
    mode: 'STRUCTURED',
    icon: Settings2,
    features: [
      'Full field set with manual curation',
      'Optional add-ons (escrow, targeting)',
      'Distinct creator & curator roles',
      'Best for standard enterprise challenges',
    ],
  },
  {
    mode: 'CONTROLLED',
    icon: ShieldCheck,
    features: [
      'Mandatory escrow & formal gates',
      'All legal documents required',
      'Strict role separation enforced',
      'Full compliance & audit trail',
    ],
  },
];

/* ─── Props ──────────────────────────────────────────── */

interface StepModeSelectionProps {
  form: UseFormReturn<ChallengeFormValues>;
  orgOperatingModel?: string | null;
  disabledModes?: GovernanceMode[];
  tierName?: string;
}

/* ─── Component ──────────────────────────────────────── */

export function StepModeSelection({
  form,
  orgOperatingModel,
  disabledModes = [],
  tierName,
}: StepModeSelectionProps) {
  const selectedMode = (form.watch('governance_mode') ?? 'STRUCTURED') as GovernanceMode;
  const selectedModel = form.watch('operating_model') ?? orgOperatingModel ?? 'MP';

  return (
    <div className="space-y-8">
      {/* ═══ Section 1: Governance Mode ═══ */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Governance Mode</h3>
          <p className="text-sm text-muted-foreground">
            Choose how much structure and compliance this challenge requires.
            {tierName && (
              <span className="ml-1 text-xs text-muted-foreground">
                (Your tier: <span className="font-medium">{tierName}</span>)
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {MODE_CARDS.map(({ mode, icon: Icon, features }) => {
            const cfg = GOVERNANCE_MODE_CONFIG[mode];
            const isSelected = selectedMode === mode;
            const isDisabled = disabledModes.includes(mode);

            return (
              <TooltipProvider key={mode} delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (!isDisabled) {
                          form.setValue('governance_mode', mode, { shouldDirty: true });
                        }
                      }}
                      className={cn(
                        'relative w-full text-left rounded-xl border-2 p-5 transition-all',
                        isSelected
                          ? 'shadow-md ring-1'
                          : 'hover:shadow-sm',
                        isDisabled && 'opacity-40 cursor-not-allowed',
                      )}
                      style={{
                        borderColor: isSelected ? cfg.color : 'hsl(var(--border))',
                        backgroundColor: isSelected ? cfg.bg : 'transparent',
                        ...(isSelected ? { boxShadow: `0 0 0 1px ${cfg.color}20` } : {}),
                      }}
                    >
                      {/* Header */}
                      <div className="flex items-center gap-2.5 mb-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold" style={{ color: cfg.color }}>
                            {cfg.label}
                          </p>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="space-y-1.5">
                        {features.map((f) => (
                          <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="mt-0.5 shrink-0 w-1 h-1 rounded-full" style={{ backgroundColor: cfg.color }} />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* Selected indicator */}
                      {isSelected && (
                        <div
                          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: cfg.color }}
                        >
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      {/* Disabled badge */}
                      {isDisabled && (
                        <Badge variant="secondary" className="absolute top-2.5 right-2.5 text-[9px]">
                          Upgrade required
                        </Badge>
                      )}
                    </button>
                  </TooltipTrigger>
                  {isDisabled && (
                    <TooltipContent className="max-w-[220px] text-xs">
                      This governance mode is not available on your current subscription tier.
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>

      {/* ═══ Section 2: Operating Model ═══ */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Engagement Model</h3>
          <p className="text-sm text-muted-foreground">
            Select the engagement model for this challenge. This determines how solvers are engaged and managed.
          </p>
        </div>

        <Controller
          control={form.control}
          name="operating_model"
          render={({ field }) => (
            <Select value={field.value || selectedModel} onValueChange={field.onChange}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="Select engagement model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MP">Marketplace (MP) — Open competition</SelectItem>
                <SelectItem value="AGG">Aggregator (AGG) — Curated selection</SelectItem>
              </SelectContent>
            </Select>
          )}
        />

        <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2.5 max-w-sm">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {selectedModel === 'AGG'
              ? 'Aggregator model: solvers are curated and invited. An Account Manager (AM) role is not required.'
              : 'Marketplace model: solvers discover and apply. An Account Manager (AM) role manages the process.'}
          </p>
        </div>
      </div>
    </div>
  );
}
