/**
 * QualityPanelCards — Score badges, severity icons, and assessment content
 * for the AI quality analysis panel.
 * Extracted from AICurationQualityPanel for ≤200 line compliance.
 */

import {
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Info, FileCheck,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/* ─── Types ──────────────────────────────────────────── */

export interface QualityGap {
  field: string;
  severity: 'critical' | 'warning' | 'suggestion';
  message: string;
}

export interface LegalGap {
  document_type: string;
  tier: string;
  severity: 'critical' | 'warning' | 'suggestion';
  message: string;
}

export interface FlaggedItem {
  checklist_key: string;
  reason: string;
}

export interface QualityAssessment {
  overall_score: number;
  completeness_score: number;
  clarity_score: number;
  solver_readiness_score: number;
  legal_compliance_score: number;
  summary: string;
  gaps: QualityGap[];
  legal_gaps: LegalGap[];
  flagged_checklist_items: FlaggedItem[];
  strengths: string[];
}

/* ─── Score badge ──────────────────────────────────────── */

export function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? 'text-primary' :
    score >= 60 ? 'text-amber-600' :
    'text-destructive';

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-lg font-bold ${color}`}>{score}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <Progress value={score} className="h-1 w-16" />
    </div>
  );
}

/* ─── Severity icon ───────────────────────────────────── */

export function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />;
    case 'warning':
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
    default:
      return <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
}

/* ─── Assessment content ──────────────────────────────── */

interface QualityAssessmentContentProps {
  assessment: QualityAssessment;
  strengthsOpen: boolean;
  onStrengthsOpenChange: (open: boolean) => void;
  legalOpen: boolean;
  onLegalOpenChange: (open: boolean) => void;
}

export function QualityAssessmentContent({
  assessment, strengthsOpen, onStrengthsOpenChange, legalOpen, onLegalOpenChange,
}: QualityAssessmentContentProps) {
  const legalGaps = assessment.legal_gaps ?? [];
  const hasLegalGaps = legalGaps.length > 0;

  return (
    <div className="space-y-4">
      {/* Score Grid */}
      <div className="grid grid-cols-5 gap-2 p-3 rounded-lg bg-muted/30 border border-border">
        <ScoreBadge score={assessment.overall_score} label="Overall" />
        <ScoreBadge score={assessment.completeness_score} label="Complete" />
        <ScoreBadge score={assessment.clarity_score} label="Clarity" />
        <ScoreBadge score={assessment.solver_readiness_score} label="Ready" />
        <ScoreBadge score={assessment.legal_compliance_score} label="Legal" />
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground leading-relaxed">{assessment.summary}</p>

      {/* Strengths */}
      {assessment.strengths.length > 0 && (
        <Collapsible open={strengthsOpen} onOpenChange={onStrengthsOpenChange}>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-foreground w-full">
            {strengthsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Strengths ({assessment.strengths.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1.5">
            {assessment.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                {s}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Specification Gaps */}
      {assessment.gaps.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Spec Issues ({assessment.gaps.length})</p>
          <div className="space-y-1.5">
            {assessment.gaps.map((gap, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-md ${gap.severity === 'critical' ? 'bg-destructive/5' : gap.severity === 'warning' ? 'bg-amber-500/5' : 'bg-muted/30'}`}>
                <SeverityIcon severity={gap.severity} />
                <div>
                  <span className="font-medium text-foreground">{gap.field}: </span>
                  <span className="text-muted-foreground">{gap.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal Document Compliance */}
      <Collapsible open={legalOpen} onOpenChange={onLegalOpenChange}>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-foreground w-full">
          {legalOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <FileCheck className="h-3.5 w-3.5" />
          Legal Documents
          {hasLegalGaps && <span className="ml-auto text-amber-500 text-[10px]">{legalGaps.length} issue{legalGaps.length > 1 ? 's' : ''}</span>}
          {!hasLegalGaps && assessment.legal_compliance_score >= 80 && <span className="ml-auto text-primary text-[10px]">Pass</span>}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-1.5">
          {hasLegalGaps ? legalGaps.map((lg, i) => (
            <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-md ${lg.severity === 'critical' ? 'bg-destructive/5' : lg.severity === 'warning' ? 'bg-amber-500/5' : 'bg-muted/30'}`}>
              <SeverityIcon severity={lg.severity} />
              <div>
                <span className="font-medium text-foreground">{lg.document_type} (Tier {lg.tier}): </span>
                <span className="text-muted-foreground">{lg.message}</span>
              </div>
            </div>
          )) : (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              All required legal documents are in place.
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Flagged Checklist Items */}
      {assessment.flagged_checklist_items.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Flagged for Curator ({assessment.flagged_checklist_items.length})
          </p>
          {assessment.flagged_checklist_items.map((item, i) => (
            <div key={i} className="text-xs text-muted-foreground pl-5">
              <span className="font-medium text-foreground">{item.checklist_key}</span>: {item.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
