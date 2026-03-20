/**
 * AISpecReviewPage — Governance-aware review of AI-drafted challenge spec.
 * Route: /cogni/challenges/:id/spec
 *
 * QUICK mode: Read-only formatted doc + "Confirm & Submit" (1-click).
 * STRUCTURED mode: Inline-editable sections + "Approve & Continue".
 * CONTROLLED mode: Redirects to side-panel editor.
 *
 * Renders deliverables as numbered lists, evaluation criteria as weighted tables,
 * and solver eligibility as category cards driven by md_solver_eligibility master data.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Check,
  Pencil,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  Settings2,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableFooter,
} from '@/components/ui/table';
import { AccessModelSummary } from '@/components/cogniblend/AccessModelSummary';
import { useChallengeDetail } from '@/hooks/queries/useChallengeForm';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { resolveGovernanceMode, type GovernanceMode } from '@/lib/governanceMode';
import { getMaturityLabel } from '@/lib/maturityLabels';
import type { SolverEligibilityDetail } from '@/hooks/mutations/useGenerateChallengeSpec';

/* ─── Types ──────────────────────────────────────────── */

interface SpecSection {
  key: string;
  label: string;
  fieldKey: string;
  isAiDrafted: boolean;
  renderer?: 'text' | 'deliverables' | 'evaluation_criteria' | 'solver_eligibility';
}

const SPEC_SECTIONS: SpecSection[] = [
  { key: 'title', label: 'Challenge Title', fieldKey: 'title', isAiDrafted: true },
  { key: 'problem_statement', label: 'Problem Statement', fieldKey: 'problem_statement', isAiDrafted: false },
  { key: 'scope', label: 'Scope & Constraints', fieldKey: 'scope', isAiDrafted: true },
  { key: 'description', label: 'Detailed Description', fieldKey: 'description', isAiDrafted: true },
  { key: 'deliverables', label: 'Deliverables', fieldKey: 'deliverables', isAiDrafted: true, renderer: 'deliverables' },
  { key: 'evaluation_criteria', label: 'Evaluation Criteria', fieldKey: 'evaluation_criteria', isAiDrafted: true, renderer: 'evaluation_criteria' },
  { key: 'solver_eligibility', label: 'Solver Eligibility & Access', fieldKey: 'solver_eligibility_codes', isAiDrafted: true, renderer: 'solver_eligibility' },
  { key: 'hook', label: 'Challenge Hook', fieldKey: 'hook', isAiDrafted: true },
  { key: 'ip_model', label: 'IP Model', fieldKey: 'ip_model', isAiDrafted: true },
];

type SectionStatus = 'pending' | 'accepted' | 'editing';

/* ─── Deliverables Renderer ───────────────────────────── */

