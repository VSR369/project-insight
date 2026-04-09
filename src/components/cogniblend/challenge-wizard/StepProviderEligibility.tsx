/**
 * Step 5 — Provider Eligibility & Matchmaking
 *
 * Sections:
 *   1. Challenge Visibility & Solver Category (database-driven)
 *   2. Solution Provider Eligibility Criteria (expertise, proficiencies, sub-domains, specialities)
 *   3. IP Model
 *   4. Permitted Artifact Types
 *   5. Targeting Filters (Enterprise only)
 */

import { useState, useEffect, useMemo } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { Info, Star, Shield, UserCheck, Globe, Lock, ChevronRight, Eye, UserPlus, FileText, Plus, X, Search } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AiFieldAssist } from './AiFieldAssist';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSolverEligibility } from '@/hooks/queries/useChallengeData';
import { useParticipationModes } from '@/hooks/queries/useMasterData';
import { useExpertiseLevels } from '@/hooks/queries/useExpertiseLevels';
import { useIndustrySegmentOptions } from '@/hooks/queries/useTaxonomySelectors';
import { useTaxonomyCascade } from '@/hooks/queries/useTaxonomyCascade';
import { TargetingFiltersSection, EMPTY_TARGETING_FILTERS } from '@/components/cogniblend/publication/TargetingFiltersSection';

import type { TargetingFilters } from '@/components/cogniblend/publication/TargetingFiltersSection';
import type { ChallengeFormValues } from './challengeFormSchema';

/* ─── Constants ──────────────────────────────────────── */

const ARTIFACT_TIERS: Record<string, string[]> = {
  blueprint: ['Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram'],
  poc: ['Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram', 'Data/Evidence', 'Video Demo', 'Audio Recording'],
  prototype: [
    'Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram',
    'Data/Evidence', 'Video Demo', 'Audio Recording', 'Audio Demo', 'Source Code', 'Hardware Specs', 'API Documentation',
  ],
  pilot: [
    'Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram',
    'Data/Evidence', 'Video Demo', 'Audio Recording', 'Audio Demo', 'Audio Narration', 'Source Code', 'Hardware Specs', 'API Documentation',
    'Field Data', 'Deployment Guide', 'Metrics Report',
  ],
};

/* IP_OPTIONS and MATURITY_IP_DEFAULTS moved to StepRewards.tsx */

/* ─── Enterprise Publication Config ──────────────────── */


/* ─── Star Rating Badge ──────────────────────────────── */

function StarBadge({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-3 w-3 fill-current" />
      ))}
    </span>
  );
}

/* ─── Searchable Multi-Select from Master Data ───────── */

