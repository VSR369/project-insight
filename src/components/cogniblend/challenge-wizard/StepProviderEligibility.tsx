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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useProficiencyAreasBySegments, useAllProficiencyAreas, useSubDomainsByAreas, useSpecialitiesBySubDomains, useAllSpecialities } from '@/hooks/queries/useScopeTaxonomy';
import { TargetingFiltersSection, EMPTY_TARGETING_FILTERS } from '@/components/cogniblend/publication/TargetingFiltersSection';
import { AccessModelSummary } from '@/components/cogniblend/AccessModelSummary';
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

const IP_OPTIONS = [
  { value: 'exclusive_assignment', label: 'Exclusive Assignment', short: 'Full IP ownership', tooltip: 'Solver transfers all IP rights to you upon acceptance.' },
  { value: 'non_exclusive_license', label: 'Non-Exclusive License', short: 'Solver keeps IP, you get license', tooltip: 'Solver retains ownership; grants you a perpetual non-exclusive license.' },
  { value: 'exclusive_license', label: 'Exclusive License', short: 'Exclusive use for you', tooltip: 'Solver retains ownership; grants you an exclusive license.' },
  { value: 'joint_ownership', label: 'Joint Ownership', short: 'Both parties co-own', tooltip: 'Both parties share IP ownership.' },
  { value: 'no_transfer', label: 'No Transfer', short: 'Advisory only', tooltip: 'No IP transfer; advisory engagement only.' },
] as const;

const MATURITY_IP_DEFAULTS: Record<string, string> = {
  blueprint: 'non_exclusive_license',
  poc: 'non_exclusive_license',
  prototype: 'exclusive_assignment',
  pilot: 'exclusive_assignment',
};

/* ─── Enterprise Publication Config ──────────────────── */

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Visible to everyone on the platform and search engines' },
  { value: 'registered_users', label: 'Registered Users', description: 'Visible only to authenticated platform users' },
  { value: 'platform_members', label: 'Platform Members', description: 'Visible only to users with active memberships' },
  { value: 'curated_experts', label: 'Curated Experts', description: 'Visible only to experts curated by the platform' },
  { value: 'invited_only', label: 'Invited Only', description: 'Visible only to specifically invited participants' },
] as const;

const ENROLLMENT_OPTIONS = [
  { value: 'open_auto', label: 'Open Enrollment (auto-approved)', description: 'Anyone eligible can enroll without approval' },
  { value: 'curator_approved', label: 'Curator-Approved Enrollment', description: 'Curator reviews and approves enrollment requests' },
  { value: 'direct_nda', label: 'Direct Registration (NDA required)', description: 'Enrollment requires signing an NDA first' },
  { value: 'org_curated', label: 'Organization-Curated', description: 'The seeking organization selects who can enroll' },
  { value: 'invitation_only', label: 'Invitation Only', description: 'Only specifically invited solvers can enroll' },
] as const;

const SUBMISSION_OPTIONS = [
  { value: 'all_enrolled', label: 'All Enrolled', description: 'Any enrolled participant can submit solutions' },
  { value: 'shortlisted_only', label: 'Shortlisted Only', description: 'Only shortlisted participants can submit' },
  { value: 'invited_solvers', label: 'Invited Solvers Only', description: 'Only specifically invited solvers can submit' },
] as const;

const VALID_ENROLLMENTS: Record<string, string[]> = {
  public: ['open_auto', 'curator_approved', 'direct_nda', 'org_curated', 'invitation_only'],
  registered_users: ['open_auto', 'curator_approved', 'direct_nda', 'org_curated', 'invitation_only'],
  platform_members: ['curator_approved', 'direct_nda', 'org_curated', 'invitation_only'],
  curated_experts: ['curator_approved', 'org_curated', 'invitation_only'],
  invited_only: ['invitation_only'],
};

const VALID_SUBMISSIONS: Record<string, string[]> = {
  open_auto: ['all_enrolled', 'shortlisted_only', 'invited_solvers'],
  curator_approved: ['all_enrolled', 'shortlisted_only', 'invited_solvers'],
  direct_nda: ['all_enrolled', 'shortlisted_only', 'invited_solvers'],
  org_curated: ['all_enrolled', 'shortlisted_only', 'invited_solvers'],
  invitation_only: ['invited_solvers'],
};

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
  isLightweight: boolean;
}

/* ─── Main Component ─────────────────────────────────── */

