/**
 * TargetingFiltersSection — 8-filter targeting configuration for challenge publication.
 * 
 * Governance-aware:
 * - Lightweight: Shows only Industry + Geography (2 filters)
 * - Enterprise: Shows all 8 filters
 * 
 * All values stored in challenges.targeting_filters JSONB.
 */

import { useState, useCallback } from 'react';
import { X, Plus, Globe, Building2, Award, Languages, Star, Trophy, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useIndustrySegments } from '@/hooks/queries/useMasterData';
import { useCountries } from '@/hooks/queries/useMasterData';

/* ─── Types ────────────────────────────────────────────── */

export interface TargetingFilters {
  industries: string[];
  geographies: string[];
  expertise_domains: string[];
  certifications: string[];
  languages: string[];
  min_solver_rating: string;
  past_performance: string;
  solver_cluster: string;
}

export const EMPTY_TARGETING_FILTERS: TargetingFilters = {
  industries: [],
  geographies: [],
  expertise_domains: [],
  certifications: [],
  languages: [],
  min_solver_rating: 'any',
  past_performance: 'any',
  solver_cluster: 'any',
};

/* ─── Constants ────────────────────────────────────────── */

const LANGUAGE_OPTIONS = [
  'English', 'Spanish', 'Mandarin', 'French', 'German', 'Other',
] as const;

const RATING_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: '3+', label: '3+' },
  { value: '4+', label: '4+' },
  { value: '4.5+', label: '4.5+' },
] as const;

const PERFORMANCE_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: '1+', label: '1+ win' },
  { value: '3+', label: '3+ wins' },
  { value: '5+', label: '5+ wins' },
] as const;

const CLUSTER_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'individual', label: 'Individual Only' },
  { value: 'teams', label: 'Teams Only' },
] as const;

/* ─── Props ────────────────────────────────────────────── */

interface TargetingFiltersSectionProps {
  value: TargetingFilters;
  onChange: (filters: TargetingFilters) => void;
  isQuick: boolean;
  disabled?: boolean;
}

/* ─── Multi-Select Chip Input ──────────────────────────── */