function MasterDataMultiSelect({
  label,
  items,
  selectedIds,
  onChange,
  placeholder,
  helpText,
  isLoading,
}: {
  label: string;
  items: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  helpText?: string;
  isLoading?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = items.filter(
    (item) => item.name.toLowerCase().includes(search.toLowerCase()) && !selectedIds.includes(item.id),
  );

  const addItem = (id: string) => {
    onChange([...selectedIds, id]);
    setSearch('');
    setShowDropdown(false);
  };

  const removeItem = (id: string) => {
    onChange(selectedIds.filter((v) => v !== id));
  };

  const getName = (id: string) => items.find((i) => i.id === id)?.name ?? id;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => (
            <Badge key={id} variant="secondary" className="flex items-center gap-1 text-xs py-1 px-2">
              {getName(id)}
              <button type="button" onClick={() => removeItem(id)} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={isLoading ? 'Loading…' : placeholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          className="pl-9 text-base"
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filtered.slice(0, 30).map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                onClick={() => addItem(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Props ──────────────────────────────────────────── */

interface StepProviderEligibilityProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isQuick: boolean;
  fieldRules?: Record<string, { visibility: string; minLength: number | null; maxLength: number | null; defaultValue: string | null }>;
}

/* ─── Main Component ─────────────────────────────────── */

export function StepProviderEligibility({ form, mandatoryFields, isQuick }: StepProviderEligibilityProps) {
  const { formState: { errors }, control, watch, setValue, register } = form;

  const isRequired = (field: string) => mandatoryFields.includes(field);

  // ── Data hooks ──
  const { data: solverCategories = [], isLoading: loadingCategories } = useSolverEligibility();
  const { data: participationModes = [], isLoading: loadingModes } = useParticipationModes();
  const { data: expertiseLevels = [] } = useExpertiseLevels();
  const { data: industrySegments = [] } = useIndustrySegmentOptions();

  // ── Watch form values ──
  const maturityLevel = watch('maturity_level');
  const selectedArtifacts = watch('permitted_artifact_types') ?? [];
  const availableArtifacts = ARTIFACT_TIERS[maturityLevel] ?? [];
  const solverEligibilityIds = watch('solver_eligibility_ids') ?? [];
  const industrySegmentId = watch('industry_segment_id') ?? '';
  const experienceCountries = watch('experience_countries') ?? [];
  const requiredProficiencies = watch('required_proficiencies') ?? [];
  const requiredSubDomains = watch('required_sub_domains') ?? [];
  const requiredSpecialities = watch('required_specialities') ?? [];
  const eligibleModes = watch('eligible_participation_modes') ?? [];

  // ── Taxonomy cascade — from industry segment through proficiency areas, sub-domains, specialities ──
  const industryIds = useMemo(() => industrySegmentId ? [industrySegmentId] : [], [industrySegmentId]);
  const cascade = useTaxonomyCascade(industryIds);

  // Proficiency areas for the "Required Proficiencies" multi-select
  const proficiencyAreas = cascade.proficiencyAreas;

  // Sub-domains filtered by selected proficiency areas (or all if none selected)
  const actualSubDomains = useMemo(
    () => cascade.getSubDomainsByProfAreas(requiredProficiencies),
    [cascade.getSubDomainsByProfAreas, requiredProficiencies],
  );

  // Specialities filtered by selected sub-domains (or all if none selected)
  const specialities = useMemo(
    () => cascade.getSpecialitiesBySubDomains(requiredSubDomains),
    [cascade.getSpecialitiesBySubDomains, requiredSubDomains],
  );

  // ── Canonical 5-code solver model (CE, IO, DR, OC, OPEN) — filter by active master data ──
  const activeCategories = useMemo(() => {
    return solverCategories;
  }, [solverCategories]);

  // ── Provider Category: "All" is a select-all toggle, checkboxes always visible ──
  const allModeIds = participationModes.map((m) => m.id);
  const isAllModes = eligibleModes.length === 0;

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setValue('eligible_participation_modes', [], { shouldDirty: true });
    } else {
      setValue('eligible_participation_modes', allModeIds, { shouldDirty: true });
    }
  };

  const toggleMode = (modeId: string) => {
    if (eligibleModes.includes(modeId)) {
      const updated = eligibleModes.filter((m: string) => m !== modeId);
      setValue('eligible_participation_modes', updated, { shouldDirty: true });
    } else {
      setValue('eligible_participation_modes', [...eligibleModes, modeId], { shouldDirty: true });
    }
  };

  // ── Solver Tier: checkboxes (multi-select) ──
  const toggleSolverTier = (catId: string) => {
    if (solverEligibilityIds.includes(catId)) {
      setValue('solver_eligibility_ids', solverEligibilityIds.filter((id: string) => id !== catId), { shouldDirty: true });
    } else {
      setValue('solver_eligibility_ids', [...solverEligibilityIds, catId], { shouldDirty: true });
    }
  };

  const isAllTiers = solverEligibilityIds.length === 0;
  const toggleAllTiers = (checked: boolean) => {
    if (checked) {
      setValue('solver_eligibility_ids', [], { shouldDirty: true });
    }
  };



  // ── Artifact types auto-populate ──
  useEffect(() => {
    if (maturityLevel && ARTIFACT_TIERS[maturityLevel] && selectedArtifacts.length === 0) {
      setValue('permitted_artifact_types', [...ARTIFACT_TIERS[maturityLevel]]);
    }
  }, [maturityLevel, setValue, selectedArtifacts.length]);

  const toggleArtifact = (artifact: string) => {
    if (selectedArtifacts.includes(artifact)) {
      setValue('permitted_artifact_types', selectedArtifacts.filter((a: string) => a !== artifact));
    } else {
      setValue('permitted_artifact_types', [...selectedArtifacts, artifact]);
    }
  };

  /* IP model auto-fill moved to StepRewards */

  // ── Targeting filters ──
  const currentFilters = (watch('targeting_filters') ?? EMPTY_TARGETING_FILTERS) as TargetingFilters;
  const handleFiltersChange = (filters: TargetingFilters) => {
    setValue('targeting_filters', filters, { shouldDirty: true });
  };

  // ── Sub-domain toggle ──
  const toggleSubDomain = (id: string) => {
    if (requiredSubDomains.includes(id)) {
      setValue('required_sub_domains', requiredSubDomains.filter((d: string) => d !== id), { shouldDirty: true });
    } else {
      setValue('required_sub_domains', [...requiredSubDomains, id], { shouldDirty: true });
    }
  };

  // ── Speciality toggle ──
  const toggleSpeciality = (id: string) => {
    if (requiredSpecialities.includes(id)) {
      setValue('required_specialities', requiredSpecialities.filter((s: string) => s !== id), { shouldDirty: true });
    } else {
      setValue('required_specialities', [...requiredSpecialities, id], { shouldDirty: true });
    }
  };


  // ── Resolve industry segment name ──
  const industryName = useMemo(() => {
    return industrySegments.find((s) => s.id === industrySegmentId)?.name ?? '';
  }, [industrySegments, industrySegmentId]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Provider Eligibility & Matchmaking</h3>
          <p className="text-sm text-muted-foreground">
            Define who can discover, enroll in, and submit solutions to this challenge.
          </p>
        </div>
        <AiFieldAssist
          fieldName="eligibility"
          context={{
            title: watch('title') ?? '',
            problem_statement: watch('problem_statement') ?? '',
            maturity_level: watch('maturity_level') ?? '',
            governance_mode: watch('governance_mode') ?? '',
          }}
          onResult={(content) => setValue('eligibility', content, { shouldDirty: true })}
          label="AI Suggest"
        />
      </div>

      {/* ═══ SECTION 1A: Provider Category (Layer 1) — Always show all checkboxes ═══ */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-foreground">Provider Category</h4>
          <p className="text-xs text-muted-foreground">
            Which types of solution providers can participate in this challenge?
          </p>
        </div>

        {loadingModes ? (
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
            <p className="text-sm text-muted-foreground">Loading categories…</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Select All toggle */}
            <label
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors',
                isAllModes
                  ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border bg-background hover:bg-muted/50',
              )}
            >
              <Checkbox checked={isAllModes} onCheckedChange={(checked) => toggleSelectAll(!!checked)} />
              <div>
                <span className="text-sm font-semibold text-foreground">All Categories</span>
                <p className="text-xs text-muted-foreground">Accept providers from all participation categories</p>
              </div>
            </label>

            {/* Individual mode checkboxes — always visible */}
            {participationModes.map((mode) => {
              const checked = isAllModes || eligibleModes.includes(mode.id);
              return (
                <label
                  key={mode.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors',
                    checked
                      ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-background hover:bg-muted/50',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={isAllModes}
                    onCheckedChange={() => toggleMode(mode.id)}
                  />
                  <div>
                    <span className="text-sm font-semibold text-foreground">{mode.name}</span>
                    {mode.description && (
                      <p className="text-xs text-muted-foreground">{mode.description}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ SECTION 1B: Solver Tier (Layer 2) — Checkboxes ═══ */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-foreground">Solver Tier</h4>
          <p className="text-xs text-muted-foreground">
            What level of solver can participate? Select one or more tiers.
          </p>
        </div>

        {loadingCategories ? (
          <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">Loading solver tiers…</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* All tiers option */}
            <label
              className={cn(
                'flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors',
                isAllTiers
                  ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border bg-background hover:bg-muted/50',
              )}
            >
              <Checkbox checked={isAllTiers} onCheckedChange={(checked) => toggleAllTiers(!!checked)} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">All (no restriction)</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">ALL</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Any solver on the platform can participate</p>
              </div>
            </label>

            {/* Individual tiers as checkboxes */}
            {activeCategories.map((cat) => {
              const isSelected = solverEligibilityIds.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors',
                    isSelected
                      ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-background hover:bg-muted/50',
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSolverTier(cat.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{cat.label}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{cat.code}</Badge>
                      {cat.min_star_rating && cat.min_star_rating > 0 && (
                        <StarBadge count={cat.min_star_rating} />
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {cat.requires_auth && (
                        <Badge variant="secondary" className="text-[10px] py-0 gap-1">
                          <Shield className="h-3 w-3" /> Auth Required
                        </Badge>
                      )}
                      {cat.requires_certification && (
                        <Badge variant="secondary" className="text-[10px] py-0 gap-1">
                          <UserCheck className="h-3 w-3" /> Certified
                        </Badge>
                      )}
                      {cat.requires_provider_record && (
                        <Badge variant="secondary" className="text-[10px] py-0 gap-1">
                          <UserCheck className="h-3 w-3" /> Provider Record
                        </Badge>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* ── Quick: Summary note ── */}
        {isQuick && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Visibility is auto-configured based on the selected solver tier(s).
            </p>
          </div>
        )}
      </div>

      {/* ═══ SECTION 2: Solution Provider Eligibility Criteria ═══ */}
      <div className="space-y-4 border-t border-border pt-6">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-foreground">Solution Provider Eligibility Criteria</h4>
          <Badge variant="outline" className="text-[10px] py-0">From Challenge Brief</Badge>
        </div>

        {/* Read-only Industry Segment */}
        {industrySegmentId && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Industry Segment</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm py-1 px-3">{industryName || industrySegmentId}</Badge>
            </div>
          </div>
        )}

        {/* Read-only Experience Countries */}
        {experienceCountries.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Localization — Experience (Country)</Label>
            <div className="flex flex-wrap gap-2">
              {experienceCountries.map((country: string) => (
                <Badge key={country} variant="secondary" className="text-xs py-0.5 px-2">{country}</Badge>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              Solvers from these countries will be prioritized in matchmaking.
            </p>
          </div>
        )}

        {/* Required Expertise Level — filtered, show level + name only */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Required Expertise Level</Label>
          <Controller
            name="required_expertise_level_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className="text-base"><SelectValue placeholder="Select expertise level" /></SelectTrigger>
                <SelectContent>
                  {expertiseLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      Level {level.level_number} — {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Required Proficiencies — from master data */}
        <MasterDataMultiSelect
          label="Required Proficiencies"
          items={proficiencyAreas}
          selectedIds={requiredProficiencies}
          onChange={(val) => setValue('required_proficiencies', val, { shouldDirty: true })}
          placeholder="Search proficiency areas…"
          helpText="Select key proficiency areas required for this challenge."
        />

        {/* Sub-Domains — always visible (from taxonomy or all) */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Required Sub-Domains</Label>
          <p className="text-xs text-muted-foreground">
            {industrySegmentId
              ? 'Select relevant sub-domains based on the industry segment.'
              : 'Select relevant sub-domains (all industries shown).'}
          </p>
          {actualSubDomains.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto rounded-lg border border-border p-3">
                {actualSubDomains.map((sd) => {
                  const checked = requiredSubDomains.includes(sd.id);
                  return (
                    <label
                      key={sd.id}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors',
                        checked ? 'border-primary/30 bg-primary/5' : 'border-border bg-background hover:bg-muted/50',
                      )}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleSubDomain(sd.id)} />
                      <span className="text-sm">{sd.name}</span>
                    </label>
                  );
                })}
              </div>
              {requiredSubDomains.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Selected Sub-Domains ({requiredSubDomains.length}):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredSubDomains.map((id: string) => {
                      const sd = actualSubDomains.find((s) => s.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="text-xs py-0.5 gap-1">
                          {sd?.name ?? id}
                          <button type="button" onClick={() => toggleSubDomain(id)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              {industrySegmentId
                ? 'No sub-domains available for this industry segment.'
                : 'Select an industry segment to see sub-domains.'}
            </p>
          )}
        </div>

        {/* Required Specialities — from master data */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Required Specialities</Label>
          <p className="text-xs text-muted-foreground">
            {requiredSubDomains.length > 0
              ? 'Select specialities from the selected sub-domains.'
              : 'Select specialities (all shown).'}
          </p>
          {specialities.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto rounded-lg border border-border p-3">
                {specialities.map((spec) => {
                  const checked = requiredSpecialities.includes(spec.id);
                  return (
                    <label
                      key={spec.id}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors',
                        checked ? 'border-primary/30 bg-primary/5' : 'border-border bg-background hover:bg-muted/50',
                      )}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleSpeciality(spec.id)} />
                      <span className="text-sm">{spec.name}</span>
                    </label>
                  );
                })}
              </div>
              {requiredSpecialities.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Selected Specialities ({requiredSpecialities.length}):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredSpecialities.map((id: string) => {
                      const spec = specialities.find((s) => s.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="text-xs py-0.5 gap-1">
                          {spec?.name ?? id}
                          <button type="button" onClick={() => toggleSpeciality(id)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">No specialities available.</p>
          )}
        </div>
      </div>

      {/* ═══ SECTION 3: Eligibility Text ═══ */}
      <div className="space-y-1.5 border-t border-border pt-6">
        <Label className="text-sm font-medium">
          Eligibility Criteria (Text)
          <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Textarea
          placeholder="Describe any additional eligibility requirements for solvers..."
          rows={3}
          className="text-base resize-none"
          {...form.register('eligibility')}
        />
      </div>

      {/* ═══ SECTION 4: Permitted Artifact Types ═══ */}
      {maturityLevel && availableArtifacts.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Permitted Artifact Types</Label>
          <p className="text-xs text-muted-foreground">Auto-populated based on maturity level. Uncheck any you don't need.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {availableArtifacts.map((artifact) => {
              const checked = selectedArtifacts.includes(artifact);
              return (
                <label key={artifact} className={cn(
                  'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                  checked ? 'border-primary/30 bg-primary/5' : 'border-border bg-background hover:bg-muted/50',
                )}>
                  <Checkbox checked={checked} onCheckedChange={() => toggleArtifact(artifact)} />
                  <span className="text-sm">{artifact}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ SECTION 5: Targeting Filters (Enterprise) ═══ */}
      {!isQuick && (
        <div className="border-t border-border pt-6">
          <TargetingFiltersSection value={currentFilters} onChange={handleFiltersChange} isQuick={isQuick} />
        </div>
      )}

      {isQuick && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Quick governance uses open enrollment by default. Upgrade to Structured or Controlled for advanced targeting filters.
          </p>
        </div>
      )}
    </div>
  );
}
