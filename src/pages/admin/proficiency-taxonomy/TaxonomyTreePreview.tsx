import * as React from "react";
import { ChevronDown, ChevronRight, Target, Boxes, Sparkles, Loader2 } from "lucide-react";
import { logWarning } from "@/lib/errorHandler";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaxonomyTreePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  industrySegmentId: string;
  industrySegmentName: string;
  expertiseLevelId: string;
  expertiseLevelName: string;
}

interface SpecialityNode {
  id: string;
  name: string;
}

interface SubDomainNode {
  id: string;
  name: string;
  specialities: SpecialityNode[];
}

interface AreaNode {
  id: string;
  name: string;
  subDomains: SubDomainNode[];
}

export function TaxonomyTreePreview({
  open,
  onOpenChange,
  industrySegmentId,
  industrySegmentName,
  expertiseLevelId,
  expertiseLevelName,
}: TaxonomyTreePreviewProps) {
  const [treeData, setTreeData] = React.useState<AreaNode[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [expandedAreas, setExpandedAreas] = React.useState<Set<string>>(new Set());
  const [expandedSubDomains, setExpandedSubDomains] = React.useState<Set<string>>(new Set());

  // Fetch full tree when dialog opens
  React.useEffect(() => {
    if (open && industrySegmentId && expertiseLevelId) {
      fetchTreeData();
    }
  }, [open, industrySegmentId, expertiseLevelId]);

  const fetchTreeData = async () => {
    setIsLoading(true);
    try {
      // Fetch proficiency areas
      const { data: areas, error: areasError } = await supabase
        .from("proficiency_areas")
        .select("id, name")
        .eq("industry_segment_id", industrySegmentId)
        .eq("expertise_level_id", expertiseLevelId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (areasError) throw areasError;

      // Fetch sub-domains for all areas
      const areaIds = areas?.map(a => a.id) || [];
      const { data: subDomains, error: sdError } = await supabase
        .from("sub_domains")
        .select("id, name, proficiency_area_id")
        .in("proficiency_area_id", areaIds)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (sdError) throw sdError;

      // Fetch specialities for all sub-domains
      const sdIds = subDomains?.map(sd => sd.id) || [];
      const { data: specialities, error: spError } = await supabase
        .from("specialities")
        .select("id, name, sub_domain_id")
        .in("sub_domain_id", sdIds)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (spError) throw spError;

      // Build tree structure
      const tree: AreaNode[] = (areas || []).map(area => ({
        id: area.id,
        name: area.name,
        subDomains: (subDomains || [])
          .filter(sd => sd.proficiency_area_id === area.id)
          .map(sd => ({
            id: sd.id,
            name: sd.name,
            specialities: (specialities || [])
              .filter(sp => sp.sub_domain_id === sd.id)
              .map(sp => ({
                id: sp.id,
                name: sp.name,
              })),
          })),
      }));

      setTreeData(tree);
      // Expand all by default
      setExpandedAreas(new Set(tree.map(a => a.id)));
      setExpandedSubDomains(new Set(tree.flatMap(a => a.subDomains.map(sd => sd.id))));
    } catch (error) {
      logWarning("Failed to fetch tree data", { operation: 'fetch_taxonomy_tree', additionalData: { error: String(error) } });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleArea = (id: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSubDomain = (id: string) => {
    setExpandedSubDomains(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedAreas(new Set(treeData.map(a => a.id)));
    setExpandedSubDomains(new Set(treeData.flatMap(a => a.subDomains.map(sd => sd.id))));
  };

  const collapseAll = () => {
    setExpandedAreas(new Set());
    setExpandedSubDomains(new Set());
  };

  const totalSubDomains = treeData.reduce((acc, a) => acc + a.subDomains.length, 0);
  const totalSpecialities = treeData.reduce(
    (acc, a) => acc + a.subDomains.reduce((acc2, sd) => acc2 + sd.specialities.length, 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Taxonomy Tree Preview
          </DialogTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{industrySegmentName}</Badge>
            <Badge variant="outline">{expertiseLevelName}</Badge>
            <span className="text-sm text-muted-foreground ml-auto">
              {treeData.length} Areas • {totalSubDomains} Sub-domains • {totalSpecialities} Specialities
            </span>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : treeData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No taxonomy data found for this segment and level.
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 pr-4">
              <div className="space-y-1">
                {treeData.map(area => (
                  <div key={area.id} className="border rounded-lg overflow-hidden">
                    {/* Area Level */}
                    <button
                      onClick={() => toggleArea(area.id)}
                      className="w-full flex items-center gap-2 p-3 bg-primary/5 hover:bg-primary/10 text-left transition-colors"
                    >
                      {expandedAreas.has(area.id) ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      <Target className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium">{area.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {area.subDomains.length} sub-domains
                      </Badge>
                    </button>

                    {/* Sub-domains */}
                    {expandedAreas.has(area.id) && (
                      <div className="pl-4 border-l-2 border-primary/20 ml-3">
                        {area.subDomains.map(sd => (
                          <div key={sd.id}>
                            {/* Sub-domain Level */}
                            <button
                              onClick={() => toggleSubDomain(sd.id)}
                              className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 text-left transition-colors"
                            >
                              {expandedSubDomains.has(sd.id) ? (
                                <ChevronDown className="h-3 w-3 shrink-0" />
                              ) : (
                                <ChevronRight className="h-3 w-3 shrink-0" />
                              )}
                              <Boxes className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span className="text-sm">{sd.name}</span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {sd.specialities.length}
                              </Badge>
                            </button>

                            {/* Specialities */}
                            {expandedSubDomains.has(sd.id) && (
                              <div className="pl-6 py-1 space-y-0.5">
                                {sd.specialities.map(sp => (
                                  <div
                                    key={sp.id}
                                    className="flex items-center gap-2 py-1 px-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                                    <span className="text-xs">{sp.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
