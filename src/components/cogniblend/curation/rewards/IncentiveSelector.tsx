/**
 * IncentiveSelector — Card-based selector for non-monetary incentives.
 * Filters by challenge maturity + complexity, shows seeker commitment input.
 */

import { useState, useMemo } from 'react';
import { Plus, X, Sparkles, Info, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { NonMonetaryIncentive } from '@/hooks/queries/useNonMonetaryIncentives';
import type { ChallengeIncentiveSelection } from '@/hooks/queries/useChallengeIncentiveSelections';

const APPEAL_COLORS: Record<string, string> = {
  exceptional: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  very_high: 'bg-blue-100 text-blue-800 border-blue-300',
  high: 'bg-amber-100 text-amber-800 border-amber-300',
};

interface IncentiveSelectorProps {
  availableIncentives: NonMonetaryIncentive[];
  selections: ChallengeIncentiveSelection[];
  maturityLevel?: string | null;
  complexityLevel?: string | null;
  disabled?: boolean;
  onAdd: (incentiveId: string) => void;
  onRemove: (selectionId: string) => void;
  onUpdateCommitment: (selectionId: string, commitment: string) => void;
}

export default function IncentiveSelector({
  availableIncentives,
  selections,
  maturityLevel,
  complexityLevel,
  disabled = false,
  onAdd,
  onRemove,
  onUpdateCommitment,
}: IncentiveSelectorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const selectedIds = useMemo(() => new Set(selections.map(s => s.incentive_id)), [selections]);

  // Filter available incentives by maturity and complexity
  const filteredIncentives = useMemo(() => {
    return availableIncentives.filter(inc => {
      if (selectedIds.has(inc.id)) return false;
      if (maturityLevel && inc.applicable_maturity_levels?.length > 0) {
        if (!inc.applicable_maturity_levels.includes(maturityLevel)) return false;
      }
      if (complexityLevel && inc.minimum_complexity) {
        const complexityOrder = ['L1', 'L2', 'L3', 'L4', 'L5'];
        const minIdx = complexityOrder.indexOf(inc.minimum_complexity);
        const currentIdx = complexityOrder.indexOf(complexityLevel);
        if (minIdx >= 0 && currentIdx >= 0 && currentIdx < minIdx) return false;
      }
      return true;
    });
  }, [availableIncentives, selectedIds, maturityLevel, complexityLevel]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Non-Monetary Incentives</h4>
        {!disabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPicker(!showPicker)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Incentive
          </Button>
        )}
      </div>

      {/* Selected incentives */}
      {selections.length > 0 ? (
        <div className="space-y-2">
          {selections.map(sel => (
            <Card key={sel.id} className="border-border">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="text-sm font-medium">{sel.incentive?.name ?? 'Incentive'}</span>
                      {sel.incentive?.solver_appeal && (
                        <Badge variant="outline" className={cn('text-[9px]', APPEAL_COLORS[sel.incentive.solver_appeal] ?? '')}>
                          {sel.incentive.solver_appeal.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{sel.incentive?.description}</p>
                    {sel.incentive && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Cash equivalent: ${sel.incentive.cash_equivalent_min.toLocaleString()} – ${sel.incentive.cash_equivalent_max.toLocaleString()}
                      </p>
                    )}

                    {/* Seeker commitment input */}
                    <div className="mt-2">
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                        Seeker Commitment *
                      </label>
                      {disabled ? (
                        <p className="text-xs">{sel.seeker_commitment || '—'}</p>
                      ) : (
                        <Input
                          value={sel.seeker_commitment ?? ''}
                          onChange={(e) => onUpdateCommitment(sel.id, e.target.value)}
                          placeholder={sel.incentive?.seeker_requirement ?? 'What the seeker will provide'}
                          className="h-7 text-xs"
                        />
                      )}
                    </div>
                  </div>
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemove(sel.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          No non-monetary incentives selected. Add incentives to increase solver appeal.
        </p>
      )}

      {/* Picker dropdown */}
      {showPicker && filteredIncentives.length > 0 && (
        <div className="border border-border rounded-lg p-2 bg-background space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground px-1">
            Available incentives ({filteredIncentives.length})
          </p>
          {filteredIncentives.map(inc => (
            <div
              key={inc.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => {
                onAdd(inc.id);
                if (filteredIncentives.length <= 1) setShowPicker(false);
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{inc.name}</span>
                  <Badge variant="outline" className={cn('text-[9px]', APPEAL_COLORS[inc.solver_appeal] ?? '')}>
                    {inc.solver_appeal.replace('_', ' ')}
                  </Badge>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        {inc.credibility_note}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground">{inc.description}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  ~${inc.cash_equivalent_min.toLocaleString()} – ${inc.cash_equivalent_max.toLocaleString()}
                </p>
              </div>
              <Plus className="h-4 w-4 text-primary shrink-0" />
            </div>
          ))}
        </div>
      )}

      {showPicker && filteredIncentives.length === 0 && (
        <p className="text-xs text-muted-foreground italic px-1">
          No additional incentives available for this maturity/complexity level.
        </p>
      )}
    </div>
  );
}
