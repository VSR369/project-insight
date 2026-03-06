import { useUpdateCheckResult } from '@/hooks/queries/useVerificationMutations';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

const CHECK_LABELS: Record<string, { label: string; description: string }> = {
  V1: { label: 'V1 — Domain Verification', description: 'Verify organization email domain matches website' },
  V2: { label: 'V2 — Organization Identity', description: 'Confirm organization exists and details are accurate' },
  V3: { label: 'V3 — Registration Documents', description: 'Validate registration/incorporation documents' },
  V4: { label: 'V4 — Compliance Check', description: 'Verify compliance with platform terms and regulations' },
  V5: { label: 'V5 — Admin Identity', description: 'Confirm primary admin identity and authority' },
  V6: { label: 'V6 — Final Review', description: 'Overall assessment and final determination' },
};

interface VerificationChecksPanelProps {
  checks: Array<{
    id: string;
    check_id: string;
    result: string;
    notes: string | null;
  }>;
  isEditable: boolean;
}

export function VerificationChecksPanel({ checks, isEditable }: VerificationChecksPanelProps) {
  const updateMutation = useUpdateCheckResult();

  const completedCount = checks.filter(c => c.result !== 'Pending').length;
  const progressPct = checks.length > 0 ? (completedCount / checks.length) * 100 : 0;

  // V6 is disabled until V1-V5 are all non-Pending
  const v1to5Complete = checks
    .filter(c => c.check_id !== 'V6')
    .every(c => c.result !== 'Pending');

  const handleResultChange = (checkId: string, result: 'Pass' | 'Fail' | 'Pending', notes?: string) => {
    updateMutation.mutate({ checkId, result, notes });
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progress: {completedCount} of {checks.length} checks completed</span>
          <span className="text-muted-foreground">{Math.round(progressPct)}%</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {/* Check rows */}
      <div className="space-y-3">
        {checks.map((check) => {
          const meta = CHECK_LABELS[check.check_id] ?? { label: check.check_id, description: '' };
          const isV6 = check.check_id === 'V6';
          const isDisabled = !isEditable || (isV6 && !v1to5Complete);

          return (
            <div
              key={check.id}
              className={`rounded-lg border p-4 space-y-3 ${
                !isEditable ? 'bg-muted/30' : ''
              } ${isDisabled && isV6 ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">{meta.label}</h4>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
                <ResultBadge result={check.result} />
              </div>

              {isEditable && !isDisabled ? (
                <>
                  <RadioGroup
                    value={check.result}
                    onValueChange={(val) => handleResultChange(check.id, val as 'Pass' | 'Fail' | 'Pending', check.notes ?? undefined)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Pass" id={`${check.id}-pass`} />
                      <Label htmlFor={`${check.id}-pass`} className="text-sm cursor-pointer">Pass</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Fail" id={`${check.id}-fail`} />
                      <Label htmlFor={`${check.id}-fail`} className="text-sm cursor-pointer">Fail</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Pending" id={`${check.id}-pending`} />
                      <Label htmlFor={`${check.id}-pending`} className="text-sm cursor-pointer">Pending</Label>
                    </div>
                  </RadioGroup>
                  <Textarea
                    placeholder="Notes (optional)"
                    defaultValue={check.notes ?? ''}
                    onBlur={(e) => {
                      if (e.target.value !== (check.notes ?? '')) {
                        handleResultChange(check.id, check.result as 'Pass' | 'Fail' | 'Pending', e.target.value);
                      }
                    }}
                    rows={2}
                    className="text-sm"
                  />
                </>
              ) : (
                check.notes && <p className="text-sm text-muted-foreground italic">{check.notes}</p>
              )}

              {isV6 && !v1to5Complete && (
                <p className="text-xs text-amber-600">Complete V1–V5 before setting V6.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultBadge({ result }: { result: string }) {
  switch (result) {
    case 'Pass':
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1"><CheckCircle2 className="h-3 w-3" />Pass</Badge>;
    case 'Fail':
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Fail</Badge>;
    default:
      return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
  }
}
