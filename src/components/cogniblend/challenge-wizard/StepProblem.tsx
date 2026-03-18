/**
 * Step 1 — Challenge Brief
 *
 * Fields:
 *   1. Challenge Title
 *   2. Industry Segment — dropdown from master data
 *   3. Experience Countries — multi-select from master data
 *   4. Context & Background — rich text
 *   5. Problem Statement — rich text
 *   6. Detailed Description — rich text
 *   7. Root Causes — rich text
 *   8. Scope Definition — rich text
 *   9. Deliverables — numbered list
 *  10. Affected Stakeholders — rich text
 *  11. Current Deficiencies — rich text
 *  12. Expected Outcomes — rich text
 *  13. Preferred Approach — rich text
 *  14. Approaches NOT of Interest — rich text
 *  15. Submission Guidelines — textarea
 *  16. Domain Tags — multi-select with search + custom entry
 *  17. Solution Maturity Level — 2×2 radio card grid
 */

import { useState, useCallback } from 'react';
import { useTaxonomySuggestions } from '@/hooks/cogniblend/useTaxonomySuggestions';
import { UseFormReturn, Controller } from 'react-hook-form';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FlaskConical,
  Code,
  Rocket,
  Search,
  X,
  Plus,
  Trash2,
  GripVertical,
  CheckCircle,
  Check,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useIndustrySegmentOptions } from '@/hooks/queries/useTaxonomySelectors';
import { useCountries } from '@/hooks/queries/useMasterData';
import type { ChallengeFormValues } from './challengeFormSchema';

/* ─── Constants ──────────────────────────────────────────── */

const TITLE_MAX = 200;
const PROBLEM_MIN_ENTERPRISE = 500;
const PROBLEM_MIN_LIGHTWEIGHT = 200;
const SCOPE_MIN_ENTERPRISE = 200;
const SCOPE_MIN_LIGHTWEIGHT = 100;

const DOMAIN_TAGS = [
  'AI/ML', 'Biotech', 'Clean Energy', 'Materials Science',
  'Digital Health', 'Manufacturing', 'Software', 'Sustainability',
] as const;

const TAG_COLORS: Record<string, string> = {
  'AI/ML': 'bg-violet-100 text-violet-700 border-violet-200',
  'Biotech': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Clean Energy': 'bg-green-100 text-green-700 border-green-200',
  'Materials Science': 'bg-sky-100 text-sky-700 border-sky-200',
  'Digital Health': 'bg-pink-100 text-pink-700 border-pink-200',
  'Manufacturing': 'bg-orange-100 text-orange-700 border-orange-200',
  'Software': 'bg-blue-100 text-blue-700 border-blue-200',
  'Sustainability': 'bg-teal-100 text-teal-700 border-teal-200',
};

const MATURITY_OPTIONS = [
  { value: 'blueprint' as const, name: 'Blueprint', description: 'Concept, architecture, or design document', Icon: FileText },
  { value: 'poc' as const, name: 'PoC', description: 'Feasibility demonstration with evidence', Icon: FlaskConical },
  { value: 'prototype' as const, name: 'Prototype', description: 'Working demo, code, or hardware model', Icon: Code },
  { value: 'pilot' as const, name: 'Pilot', description: 'Real-world deployment test with metrics', Icon: Rocket },
] as const;

/* ─── Props ──────────────────────────────────────────────── */

interface StepProblemProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
}

/* ─── Component ──────────────────────────────────────────── */

