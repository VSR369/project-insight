/**
 * Step 1 — Problem Definition
 *
 * Fields:
 *   1. Title — max 200 chars, live counter
 *   2. Problem Statement — min 500 (ENT) / 200 (LW) chars, live counter with green threshold
 *   3. Scope — min 200 (ENT) / 100 (LW), required (Enterprise), advanced expandable (Lightweight)
 *   4. Domain Tags — multi-select with search + colored pills
 *   5. Solution Maturity Level — 2×2 radio card grid
 */

import { useState, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ChallengeFormValues } from './challengeFormSchema';

/* ─── Constants ──────────────────────────────────────────── */

const TITLE_MAX = 200;
const PROBLEM_MIN_ENTERPRISE = 500;
const PROBLEM_MIN_LIGHTWEIGHT = 200;
const SCOPE_MIN_ENTERPRISE = 200;
const SCOPE_MIN_LIGHTWEIGHT = 100;

const DOMAIN_TAGS = [
  'AI/ML',
  'Biotech',
  'Clean Energy',
  'Materials Science',
  'Digital Health',
  'Manufacturing',
  'Software',
  'Sustainability',
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
  {
    value: 'blueprint' as const,
    name: 'Blueprint',
    description: 'Concept, architecture, or design document',
    Icon: FileText,
  },
  {
    value: 'poc' as const,
    name: 'PoC',
    description: 'Feasibility demonstration with evidence',
    Icon: FlaskConical,
  },
  {
    value: 'prototype' as const,
    name: 'Prototype',
    description: 'Working demo, code, or hardware model',
    Icon: Code,
  },
  {
    value: 'pilot' as const,
    name: 'Pilot',
    description: 'Real-world deployment test with metrics',
    Icon: Rocket,
  },
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
  const {
    register,
    formState: { errors },
    watch,
    control,
  } = form;

  const titleValue = watch('title') ?? '';
  const titleLen = titleValue.length;

  const problemMin = isLightweight ? PROBLEM_MIN_LIGHTWEIGHT : PROBLEM_MIN_ENTERPRISE;
  const scopeMin = isLightweight ? SCOPE_MIN_LIGHTWEIGHT : SCOPE_MIN_ENTERPRISE;

  const isRequired = (field: string) => mandatoryFields.includes(field);

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
          className={cn(
            'text-base',
            errors.title && 'border-destructive focus-visible:ring-destructive',
          )}
          {...register('title')}
        />
        <div className="flex items-center justify-between">
          {errors.title ? (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          ) : (
            <span />
          )}
          <span
            className={cn(
              'text-xs tabular-nums',
              titleLen > TITLE_MAX
                ? 'text-destructive font-medium'
                : 'text-muted-foreground',
            )}
          >
            {titleLen} / {TITLE_MAX}
          </span>
        </div>
      </div>

      {/* ── 2. Problem Statement (Rich Text) ─────────── */}
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

      {/* ── 3. Scope (Rich Text) ──────────────────────── */}
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
            {showAdvanced ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Show Advanced Options
          </button>
          {showAdvanced && (
            <div className="mt-3 pl-1 border-l-2 border-muted ml-1.5">
              <div className="pl-4 space-y-1.5">
                <Label className="text-sm font-medium">
                  Scope{' '}
                  <span className="text-xs text-muted-foreground">(optional)</span>
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

      {/* ── 4. Domain Tags ────────────────────────────── */}
      <Controller
        name="domain_tags"
        control={control}
        render={({ field }) => (
          <DomainTagSelect
            value={field.value}
            onChange={field.onChange}
            error={errors.domain_tags?.message}
          />
        )}
      />

      {/* ── 5. Solution Maturity Level ────────────────── */}
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
   Domain Tag Multi-Select (reuses M-11 tag list + colors)
   ═══════════════════════════════════════════════════════════ */

interface DomainTagSelectProps {
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
}

function DomainTagSelect({ value, onChange, error }: DomainTagSelectProps) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = DOMAIN_TAGS.filter(
    (tag) =>
      tag.toLowerCase().includes(search.toLowerCase()) && !value.includes(tag),
  );

  const addTag = useCallback(
    (tag: string) => {
      onChange([...value, tag]);
      setSearch('');
      setShowDropdown(false);
    },
    [value, onChange],
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(value.filter((t) => t !== tag));
    },
    [value, onChange],
  );

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        Domain Tags <span className="text-destructive">*</span>
      </Label>

      {/* Selected pills */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {value.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={cn(
                'gap-1 pr-1 border',
                TAG_COLORS[tag] || 'bg-secondary text-secondary-foreground',
              )}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full hover:bg-black/10 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder="Search domain tags..."
          className={cn(
            'pl-9',
            error && 'border-destructive focus-visible:ring-destructive',
          )}
        />

        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filtered.map((tag) => (
              <button
                key={tag}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                onClick={() => addTag(tag)}
              >
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs border',
                    TAG_COLORS[tag] || 'bg-secondary',
                  )}
                >
                  {tag}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

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
                isSelected
                  ? 'border-[#378ADD] bg-[#F0F7FF]'
                  : 'border-border bg-card hover:border-muted-foreground/30',
                error && !value && 'border-destructive',
              )}
            >
              <opt.Icon
                className={cn(
                  'h-6 w-6 mb-2',
                  isSelected ? 'text-[#378ADD]' : 'text-muted-foreground',
                )}
              />
              <span
                className={cn(
                  'text-sm font-semibold',
                  isSelected ? 'text-[#378ADD]' : 'text-foreground',
                )}
              >
                {opt.name}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {opt.description}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
