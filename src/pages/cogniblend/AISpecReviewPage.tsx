/**
 * AISpecReviewPage — Governance-aware review of AI-drafted challenge spec.
 * Route: /cogni/challenges/:id/spec
 *
 * QUICK mode: Read-only formatted doc + "Confirm & Submit" (1-click).
 * STRUCTURED mode: Inline-editable sections + "Approve & Continue".
 * CONTROLLED mode: Redirects to side-panel editor.
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useChallengeDetail } from '@/hooks/queries/useChallengeForm';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { resolveGovernanceMode, type GovernanceMode } from '@/lib/governanceMode';
import { getMaturityLabel } from '@/lib/maturityLabels';

/* ─── Types ──────────────────────────────────────────── */

interface SpecSection {
  key: string;
  label: string;
  fieldKey: string;
  isAiDrafted: boolean;
}

const SPEC_SECTIONS: SpecSection[] = [
  { key: 'title', label: 'Challenge Title', fieldKey: 'title', isAiDrafted: true },
  { key: 'problem_statement', label: 'Problem Statement', fieldKey: 'problem_statement', isAiDrafted: false },
  { key: 'scope', label: 'Scope & Constraints', fieldKey: 'scope', isAiDrafted: true },
  { key: 'description', label: 'Detailed Description', fieldKey: 'description', isAiDrafted: true },
  { key: 'deliverables', label: 'Deliverables', fieldKey: 'deliverables', isAiDrafted: true },
  { key: 'evaluation_criteria', label: 'Evaluation Criteria', fieldKey: 'evaluation_criteria', isAiDrafted: true },
  { key: 'eligibility', label: 'Eligibility Requirements', fieldKey: 'eligibility', isAiDrafted: true },
  { key: 'hook', label: 'Challenge Hook', fieldKey: 'hook', isAiDrafted: true },
  { key: 'ip_model', label: 'IP Model', fieldKey: 'ip_model', isAiDrafted: true },
];

type SectionStatus = 'pending' | 'accepted' | 'editing';

/* ─── Section Card (STRUCTURED mode — editable) ───────── */

function EditableSectionCard({
  section,
  value,
  status,
  onAccept,
  onEdit,
  onSave,
}: {
  section: SpecSection;
  value: string;
  status: SectionStatus;
  onAccept: () => void;
  onEdit: () => void;
  onSave: (val: string) => void;
}) {
  const [editValue, setEditValue] = useState(value);

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
          {status === 'editing' ? (
            <Button size="sm" variant="default" onClick={() => onSave(editValue)}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {status !== 'accepted' && (
                <Button size="sm" variant="ghost" onClick={onAccept}>
                  <Check className="h-3.5 w-3.5 text-primary" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {status === 'editing' ? (
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          rows={4}
          className="text-sm resize-none"
        />
      ) : (
        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
          {value || <span className="italic">No content yet</span>}
        </p>
      )}
    </div>
  );
}

/* ─── Read-only Section Card (QUICK mode) ─────────────── */

function ReadOnlySectionCard({
  section,
  value,
}: {
  section: SpecSection;
  value: string;
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
      <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
        {value || <span className="italic">No content yet</span>}
      </p>
    </div>
  );
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

  const getFieldValue = (fieldKey: string): string => {
    if (sectionValues[fieldKey] !== undefined) return sectionValues[fieldKey];
    const raw = (challenge as unknown as Record<string, unknown>)[fieldKey];
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object') return JSON.stringify(raw, null, 2);
    return '';
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
    // QUICK mode: 1-click confirm — navigate to dashboard (phases auto-advance)
    navigate('/cogni/dashboard');
  };

  const handleApproveAndContinue = () => {
    // STRUCTURED mode: submit to curator queue — navigate to dashboard
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
