/**
 * ChallengeSubmitSummaryModal — Pre-submission review of all wizard entries.
 * Shows a structured summary across all 4 steps before final confirmation.
 */

import { Check, AlertTriangle, Send } from 'lucide-react';
import { resolveGovernanceMode, isEnterpriseGrade } from '@/lib/governanceMode';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { ChallengeFormValues } from './challengeFormSchema';

/* ─── Constants ──────────────────────────────────────── */

const MATURITY_LABELS: Record<string, string> = {
  blueprint: 'An idea or concept',
  poc: 'Proof it can work',
  prototype: 'A working demo',
  pilot: 'A real-world test',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};

/* ─── Props ──────────────────────────────────────────── */

interface ChallengeSubmitSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: ChallengeFormValues;
  governanceProfile: string | null;
  isSubmitting: boolean;
  onConfirm: () => void;
}

/* ─── Component ──────────────────────────────────────── */

export function ChallengeSubmitSummaryModal({
  open,
  onOpenChange,
  values,
  governanceProfile,
  isSubmitting,
  onConfirm,
}: ChallengeSubmitSummaryModalProps) {
  const isEnterprise = isEnterpriseGrade(resolveGovernanceMode(governanceProfile));
  const sym = CURRENCY_SYMBOLS[values.currency_code] ?? '$';
  const totalWeight = values.weighted_criteria.reduce((s, c) => s + (c.weight || 0), 0);
  const deliverables = values.deliverables_list.filter(Boolean);

  // Complexity
  const complexityScore = values.complexity_params
    ? Object.values(values.complexity_params).reduce((s, v, i) => {
        const weights = [0.20, 0.15, 0.15, 0.15, 0.15, 0.10, 0.10];
        return s + v * (weights[i] ?? 0.1);
      }, 0)
    : null;

  const getComplexityLabel = (score: number) => {
    if (score < 2) return 'L1';
    if (score < 4) return 'L2';
    if (score < 6) return 'L3';
    if (score < 8) return 'L4';
    return 'L5';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg font-bold">Review & Confirm Submission</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Please review all details before submitting.
            {isEnterprise
              ? ' This will route your challenge for Legal Review.'
              : ' Your challenge will be submitted for curation.'}
          </p>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-5">
          {/* ── Step 1: Problem ── */}
          <SummarySection title="Step 1 — Problem Definition">
            <SummaryRow label="Title" value={values.title} />
            <SummaryRow
              label="Problem Statement"
              value={values.problem_statement}
              truncate
            />
            {values.scope && <SummaryRow label="Scope" value={values.scope} truncate />}
            <SummaryRow
              label="Domain Tags"
              value={
                <div className="flex flex-wrap gap-1">
                  {values.domain_tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              }
            />
            <SummaryRow
              label="Maturity Level"
              value={MATURITY_LABELS[values.maturity_level] ?? values.maturity_level}
            />
          </SummarySection>

          <Separator />

          {/* ── Step 2: Requirements ── */}
          <SummarySection title="Step 2 — Requirements">
            <SummaryRow
              label="Deliverables"
              value={
                <ul className="list-disc list-inside text-sm text-foreground space-y-0.5">
                  {deliverables.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              }
            />
            {values.permitted_artifact_types.length > 0 && (
              <SummaryRow
                label="Artifact Types"
                value={values.permitted_artifact_types.join(', ')}
              />
            )}
            {values.ip_model && <SummaryRow label="IP Model" value={values.ip_model.split('—')[0]?.trim()} />}
            {values.submission_guidelines && (
              <SummaryRow label="Submission Guidelines" value={values.submission_guidelines} truncate />
            )}
          </SummarySection>

          <Separator />

          {/* ── Step 3: Evaluation ── */}
          <SummarySection title="Step 3 — Evaluation & Rewards">
            <SummaryRow
              label="Evaluation Criteria"
              value={
                <div className="space-y-1">
                  {values.weighted_criteria.filter((c) => c.name).map((c, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-foreground">{c.name}</span>
                      <span className="text-muted-foreground font-medium">{c.weight}%</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 pt-1">
                    {totalWeight === 100 ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        totalWeight === 100 ? 'text-emerald-600' : 'text-destructive'
                      }`}
                    >
                      Total: {totalWeight}%
                    </span>
                  </div>
                </div>
              }
            />
            <SummaryRow label="Platinum Award" value={`${sym}${values.platinum_award.toLocaleString()}`} />
            <SummaryRow label="Gold Award" value={`${sym}${values.gold_award.toLocaleString()}`} />
            {values.silver_award !== undefined && values.silver_award > 0 && (
              <SummaryRow label="Silver Award" value={`${sym}${values.silver_award.toLocaleString()}`} />
            )}
            {!isEnterprise ? null : (
              <SummaryRow label="Rejection Fee" value={`${values.rejection_fee_pct}%`} />
            )}
          </SummarySection>

          <Separator />

          {/* ── Step 4: Timeline ── */}
          <SummarySection title="Step 4 — Timeline & Complexity">
            {values.submission_deadline && (
              <SummaryRow label="Start Date" value={values.submission_deadline} />
            )}
            {values.phase_durations && (
              <SummaryRow
                label="Phase Durations"
                value={
                  <div className="space-y-0.5 text-sm">
                    {Object.entries(values.phase_durations).map(([key, days]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-muted-foreground">{days} days</span>
                      </div>
                    ))}
                  </div>
                }
              />
            )}
            {complexityScore !== null ? (
              <SummaryRow
                label="Complexity"
                value={`Score: ${complexityScore.toFixed(1)} (${getComplexityLabel(complexityScore)})`}
              />
            ) : values.complexity_notes ? (
              <SummaryRow label="Complexity" value={values.complexity_notes} />
            ) : null}
          </SummarySection>
        </div>

        <DialogFooter className="shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Go Back & Edit
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            style={{ backgroundColor: '#378ADD' }}
            className="text-white hover:opacity-90"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting…
              </span>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1.5" />
                {isEnterprise ? 'Confirm & Submit for Legal Review' : 'Confirm & Submit'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Sub-Components ─────────────────────────────────── */

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-foreground">{title}</h4>
      <div className="space-y-2 pl-1">{children}</div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  truncate,
}: {
  label: string;
  value: React.ReactNode;
  truncate?: boolean;
}) {
  const isString = typeof value === 'string';

  return (
    <div className="flex gap-3">
      <span className="text-xs font-medium text-muted-foreground w-32 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">
        {isString ? (
          <p
            className={`text-sm text-foreground ${truncate ? 'line-clamp-3' : ''}`}
          >
            {value}
          </p>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
