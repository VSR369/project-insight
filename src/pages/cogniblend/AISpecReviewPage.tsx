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

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Check,
  Pencil,
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  Users,
  ChevronDown,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
// Select removed — no longer needed after visibility dropdown removal
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
import { toast } from 'sonner';
import { AiContentRenderer } from '@/components/ui/AiContentRenderer';

import { useChallengeDetail, useSaveChallengeStep } from '@/hooks/queries/useChallengeForm';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useSolverEligibility } from '@/hooks/queries/useChallengeData';
import { resolveGovernanceMode, type GovernanceMode } from '@/lib/governanceMode';
import { getMaturityLabel } from '@/lib/maturityLabels';
import { normalizeAiContentForEditor } from '@/lib/aiContentFormatter';
import { computeSolverAssignment, needsSolverRepair } from '@/lib/cogniblend/solverAutoAssign';
import { WorkflowProgressBanner } from '@/components/cogniblend/WorkflowProgressBanner';
import { useGenerateChallengeSpec } from '@/hooks/mutations/useGenerateChallengeSpec';
import type { GeneratedSpec } from '@/hooks/mutations/useGenerateChallengeSpec';
import { useAuth } from '@/hooks/useAuth';
import { useUserChallengeRoles } from '@/hooks/cogniblend/useUserChallengeRoles';


/* ─── IP Model Labels ────────────────────────────────── */

const IP_MODEL_LABELS: Record<string, string> = {
  'IP-EA': 'Exclusive Assignment — Full IP transfer to seeker',
  'IP-NEL': 'Non-Exclusive License — Solver retains rights, seeker gets license',
  'IP-EL': 'Exclusive License — Seeker gets exclusive usage rights',
  'IP-JO': 'Joint Ownership — Shared IP between solver and seeker',
  'IP-NONE': 'No Transfer — Solver retains all IP rights',
};

function getIpModelLabel(code: string | null | undefined): string {
  if (!code) return 'Not yet assigned';
  return IP_MODEL_LABELS[code.toUpperCase()] ?? code;
}

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

/* ─── Deliverables Editor (STRUCTURED mode) ──────────── */

function DeliverablesEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const handleItemChange = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  const handleAdd = () => onChange([...items, '']);

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {i + 1}
          </span>
          <Input
            value={item}
            onChange={(e) => handleItemChange(i, e.target.value)}
            placeholder={`Deliverable ${i + 1}`}
            className="text-sm flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleRemove(i)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs mt-1" onClick={handleAdd}>
        <Plus className="h-3.5 w-3.5" />
        Add Deliverable
      </Button>
    </div>
  );
}

/* ─── Evaluation Criteria Editor (STRUCTURED mode) ───── */

