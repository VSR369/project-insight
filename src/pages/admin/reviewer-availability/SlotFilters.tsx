import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { SlotFilters as SlotFiltersType } from "@/hooks/queries/useAdminReviewerSlots";

interface SlotFiltersProps {
  filters: SlotFiltersType;
  onFiltersChange: (filters: SlotFiltersType) => void;
  industries: Array<{ id: string; name: string }>;
  levels: Array<{ id: string; name: string }>;
}

export function SlotFilters({
  filters,
  onFiltersChange,
  industries,
  levels,
}: SlotFiltersProps) {
  const [expanded, setExpanded] = useState(true);

  const updateFilter = <K extends keyof SlotFiltersType>(
    key: K,
    value: SlotFiltersType[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      reviewerSearch: "",
      industrySegmentIds: [],
      expertiseLevelIds: [],
      dateFrom: null,
      dateTo: null,
      status: "all",
    });
  };

  const hasActiveFilters =
    filters.reviewerSearch ||
    filters.industrySegmentIds.length > 0 ||
    filters.expertiseLevelIds.length > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.status !== "all";

  const toggleIndustry = (id: string) => {
    const current = filters.industrySegmentIds;
    const updated = current.includes(id)
      ? current.filter((i) => i !== id)
      : [...current, id];
    updateFilter("industrySegmentIds", updated);
  };

  const toggleLevel = (id: string) => {
    const current = filters.expertiseLevelIds;
    const updated = current.includes(id)
      ? current.filter((i) => i !== id)
      : [...current, id];
    updateFilter("expertiseLevelIds", updated);
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">Filters</h3>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          {/* Reviewer Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reviewer name or email..."
              value={filters.reviewerSearch}
              onChange={(e) => updateFilter("reviewerSearch", e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Industry Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-between">
                <span className="truncate">
                  {filters.industrySegmentIds.length > 0
                    ? `${filters.industrySegmentIds.length} selected`
                    : "Industry"}
                </span>
                <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="max-h-60 overflow-y-auto space-y-1">
                {industries.map((industry) => (
                  <button
                    key={industry.id}
                    onClick={() => toggleIndustry(industry.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      filters.industrySegmentIds.includes(industry.id)
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    {industry.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Expertise Level Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-between">
                <span className="truncate">
                  {filters.expertiseLevelIds.length > 0
                    ? `${filters.expertiseLevelIds.length} selected`
                    : "Expertise"}
                </span>
                <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                {levels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => toggleLevel(level.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      filters.expertiseLevelIds.includes(level.id)
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    {level.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Date From */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !filters.dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? format(filters.dateFrom, "MMM d") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom || undefined}
                onSelect={(date) => updateFilter("dateFrom", date || null)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          <Select
            value={filters.status}
            onValueChange={(value) =>
              updateFilter("status", value as SlotFiltersType["status"])
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="held">Held</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
