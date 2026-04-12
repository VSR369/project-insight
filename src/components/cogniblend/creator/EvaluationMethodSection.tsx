/**
 * EvaluationMethodSection — Evaluation method picker for STRUCTURED/CONTROLLED modes.
 * SINGLE (1 evaluator) or DELPHI (2-5 independent evaluators).
 */

import { useFormContext } from 'react-hook-form';
import { Info, Lock, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { GovernanceMode } from '@/lib/governanceMode';

interface EvaluationMethodSectionProps {
  governanceMode: GovernanceMode;
}

const EVALUATOR_COUNT_OPTIONS = [
  { value: '2', label: '2 evaluators' },
  { value: '3', label: '3 evaluators' },
  { value: '4', label: '4 evaluators' },
  { value: '5', label: '5 evaluators' },
] as const;

export function EvaluationMethodSection({ governanceMode }: EvaluationMethodSectionProps) {
  const { watch, setValue } = useFormContext();
  const evaluationMethod = watch('evaluation_method') ?? 'SINGLE';
  const evaluatorCount = watch('evaluator_count') ?? 1;
  const isControlled = governanceMode === 'CONTROLLED';
  const isDelphi = evaluationMethod === 'DELPHI';

  const handleMethodChange = (value: string) => {
    setValue('evaluation_method', value, { shouldDirty: true });
    if (value === 'SINGLE') {
      setValue('evaluator_count', 1, { shouldDirty: true });
    } else if (value === 'DELPHI' && evaluatorCount < 2) {
      setValue('evaluator_count', 3, { shouldDirty: true });
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4 text-muted-foreground" />
        Evaluation Method
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Choose how submissions will be evaluated. Single uses one expert; Delphi uses multiple independent evaluators whose scores are aggregated.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <RadioGroup
        value={evaluationMethod}
        onValueChange={handleMethodChange}
        className="flex flex-col gap-1.5"
      >
        <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
          <RadioGroupItem value="SINGLE" id="em-single" className="mt-0.5" />
          <div>
            <Label htmlFor="em-single" className="text-sm font-medium cursor-pointer">Single evaluator</Label>
            <p className="text-xs text-muted-foreground">One expert reviewer scores all submissions</p>
          </div>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
          <RadioGroupItem value="DELPHI" id="em-delphi" className="mt-0.5" />
          <div>
            <Label htmlFor="em-delphi" className="text-sm font-medium cursor-pointer">Delphi panel</Label>
            <p className="text-xs text-muted-foreground">Multiple independent evaluators score separately, results aggregated</p>
          </div>
        </label>
      </RadioGroup>

      {isDelphi && (
        <div className="space-y-1.5 pl-1">
          <Label className="text-sm font-medium">Number of evaluators</Label>
          <Select
            value={String(evaluatorCount)}
            onValueChange={(v) => setValue('evaluator_count', Number(v), { shouldDirty: true })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVALUATOR_COUNT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isControlled ? (
        <div className="flex items-center gap-2 rounded-md bg-accent/50 px-3 py-2">
          <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Badge variant="secondary" className="text-xs font-normal">
            Blinded evaluation: Solution Provider identities hidden from evaluators
          </Badge>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Info className="h-3 w-3 shrink-0" />
          Evaluators can see Solution Provider identities
        </p>
      )}
    </div>
  );
}
