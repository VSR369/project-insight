/**
 * AISpecReviewPage — Governance-aware review of AI-drafted challenge spec.
 * Route: /cogni/challenges/:id/spec
 *
 * QUICK mode: Read-only formatted doc + "Confirm & Submit" (1-click).
 * STRUCTURED mode: Inline-editable sections + "Approve & Continue".
 * CONTROLLED mode: Redirects to side-panel editor.
 *
 * Renders deliverables as numbered lists, evaluation criteria as weighted tables,
 * and solver eligibility as editable checkbox cards driven by md_solver_eligibility master data.
 * Shows only AI-finalized solver types with option to add/remove.
 */

import { useState, useEffect, useMemo } from 'react';
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
  ChevronDown,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableFooter,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { useChallengeDetail } from '@/hooks/queries/useChallengeForm';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useSolverEligibility } from '@/hooks/queries/useChallengeData';
import { resolveGovernanceMode, type GovernanceMode } from '@/lib/governanceMode';
import { getMaturityLabel } from '@/lib/maturityLabels';
import type { SolverEligibilityDetail } from '@/hooks/mutations/useGenerateChallengeSpec';

/* ─── Types ──────────────────────────────────────────── */

interface SpecSection {
  key: string;
  label: string;
  fieldKey: string;
  isAiDrafted: boolean;
  renderer?: 'text' | 'deliverables' | 'evaluation_criteria' | 'solver_eligibility' | 'solver_visibility';
}

const SPEC_SECTIONS: SpecSection[] = [
  { key: 'title', label: 'Challenge Title', fieldKey: 'title', isAiDrafted: true },
  { key: 'problem_statement', label: 'Problem Statement', fieldKey: 'problem_statement', isAiDrafted: false },
  { key: 'scope', label: 'Scope & Constraints', fieldKey: 'scope', isAiDrafted: true },
  { key: 'description', label: 'Detailed Description', fieldKey: 'description', isAiDrafted: true },
  { key: 'deliverables', label: 'Deliverables', fieldKey: 'deliverables', isAiDrafted: true, renderer: 'deliverables' },
  { key: 'evaluation_criteria', label: 'Evaluation Criteria', fieldKey: 'evaluation_criteria', isAiDrafted: true, renderer: 'evaluation_criteria' },
  { key: 'solver_eligibility', label: 'Eligible Solver Types (Can Submit)', fieldKey: 'solver_eligibility_types', isAiDrafted: true, renderer: 'solver_eligibility' },
  { key: 'solver_visibility', label: 'Visible Solver Types (View Only)', fieldKey: 'solver_visibility_types', isAiDrafted: true, renderer: 'solver_visibility' },
  { key: 'hook', label: 'Challenge Hook', fieldKey: 'hook', isAiDrafted: true },
  { key: 'ip_model', label: 'IP Model', fieldKey: 'ip_model', isAiDrafted: true },
];

type SectionStatus = 'pending' | 'accepted' | 'editing';

/* ─── Deliverables Renderer ───────────────────────────── */

