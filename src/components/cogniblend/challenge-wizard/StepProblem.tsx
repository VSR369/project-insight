/**
 * Step 1 — Challenge Brief
 *
 * Fields aligned with curator SECTION_FORMAT_CONFIG:
 *   - rich_text: problem_statement, scope, context_background, detailed_description
 *   - line_items: deliverables, expected_outcomes, root_causes, current_deficiencies,
 *                 preferred_approach, approaches_not_of_interest, submission_guidelines
 *   - table: affected_stakeholders
 *   - checkbox_single: maturity_level (from md_solution_maturity DB)
 *   - tag_input: domain_tags
 */

import { useState, useCallback } from 'react';
import { useTaxonomySuggestions } from '@/hooks/cogniblend/useTaxonomySuggestions';
import { UseFormReturn, Controller } from 'react-hook-form';
import {
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Plus,
  Trash2,
  GripVertical,
  CheckCircle,
  Check,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';
import { useIndustrySegmentOptions } from '@/hooks/queries/useTaxonomySelectors';
import { useCountries } from '@/hooks/queries/useMasterData';
import { useSolutionMaturityList } from '@/hooks/queries/useSolutionMaturity';
import { AiFieldAssist } from './AiFieldAssist';
import { LineItemsInput } from './LineItemsInput';
import type { ChallengeFormValues } from './challengeFormSchema';

/* ─── Constants ──────────────────────────────────────────── */

const TITLE_MAX = 200;
const PROBLEM_MIN_ENTERPRISE = 500;
const PROBLEM_MIN_QUICK = 200;
const SCOPE_MIN_ENTERPRISE = 200;
const SCOPE_MIN_QUICK = 100;

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

/* ─── Props ──────────────────────────────────────────────── */

interface StepProblemProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isQuick: boolean;
  fieldRules?: Record<string, { visibility: string; minLength: number | null; maxLength: number | null; defaultValue: string | null }>;
}

/* ─── Component ──────────────────────────────────────────── */