export function StepProblem({ form, mandatoryFields, isLightweight }: StepProblemProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const { register, formState: { errors }, watch, control, setValue } = form;

  // Master data hooks
  const { data: industrySegments = [], isLoading: loadingSegments } = useIndustrySegmentOptions();
  const { data: countriesList = [], isLoading: loadingCountries } = useCountries();

  const titleValue = watch('title') ?? '';
  const titleLen = titleValue.length;
  const problemMin = isLightweight ? PROBLEM_MIN_LIGHTWEIGHT : PROBLEM_MIN_ENTERPRISE;
  const scopeMin = isLightweight ? SCOPE_MIN_LIGHTWEIGHT : SCOPE_MIN_ENTERPRISE;
  const isRequired = (field: string) => mandatoryFields.includes(field);

  const problemStatement = watch('problem_statement') ?? '';
  const { suggestions: taxonomySuggestions } = useTaxonomySuggestions(problemStatement);

  // Deliverables
  const deliverablesList = watch('deliverables_list') ?? [''];
  const addDeliverable = () => setValue('deliverables_list', [...deliverablesList, '']);
  const removeDeliverable = (index: number) => {
    if (deliverablesList.length <= 1) return;
    setValue('deliverables_list', deliverablesList.filter((_: string, i: number) => i !== index));
  };
  const updateDeliverable = (index: number, value: string) => {
    const updated = [...deliverablesList];
    updated[index] = value;
    setValue('deliverables_list', updated);
  };
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragEnd = () => setDragIndex(null);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...deliverablesList];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setValue('deliverables_list', reordered);
    setDragIndex(index);
  };

  // Experience Countries — multi-select from master data
  const countries = watch('experience_countries') ?? [];
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const filteredCountries = countriesList.filter(
    (c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()) && !countries.includes(c.id),
  );

  const addCountry = (countryId: string) => {
    if (!countries.includes(countryId)) {
      setValue('experience_countries', [...countries, countryId]);
    }
    setCountrySearch('');
    setShowCountryDropdown(false);
  };

  const removeCountry = (countryId: string) => {
    setValue('experience_countries', countries.filter((x: string) => x !== countryId));
  };

  const getCountryName = (id: string) => countriesList.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      {/* ── 1. Title ──────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-sm font-medium">
          Challenge Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          maxLength={TITLE_MAX + 20}
          placeholder="Give your challenge a clear, descriptive title"
          className={cn('text-base', errors.title && 'border-destructive focus-visible:ring-destructive')}
          {...register('title')}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {errors.title ? (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            ) : titleLen > 0 && titleLen <= TITLE_MAX ? (
              <span className="flex items-center gap-1 text-xs text-[hsl(155,68%,37%)]">
                <CheckCircle className="h-3 w-3" /> Valid
              </span>
            ) : (
              <span />
            )}
          </div>
          <span className={cn('text-xs tabular-nums', titleLen > TITLE_MAX ? 'text-destructive font-medium' : 'text-muted-foreground')}>
            {titleLen} / {TITLE_MAX}
          </span>
        </div>
      </div>

      {/* ── 2. Industry Segment — Select from master data ── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Industry Segment <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Controller
          name="industry_segment_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger className="text-base">
                <SelectValue placeholder={loadingSegments ? 'Loading…' : 'Select industry segment'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {industrySegments.map((seg) => (
                  <SelectItem key={seg.id} value={seg.id}>
                    {seg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* ── 3. Experience Countries — Searchable multi-select from master data ── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Experience Countries <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        {countries.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1">
            {countries.map((id: string) => (
              <Badge key={id} variant="outline" className="gap-1 pr-1 border bg-secondary text-secondary-foreground">
                {getCountryName(id)}
                <button type="button" onClick={() => removeCountry(id)} className="ml-0.5 rounded-full hover:bg-black/10 p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={countrySearch}
            onChange={(e) => { setCountrySearch(e.target.value); setShowCountryDropdown(true); }}
            onFocus={() => setShowCountryDropdown(true)}
            onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
            placeholder={loadingCountries ? 'Loading countries…' : 'Search countries…'}
            className="pl-9"
          />
          {showCountryDropdown && filteredCountries.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredCountries.slice(0, 20).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between"
                  onClick={() => addCountry(c.id)}
                >
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Context & Background ───────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Context & Background <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Controller
          name="context_background"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="Provide context about the challenge background, industry landscape, and why this problem matters."
              storagePath="context-background"
            />
          )}
        />
      </div>

      {/* ── 5. Problem Statement ──────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Problem Statement <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="problem_statement"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="Describe the problem in detail. What makes it challenging? What has been tried before?"
              minLength={problemMin}
              error={errors.problem_statement?.message}
              storagePath="problem-statements"
            />
          )}
        />
      </div>

      {/* ── 6. Detailed Description ──────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Detailed Description <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Controller
          name="detailed_description"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="Expand on the problem with technical details, constraints, and requirements."
              storagePath="detailed-descriptions"
            />
          )}
        />
      </div>

      {/* ── 7. Root Causes ────────────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Root Causes <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Controller
          name="root_causes"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="Identify the underlying root causes of the problem."
              storagePath="root-causes"
            />
          )}
        />
      </div>

      {/* ── 8. Scope Definition ──────────────────────── */}
      {!isLightweight ? (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Scope {isRequired('scope') && <span className="text-destructive">*</span>}
          </Label>
          <Controller
            name="scope"
            control={control}
            render={({ field }) => (
              <RichTextEditor
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="Define what is in scope and out of scope for solutions."
                minLength={scopeMin}
                error={errors.scope?.message}
                storagePath="scope-content"
              />
            )}
          />
        </div>
      ) : (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Show Advanced Options
          </button>
          {showAdvanced && (
            <div className="mt-3 pl-1 border-l-2 border-muted ml-1.5">
              <div className="pl-4 space-y-1.5">
                <Label className="text-sm font-medium">
                  Scope <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Controller
                  name="scope"
                  control={control}
                  render={({ field }) => (
                    <RichTextEditor
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="Define what is in scope and out of scope for solutions."
                      minLength={scopeMin}
                      storagePath="scope-content"
                    />
                  )}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 9. Deliverables ──────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Deliverables <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          List the expected outputs from solvers. Drag to reorder.
        </p>
        <div className="space-y-2">
          {deliverablesList.map((item: string, index: number) => (
            <div
              key={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              className={cn(
                'flex items-center gap-2 rounded-lg border border-border bg-background p-1 transition-shadow',
                dragIndex === index && 'shadow-md ring-2 ring-primary/30',
              )}
            >
              <button type="button" className="cursor-grab shrink-0 p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing" tabIndex={-1}>
                <GripVertical className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground font-mono shrink-0 w-5">{index + 1}.</span>
              <Input
                placeholder="Describe a specific deliverable..."
                value={item}
                onChange={(e) => updateDeliverable(index, e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0 text-base"
              />
              {deliverablesList.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeDeliverable(index)} className="shrink-0 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={addDeliverable} className="text-primary hover:text-primary/80">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Deliverable
        </Button>
      </div>

      {/* ── 10. Affected Stakeholders ─────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Affected Stakeholders <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Controller
          name="affected_stakeholders"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} placeholder="Who are the stakeholders affected by this problem?" storagePath="affected-stakeholders" />
          )}
        />
      </div>

      {/* ── 11. Current Deficiencies ──────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Current Deficiencies <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Controller
          name="current_deficiencies"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} placeholder="Describe the gaps in current solutions or approaches." storagePath="current-deficiencies" />
          )}
        />
      </div>

      {/* ── 12. Expected Outcomes ─────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Expected Outcomes <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Controller
          name="expected_outcomes"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} placeholder="What outcomes do you expect from the challenge solutions?" storagePath="expected-outcomes" />
          )}
        />
      </div>

      {/* ── 13. Preferred Approach ────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Preferred Approach <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Controller
          name="preferred_approach"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} placeholder="Describe any preferred methodologies or approaches." storagePath="preferred-approach" />
          )}
        />
      </div>

      {/* ── 14. Approaches NOT of Interest ────────────── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Approaches NOT of Interest <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Controller
          name="approaches_not_of_interest"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} placeholder="Describe approaches or solutions that should NOT be submitted." storagePath="approaches-not-of-interest" />
          )}
        />
      </div>

      {/* ── 15. Submission Guidelines ─────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="submission_guidelines" className="text-sm font-medium">
          Submission Guidelines <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Textarea
          id="submission_guidelines"
          placeholder="Any specific instructions for solvers about how to prepare and submit their solutions."
          rows={4}
          className="text-base resize-none"
          {...register('submission_guidelines')}
        />
      </div>

      {/* ── 16. Domain Tags — with custom entry ─────── */}
      <Controller
        name="domain_tags"
        control={control}
        render={({ field }) => (
          <DomainTagSelect
            value={field.value}
            onChange={field.onChange}
            error={errors.domain_tags?.message}
            taxonomySuggestions={taxonomySuggestions}
          />
        )}
      />

      {/* ── 17. Solution Maturity Level ───────────────── */}
      <Controller
        name="maturity_level"
        control={control}
        render={({ field }) => (
          <MaturityRadioCards
            value={field.value}
            onChange={field.onChange}
            error={errors.maturity_level?.message}
          />
        )}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Domain Tag Multi-Select — with custom tag entry
   ═══════════════════════════════════════════════════════════ */

interface DomainTagSelectProps {
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
  taxonomySuggestions?: Array<{ tag: string; source: string }>;
}

function DomainTagSelect({ value, onChange, error, taxonomySuggestions = [] }: DomainTagSelectProps) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = DOMAIN_TAGS.filter(
    (tag) => tag.toLowerCase().includes(search.toLowerCase()) && !value.includes(tag),
  );

  const addTag = useCallback((tag: string) => {
    if (!value.includes(tag)) {
      onChange([...value, tag]);
    }
    setSearch('');
    setShowDropdown(false);
  }, [value, onChange]);

  const removeTag = useCallback((tag: string) => {
    onChange(value.filter((t) => t !== tag));
  }, [value, onChange]);

  const handleAddCustomTag = () => {
    const trimmed = search.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setSearch('');
      setShowDropdown(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        Domain Tags <span className="text-destructive">*</span>
      </Label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {value.map((tag) => (
            <Badge key={tag} variant="outline" className={cn('gap-1 pr-1 border', TAG_COLORS[tag] || 'bg-secondary text-secondary-foreground')}>
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 rounded-full hover:bg-black/10 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustomTag();
            }
          }}
          placeholder="Search or type custom tag and press Enter…"
          className={cn('pl-9', error && 'border-destructive focus-visible:ring-destructive')}
        />
        {showDropdown && (filtered.length > 0 || (search.trim() && !value.includes(search.trim()))) && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filtered.map((tag) => (
              <button key={tag} type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors" onClick={() => addTag(tag)}>
                <Badge variant="outline" className={cn('text-xs border', TAG_COLORS[tag] || 'bg-secondary')}>{tag}</Badge>
              </button>
            ))}
            {search.trim() && !value.includes(search.trim()) && !DOMAIN_TAGS.includes(search.trim() as any) && (
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2 border-t border-border"
                onClick={handleAddCustomTag}
              >
                <Plus className="h-3.5 w-3.5 text-primary" />
                <span className="text-primary font-medium">Add custom tag: "{search.trim()}"</span>
              </button>
            )}
          </div>
        )}
      </div>
      {taxonomySuggestions.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground font-medium">Suggested from problem statement:</p>
          <div className="flex flex-wrap gap-1.5">
            {taxonomySuggestions.filter((s) => !value.includes(s.tag)).slice(0, 6).map((s) => (
              <button key={s.tag} type="button" onClick={() => addTag(s.tag)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-dashed border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors">
                + {s.tag}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Maturity Level Radio Cards (2×2 grid)
   ═══════════════════════════════════════════════════════════ */

interface MaturityRadioCardsProps {
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
}

function MaturityRadioCards({ value, onChange, error }: MaturityRadioCardsProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        Solution Maturity Level <span className="text-destructive">*</span>
      </Label>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {MATURITY_OPTIONS.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex flex-col items-center text-center rounded-lg p-4 transition-all cursor-pointer border-2',
                isSelected ? 'border-[#378ADD] bg-[#F0F7FF]' : 'border-border bg-card hover:border-muted-foreground/30',
                error && !value && 'border-destructive',
              )}
            >
              <opt.Icon className={cn('h-6 w-6 mb-2', isSelected ? 'text-[#378ADD]' : 'text-muted-foreground')} />
              <span className={cn('text-sm font-semibold', isSelected ? 'text-[#378ADD]' : 'text-foreground')}>{opt.name}</span>
              <span className="text-xs text-muted-foreground mt-0.5 leading-snug">{opt.description}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
