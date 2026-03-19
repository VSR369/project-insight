/**
 * ControlledEditorPage — Side-panel AI advisor layout for CONTROLLED governance.
 * Route: /cogni/challenges/:id/controlled-edit
 *
 * Left pane: Manual field entry (user must type or explicitly "Apply" suggestion).
 * Right pane: AI suggestions with Apply / Skip per field.
 * Tracks which fields were AI-applied vs human-written for audit.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Lightbulb,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChallengeDetail } from '@/hooks/queries/useChallengeForm';
import { getMaturityLabel } from '@/lib/maturityLabels';

/* ─── Field Definitions ──────────────────────────────── */

interface FieldDef {
  key: string;
  label: string;
  dbKey: string;
  multiline: boolean;
}

const FIELDS: FieldDef[] = [
  { key: 'title', label: 'Challenge Title', dbKey: 'title', multiline: false },
  { key: 'problem_statement', label: 'Problem Statement', dbKey: 'problem_statement', multiline: true },
  { key: 'scope', label: 'Scope & Constraints', dbKey: 'scope', multiline: true },
  { key: 'description', label: 'Detailed Description', dbKey: 'description', multiline: true },
  { key: 'deliverables', label: 'Deliverables', dbKey: 'deliverables', multiline: true },
  { key: 'evaluation_criteria', label: 'Evaluation Criteria', dbKey: 'evaluation_criteria', multiline: true },
  { key: 'eligibility', label: 'Eligibility Requirements', dbKey: 'eligibility', multiline: true },
  { key: 'hook', label: 'Challenge Hook', dbKey: 'hook', multiline: true },
  { key: 'ip_model', label: 'IP Model', dbKey: 'ip_model', multiline: false },
];

/* ─── Suggestion Card ─────────────────────────────────── */

function SuggestionCard({
  field,
  suggestion,
  onApply,
  onSkip,
  applied,
  skipped,
}: {
  field: FieldDef;
  suggestion: string;
  onApply: () => void;
  onSkip: () => void;
  applied: boolean;
  skipped: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        applied
          ? 'border-primary/30 bg-primary/5 opacity-70'
          : skipped
            ? 'border-border opacity-50'
            : 'border-amber-200 bg-amber-50/50 dark:border-amber-700/50 dark:bg-amber-950/20'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span className="text-xs font-semibold text-foreground">{field.label}</span>
        {applied && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">
            Applied
          </Badge>
        )}
        {skipped && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
            Skipped
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed mb-3 line-clamp-6">
        {suggestion || 'No AI suggestion available'}
      </p>
      {!applied && !skipped && suggestion && (
        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={onApply} className="text-xs h-7">
            <Check className="h-3 w-3 mr-1" />
            Apply
          </Button>
          <Button size="sm" variant="ghost" onClick={onSkip} className="text-xs h-7">
            <X className="h-3 w-3 mr-1" />
            Skip
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────── */

export default function ControlledEditorPage() {
  // ═══════ Hooks — state ═══════
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());
  const [skippedFields, setSkippedFields] = useState<Set<string>>(new Set());

  // ═══════ Hooks — context ═══════
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ═══════ Hooks — queries ═══════
  const { data: challenge, isLoading } = useChallengeDetail(challengeId);

  // ═══════ Conditional returns ═══════
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center py-16">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground">Challenge not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/cogni/challenges/create')}>
          Create New Challenge
        </Button>
      </div>
    );
  }

  // ═══════ Helpers ═══════

  const getAiSuggestion = (dbKey: string): string => {
    const raw = (challenge as unknown as Record<string, unknown>)[dbKey];
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object') return JSON.stringify(raw, null, 2);
    return '';
  };

  const getFieldValue = (key: string): string => {
    return fieldValues[key] ?? '';
  };

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = (field: FieldDef) => {
    const suggestion = getAiSuggestion(field.dbKey);
    setFieldValues((prev) => ({ ...prev, [field.key]: suggestion }));
    setAppliedFields((prev) => new Set(prev).add(field.key));
    setSkippedFields((prev) => {
      const next = new Set(prev);
      next.delete(field.key);
      return next;
    });
  };

  const handleSkip = (key: string) => {
    setSkippedFields((prev) => new Set(prev).add(key));
  };

  const allFieldsFilled = FIELDS.every((f) => getFieldValue(f.key).trim().length > 0);

  const handleSave = () => {
    // TODO: persist to DB via saveStep mutation
    navigate('/cogni/dashboard');
  };

  // ═══════ Render ═══════
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground">
              Controlled Mode — Manual Entry
            </h1>
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              CONTROLLED
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Write each field manually. AI suggestions appear on the right — apply or skip each one.
          </p>
          {challenge.maturity_level && (
            <Badge variant="outline" className="mt-2 text-xs">
              Maturity: {getMaturityLabel(challenge.maturity_level)}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/cogni/challenges/create')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>
      </div>

      <Alert className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/10 dark:border-purple-800">
        <ShieldCheck className="h-4 w-4 text-purple-600" />
        <AlertTitle className="text-purple-800 dark:text-purple-300">Full Compliance Mode</AlertTitle>
        <AlertDescription className="text-purple-700 dark:text-purple-400">
          AI suggestions never auto-fill fields. You must manually write content or explicitly click "Apply" on each suggestion.
          An audit trail records what was AI-suggested vs human-written.
        </AlertDescription>
      </Alert>

      {/* Split-pane layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0">
        {/* Left: Manual field entry */}
        <div className="lg:col-span-3 space-y-5">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
            Manual Entry
          </h2>
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {field.label}
                <span className="text-destructive ml-1">*</span>
              </label>
              {field.multiline ? (
                <Textarea
                  value={getFieldValue(field.key)}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  rows={4}
                  className="text-sm resize-none"
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                />
              ) : (
                <Input
                  value={getFieldValue(field.key)}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="text-sm"
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                />
              )}
              {appliedFields.has(field.key) && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  ⚡ Content applied from AI suggestion
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Right: AI suggestions panel */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6">
            <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-4 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              AI Suggestions
            </h2>
            <ScrollArea className="max-h-[calc(100vh-220px)]">
              <div className="space-y-3 pr-2">
                {FIELDS.map((field) => (
                  <SuggestionCard
                    key={field.key}
                    field={field}
                    suggestion={getAiSuggestion(field.dbKey)}
                    onApply={() => handleApply(field)}
                    onSkip={() => handleSkip(field.key)}
                    applied={appliedFields.has(field.key)}
                    skipped={skippedFields.has(field.key)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{appliedFields.size} AI-applied</span>
          <span>•</span>
          <span>{FIELDS.filter((f) => getFieldValue(f.key).trim() && !appliedFields.has(f.key)).length} human-written</span>
          <span>•</span>
          <span>{skippedFields.size} skipped</span>
        </div>
        <Button onClick={handleSave} disabled={!allFieldsFilled} size="lg">
          <ArrowRight className="h-4 w-4 mr-2" />
          Save & Continue
        </Button>
      </div>
    </div>
  );
}
