/**
 * Time Slot Selector Component
 * 
 * Allows reviewers to select time and duration for new availability slots.
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  QUICK_TIME_PRESETS,
  DURATION_OPTIONS,
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  generateSlotKey,
  formatSlotDate,
  type DraftSlot,
} from "@/services/availabilityService";

interface TimeSlotSelectorProps {
  selectedDate: Date | null;
  onAddSlot: (slot: DraftSlot) => void;
  existingDraftKeys: Set<string>;
}

export function TimeSlotSelector({
  selectedDate,
  onAddSlot,
  existingDraftKeys,
}: TimeSlotSelectorProps) {
  const [hour, setHour] = useState<number>(9);
  const [minute, setMinute] = useState<number>(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [duration, setDuration] = useState<number>(60);

  const get24Hour = (h: number, p: 'AM' | 'PM'): number => {
    if (p === 'AM') {
      return h === 12 ? 0 : h;
    }
    return h === 12 ? 12 : h + 12;
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

      {/* Add Button */}
      <Button
        onClick={handleAddSlot}
        disabled={isAddDisabled}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Time Slot
      </Button>

      {isAddDisabled && (
        <p className="text-xs text-muted-foreground text-center">
          Select a date on the calendar to add slots
        </p>
      )}
    </div>
  );
}
