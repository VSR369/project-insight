import { useState } from "react";
import { Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { CandidateFilters as CandidateFiltersType, useCandidateFilterOptions } from "@/hooks/queries/useReviewerCandidates";
import type { Enums } from "@/integrations/supabase/types";

type LifecycleStatus = Enums<"lifecycle_status">;
import { STATUS_DISPLAY_NAMES } from "@/constants/lifecycle.constants";

interface CandidateFiltersProps {
  filters: CandidateFiltersType;
  onFiltersChange: (filters: CandidateFiltersType) => void;
}

// Status options mapped to lifecycle statuses
const STATUS_OPTIONS: { value: LifecycleStatus; label: string }[] = [
  { value: "proof_points_min_met", label: "New Submission" },
  { value: "assessment_pending", label: "Assessment Pending" },
  { value: "assessment_in_progress", label: "Assessment In Progress" },
  { value: "assessment_completed", label: "Assessment Completed" },
  { value: "panel_scheduled", label: "Panel Scheduled" },
  { value: "panel_completed", label: "Panel Completed" },
  { value: "verified", label: "Verified" },
  { value: "not_verified", label: "Not Verified" },
];

export function CandidateFiltersPanel({ filters, onFiltersChange }: CandidateFiltersProps) {
  const { data: options, isLoading } = useCandidateFilterOptions();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    status: true,
    category: true,
    expertise: false,
    country: false,
    assessment: false,
    interview: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleStatusChange = (status: LifecycleStatus, checked: boolean) => {
    const current = filters.statuses || [];
    const updated = checked
      ? [...current, status]
      : current.filter(s => s !== status);
    onFiltersChange({ ...filters, statuses: updated.length ? updated : undefined });
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const current = filters.categoryIds || [];
    const updated = checked
      ? [...current, categoryId]
      : current.filter(c => c !== categoryId);
    onFiltersChange({ ...filters, categoryIds: updated.length ? updated : undefined });
  };

  const handleExpertiseChange = (levelId: string, checked: boolean) => {
    const current = filters.expertiseLevelIds || [];
    const updated = checked
      ? [...current, levelId]
      : current.filter(e => e !== levelId);
    onFiltersChange({ ...filters, expertiseLevelIds: updated.length ? updated : undefined });
  };

  const handleCountryChange = (countryId: string, checked: boolean) => {
    const current = filters.countryIds || [];
    const updated = checked
      ? [...current, countryId]
      : current.filter(c => c !== countryId);
    onFiltersChange({ ...filters, countryIds: updated.length ? updated : undefined });
  };

  const handleAssessmentScoreChange = (values: number[]) => {
    onFiltersChange({
      ...filters,
      minAssessmentScore: values[0],
      maxAssessmentScore: values[1],
    });
  };

  const handleInterviewDateChange = (field: "from" | "to", value: string) => {
    onFiltersChange({
      ...filters,
      [field === "from" ? "interviewDateFrom" : "interviewDateTo"]: value || undefined,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = [
    filters.statuses?.length || 0,
    filters.categoryIds?.length || 0,
    filters.expertiseLevelIds?.length || 0,
    filters.countryIds?.length || 0,
    filters.minAssessmentScore !== undefined || filters.maxAssessmentScore !== undefined ? 1 : 0,
    filters.interviewDateFrom || filters.interviewDateTo ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Filter */}
        <Collapsible open={openSections.status} onOpenChange={() => toggleSection("status")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
            Status
            {openSections.status ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {STATUS_OPTIONS.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${option.value}`}
                  checked={filters.statuses?.includes(option.value) || false}
                  onCheckedChange={(checked) => handleStatusChange(option.value, !!checked)}
                />
                <Label htmlFor={`status-${option.value}`} className="text-sm cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Provider Category Filter */}
        <Collapsible open={openSections.category} onOpenChange={() => toggleSection("category")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
            Provider Category
            {openSections.category ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : (
              options?.participationModes.map(mode => (
                <div key={mode.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${mode.id}`}
                    checked={filters.categoryIds?.includes(mode.id) || false}
                    onCheckedChange={(checked) => handleCategoryChange(mode.id, !!checked)}
                  />
                  <Label htmlFor={`category-${mode.id}`} className="text-sm cursor-pointer">
                    {mode.name}
                  </Label>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Expertise Level Filter */}
        <Collapsible open={openSections.expertise} onOpenChange={() => toggleSection("expertise")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
            Expertise Level
            {openSections.expertise ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : (
              options?.expertiseLevels.map(level => (
                <div key={level.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`expertise-${level.id}`}
                    checked={filters.expertiseLevelIds?.includes(level.id) || false}
                    onCheckedChange={(checked) => handleExpertiseChange(level.id, !!checked)}
                  />
                  <Label htmlFor={`expertise-${level.id}`} className="text-sm cursor-pointer">
                    {level.name}
                  </Label>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Country Filter */}
        <Collapsible open={openSections.country} onOpenChange={() => toggleSection("country")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
            Country
            {openSections.country ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2 max-h-48 overflow-y-auto">
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : (
              options?.countries.map(country => (
                <div key={country.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`country-${country.id}`}
                    checked={filters.countryIds?.includes(country.id) || false}
                    onCheckedChange={(checked) => handleCountryChange(country.id, !!checked)}
                  />
                  <Label htmlFor={`country-${country.id}`} className="text-sm cursor-pointer">
                    {country.name}
                  </Label>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Assessment Score Filter */}
        <Collapsible open={openSections.assessment} onOpenChange={() => toggleSection("assessment")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
            Assessment Score
            {openSections.assessment ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 pb-2">
            <div className="space-y-4">
              <Slider
                value={[filters.minAssessmentScore ?? 0, filters.maxAssessmentScore ?? 100]}
                onValueChange={handleAssessmentScoreChange}
                max={100}
                step={5}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{filters.minAssessmentScore ?? 0}%</span>
                <span>{filters.maxAssessmentScore ?? 100}%</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Interview Date Filter */}
        <Collapsible open={openSections.interview} onOpenChange={() => toggleSection("interview")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
            Interview Date
            {openSections.interview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={filters.interviewDateFrom || ""}
                onChange={(e) => handleInterviewDateChange("from", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={filters.interviewDateTo || ""}
                onChange={(e) => handleInterviewDateChange("to", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
