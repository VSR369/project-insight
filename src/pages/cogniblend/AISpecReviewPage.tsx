/**
 * AISpecReviewPage — Review AI-drafted challenge sections before creating.
 * Route: /cogni/challenges/:id/spec
 *
 * Displays AI-generated fields with sparkle badges indicating AI-drafted content.
 * User can accept, edit, or regenerate each section.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Check,
  Pencil,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useChallengeDetail } from '@/hooks/queries/useChallengeForm';
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

/* ─── Section Card ────────────────────────────────────── */

type SectionStatus = 'pending' | 'accepted' | 'editing';

function SpecSectionCard({
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
      className={`
        rounded-xl border p-5 transition-all
        ${status === 'accepted'
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-card'
        }
      `}
    >
      {/* Header */}
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
            <Button
              size="sm"
              variant="default"
              onClick={() => onSave(editValue)}
            >
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

      {/* Content */}
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
    const raw = (challenge as Record<string, unknown>)[fieldKey];
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

  const handleProceedToWizard = () => {
    navigate(`/cogni/challenges/${challengeId}/edit`);
  };

  // ═══════ Render ═══════
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
            Review each section below. Accept or edit before proceeding to the full editor.
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

      {/* Sections */}
      <div className="space-y-4">
        {SPEC_SECTIONS.map((section) => (
          <SpecSectionCard
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
        <Button
          onClick={handleProceedToWizard}
          disabled={!allAccepted}
          size="lg"
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Open in Advanced Editor
        </Button>
      </div>
    </div>
  );
}