function DeliverablesDisplay({ data }: { data: unknown }) {
  const items: string[] = Array.isArray(data) ? data : [];
  if (items.length === 0) return <p className="text-sm text-muted-foreground italic">No deliverables defined</p>;

  return (
    <ol className="space-y-2 pl-0">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {i + 1}
          </span>
          <span className="text-sm text-foreground leading-relaxed pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/* ─── Evaluation Criteria Renderer ────────────────────── */

function EvaluationCriteriaDisplay({ data }: { data: unknown }) {
  const criteria: Array<{ name: string; weight: number; description: string }> =
    Array.isArray(data) ? data : [];
  if (criteria.length === 0) return <p className="text-sm text-muted-foreground italic">No criteria defined</p>;

  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight ?? 0), 0);

  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Criterion</TableHead>
            <TableHead className="w-24 text-right">Weight</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {criteria.map((c, i) => (
            <TableRow key={i}>
              <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
              <TableCell className="font-medium text-foreground">{c.name}</TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary" className="font-mono text-xs">
                  {c.weight}%
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{c.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="font-semibold text-foreground">Total</TableCell>
            <TableCell className="text-right">
              <Badge
                variant={totalWeight === 100 ? 'default' : 'destructive'}
                className="font-mono text-xs"
              >
                {totalWeight}%
              </Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {totalWeight === 100 ? 'Weights balanced' : `Expected 100% — currently ${totalWeight}%`}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

/* ─── Solver Eligibility & Access Renderer ─────────────── */

function SolverEligibilityDisplay({ challenge }: { challenge: Record<string, unknown> }) {
  const details: SolverEligibilityDetail[] = Array.isArray(challenge.solver_eligibility_details)
    ? challenge.solver_eligibility_details as SolverEligibilityDetail[]
    : [];
  const eligNotes = (challenge.eligibility_notes as string) || (challenge.eligibility as string) || '';
  const visibility = (challenge.challenge_visibility as string) || 'public';
  const enrollment = (challenge.challenge_enrollment as string) || 'open_auto';
  const submission = (challenge.challenge_submission as string) || 'all_enrolled';

  return (
    <div className="space-y-4">
      {/* Solver Category Cards */}
      {details.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            AI-Selected Solver Types
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {details.map((cat) => (
              <div
                key={cat.code}
                className="rounded-lg border border-border bg-muted/30 p-3.5"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <Badge variant="outline" className="font-mono text-[10px]">{cat.code}</Badge>
                  <span className="text-sm font-medium text-foreground">{cat.label}</span>
                </div>
                {cat.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">{cat.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {cat.requires_auth && (
                    <Badge variant="secondary" className="text-[10px]">Auth Required</Badge>
                  )}
                  {cat.requires_certification && (
                    <Badge variant="secondary" className="text-[10px]">Certified</Badge>
                  )}
                  {cat.requires_provider_record && (
                    <Badge variant="secondary" className="text-[10px]">Provider Record</Badge>
                  )}
                  {!cat.requires_auth && !cat.requires_certification && !cat.requires_provider_record && (
                    <Badge variant="secondary" className="text-[10px]">Open Access</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No solver categories selected</p>
      )}

      {/* Derived Access Model */}
      <AccessModelSummary
        visibility={visibility}
        enrollment={enrollment}
        submission={submission}
        eligibility={eligNotes}
      />

      {/* Free-text eligibility notes */}
      {eligNotes && (
        <div className="rounded-lg border border-border bg-card p-3.5">
          <p className="text-xs font-semibold text-foreground mb-1">Additional Eligibility Notes</p>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{eligNotes}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Section Card (STRUCTURED mode — editable) ───────── */

function EditableSectionCard({
  section,
  value,
  rawData,
  challenge,
  status,
  onAccept,
  onEdit,
  onSave,
}: {
  section: SpecSection;
  value: string;
  rawData: unknown;
  challenge: Record<string, unknown>;
  status: SectionStatus;
  onAccept: () => void;
  onEdit: () => void;
  onSave: (val: string) => void;
}) {
  const [editValue, setEditValue] = useState(value);
  const isStructured = section.renderer && section.renderer !== 'text';

  return (
    <div
      className={`rounded-xl border p-5 transition-all ${
        status === 'accepted'
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
          {section.isAiDrafted && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              <Sparkles className="h-3 w-3 mr-0.5 text-amber-500" />
              AI Draft
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {status === 'editing' && !isStructured ? (
            <Button size="sm" variant="default" onClick={() => onSave(editValue)}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          ) : (
            <>
              {!isStructured && (
                <Button size="sm" variant="ghost" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {status !== 'accepted' && (
                <Button size="sm" variant="ghost" onClick={onAccept}>
                  <Check className="h-3.5 w-3.5 text-primary" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {status === 'editing' && !isStructured ? (
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          rows={4}
          className="text-sm resize-none"
        />
      ) : (
        <SectionContent section={section} value={value} rawData={rawData} challenge={challenge} />
      )}
    </div>
  );
}

/* ─── Read-only Section Card (QUICK mode) ─────────────── */

function ReadOnlySectionCard({
  section,
  value,
  rawData,
  challenge,
}: {
  section: SpecSection;
  value: string;
  rawData: unknown;
  challenge: Record<string, unknown>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
        {section.isAiDrafted && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            <Sparkles className="h-3 w-3 mr-0.5 text-amber-500" />
            AI
          </Badge>
        )}
      </div>
      <SectionContent section={section} value={value} rawData={rawData} challenge={challenge} />
    </div>
  );
}

/* ─── Content Dispatcher ─────────────────────────────── */

function SectionContent({
  section,
  value,
  rawData,
  challenge,
}: {
  section: SpecSection;
  value: string;
  rawData: unknown;
  challenge: Record<string, unknown>;
}) {
  switch (section.renderer) {
    case 'deliverables':
      return <DeliverablesDisplay data={rawData} />;
    case 'evaluation_criteria':
      return <EvaluationCriteriaDisplay data={rawData} />;
    case 'eligibility_visibility':
      return <EligibilityVisibilityDisplay challenge={challenge} />;
    default:
      return (
        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
          {value || <span className="italic">No content yet</span>}
        </p>
      );
  }
}

/* ─── Main Component ──────────────────────────────────── */

export default function AISpecReviewPage() {
  // ═══════ Hooks — state ═══════
  const [sectionStatuses, setSectionStatuses] = useState<Record<string, SectionStatus>>({});
  const [sectionValues, setSectionValues] = useState<Record<string, string>>({});

  // ═══════ Hooks — context ═══════
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ═══════ Hooks — queries ═══════
  const { data: challenge, isLoading } = useChallengeDetail(challengeId);
  const { data: currentOrg } = useCurrentOrg();

  // ═══════ Hooks — derived (after all hooks, before conditional returns) ═══════
  const govMode: GovernanceMode = resolveGovernanceMode(currentOrg?.governanceProfile);

  // ═══════ Effects — redirect CONTROLLED to side-panel ═══════
  useEffect(() => {
    if (!isLoading && challenge && govMode === 'CONTROLLED') {
      navigate(`/cogni/challenges/${challengeId}/controlled-edit`, { replace: true });
    }
  }, [isLoading, challenge, govMode, challengeId, navigate]);

  // ═══════ Conditional returns (after all hooks) ═══════
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center py-16">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground">Challenge not found</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This challenge may have been deleted or you don't have access.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/cogni/challenges/create')}
        >
          Create New Challenge
        </Button>
      </div>
    );
  }

  // ═══════ Helpers ═══════
  const challengeRecord = challenge as unknown as Record<string, unknown>;

  const getFieldValue = (fieldKey: string): string => {
    if (sectionValues[fieldKey] !== undefined) return sectionValues[fieldKey];
    const raw = challengeRecord[fieldKey];
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object') return JSON.stringify(raw, null, 2);
    return '';
  };

  const getRawData = (fieldKey: string): unknown => {
    return challengeRecord[fieldKey];
  };

  const handleAccept = (key: string) => {
    setSectionStatuses((prev) => ({ ...prev, [key]: 'accepted' }));
  };

  const handleEdit = (key: string) => {
    setSectionStatuses((prev) => ({ ...prev, [key]: 'editing' }));
  };

  const handleSave = (key: string, val: string) => {
    setSectionValues((prev) => ({ ...prev, [key]: val }));
    setSectionStatuses((prev) => ({ ...prev, [key]: 'accepted' }));
  };

  const allAccepted = SPEC_SECTIONS.every(
    (s) => (sectionStatuses[s.key] ?? 'pending') === 'accepted',
  );

  const handleConfirmSubmit = () => {
    navigate('/cogni/dashboard');
  };

  const handleApproveAndContinue = () => {
    navigate('/cogni/dashboard');
  };

  const handleOpenEditor = () => {
    navigate(`/cogni/challenges/${challengeId}/edit`);
  };

  // ═══════ QUICK mode: read-only with 1-click confirm ═══════
  if (govMode === 'QUICK') {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-foreground">
                AI Specification — Quick Review
              </h1>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                QUICK
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Your challenge specification is ready. Review below and confirm with one click.
            </p>
            {challenge.maturity_level && (
              <Badge variant="outline" className="mt-2 text-xs">
                Maturity: {getMaturityLabel(challenge.maturity_level)}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/cogni/challenges/create')}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        </div>

        {/* Read-only sections */}
        <div className="space-y-4">
          {SPEC_SECTIONS.map((section) => (
            <ReadOnlySectionCard
              key={section.key}
              section={section}
              value={getFieldValue(section.fieldKey)}
              rawData={getRawData(section.fieldKey)}
              challenge={challengeRecord}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            All fields auto-completed by AI. Legal auto-configured from maturity level.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleOpenEditor}>
              <Settings2 className="h-4 w-4 mr-2" />
              Open Editor
            </Button>
            <Button onClick={handleConfirmSubmit} size="lg">
              <Check className="h-4 w-4 mr-2" />
              Confirm & Submit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════ STRUCTURED mode: editable sections ═══════
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground">
              Review AI Specification
            </h1>
            <Badge variant="secondary">
              <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
              AI-Drafted
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Review each section. Accept, edit, or regenerate before approving.
          </p>
          {challenge.maturity_level && (
            <Badge variant="outline" className="mt-2 text-xs">
              Maturity: {getMaturityLabel(challenge.maturity_level)}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/cogni/challenges/create')}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>
      </div>

      {/* Editable Sections */}
      <div className="space-y-4">
        {SPEC_SECTIONS.map((section) => (
          <EditableSectionCard
            key={section.key}
            section={section}
            value={getFieldValue(section.fieldKey)}
            rawData={getRawData(section.fieldKey)}
            challenge={challengeRecord}
            status={sectionStatuses[section.key] ?? 'pending'}
            onAccept={() => handleAccept(section.key)}
            onEdit={() => handleEdit(section.key)}
            onSave={(val) => handleSave(section.key, val)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {Object.values(sectionStatuses).filter((s) => s === 'accepted').length} of{' '}
          {SPEC_SECTIONS.length} sections accepted
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleOpenEditor}>
            <Settings2 className="h-4 w-4 mr-2" />
            Advanced Editor
          </Button>
          <Button
            onClick={handleApproveAndContinue}
            disabled={!allAccepted}
            size="lg"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Approve & Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