export function StepProblem({ form, mandatoryFields, isQuick }: StepProblemProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const { register, formState: { errors }, watch, control, setValue } = form;

  // Master data hooks
  const { data: industrySegments = [], isLoading: loadingSegments } = useIndustrySegmentOptions();
  const { data: countriesList = [], isLoading: loadingCountries } = useCountries();
  const { data: maturityOptions = [], isLoading: loadingMaturity } = useSolutionMaturityList();

  const titleValue = watch('title') ?? '';
  const titleLen = titleValue.length;
  const problemMin = isQuick ? PROBLEM_MIN_QUICK : PROBLEM_MIN_ENTERPRISE;
  const scopeMin = isQuick ? SCOPE_MIN_QUICK : SCOPE_MIN_ENTERPRISE;
  const isRequired = (field: string) => mandatoryFields.includes(field);

  const problemStatement = watch('problem_statement') ?? '';
  const { suggestions: taxonomySuggestions } = useTaxonomySuggestions(problemStatement);

  // AI context for field assist
  const aiContext = {
    title: watch('title') ?? '',
    problem_statement: problemStatement,
    maturity_level: watch('maturity_level') ?? '',
    governance_mode: watch('governance_mode') ?? '',
  };

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

  // Affected stakeholders table
  const stakeholders = watch('affected_stakeholders') ?? [];
  const addStakeholder = () => {
    setValue('affected_stakeholders', [
      ...stakeholders,
      { stakeholder_name: '', role: '', impact_description: '', adoption_challenge: '' },
    ]);
  };
  const removeStakeholder = (index: number) => {
    setValue('affected_stakeholders', stakeholders.filter((_, i) => i !== index));
  };
  const updateStakeholder = (index: number, field: string, val: string) => {
    const updated = [...stakeholders];
    updated[index] = { ...updated[index], [field]: val };
    setValue('affected_stakeholders', updated);
  };

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

      {/* ── 1b. The Hook ─────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="hook" className="text-sm font-medium">
            The Hook <span className="text-destructive">*</span>
          </Label>
          <AiFieldAssist
            fieldName="hook"
            context={aiContext}
            onResult={(content) => setValue('hook', content)}
            compact
          />
        </div>
        <Input
          id="hook"
          maxLength={300}
          placeholder="A compelling one-liner that captures the essence of this challenge"
          className="text-base"
          {...register('hook')}
        />
        <p className="text-xs text-muted-foreground">Short tagline to attract solvers (max 300 chars)</p>
      </div>

      {/* ── 1c. Challenge Description ─────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="description" className="text-sm font-medium">
            Challenge Description <span className="text-destructive">*</span>
          </Label>
          <AiFieldAssist
            fieldName="description"
            context={aiContext}
            onResult={(content) => setValue('description', content)}
            compact
          />
        </div>
        <Input
          id="description"
          placeholder="Provide a short summary description of the challenge"
          className="text-base"
          {...register('description')}
        />
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
            <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
              <SelectTrigger className="text-base">
                <SelectValue placeholder={loadingSegments ? 'Loading…' : 'Select industry segment'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
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

      {/* ── 4. Context & Background (rich_text — matches curator) ── */}
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

      {/* ── 5. Problem Statement (rich_text — matches curator) ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Problem Statement <span className="text-destructive">*</span>
          </Label>
          <AiFieldAssist
            fieldName="problem_statement"
            context={aiContext}
            onResult={(content) => setValue('problem_statement', content)}
            label="AI Draft"
          />
        </div>
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

      {/* ── 6. Detailed Description (rich_text) ──────── */}
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

      {/* ── 7. Root Causes (line_items — matches curator) ── */}
      <Controller
        name="root_causes"
        control={control}
        render={({ field }) => (
          <LineItemsInput
            value={Array.isArray(field.value) ? field.value : ['']}
            onChange={field.onChange}
            label="Root Causes"
            placeholder="Identify an underlying root cause..."
            addLabel="Add Root Cause"
          />
        )}
      />

      {/* ── 8. Scope Definition (rich_text — matches curator) ── */}
      {!isQuick ? (
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

      {/* ── 9. Deliverables (line_items — matches curator) ── */}
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

      {/* ── 10. Affected Stakeholders (table — matches curator) ── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Affected Stakeholders <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Identify stakeholders affected by this problem.
        </p>
        {stakeholders.length > 0 && (
          <div className="space-y-3">
            {stakeholders.map((s, i) => (
              <div key={i} className="rounded-lg border border-border bg-background p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Stakeholder {i + 1}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeStakeholder(i)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  <Input
                    placeholder="Stakeholder name"
                    value={s.stakeholder_name ?? ''}
                    onChange={(e) => updateStakeholder(i, 'stakeholder_name', e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Role"
                    value={s.role ?? ''}
                    onChange={(e) => updateStakeholder(i, 'role', e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Impact description"
                    value={s.impact_description ?? ''}
                    onChange={(e) => updateStakeholder(i, 'impact_description', e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Adoption challenge"
                    value={s.adoption_challenge ?? ''}
                    onChange={(e) => updateStakeholder(i, 'adoption_challenge', e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={addStakeholder} className="text-primary hover:text-primary/80">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Stakeholder
        </Button>
      </div>

      {/* ── 11. Current Deficiencies (line_items — matches curator) ── */}
      <Controller
        name="current_deficiencies"
        control={control}
        render={({ field }) => (
          <LineItemsInput
            value={Array.isArray(field.value) ? field.value : ['']}
            onChange={field.onChange}
            label="Current Deficiencies"
            placeholder="Describe a gap in current solutions..."
            addLabel="Add Deficiency"
          />
        )}
      />

      {/* ── 12. Expected Outcomes (line_items — matches curator) ── */}
      <Controller
        name="expected_outcomes"
        control={control}
        render={({ field }) => (
          <LineItemsInput
            value={Array.isArray(field.value) ? field.value : ['']}
            onChange={field.onChange}
            label="Expected Outcomes"
            placeholder="What outcome do you expect?"
            addLabel="Add Outcome"
          />
        )}
      />

      {/* ── 13. Preferred Approach (line_items — matches curator) ── */}
      <Controller
        name="preferred_approach"
        control={control}
        render={({ field }) => (
          <LineItemsInput
            value={Array.isArray(field.value) ? field.value : ['']}
            onChange={field.onChange}
            label="Preferred Approach"
            placeholder="Describe a preferred methodology..."
            addLabel="Add Approach"
          />
        )}
      />

      {/* ── 14. Approaches NOT of Interest (line_items — matches curator) ── */}
      <Controller
        name="approaches_not_of_interest"
        control={control}
        render={({ field }) => (
          <LineItemsInput
            value={Array.isArray(field.value) ? field.value : ['']}
            onChange={field.onChange}
            label="Approaches NOT of Interest"
            placeholder="Describe an approach that should NOT be submitted..."
            addLabel="Add Excluded Approach"
          />
        )}
      />

      {/* ── 15. Submission Guidelines (line_items — matches curator) ── */}
      <Controller
        name="submission_guidelines"
        control={control}
        render={({ field }) => (
          <LineItemsInput
            value={Array.isArray(field.value) ? field.value : ['']}
            onChange={field.onChange}
            label="Submission Guidelines"
            placeholder="Specific instruction for solvers..."
            addLabel="Add Guideline"
          />
        )}
      />

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

      {/* ── 16b. Taxonomy Tags ────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="taxonomy_tags" className="text-sm font-medium">
          Taxonomy Tags <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Input
          id="taxonomy_tags"
          placeholder="Comma-separated taxonomy tags, e.g. SAP, ERP, Cloud Migration"
          className="text-base"
          {...register('taxonomy_tags')}
        />
        <p className="text-xs text-muted-foreground">Used for advanced classification and search indexing</p>
      </div>

      {/* ── 17. Solution Maturity Level — Dynamic from DB ── */}
      <Controller
        name="maturity_level"
        control={control}
        render={({ field }) => (
          <MaturityRadioCards
            value={field.value}
            onChange={(code, id) => {
              field.onChange(code);
              setValue('solution_maturity_id', id);
            }}
            error={errors.maturity_level?.message}
            options={maturityOptions}
            loading={loadingMaturity}
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
   Maturity Level Radio Cards — Dynamic from DB
   ═══════════════════════════════════════════════════════════ */

interface MaturityRadioCardsProps {
  value: string | undefined;
  onChange: (code: string, id: string) => void;
  error?: string;
  options: Array<{ id: string; code: string; label: string; description: string | null }>;
  loading?: boolean;
}

function MaturityRadioCards({ value, onChange, error, options, loading }: MaturityRadioCardsProps) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Solution Maturity Level <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center gap-2 py-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading maturity levels...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        Solution Maturity Level <span className="text-destructive">*</span>
      </Label>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = value === opt.code;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.code, opt.id)}
              className={cn(
                'flex flex-col items-center text-center rounded-lg p-4 transition-all cursor-pointer border-2',
                isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-muted-foreground/30',
                error && !value && 'border-destructive',
              )}
            >
              {isSelected && <Check className="h-5 w-5 text-primary mb-1" />}
              <span className={cn('text-sm font-semibold', isSelected ? 'text-primary' : 'text-foreground')}>{opt.label}</span>
              {opt.description && (
                <span className="text-xs text-muted-foreground mt-0.5 leading-snug">{opt.description}</span>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
