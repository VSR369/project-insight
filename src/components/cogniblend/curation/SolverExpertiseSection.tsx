/**
 * SolverExpertiseSection — Taxonomy tree-based expertise requirement selector.
 *
 * Shows the challenge's industry segment (read-only) and lets curators select
 * proficiency areas, sub-domains, and specialities that solvers must possess.
 * When nothing is selected = "All applicable" (no restriction).
 *
 * Uses useProficiencyTaxonomy hook to fetch the tree for each expertise level.
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Pencil, Save, X, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { CACHE_STABLE } from "@/config/queryCache";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Json } from "@/integrations/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SelectedItem {
  id: string;
  name: string;
}

export interface SolverExpertiseData {
  expertise_levels?: SelectedItem[];
  proficiency_areas?: SelectedItem[];
  sub_domains?: SelectedItem[];
  specialities?: SelectedItem[];
  industry_segment_id?: string;
}

interface SolverExpertiseSectionProps {
  data: Json | null;
  industrySegmentId: string | null;
  readOnly?: boolean;
  editing?: boolean;
  onSave: (data: SolverExpertiseData) => void;
  saving?: boolean;
  onCancel?: () => void;
}

// ---------------------------------------------------------------------------
// Taxonomy tree fetcher (all levels for an industry)
// ---------------------------------------------------------------------------

function useFullTaxonomyTree(industrySegmentId?: string) {
  // Fetch all expertise levels
  const { data: expertiseLevels, isLoading: elLoading } = useQuery({
    queryKey: ["expertise-levels-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expertise_levels")
        .select("id, name, level_number, description")
        .eq("is_active", true)
        .not("name", "like", "__SMOKE_TEST_%")
        .order("level_number");
      if (error) return [];
      return data ?? [];
    },
    ...CACHE_STABLE,
  });

  // Fetch all proficiency areas for this industry across all levels
  const { data: proficiencyAreas, isLoading: paLoading } = useQuery({
    queryKey: ["taxonomy-prof-areas", industrySegmentId],
    queryFn: async () => {
      if (!industrySegmentId) return [];
      const { data, error } = await supabase
        .from("proficiency_areas")
        .select("id, name, description, expertise_level_id")
        .eq("industry_segment_id", industrySegmentId)
        .eq("is_active", true)
        .not("name", "like", "__SMOKE_TEST_%")
        .order("display_order");
      if (error) return [];
      return data ?? [];
    },
    enabled: !!industrySegmentId,
    ...CACHE_STABLE,
  });

  // Fetch all sub-domains for these proficiency areas
  const paIds = useMemo(() => (proficiencyAreas ?? []).map(p => p.id), [proficiencyAreas]);
  const { data: subDomains, isLoading: sdLoading } = useQuery({
    queryKey: ["taxonomy-sub-domains", paIds],
    queryFn: async () => {
      if (paIds.length === 0) return [];
      // Batch to avoid URL limits
      const results = [];
      for (let i = 0; i < paIds.length; i += 50) {
        const batch = paIds.slice(i, i + 50);
        const { data } = await supabase
          .from("sub_domains")
          .select("id, name, description, proficiency_area_id")
          .in("proficiency_area_id", batch)
          .eq("is_active", true)
          .order("display_order");
        if (data) results.push(...data);
      }
      return results;
    },
    enabled: paIds.length > 0,
    ...CACHE_STABLE,
  });

  // Fetch all specialities for these sub-domains
  const sdIds = useMemo(() => (subDomains ?? []).map(s => s.id), [subDomains]);
  const { data: specialities, isLoading: spLoading } = useQuery({
    queryKey: ["taxonomy-specialities", sdIds],
    queryFn: async () => {
      if (sdIds.length === 0) return [];
      const results = [];
      for (let i = 0; i < sdIds.length; i += 50) {
        const batch = sdIds.slice(i, i + 50);
        const { data } = await supabase
          .from("specialities")
          .select("id, name, description, sub_domain_id")
          .in("sub_domain_id", batch)
          .eq("is_active", true)
          .order("display_order");
        if (data) results.push(...data);
      }
      return results;
    },
    enabled: sdIds.length > 0,
    ...CACHE_STABLE,
  });

  // Build tree: expertise_level → proficiency_areas → sub_domains → specialities
  const tree = useMemo(() => {
    if (!expertiseLevels || !proficiencyAreas) return [];
    return expertiseLevels
      .map(el => ({
        ...el,
        proficiencyAreas: proficiencyAreas
          .filter(pa => pa.expertise_level_id === el.id)
          .map(pa => ({
            ...pa,
            subDomains: (subDomains ?? [])
              .filter(sd => sd.proficiency_area_id === pa.id)
              .map(sd => ({
                ...sd,
                specialities: (specialities ?? [])
                  .filter(sp => sp.sub_domain_id === sd.id),
              })),
          })),
      }))
      .filter(el => el.proficiencyAreas.length > 0); // Only show levels with content
  }, [expertiseLevels, proficiencyAreas, subDomains, specialities]);

  return { tree, isLoading: elLoading || paLoading || sdLoading || spLoading };
}

// ---------------------------------------------------------------------------
// Parse helper
// ---------------------------------------------------------------------------

function parseSolverExpertise(val: Json | null): SolverExpertiseData {
  if (!val) return {};
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return {}; }
  }
  return val as unknown as SolverExpertiseData;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SolverExpertiseSection({
  data,
  industrySegmentId,
  readOnly = false,
  editing: externalEditing,
  onSave,
  saving,
  onCancel: externalOnCancel,
}: SolverExpertiseSectionProps) {
  const parsed = parseSolverExpertise(data);
  const [internalEditing, setInternalEditing] = useState(false);
  const editing = externalEditing ?? internalEditing;
  const [localSelectedSegmentId, setLocalSelectedSegmentId] = useState<string | null>(null);
  const [selectedPAs, setSelectedPAs] = useState<Set<string>>(new Set((parsed.proficiency_areas ?? []).map(i => i.id)));
  const [selectedSDs, setSelectedSDs] = useState<Set<string>>(new Set((parsed.sub_domains ?? []).map(i => i.id)));
  const [selectedSPs, setSelectedSPs] = useState<Set<string>>(new Set((parsed.specialities ?? []).map(i => i.id)));
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [expandedPAs, setExpandedPAs] = useState<Set<string>>(new Set());
  const [expandedSDs, setExpandedSDs] = useState<Set<string>>(new Set());

  const { data: industrySegments } = useIndustrySegments();

  // Effective segment: prop value OR curator's local selection
  const effectiveSegmentId = industrySegmentId ?? localSelectedSegmentId;
  const industryName = industrySegments?.find(s => s.id === effectiveSegmentId)?.name;

  const { tree, isLoading } = useFullTaxonomyTree(effectiveSegmentId ?? undefined);

  // Sync selections when entering edit mode externally
  useEffect(() => {
    if (editing) {
      const p = parseSolverExpertise(data);
      setSelectedPAs(new Set((p.proficiency_areas ?? []).map(i => i.id)));
      setSelectedSDs(new Set((p.sub_domains ?? []).map(i => i.id)));
      setSelectedSPs(new Set((p.specialities ?? []).map(i => i.id)));
    }
  }, [editing, data]);

  const handleCancel = () => {
    setInternalEditing(false);
    setLocalSelectedSegmentId(null);
    externalOnCancel?.();
  };

  const handleSave = useCallback(() => {
    // Build named selections from tree
    const paItems: SelectedItem[] = [];
    const sdItems: SelectedItem[] = [];
    const spItems: SelectedItem[] = [];

    tree.forEach(el => {
      el.proficiencyAreas.forEach(pa => {
        if (selectedPAs.has(pa.id)) paItems.push({ id: pa.id, name: pa.name });
        pa.subDomains.forEach(sd => {
          if (selectedSDs.has(sd.id)) sdItems.push({ id: sd.id, name: sd.name });
          sd.specialities.forEach(sp => {
            if (selectedSPs.has(sp.id)) spItems.push({ id: sp.id, name: sp.name });
          });
        });
      });
    });

    const savePayload: SolverExpertiseData = {
      proficiency_areas: paItems,
      sub_domains: sdItems,
      specialities: spItems,
    };
    // Include curator-selected industry segment if it was manually picked
    if (!industrySegmentId && localSelectedSegmentId) {
      savePayload.industry_segment_id = localSelectedSegmentId;
    }
    onSave(savePayload);
    setInternalEditing(false);
  }, [tree, selectedPAs, selectedSDs, selectedSPs, onSave, industrySegmentId, localSelectedSegmentId]);

  const togglePA = (id: string) => setSelectedPAs(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleSD = (id: string) => setSelectedSDs(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleSP = (id: string) => setSelectedSPs(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleLevel = (id: string) => setExpandedLevels(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const togglePAExpand = (id: string) => setExpandedPAs(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleSDExpand = (id: string) => setExpandedSDs(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const hasAnySelection = (parsed.proficiency_areas?.length ?? 0) + (parsed.sub_domains?.length ?? 0) + (parsed.specialities?.length ?? 0) > 0;

  if (!industrySegmentId) {
    return (
      <div className="text-sm text-muted-foreground italic py-2">
        No industry segment configured for this challenge. Expertise requirements cannot be specified.
      </div>
    );
  }

  // ── View mode ──
  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Industry:</span>
          <Badge variant="outline">{industryName ?? "Loading..."}</Badge>
        </div>

        {!hasAnySelection ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">All Applicable</Badge>
            <span className="text-xs text-muted-foreground">No specific expertise restrictions — all solver expertise levels qualify.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {parsed.proficiency_areas && parsed.proficiency_areas.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Proficiency Areas</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.proficiency_areas.map(pa => (
                    <Badge key={pa.id} variant="secondary" className="text-xs">{pa.name}</Badge>
                  ))}
                </div>
              </div>
            )}
            {parsed.sub_domains && parsed.sub_domains.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Sub-domains</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.sub_domains.map(sd => (
                    <Badge key={sd.id} variant="outline" className="text-xs">{sd.name}</Badge>
                  ))}
                </div>
              </div>
            )}
            {parsed.specialities && parsed.specialities.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Specialities</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.specialities.map(sp => (
                    <Badge key={sp.id} className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">{sp.name}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    );
  }

  // ── Edit mode ──
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">No taxonomy data available for industry "{industryName}". All expertise levels will apply.</p>
        <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <GraduationCap className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Industry:</span>
        <Badge variant="outline">{industryName}</Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Select the proficiency areas, sub-domains, and specialities solvers should possess. Leave unchecked for "All applicable".
      </p>

      <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
        {tree.map(el => (
          <Collapsible key={el.id} open={expandedLevels.has(el.id)} onOpenChange={() => toggleLevel(el.id)}>
            <CollapsibleTrigger className="w-full px-3 py-2 flex items-center gap-2 text-sm font-medium hover:bg-muted/50">
              {expandedLevels.has(el.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span>{el.name}</span>
              <Badge variant="outline" className="text-[10px] ml-auto">{el.proficiencyAreas.length} areas</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4">
              {el.proficiencyAreas.map(pa => (
                <div key={pa.id} className="border-l border-border ml-2">
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <Checkbox
                      checked={selectedPAs.has(pa.id)}
                      onCheckedChange={() => togglePA(pa.id)}
                      id={`pa-${pa.id}`}
                    />
                    <label htmlFor={`pa-${pa.id}`} className="text-sm cursor-pointer flex-1">{pa.name}</label>
                    {pa.subDomains.length > 0 && (
                      <button onClick={() => togglePAExpand(pa.id)} className="text-muted-foreground hover:text-foreground">
                        {expandedPAs.has(pa.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                  {expandedPAs.has(pa.id) && pa.subDomains.map(sd => (
                    <div key={sd.id} className="border-l border-border ml-6">
                      <div className="flex items-center gap-2 px-3 py-1">
                        <Checkbox
                          checked={selectedSDs.has(sd.id)}
                          onCheckedChange={() => toggleSD(sd.id)}
                          id={`sd-${sd.id}`}
                        />
                        <label htmlFor={`sd-${sd.id}`} className="text-xs cursor-pointer flex-1">{sd.name}</label>
                        {sd.specialities.length > 0 && (
                          <button onClick={() => toggleSDExpand(sd.id)} className="text-muted-foreground hover:text-foreground">
                            {expandedSDs.has(sd.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                      {expandedSDs.has(sd.id) && sd.specialities.map(sp => (
                        <div key={sp.id} className="flex items-center gap-2 px-3 py-1 ml-6">
                          <Checkbox
                            checked={selectedSPs.has(sp.id)}
                            onCheckedChange={() => toggleSP(sp.id)}
                            id={`sp-${sp.id}`}
                          />
                          <label htmlFor={`sp-${sp.id}`} className="text-[11px] cursor-pointer text-muted-foreground">{sp.name}</label>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      <div className="flex gap-2">
        <Button size="sm" disabled={saving} onClick={handleSave}>
          <Save className="h-3 w-3 mr-1" />{saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <X className="h-3 w-3 mr-1" />Cancel
        </Button>
      </div>
    </div>
  );
}