function DeliverablesDisplay({ data }: { data: unknown }) {
  // Handle both raw array and wrapped { items: [...] } format
  const items: string[] = Array.isArray(data)
    ? data
    : (data && typeof data === 'object' && 'items' in (data as Record<string, unknown>) && Array.isArray((data as Record<string, unknown>).items))
      ? (data as Record<string, unknown>).items as string[]
      : [];
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
  // Handle both raw array and wrapped { criteria: [...] } format
  const criteria: Array<{ name: string; weight: number; description: string }> =
    Array.isArray(data)
      ? data
      : (data && typeof data === 'object' && 'criteria' in (data as Record<string, unknown>) && Array.isArray((data as Record<string, unknown>).criteria))
        ? (data as Record<string, unknown>).criteria as Array<{ name: string; weight: number; description: string }>
        : [];
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

/* ─── Editable Solver Type Cards (STRUCTURED mode) ───── */

interface SolverTypeEditorProps {
  challenge: Record<string, unknown>;
  selectedTierIds: string[];
  onTierIdsChange: (ids: string[]) => void;
  solverCategories: Array<{
    id: string;
    code: string;
    label: string;
    description: string | null;
    requires_auth: boolean;
    requires_provider_record: boolean;
    requires_certification: boolean;
    default_visibility: string | null;
  }>;
  typeLabel: string;
  typeDescription: string;
}

function SolverTypeEditor({
  challenge,
  selectedTierIds,
  onTierIdsChange,
  solverCategories,
  typeLabel,
  typeDescription,
}: SolverTypeEditorProps) {
  const [showMore, setShowMore] = useState(false);

  const selectedCategories = solverCategories.filter((c) => selectedTierIds.includes(c.id));
  const unselectedCategories = solverCategories.filter((c) => !selectedTierIds.includes(c.id));

  const handleToggle = (tierId: string, checked: boolean) => {
    if (checked) {
      onTierIdsChange([...selectedTierIds, tierId]);
    } else {
      onTierIdsChange(selectedTierIds.filter((id) => id !== tierId));
    }
  };

  const renderCategoryCard = (cat: typeof solverCategories[0], isSelected: boolean) => (
    <label
      key={cat.id}
      className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-muted/30 hover:border-muted-foreground/30'
      }`}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => handleToggle(cat.id, !!checked)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="font-mono text-[10px]">{cat.code}</Badge>
          <span className="text-sm font-medium text-foreground">{cat.label}</span>
        </div>
        {cat.description && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{cat.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {cat.requires_auth && <Badge variant="secondary" className="text-[10px]">Auth Required</Badge>}
          {cat.requires_certification && <Badge variant="secondary" className="text-[10px]">Certified</Badge>}
          {cat.requires_provider_record && <Badge variant="secondary" className="text-[10px]">Provider Record</Badge>}
          {!cat.requires_auth && !cat.requires_certification && !cat.requires_provider_record && (
            <Badge variant="secondary" className="text-[10px]">Open Access</Badge>
          )}
        </div>
      </div>
    </label>
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{typeDescription}</p>

      {/* AI-Selected */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          AI-Selected ({selectedCategories.length})
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {selectedCategories.map((cat) => renderCategoryCard(cat, true))}
        </div>
        {selectedCategories.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No solver types selected — add from below</p>
        )}
      </div>

      {/* Add More */}
      {unselectedCategories.length > 0 && (
        <Collapsible open={showMore} onOpenChange={setShowMore}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
              {showMore ? 'Hide' : 'Add more'} ({unselectedCategories.length} available)
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {unselectedCategories.map((cat) => renderCategoryCard(cat, false))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

/* ─── Read-Only Solver Display (for QUICK mode) ─────── */

function SolverTypeReadOnly({ typesData, label }: { typesData: unknown; label: string }) {
  const details: Array<{ code: string; label: string; description?: string | null; requires_auth?: boolean; requires_certification?: boolean; requires_provider_record?: boolean }> =
    Array.isArray(typesData) ? typesData : [];

  return (
    <div className="space-y-3">
      {details.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {details.map((cat) => (
            <div key={cat.code} className="rounded-lg border border-border bg-muted/30 p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <Badge variant="outline" className="font-mono text-[10px]">{cat.code}</Badge>
                <span className="text-sm font-medium text-foreground">{cat.label}</span>
              </div>
              {cat.description && (
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">{cat.description}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {cat.requires_auth && <Badge variant="secondary" className="text-[10px]">Auth Required</Badge>}
                {cat.requires_certification && <Badge variant="secondary" className="text-[10px]">Certified</Badge>}
                {cat.requires_provider_record && <Badge variant="secondary" className="text-[10px]">Provider Record</Badge>}
                {!cat.requires_auth && !cat.requires_certification && !cat.requires_provider_record && (
                  <Badge variant="secondary" className="text-[10px]">Open Access</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No solver categories selected</p>
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
  solverEditor,
}: {
  section: SpecSection;
  value: string;
  rawData: unknown;
  challenge: Record<string, unknown>;
  status: SectionStatus;
  onAccept: () => void;
  onEdit: () => void;
  onSave: (val: string) => void;
  solverEditor?: React.ReactNode;
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
        <SectionContent section={section} value={value} rawData={rawData} challenge={challenge} solverEditor={solverEditor} />
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
  solverEditor,
}: {
  section: SpecSection;
  value: string;
  rawData: unknown;
  challenge: Record<string, unknown>;
  solverEditor?: React.ReactNode;
}) {
  switch (section.renderer) {
    case 'deliverables':
      return <DeliverablesDisplay data={rawData} />;
    case 'evaluation_criteria':
      return <EvaluationCriteriaDisplay data={rawData} />;
    case 'solver_eligibility':
    case 'solver_visibility':
      return solverEditor ?? <SolverTypeReadOnly typesData={rawData} label={section.label} />;
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
  const [selectedEligibleTierIds, setSelectedEligibleTierIds] = useState<string[]>([]);
  const [selectedVisibleTierIds, setSelectedVisibleTierIds] = useState<string[]>([]);
  const [solverStateInitialized, setSolverStateInitialized] = useState(false);

  // ═══════ Hooks — context ═══════
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ═══════ Hooks — queries ═══════
  const { data: challenge, isLoading } = useChallengeDetail(challengeId);
  const { data: currentOrg } = useCurrentOrg();
  const { data: solverCategories = [], isLoading: loadingSolverCategories } = useSolverEligibility();

  // ═══════ Hooks — derived (after all hooks, before conditional returns) ═══════
  const govMode: GovernanceMode = resolveGovernanceMode(currentOrg?.governanceProfile);

  // ═══════ Effects — initialize solver state from AI spec ═══════
  useEffect(() => {
    if (solverStateInitialized || !challenge || solverCategories.length === 0) return;

    const challengeRecord = challenge as unknown as Record<string, unknown>;

    // Helper to map { code, label } arrays to category IDs
    const mapCodesToIds = (raw: unknown): string[] => {
      const codes: string[] = Array.isArray(raw)
        ? (raw as Array<{ code?: string }>).map((t) => t.code).filter(Boolean) as string[]
        : [];
      return solverCategories
        .filter((cat) => codes.includes(cat.code))
        .map((cat) => cat.id);
    };

    setSelectedEligibleTierIds(mapCodesToIds(challengeRecord.solver_eligibility_types));
    setSelectedVisibleTierIds(mapCodesToIds(challengeRecord.solver_visibility_types));
    setSolverStateInitialized(true);
  }, [challenge, solverCategories, solverStateInitialized]);

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
            solverEditor={
              section.renderer === 'solver_eligibility' ? (
                <SolverTypeEditor
                  challenge={challengeRecord}
                  selectedTierIds={selectedEligibleTierIds}
                  onTierIdsChange={setSelectedEligibleTierIds}
                  solverCategories={solverCategories}
                  typeLabel="Eligible Solver Types"
                  typeDescription="These solver types can view AND submit solutions to this challenge."
                />
              ) : section.renderer === 'solver_visibility' ? (
                <SolverTypeEditor
                  challenge={challengeRecord}
                  selectedTierIds={selectedVisibleTierIds}
                  onTierIdsChange={setSelectedVisibleTierIds}
                  solverCategories={solverCategories}
                  typeLabel="Visible Solver Types"
                  typeDescription="These solver types can discover and view this challenge but cannot submit solutions."
                />
              ) : undefined
            }
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
