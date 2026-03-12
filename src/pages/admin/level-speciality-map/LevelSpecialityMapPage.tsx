import * as React from "react";
import { Link2, ChevronRight, Building2, Target, Boxes, Sparkles, Filter, Check, X } from "lucide-react";


import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
import {
  useProficiencyAreasAdmin,
  useSubDomainsAdmin,
  useSpecialitiesAdmin,
} from "@/hooks/queries/useProficiencyTaxonomyAdmin";
import {
  useLevelSpecialityMappings,
  useBulkUpdateMappings,
} from "@/hooks/queries/useLevelSpecialityMap";

export function LevelSpecialityMapPage() {
  // Hierarchy filters
  const [selectedIndustrySegmentId, setSelectedIndustrySegmentId] = React.useState<string>("");
  const [selectedProficiencyAreaId, setSelectedProficiencyAreaId] = React.useState<string>("");
  const [selectedSubDomainId, setSelectedSubDomainId] = React.useState<string>("");
  const [selectedSpecialityId, setSelectedSpecialityId] = React.useState<string>("");

  // Selected expertise levels for mapping
  const [selectedLevelIds, setSelectedLevelIds] = React.useState<string[]>([]);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Queries for hierarchy
  const { data: industrySegments = [] } = useIndustrySegments(false);
  const { data: proficiencyAreas = [] } = useProficiencyAreasAdmin(
    selectedIndustrySegmentId || undefined,
    undefined,
    false
  );
  const { data: subDomains = [] } = useSubDomainsAdmin(
    selectedProficiencyAreaId || undefined,
    false
  );
  const { data: specialities = [] } = useSpecialitiesAdmin(
    selectedSubDomainId || undefined,
    false
  );

  // Expertise levels query
  const { data: expertiseLevels = [], isLoading: levelsLoading } = useExpertiseLevels(false);

  // Current mappings for selected speciality
  const { data: currentMappings = [], isLoading: mappingsLoading } = useLevelSpecialityMappings(
    selectedSpecialityId || undefined
  );

  // Mutation for bulk update
  const bulkUpdateMutation = useBulkUpdateMappings();

  // Reset child selections when parent changes
  React.useEffect(() => {
    setSelectedProficiencyAreaId("");
    setSelectedSubDomainId("");
    setSelectedSpecialityId("");
  }, [selectedIndustrySegmentId]);

  React.useEffect(() => {
    setSelectedSubDomainId("");
    setSelectedSpecialityId("");
  }, [selectedProficiencyAreaId]);

  React.useEffect(() => {
    setSelectedSpecialityId("");
  }, [selectedSubDomainId]);

  // Sync selected levels with current mappings
  React.useEffect(() => {
    if (currentMappings.length >= 0) {
      const mappedLevelIds = currentMappings.map((m) => m.expertise_level_id);
      setSelectedLevelIds(mappedLevelIds);
      setHasChanges(false);
    }
  }, [currentMappings]);

  // Handle level toggle
  const handleLevelToggle = (levelId: string, checked: boolean) => {
    setSelectedLevelIds((prev) => {
      const updated = checked
        ? [...prev, levelId]
        : prev.filter((id) => id !== levelId);
      
      // Check if there are changes from the original
      const originalIds = currentMappings.map((m) => m.expertise_level_id);
      const hasChanged = 
        updated.length !== originalIds.length ||
        updated.some((id) => !originalIds.includes(id)) ||
        originalIds.some((id) => !updated.includes(id));
      
      setHasChanges(hasChanged);
      return updated;
    });
  };

  // Handle save
  const handleSave = async () => {
    if (!selectedSpecialityId) return;

    await bulkUpdateMutation.mutateAsync({
      specialityId: selectedSpecialityId,
      expertiseLevelIds: selectedLevelIds,
    });
    setHasChanges(false);
  };

  // Handle cancel
  const handleCancel = () => {
    const mappedLevelIds = currentMappings.map((m) => m.expertise_level_id);
    setSelectedLevelIds(mappedLevelIds);
    setHasChanges(false);
  };

  // Select/deselect all
  const handleSelectAll = () => {
    const allIds = expertiseLevels.map((l) => l.id);
    setSelectedLevelIds(allIds);
    
    const originalIds = currentMappings.map((m) => m.expertise_level_id);
    const hasChanged = 
      allIds.length !== originalIds.length ||
      allIds.some((id) => !originalIds.includes(id));
    setHasChanges(hasChanged);
  };

  const handleDeselectAll = () => {
    setSelectedLevelIds([]);
    setHasChanges(currentMappings.length > 0);
  };

  // Helpers
  const selectedSegment = industrySegments.find((s) => s.id === selectedIndustrySegmentId);
  const selectedArea = proficiencyAreas.find((a) => a.id === selectedProficiencyAreaId);
  const selectedSubDomain = subDomains.find((sd) => sd.id === selectedSubDomainId);
  const selectedSpeciality = specialities.find((sp) => sp.id === selectedSpecialityId);

  const isLoading = levelsLoading || mappingsLoading;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Level-Speciality Mapping</h1>
        <p className="text-muted-foreground mt-1">Configure which expertise levels apply to each speciality for assessments</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <CardTitle>Level-Speciality Mapping</CardTitle>
            </div>
          </div>
          <CardDescription>
            Select a speciality and configure which expertise levels should be applicable for assessments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hierarchy Filters */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4" />
              Select Speciality
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Industry Segment */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Industry Segment
                </Label>
                <Select
                  value={selectedIndustrySegmentId}
                  onValueChange={setSelectedIndustrySegmentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select segment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {industrySegments.map((segment) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Proficiency Area */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Proficiency Area
                </Label>
                <Select
                  value={selectedProficiencyAreaId}
                  onValueChange={setSelectedProficiencyAreaId}
                  disabled={!selectedIndustrySegmentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area..." />
                  </SelectTrigger>
                  <SelectContent>
                    {proficiencyAreas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sub-domain */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Boxes className="h-3 w-3" />
                  Sub-domain
                </Label>
                <Select
                  value={selectedSubDomainId}
                  onValueChange={setSelectedSubDomainId}
                  disabled={!selectedProficiencyAreaId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-domain..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subDomains.map((sd) => (
                      <SelectItem key={sd.id} value={sd.id}>
                        {sd.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Speciality */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Speciality
                </Label>
                <Select
                  value={selectedSpecialityId}
                  onValueChange={setSelectedSpecialityId}
                  disabled={!selectedSubDomainId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select speciality..." />
                  </SelectTrigger>
                  <SelectContent>
                    {specialities.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Breadcrumb Trail */}
            {selectedSpecialityId && (
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
                <span className="text-xs text-muted-foreground">Selected:</span>
                {selectedSegment && (
                  <Badge variant="outline" className="text-xs">
                    {selectedSegment.name}
                  </Badge>
                )}
                {selectedArea && (
                  <>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">
                      {selectedArea.name}
                    </Badge>
                  </>
                )}
                {selectedSubDomain && (
                  <>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">
                      {selectedSubDomain.name}
                    </Badge>
                  </>
                )}
                {selectedSpeciality && (
                  <>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="default" className="text-xs">
                      {selectedSpeciality.name}
                    </Badge>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Expertise Levels Selection */}
          {selectedSpecialityId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Applicable Expertise Levels</h3>
                  <p className="text-sm text-muted-foreground">
                    Select which expertise levels apply to this speciality
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={isLoading}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAll}
                    disabled={isLoading}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : expertiseLevels.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No expertise levels found. Please add expertise levels first.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {expertiseLevels
                    .sort((a, b) => a.level_number - b.level_number)
                    .map((level) => {
                      const isSelected = selectedLevelIds.includes(level.id);
                      return (
                        <div
                          key={level.id}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => handleLevelToggle(level.id, !isSelected)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleLevelToggle(level.id, checked as boolean)
                              }
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="shrink-0">
                                  Level {level.level_number}
                                </Badge>
                                <span className="font-medium truncate">{level.name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {level.min_years}
                                {level.max_years ? `–${level.max_years}` : "+"} years experience
                              </p>
                              {level.description && (
                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                  {level.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Save/Cancel Actions */}
              {hasChanges && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    {selectedLevelIds.length} level(s) selected
                  </span>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={bulkUpdateMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={bulkUpdateMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {bulkUpdateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <Link2 className="h-4 w-4" />
              <AlertDescription>
                Select an industry segment, proficiency area, sub-domain, and speciality to configure expertise level mappings.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </>
  );
}
