/**
 * StepProblem sub-components — DomainTagSelect and MaturityRadioCards.
 * Extracted from StepProblem.tsx for decomposition.
 */

import { useState, useCallback } from 'react';
import { Search, X, Plus, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/* ─── Constants ──────────────────────────────────────────── */

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

/* ─── DomainTagSelect ────────────────────────────────────── */

interface DomainTagSelectProps {
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
  taxonomySuggestions?: Array<{ tag: string; source: string }>;
}

export function DomainTagSelect({ value, onChange, error, taxonomySuggestions = [] }: DomainTagSelectProps) {
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
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomTag(); } }}
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
              <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2 border-t border-border" onClick={handleAddCustomTag}>
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

/* ─── MaturityRadioCards ──────────────────────────────────── */

interface MaturityRadioCardsProps {
  value: string | undefined;
  onChange: (code: string, id: string) => void;
  error?: string;
  options: Array<{ id: string; code: string; label: string; description: string | null }>;
  loading?: boolean;
}

export function MaturityRadioCards({ value, onChange, error, options, loading }: MaturityRadioCardsProps) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Solution Maturity Level <span className="text-destructive">*</span></Label>
        <div className="flex items-center gap-2 py-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Loading maturity levels...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Solution Maturity Level <span className="text-destructive">*</span></Label>
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
              {opt.description && <span className="text-xs text-muted-foreground mt-0.5 leading-snug">{opt.description}</span>}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