export function StepProviderEligibility({ form, mandatoryFields, isLightweight }: StepProviderEligibilityProps) {
  const { formState: { errors }, control, watch, setValue } = form;

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
  const ipModel = watch('ip_model');
  const solverEligibilityIds = watch('solver_eligibility_ids') ?? [];
  const industrySegmentId = watch('industry_segment_id') ?? '';
  const experienceCountries = watch('experience_countries') ?? [];
  const requiredProficiencies = watch('required_proficiencies') ?? [];
  const requiredSubDomains = watch('required_sub_domains') ?? [];
  const requiredSpecialities = watch('required_specialities') ?? [];
  const challengeVisibility = watch('challenge_visibility') || '';
  const challengeEnrollment = watch('challenge_enrollment') || '';
  const challengeSubmission = watch('challenge_submission') || '';
  const eligibleModes = watch('eligible_participation_modes') ?? [];

  // ── Sub-domains from taxonomy — show all if no industry segment ──
  const industryIds = useMemo(() => industrySegmentId ? [industrySegmentId] : [], [industrySegmentId]);
  const { data: proficiencyAreasBySegment = [] } = useProficiencyAreasBySegments(industryIds);
  const { data: allProficiencyAreas = [] } = useAllProficiencyAreas(!industrySegmentId);
  const proficiencyAreas = industrySegmentId ? proficiencyAreasBySegment : allProficiencyAreas;

  // ── Specialities from taxonomy — cascade from selected sub-domains or show all ──
  const { data: specialitiesBySubDomains = [] } = useSpecialitiesBySubDomains(requiredSubDomains);
  const { data: allSpecialities = [] } = useAllSpecialities(requiredSubDomains.length === 0);
  const specialities = requiredSubDomains.length > 0 ? specialitiesBySubDomains : allSpecialities;

  // ── Filter solver categories: legacy only (exclude BRD 5.7.1) ──
  const legacyCategories = useMemo(() => {
    return solverCategories.filter((cat) => (cat as any).model_category !== 'brd_5_7_1');
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
      // Set most open defaults
      setValue('challenge_visibility', 'public', { shouldDirty: true });
      setValue('challenge_enrollment', 'open_auto', { shouldDirty: true });
      setValue('challenge_submission', 'all_enrolled', { shouldDirty: true });
    }
  };

  // ── Auto-fill publication config from first selected category ──
  const firstSelectedCategory = useMemo(() => {
    if (solverEligibilityIds.length === 0) return null;
    return solverCategories.find((c) => c.id === solverEligibilityIds[0]);
  }, [solverCategories, solverEligibilityIds]);

  useEffect(() => {
    if (firstSelectedCategory) {
      const cat = firstSelectedCategory as any;
      if (cat.default_visibility) setValue('challenge_visibility', cat.default_visibility, { shouldDirty: true });
      if (cat.default_enrollment) setValue('challenge_enrollment', cat.default_enrollment, { shouldDirty: true });
      if (cat.default_submission) setValue('challenge_submission', cat.default_submission, { shouldDirty: true });
    }
  }, [firstSelectedCategory, setValue]);

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

  // ── IP model default ──
  useEffect(() => {
    if (isLightweight && maturityLevel && !ipModel) {
      const defaultIp = MATURITY_IP_DEFAULTS[maturityLevel];
      if (defaultIp) setValue('ip_model', defaultIp);
    }
  }, [maturityLevel, isLightweight, ipModel, setValue]);

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

  // ── Enterprise publication config validation ──
  const validEnrollments = VALID_ENROLLMENTS[challengeVisibility] ?? ENROLLMENT_OPTIONS.map((o) => o.value);
  const validSubmissions = VALID_SUBMISSIONS[challengeEnrollment] ?? SUBMISSION_OPTIONS.map((o) => o.value);

  useEffect(() => {
    if (challengeVisibility && !validEnrollments.includes(challengeEnrollment)) {
      setValue('challenge_enrollment', validEnrollments[0], { shouldDirty: true });
    }
  }, [challengeVisibility]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (challengeEnrollment && !validSubmissions.includes(challengeSubmission)) {
      setValue('challenge_submission', validSubmissions[0], { shouldDirty: true });
    }
  }, [challengeEnrollment]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resolve industry segment name ──
  const industryName = useMemo(() => {
    return industrySegments.find((s) => s.id === industrySegmentId)?.name ?? '';
  }, [industrySegments, industrySegmentId]);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-foreground mb-1">Provider Eligibility & Matchmaking</h3>
        <p className="text-sm text-muted-foreground">
          Define who can discover, enroll in, and submit solutions to this challenge.
        </p>
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
            {legacyCategories.map((cat) => {
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

        {/* ── Enterprise: Editable 3-Tier Publication Config ── */}
        {!isLightweight && (solverEligibilityIds.length > 0 || isAllTiers) && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Publication Configuration</h4>
              <p className="text-xs text-muted-foreground">
                Auto-filled from selected category. You can override these settings.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
              {[
                { title: 'Visibility', subtitle: 'Who can SEE', icon: Eye, value: challengeVisibility, onChange: (v: string) => setValue('challenge_visibility', v, { shouldDirty: true }), options: VISIBILITY_OPTIONS, isDisabled: () => false },
                { title: 'Enrollment', subtitle: 'Who can ENROLL', icon: UserPlus, value: challengeEnrollment, onChange: (v: string) => setValue('challenge_enrollment', v, { shouldDirty: true }), options: ENROLLMENT_OPTIONS, isDisabled: (v: string) => !validEnrollments.includes(v) },
                { title: 'Submission', subtitle: 'Who can SUBMIT', icon: FileText, value: challengeSubmission, onChange: (v: string) => setValue('challenge_submission', v, { shouldDirty: true }), options: SUBMISSION_OPTIONS, isDisabled: (v: string) => !validSubmissions.includes(v) },
              ].map((tier, idx) => {
                const Icon = tier.icon;
                return (
                  <div key={tier.title} className="relative flex">
                    {idx > 0 && (
                      <div className="hidden lg:flex absolute -left-[14px] top-1/2 -translate-y-1/2 z-10">
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <Card className="flex-1 flex flex-col">
                      <CardHeader className="pb-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <CardTitle className="text-sm">{tier.title}</CardTitle>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{tier.subtitle}</p>
                      </CardHeader>
                      <CardContent className="flex-1 pt-0 space-y-2">
                        <Select value={tier.value} onValueChange={tier.onChange}>
                          <SelectTrigger className="text-base w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {tier.options.map((opt) => {
                              const disabled = tier.isDisabled(opt.value);
                              return (
                                <SelectItem key={opt.value} value={opt.value} disabled={disabled}>
                                  <span className={cn(disabled && 'opacity-50')}>{opt.label}</span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
            <AccessModelSummary visibility={challengeVisibility} enrollment={challengeEnrollment} submission={challengeSubmission} />
          </div>
        )}

        {/* ── Lightweight: Summary note ── */}
        {isLightweight && (
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
          {proficiencyAreas.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto rounded-lg border border-border p-3">
                {proficiencyAreas.map((area) => {
                  const checked = requiredSubDomains.includes(area.id);
                  return (
                    <label
                      key={area.id}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors',
                        checked ? 'border-primary/30 bg-primary/5' : 'border-border bg-background hover:bg-muted/50',
                      )}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleSubDomain(area.id)} />
                      <span className="text-sm">{area.name}</span>
                    </label>
                  );
                })}
              </div>
              {requiredSubDomains.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Selected Sub-Domains ({requiredSubDomains.length}):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredSubDomains.map((id: string) => {
                      const area = proficiencyAreas.find((a) => a.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="text-xs py-0.5 gap-1">
                          {area?.name ?? id}
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
            <p className="text-xs text-muted-foreground italic">No sub-domains available.</p>
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

      {/* ═══ SECTION 3: IP Model ═══ */}
      <div className="space-y-1.5 border-t border-border pt-6">
        <Label className="text-sm font-medium">
          IP Model{' '}
          {!isLightweight && isRequired('ip_model') && <span className="text-destructive">*</span>}
          {isLightweight && <span className="text-xs text-muted-foreground ml-1">(optional)</span>}
        </Label>
        <p className="text-xs text-muted-foreground">Select how intellectual property will be handled</p>
        <Controller name="ip_model" control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger className="text-base"><SelectValue placeholder="Select IP ownership model" /></SelectTrigger>
              <SelectContent>
                <TooltipProvider delayDuration={200}>
                  {IP_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">— {opt.short}</span>
                        <Tooltip>
                          <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" /></TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs text-xs">{opt.tooltip}</TooltipContent>
                        </Tooltip>
                      </div>
                    </SelectItem>
                  ))}
                </TooltipProvider>
              </SelectContent>
            </Select>
          )}
        />
        {errors.ip_model && <p className="text-xs text-destructive">{errors.ip_model.message}</p>}
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
      {!isLightweight && (
        <div className="border-t border-border pt-6">
          <TargetingFiltersSection value={currentFilters} onChange={handleFiltersChange} isLightweight={isLightweight} />
        </div>
      )}

      {isLightweight && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Lightweight governance uses open enrollment by default. Upgrade to Enterprise for advanced targeting filters.
          </p>
        </div>
      )}
    </div>
  );
}