interface ChipMultiSelectProps {
  label: string;
  icon: React.ReactNode;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

function ChipMultiSelect({ label, icon, options, selected, onChange, disabled }: ChipMultiSelectProps) {
  const available = options.filter(o => !selected.includes(o.value));

  const add = (val: string) => {
    if (!selected.includes(val)) onChange([...selected, val]);
  };

  const remove = (val: string) => {
    onChange(selected.filter(s => s !== val));
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(val => {
            const opt = options.find(o => o.value === val);
            return (
              <Badge key={val} variant="secondary" className="gap-1 pr-1">
                {opt?.label ?? val}
                <button
                  type="button"
                  onClick={() => remove(val)}
                  disabled={disabled}
                  className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      {available.length > 0 && (
        <Select onValueChange={add} value="" disabled={disabled}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${label.toLowerCase()}…`} />
          </SelectTrigger>
          <SelectContent>
            {available.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

/* ─── Text Chip Input (for certifications) ─────────────── */

interface TextChipInputProps {
  label: string;
  icon: React.ReactNode;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

function TextChipInput({ label, icon, values, onChange, placeholder, disabled }: TextChipInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addChip = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInputValue('');
  }, [inputValue, values, onChange]);

  const removeChip = (val: string) => {
    onChange(values.filter(v => v !== val));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addChip();
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map(val => (
            <Badge key={val} variant="secondary" className="gap-1 pr-1">
              {val}
              <button
                type="button"
                onClick={() => removeChip(val)}
                disabled={disabled}
                className="ml-0.5 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? `Add ${label.toLowerCase()}…`}
          disabled={disabled}
          className="flex-1"
        />
        <button
          type="button"
          onClick={addChip}
          disabled={disabled || !inputValue.trim()}
          className={cn(
            'flex items-center justify-center h-10 w-10 rounded-md border border-input transition-colors',
            inputValue.trim()
              ? 'bg-background hover:bg-accent text-foreground'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────── */

export function TargetingFiltersSection({
  value,
  onChange,
  isQuick,
  disabled,
}: TargetingFiltersSectionProps) {
  const { data: industries = [] } = useIndustrySegments();
  const { data: countries = [] } = useCountries();

  const industryOptions = industries.map(i => ({ value: i.id, label: i.name }));
  const countryOptions = countries.map(c => ({ value: c.id, label: c.name }));
  const languageOptions = LANGUAGE_OPTIONS.map(l => ({ value: l, label: l }));

  // Expertise domain tags reuse domain_tags from the challenge wizard constant
  const EXPERTISE_DOMAINS = [
    'AI/ML', 'Biotech', 'Clean Energy', 'Materials Science',
    'Digital Health', 'Manufacturing', 'Software', 'Sustainability',
    'Data Science', 'Cybersecurity', 'Robotics', 'IoT',
  ];
  const expertiseOptions = EXPERTISE_DOMAINS.map(d => ({ value: d, label: d }));

  const update = <K extends keyof TargetingFilters>(key: K, val: TargetingFilters[K]) => {
    onChange({ ...value, [key]: val });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h4 className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
          <Globe className="h-4 w-4 text-primary" />
          Targeting Filters
        </h4>
        <p className="text-xs text-muted-foreground">
          {isQuick
            ? 'Set industry and geography preferences for solver targeting.'
            : 'Configure all 8 targeting dimensions to narrow solver eligibility.'}
        </p>
      </div>

      {/* ── 1. Industry (both LW + Enterprise) ─── */}
      <ChipMultiSelect
        label="Industry"
        icon={<Building2 className="h-4 w-4" />}
        options={industryOptions}
        selected={value.industries}
        onChange={v => update('industries', v)}
        disabled={disabled}
      />

      {/* ── 2. Geography (both LW + Enterprise) ── */}
      <ChipMultiSelect
        label="Geography"
        icon={<Globe className="h-4 w-4" />}
        options={countryOptions}
        selected={value.geographies}
        onChange={v => update('geographies', v)}
        disabled={disabled}
      />

      {/* ── Enterprise-only filters (3–8) ──────── */}
      {!isQuick && (
        <>
          {/* 3. Expertise Domain */}
          <ChipMultiSelect
            label="Expertise Domain"
            icon={<Award className="h-4 w-4" />}
            options={expertiseOptions}
            selected={value.expertise_domains}
            onChange={v => update('expertise_domains', v)}
            disabled={disabled}
          />

          {/* 4. Required Certifications */}
          <TextChipInput
            label="Required Certifications"
            icon={<Award className="h-4 w-4" />}
            values={value.certifications}
            onChange={v => update('certifications', v)}
            placeholder="e.g. ISO 27001, PMP, AWS Solutions Architect…"
            disabled={disabled}
          />

          {/* 5. Language Proficiency */}
          <ChipMultiSelect
            label="Language Proficiency"
            icon={<Languages className="h-4 w-4" />}
            options={languageOptions}
            selected={value.languages}
            onChange={v => update('languages', v)}
            disabled={disabled}
          />

          {/* 6. Minimum Solver Rating */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Star className="h-4 w-4" />
              Minimum Solver Rating
            </Label>
            <Select
              value={value.min_solver_rating}
              onValueChange={v => update('min_solver_rating', v)}
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATING_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 7. Past Performance */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Trophy className="h-4 w-4" />
              Past Performance
            </Label>
            <Select
              value={value.past_performance}
              onValueChange={v => update('past_performance', v)}
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERFORMANCE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 8. Solver Cluster */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Solver Cluster
            </Label>
            <Select
              value={value.solver_cluster}
              onValueChange={v => update('solver_cluster', v)}
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLUSTER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
