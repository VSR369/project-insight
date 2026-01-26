/**
 * Time Slot Selector Component
 * 
 * Allows reviewers to select time, duration, and industry/expertise scope
 * for new availability slots.
 */

import { useState } from "react";
import { Plus, Briefcase, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  QUICK_TIME_PRESETS,
  DURATION_OPTIONS,
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  generateSlotKey,
  formatSlotDate,
  type DraftSlot,
} from "@/services/availabilityService";
import { useIndustrySegments, useExpertiseLevels } from "@/hooks/queries/useMasterData";

interface TimeSlotSelectorProps {
  selectedDate: Date | null;
  onAddSlot: (slot: DraftSlot) => void;
  existingDraftKeys: Set<string>;
  /** Reviewer's assigned industry segment IDs - only these are selectable */
  reviewerIndustryIds: string[];
  /** Reviewer's assigned expertise level IDs - only these are selectable */
  reviewerExpertiseIds: string[];
}

export function TimeSlotSelector({
  selectedDate,
  onAddSlot,
  existingDraftKeys,
  reviewerIndustryIds,
  reviewerExpertiseIds,
}: TimeSlotSelectorProps) {
  const [hour, setHour] = useState<number>(9);
  const [minute, setMinute] = useState<number>(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [duration, setDuration] = useState<number>(60);
  
  // Selected industry and expertise IDs for this slot
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<string[]>([]);
  const [selectedExpertiseIds, setSelectedExpertiseIds] = useState<string[]>([]);

  // Fetch master data
  const { data: allIndustries = [] } = useIndustrySegments();
  const { data: allLevels = [] } = useExpertiseLevels();

  // Filter to only reviewer's assigned industries/levels
  const availableIndustries = allIndustries.filter(ind => 
    reviewerIndustryIds.includes(ind.id)
  );
  const availableLevels = allLevels
    .filter(level => reviewerExpertiseIds.includes(level.id))
    .sort((a, b) => a.level_number - b.level_number);

  const get24Hour = (h: number, p: 'AM' | 'PM'): number => {
    if (p === 'AM') {
      return h === 12 ? 0 : h;
    }
    return h === 12 ? 12 : h + 12;
  };

  const handleIndustryToggle = (industryId: string) => {
    setSelectedIndustryIds(prev => 
      prev.includes(industryId)
        ? prev.filter(id => id !== industryId)
        : [...prev, industryId]
    );
  };

  const handleExpertiseToggle = (levelId: string) => {
    setSelectedExpertiseIds(prev => 
      prev.includes(levelId)
        ? prev.filter(id => id !== levelId)
        : [...prev, levelId]
    );
  };

  const handleSelectAllIndustries = () => {
    if (selectedIndustryIds.length === availableIndustries.length) {
      setSelectedIndustryIds([]);
    } else {
      setSelectedIndustryIds(availableIndustries.map(ind => ind.id));
    }
  };

  const handleSelectAllExpertise = () => {
    if (selectedExpertiseIds.length === availableLevels.length) {
      setSelectedExpertiseIds([]);
    } else {
      setSelectedExpertiseIds(availableLevels.map(level => level.id));
    }
  };

  const handleAddSlot = () => {
    if (!selectedDate) return;

    const startHour = get24Hour(hour, period);
    const key = generateSlotKey(selectedDate, startHour, minute);

    if (existingDraftKeys.has(key)) {
      return; // Already exists
    }

    const newSlot: DraftSlot = {
      date: new Date(selectedDate),
      startHour,
      startMinute: minute,
      durationMinutes: duration,
      key,
      industrySegmentIds: selectedIndustryIds,
      expertiseLevelIds: selectedExpertiseIds,
    };

    onAddSlot(newSlot);
  };

  const handlePresetClick = (preset: typeof QUICK_TIME_PRESETS[number]) => {
    const h = preset.hour > 12 ? preset.hour - 12 : preset.hour;
    const p: 'AM' | 'PM' = preset.hour >= 12 ? 'PM' : 'AM';
    setHour(h === 0 ? 12 : h);
    setMinute(preset.minute);
    setPeriod(p);
  };

  const isAddDisabled = !selectedDate;
  const allIndustriesSelected = selectedIndustryIds.length === availableIndustries.length && availableIndustries.length > 0;
  const allExpertiseSelected = selectedExpertiseIds.length === availableLevels.length && availableLevels.length > 0;

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <h3 className="font-medium">Add Availability</h3>

      {/* Selected Date Display */}
      <div className="text-sm">
        <span className="text-muted-foreground">Selected Date: </span>
        <span className="font-medium">
          {selectedDate ? formatSlotDate(selectedDate) : 'None selected'}
        </span>
      </div>

      {/* Time Selection */}
      <div className="space-y-3">
        <Label>Start Time</Label>
        <div className="flex gap-2">
          <Select
            value={hour.toString()}
            onValueChange={(v) => setHour(parseInt(v))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOUR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={minute.toString()}
            onValueChange={(v) => setMinute(parseInt(v))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MINUTE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as 'AM' | 'PM')}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Duration Selection */}
      <div className="space-y-3">
        <Label>Duration</Label>
        <Select
          value={duration.toString()}
          onValueChange={(v) => setDuration(parseInt(v))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Quick Presets</Label>
        <div className="flex flex-wrap gap-2">
          {QUICK_TIME_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => handlePresetClick(preset)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Industry Segment Selection */}
      {availableIndustries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Industry Segments
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleSelectAllIndustries}
            >
              {allIndustriesSelected ? 'Clear All' : 'Select All'}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
            {availableIndustries.map((industry) => (
              <label
                key={industry.id}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
              >
                <Checkbox
                  checked={selectedIndustryIds.includes(industry.id)}
                  onCheckedChange={() => handleIndustryToggle(industry.id)}
                />
                <span>{industry.name}</span>
              </label>
            ))}
          </div>
          {selectedIndustryIds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No selection = available for all your industries
            </p>
          )}
        </div>
      )}

      {/* Expertise Level Selection */}
      {availableLevels.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              Expertise Levels
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleSelectAllExpertise}
            >
              {allExpertiseSelected ? 'Clear All' : 'Select All'}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
            {availableLevels.map((level) => (
              <label
                key={level.id}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
              >
                <Checkbox
                  checked={selectedExpertiseIds.includes(level.id)}
                  onCheckedChange={() => handleExpertiseToggle(level.id)}
                />
                <span>L{level.level_number}: {level.name}</span>
              </label>
            ))}
          </div>
          {selectedExpertiseIds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No selection = available for all your expertise levels
            </p>
          )}
        </div>
      )}

      {/* Add Button with Tooltip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">
              <Button
                onClick={handleAddSlot}
                disabled={isAddDisabled}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Time Slot
              </Button>
            </div>
          </TooltipTrigger>
          {isAddDisabled && (
            <TooltipContent>
              <p>Select a date on the calendar first</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