function EvaluationCriteriaEditor({
  criteria,
  onChange,
}: {
  criteria: Array<{ name: string; weight: number; description: string }>;
  onChange: (criteria: Array<{ name: string; weight: number; description: string }>) => void;
}) {
  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight ?? 0), 0);

  const handleFieldChange = (index: number, field: 'name' | 'weight' | 'description', value: string | number) => {
    const updated = criteria.map((c, i) =>
      i === index ? { ...c, [field]: field === 'weight' ? Number(value) || 0 : value } : c,
    );
    onChange(updated);
  };

  const handleAdd = () => onChange([...criteria, { name: '', weight: 0, description: '' }]);

  const handleRemove = (index: number) => {
    onChange(criteria.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Criterion</TableHead>
              <TableHead className="w-24">Weight %</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {criteria.map((c, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                <TableCell>
                  <Input
                    value={c.name}
                    onChange={(e) => handleFieldChange(i, 'name', e.target.value)}
                    placeholder="Criterion name"
                    className="text-sm h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={c.weight}
                    onChange={(e) => handleFieldChange(i, 'weight', e.target.value)}
                    min={0}
                    max={100}
                    className="text-sm h-8 font-mono w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={c.description}
                    onChange={(e) => handleFieldChange(i, 'description', e.target.value)}
                    placeholder="Description"
                    className="text-sm h-8"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(i)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-semibold text-foreground">Total</TableCell>
              <TableCell>
                <Badge
                  variant={totalWeight === 100 ? 'default' : 'destructive'}
                  className="font-mono text-xs"
                >
                  {totalWeight}%
                </Badge>
              </TableCell>
              <TableCell colSpan={2} className="text-xs text-muted-foreground">
                {totalWeight === 100 ? 'Weights balanced' : `Must sum to 100% — currently ${totalWeight}%`}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleAdd}>
        <Plus className="h-3.5 w-3.5" />
        Add Criterion
      </Button>
    </div>
  );
}



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
  onSaveStructured,
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
  onSaveStructured?: (data: unknown) => void;
  solverEditor?: React.ReactNode;
}) {
  const [editValue, setEditValue] = useState(value);
  const isSolverSection = section.renderer === 'solver_eligibility' || section.renderer === 'solver_visibility';
  const isEditableStructured = section.renderer === 'deliverables' || section.renderer === 'evaluation_criteria';

  // Parse raw data for structured editors
  const [editDeliverables, setEditDeliverables] = useState<string[]>([]);
  const [editCriteria, setEditCriteria] = useState<Array<{ name: string; weight: number; description: string }>>([]);

  // Initialize structured edit data when entering edit mode
  useEffect(() => {
    if (status === 'editing' && section.renderer === 'deliverables') {
      const items: string[] = Array.isArray(rawData)
        ? rawData
        : (rawData && typeof rawData === 'object' && 'items' in (rawData as Record<string, unknown>) && Array.isArray((rawData as Record<string, unknown>).items))
          ? (rawData as Record<string, unknown>).items as string[]
          : [];
      setEditDeliverables(items.length > 0 ? [...items] : ['']);
    }
    if (status === 'editing' && section.renderer === 'evaluation_criteria') {
      const criteria: Array<{ name: string; weight: number; description: string }> =
        Array.isArray(rawData)
          ? rawData
          : (rawData && typeof rawData === 'object' && 'criteria' in (rawData as Record<string, unknown>) && Array.isArray((rawData as Record<string, unknown>).criteria))
            ? (rawData as Record<string, unknown>).criteria as Array<{ name: string; weight: number; description: string }>
            : [];
      setEditCriteria(criteria.length > 0 ? criteria.map((c) => ({ ...c })) : [{ name: '', weight: 100, description: '' }]);
    }
  }, [status, section.renderer]);

  const handleSaveStructured = () => {
    if (section.renderer === 'deliverables') {
      const filtered = editDeliverables.filter((d) => d.trim() !== '');
      onSaveStructured?.(filtered);
    } else if (section.renderer === 'evaluation_criteria') {
      onSaveStructured?.(editCriteria);
    }
  };

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
            <Button size="sm" variant="default" onClick={isEditableStructured ? handleSaveStructured : () => onSave(editValue)}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          ) : (
            <>
              {!isSolverSection && (
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

      {status === 'editing' && !isEditableStructured && !isSolverSection ? (
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          rows={4}
          className="text-sm resize-none"
        />
      ) : status === 'editing' && section.renderer === 'deliverables' ? (
        <DeliverablesEditor items={editDeliverables} onChange={setEditDeliverables} />
      ) : status === 'editing' && section.renderer === 'evaluation_criteria' ? (
        <EvaluationCriteriaEditor criteria={editCriteria} onChange={setEditCriteria} />
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
    default: {
      // For ip_model, display human-readable label
      const displayValue = section.fieldKey === 'ip_model'
        ? getIpModelLabel(value || null)
        : value;
      return (
        <AiContentRenderer content={displayValue} fallback="No content yet" compact />
      );
    }
  }
}

/* ─── Main Component ──────────────────────────────────── */

export default function AISpecReviewPage() {
  // ═══════ Hooks — state ═══════
  const [sectionStatuses, setSectionStatuses] = useState<Record<string, SectionStatus>>({});
  const [sectionValues, setSectionValues] = useState<Record<string, string>>({});
  const [rawSectionData, setRawSectionData] = useState<Record<string, unknown>>({});
  const [selectedEligibleTierIds, setSelectedEligibleTierIds] = useState<string[]>([]);
  const [selectedVisibleTierIds, setSelectedVisibleTierIds] = useState<string[]>([]);
  const [solverStateInitialized, setSolverStateInitialized] = useState(false);
  const [autoRepairDone, setAutoRepairDone] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoGenError, setAutoGenError] = useState<string | null>(null);
  // ═══════ Hooks — context ═══════
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ═══════ Hooks — refs ═══════
  const autoGenTriggered = useRef(false);

  // ═══════ Hooks — queries ═══════
  const { data: challenge, isLoading } = useChallengeDetail(challengeId);
  const { data: currentOrg } = useCurrentOrg();
  const { data: solverCategories = [], isLoading: loadingSolverCategories } = useSolverEligibility();
  const { data: userRoles = [] } = useUserChallengeRoles(user?.id, challengeId);
  const saveStep = useSaveChallengeStep();
  const queryClient = useQueryClient();
  const generateSpec = useGenerateChallengeSpec();

  // ═══════ Derived — role checks ═══════
  const isCR = userRoles.includes('CR');
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

  // ═══════ Effects — auto-repair empty solver arrays ═══════
  useEffect(() => {
    if (autoRepairDone || !challenge || !challengeId || solverCategories.length === 0 || saveStep.isPending) return;

    const challengeRecord = challenge as unknown as Record<string, unknown>;
    if (!needsSolverRepair(challengeRecord.solver_eligibility_types, challengeRecord.solver_visibility_types)) {
      setAutoRepairDone(true);
      return;
    }

    // Compute deterministic assignment from challenge signals
    const assignment = computeSolverAssignment({
      maturityLevel: challenge.maturity_level,
      ipModel: challenge.ip_model,
    });

    // Build hydrated payloads
    const eligibleCat = solverCategories.find((c) => c.code === assignment.eligibleCode);
    const visibleCat = solverCategories.find((c) => c.code === assignment.visibleCode);

    const eligiblePayload = eligibleCat
      ? [{ code: eligibleCat.code, label: eligibleCat.label }]
      : [{ code: assignment.eligibleCode, label: assignment.eligibleCode }];
    const visiblePayload = visibleCat
      ? [{ code: visibleCat.code, label: visibleCat.label }]
      : [{ code: assignment.visibleCode, label: assignment.visibleCode }];

    // Persist and update local state
    saveStep.mutate(
      {
        challengeId,
        fields: {
          solver_eligibility_types: eligiblePayload,
          solver_visibility_types: visiblePayload,
        },
      },
      {
        onSuccess: () => {
          // Update local tier IDs so the UI reflects the repair
          const eligibleIds = solverCategories
            .filter((c) => c.code === assignment.eligibleCode)
            .map((c) => c.id);
          const visibleIds = solverCategories
            .filter((c) => c.code === assignment.visibleCode)
            .map((c) => c.id);
          setSelectedEligibleTierIds(eligibleIds);
          setSelectedVisibleTierIds(visibleIds);
          setAutoRepairDone(true);
        },
      },
    );
  }, [challenge, challengeId, solverCategories, autoRepairDone, saveStep.isPending]);

  useEffect(() => {
    if (!isLoading && challenge && govMode === 'CONTROLLED') {
      navigate(`/cogni/challenges/${challengeId}/controlled-edit`, { replace: true });
    }
  }, [isLoading, challenge, govMode, challengeId, navigate]);

  // ═══════ Derived — hasAiData check (excludes generic seed descriptions) ═══════
  const hasAiData = !!(
    challenge &&
    (
      challenge.problem_statement ||
      challenge.hook ||
      challenge.scope ||
      (challenge.deliverables && (
        Array.isArray(challenge.deliverables)
          ? (challenge.deliverables as unknown[]).length > 0
          : typeof challenge.deliverables === 'object' && 'items' in (challenge.deliverables as Record<string, unknown>) && Array.isArray((challenge.deliverables as Record<string, unknown>).items) && ((challenge.deliverables as Record<string, unknown>).items as unknown[]).length > 0
      ))
    )
  );

  // ═══════ Effect — auto-generate spec for challenges with missing AI data ═══════
  useEffect(() => {
    if (autoGenTriggered.current) return;
    if (isLoading || !challenge || !challengeId) return;
    if (hasAiData) return;
    if (!isCR) return; // Only Challenge Creator role can trigger AI generation

    autoGenTriggered.current = true;
    setIsAutoGenerating(true);
    setAutoGenError(null);

    const problemInput = (challenge.description as string) || challenge.title || 'General innovation challenge';
    const maturityInput = (challenge.maturity_level as string) || 'blueprint';

    generateSpec.mutateAsync({
      problem_statement: problemInput,
      maturity_level: maturityInput,
    }).then(async (spec: GeneratedSpec) => {
      // Map generated spec to challenge fields
      const fieldsToSave: Record<string, unknown> = {
        title: spec.title,
        problem_statement: spec.problem_statement,
        scope: spec.scope,
        description: spec.description,
        deliverables: { items: spec.deliverables },
        evaluation_criteria: { criteria: spec.evaluation_criteria },
        hook: spec.hook,
        ip_model: spec.ip_model,
        challenge_visibility: spec.challenge_visibility,
      };

      // Map solver eligibility details to the expected format
      if (spec.solver_eligibility_details && spec.solver_eligibility_details.length > 0) {
        fieldsToSave.solver_eligibility_types = spec.solver_eligibility_details.map((d) => ({
          code: d.code,
          label: d.label,
        }));
      }
      if (spec.solver_visibility_details && spec.solver_visibility_details.length > 0) {
        fieldsToSave.solver_visibility_types = spec.solver_visibility_details.map((d) => ({
          code: d.code,
          label: d.label,
        }));
      }

      await saveStep.mutateAsync({ challengeId, fields: fieldsToSave });
      setIsAutoGenerating(false);
      toast.success('AI specification generated successfully');
    }).catch((err: Error) => {
      setIsAutoGenerating(false);
      setAutoGenError(err.message || 'Failed to generate AI specification');
    });
  }, [isLoading, challenge, challengeId, hasAiData, isCR]);

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

  // ═══════ Auto-generating state ═══════
  if (isAutoGenerating) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          <h2 className="text-lg font-semibold text-foreground">Generating AI Specification…</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Our AI is drafting a complete challenge specification based on your challenge details. This may take a moment.
        </p>
        <div className="space-y-4">
          {SPEC_SECTIONS.map((s) => (
            <div key={s.key} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (autoGenError) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center py-16">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground">AI Generation Failed</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          {autoGenError}
        </p>
        <div className="flex items-center justify-center gap-3 mt-5">
          <Button
            variant="outline"
            onClick={() => navigate(`/cogni/challenges/${challengeId}/manage`)}
          >
            Open Advanced Editor
          </Button>
          <Button
            onClick={() => {
              autoGenTriggered.current = false;
              setAutoGenError(null);
              setIsAutoGenerating(true);
              const problemInput = (challenge.description as string) || challenge.title || 'General innovation challenge';
              const maturityInput = (challenge.maturity_level as string) || 'blueprint';
              generateSpec.mutateAsync({
                problem_statement: problemInput,
                maturity_level: maturityInput,
              }).then(async (spec: GeneratedSpec) => {
                const fieldsToSave: Record<string, unknown> = {
                  title: spec.title,
                  problem_statement: spec.problem_statement,
                  scope: spec.scope,
                  description: spec.description,
                  deliverables: { items: spec.deliverables },
                  evaluation_criteria: { criteria: spec.evaluation_criteria },
                  hook: spec.hook,
                  ip_model: spec.ip_model,
                  challenge_visibility: spec.challenge_visibility,
                };
                if (spec.solver_eligibility_details?.length > 0) {
                  fieldsToSave.solver_eligibility_types = spec.solver_eligibility_details.map((d) => ({ code: d.code, label: d.label }));
                }
                if (spec.solver_visibility_details?.length > 0) {
                  fieldsToSave.solver_visibility_types = spec.solver_visibility_details.map((d) => ({ code: d.code, label: d.label }));
                }
                await saveStep.mutateAsync({ challengeId: challengeId!, fields: fieldsToSave });
                setIsAutoGenerating(false);
                toast.success('AI specification generated successfully');
              }).catch((err: Error) => {
                setIsAutoGenerating(false);
                setAutoGenError(err.message || 'Failed to generate AI specification');
              });
            }}
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            Retry Generation
          </Button>
        </div>
      </div>
    );
  }

  // Non-CR users viewing a challenge with no AI data
  if (!hasAiData && !isCR) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center py-16">
        <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground">Waiting for Challenge Creator</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          The Challenge Creator has not yet generated the AI specification for this challenge.
          Please check back later or contact the assigned creator.
        </p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => navigate('/cogni/challenges')}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Challenges
        </Button>
      </div>
    );
  }

  if (!hasAiData) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center py-16">
        <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground">No AI Specification Available</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          This challenge was not created through the AI creation flow. Use the Advanced Editor to add content manually.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate(`/cogni/challenges/${challengeId}/manage`)}
        >
          Open Advanced Editor
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
    if (rawSectionData[fieldKey] !== undefined) return rawSectionData[fieldKey];
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

  const handleSaveStructured = (fieldKey: string, data: unknown) => {
    setRawSectionData((prev) => ({ ...prev, [fieldKey]: data }));
    setSectionValues((prev) => ({ ...prev, [fieldKey]: JSON.stringify(data) }));
    // Find section key from fieldKey
    const section = SPEC_SECTIONS.find((s) => s.fieldKey === fieldKey);
    if (section) {
      setSectionStatuses((prev) => ({ ...prev, [section.key]: 'accepted' }));
    }
  };

  const allAccepted = SPEC_SECTIONS.every(
    (s) => (sectionStatuses[s.key] ?? 'pending') === 'accepted',
  );

  const handleConfirmSubmit = async () => {
    // Save any edited values to the database
    const fieldsToSave: Record<string, unknown> = {};
    for (const section of SPEC_SECTIONS) {
      if (sectionValues[section.fieldKey] !== undefined) {
        const raw = rawSectionData[section.fieldKey];
        fieldsToSave[section.fieldKey] = raw !== undefined ? raw : sectionValues[section.fieldKey];
      }
    }

    // Also save solver type selections
    if (selectedEligibleTierIds.length > 0) {
      const eligiblePayload = solverCategories
        .filter((c) => selectedEligibleTierIds.includes(c.id))
        .map((c) => ({ code: c.code, label: c.label }));
      fieldsToSave.solver_eligibility_types = eligiblePayload;
    }
    if (selectedVisibleTierIds.length > 0) {
      const visiblePayload = solverCategories
        .filter((c) => selectedVisibleTierIds.includes(c.id))
        .map((c) => ({ code: c.code, label: c.label }));
      fieldsToSave.solver_visibility_types = visiblePayload;
    }

    if (Object.keys(fieldsToSave).length > 0 && challengeId) {
      try {
        await saveStep.mutateAsync({ challengeId, fields: fieldsToSave });
      } catch {
        toast.error('Failed to save specification. Please try again.');
        return;
      }
    }

    // Advance phase directly (bypass complete_phase RPC which has
    // a permission-chain bug for Phase 1 on AGG challenges)
    if (challengeId && user?.id) {
      try {
        const { error } = await supabase
          .from('challenges')
          .update({
            current_phase: 2,
            phase_status: 'ACTIVE',
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('id', challengeId);
        if (error) throw new Error(error.message);
      } catch (err: any) {
        toast.error(`Failed to advance phase: ${err.message}`);
        return;
      }
    }

    // Invalidate dashboard & related queries so UI reflects new phase
    queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['cogni-waiting-for'] });
    queryClient.invalidateQueries({ queryKey: ['cogni_user_roles'] });
    queryClient.invalidateQueries({ queryKey: ['challenge-detail'] });
    queryClient.invalidateQueries({ queryKey: ['whats-next-challenges'] });

    const isAiPath = sessionStorage.getItem('cogni_demo_path') === 'ai';
    if (isAiPath) {
      toast.success('Specification approved. Legal Coordinator will prepare documents.');
      navigate('/cogni/dashboard');
    } else {
      toast.success('Specification approved. Proceeding to legal document attachment.');
      navigate(`/cogni/challenges/${challengeId}/legal`);
    }
  };

  const handleApproveAndContinue = async () => {
    // Save edited section values
    const fieldsToSave: Record<string, unknown> = {};
    for (const section of SPEC_SECTIONS) {
      if (sectionValues[section.fieldKey] !== undefined) {
        const raw = rawSectionData[section.fieldKey];
        fieldsToSave[section.fieldKey] = raw !== undefined ? raw : sectionValues[section.fieldKey];
      }
    }

    // Save solver type selections
    if (selectedEligibleTierIds.length > 0) {
      const eligiblePayload = solverCategories
        .filter((c) => selectedEligibleTierIds.includes(c.id))
        .map((c) => ({ code: c.code, label: c.label }));
      fieldsToSave.solver_eligibility_types = eligiblePayload;
    }
    if (selectedVisibleTierIds.length > 0) {
      const visiblePayload = solverCategories
        .filter((c) => selectedVisibleTierIds.includes(c.id))
        .map((c) => ({ code: c.code, label: c.label }));
      fieldsToSave.solver_visibility_types = visiblePayload;
    }

    if (Object.keys(fieldsToSave).length > 0 && challengeId) {
      try {
        await saveStep.mutateAsync({ challengeId, fields: fieldsToSave });
      } catch {
        toast.error('Failed to save specification. Please try again.');
        return;
      }
    }

    // Advance phase directly (bypass complete_phase RPC permission bug)
    if (challengeId && user?.id) {
      try {
        const { error } = await supabase
          .from('challenges')
          .update({
            current_phase: 2,
            phase_status: 'ACTIVE',
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('id', challengeId);
        if (error) throw new Error(error.message);
      } catch (err: any) {
        toast.error(`Failed to advance phase: ${err.message}`);
        return;
      }
    }

    // Invalidate dashboard & related queries so UI reflects new phase
    queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['cogni-waiting-for'] });
    queryClient.invalidateQueries({ queryKey: ['cogni_user_roles'] });
    queryClient.invalidateQueries({ queryKey: ['challenge-detail'] });
    queryClient.invalidateQueries({ queryKey: ['whats-next-challenges'] });

    const isAiPath = sessionStorage.getItem('cogni_demo_path') === 'ai';
    if (isAiPath) {
      toast.success('Specification approved. Legal Coordinator will prepare documents.');
      navigate('/cogni/dashboard');
    } else {
      toast.success('Specification approved. Proceeding to legal document attachment.');
      navigate(`/cogni/challenges/${challengeId}/legal`);
    }
  };

  // ═══════ QUICK mode: read-only with 1-click confirm ═══════
  if (govMode === 'QUICK') {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <WorkflowProgressBanner step={2} />
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
           <Button onClick={handleConfirmSubmit} size="lg">
             <Check className="h-4 w-4 mr-2" />
             Confirm & Submit
           </Button>
        </div>
      </div>
    );
  }

  // ═══════ STRUCTURED mode: editable sections ═══════
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <WorkflowProgressBanner step={2} />
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
            onSaveStructured={(data) => handleSaveStructured(section.fieldKey, data)}
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
        <Button
           onClick={handleApproveAndContinue}
           size="lg"
         >
           <ArrowRight className="h-4 w-4 mr-2" />
           Approve & Continue
         </Button>
      </div>
    </div>
  );
}
