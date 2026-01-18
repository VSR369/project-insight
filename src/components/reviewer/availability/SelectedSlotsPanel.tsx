/**
 * Selected Slots Panel Component
 * 
 * Displays draft and existing slots with options to remove them.
 */

import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  formatSlotDate,
  formatTime,
  formatSlotTimeRange,
  isSlotInPast,
  type DraftSlot,
} from "@/services/availabilityService";
import type { InterviewSlot } from "@/hooks/queries/useReviewerAvailability";

interface SelectedSlotsPanelProps {
  draftSlots: DraftSlot[];
  existingSlots: InterviewSlot[];
  onRemoveDraft: (key: string) => void;
  onDeleteExisting: (slotId: string) => void;
  onClearAllDrafts: () => void;
  onConfirmSelection: () => void;
  isSubmitting: boolean;
}

export function SelectedSlotsPanel({
  draftSlots,
  existingSlots,
  onRemoveDraft,
  onDeleteExisting,
  onClearAllDrafts,
  onConfirmSelection,
  isSubmitting,
}: SelectedSlotsPanelProps) {
  const openSlots = existingSlots.filter(
    (slot) => slot.status === 'open' && !isSlotInPast(new Date(slot.start_at))
  );
  const bookedSlots = existingSlots.filter(
    (slot) => slot.status === 'booked' || slot.status === 'held'
  );

  const hasNoDrafts = draftSlots.length === 0;

  return (
    <div className="bg-card border rounded-lg p-4 flex flex-col h-full">
      <h3 className="font-medium mb-4">Your Selection</h3>

      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="space-y-4">
          {/* Draft Slots Section */}
          {draftSlots.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Pending</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {draftSlots.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {draftSlots.map((slot) => {
                  const endMinute = slot.startMinute + slot.durationMinutes;
                  const endHour = slot.startHour + Math.floor(endMinute / 60);
                  const endMin = endMinute % 60;
                  
                  return (
                    <div
                      key={slot.key}
                      className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md"
                    >
                      <div className="text-sm">
                        <div className="font-medium">{formatSlotDate(slot.date)}</div>
                        <div className="text-muted-foreground">
                          {formatTime(slot.startHour, slot.startMinute)} -{' '}
                          {formatTime(endHour, endMin)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoveDraft(slot.key)}
                        aria-label="Remove slot"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Open Slots Section */}
          {openSlots.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Open Slots</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {openSlots.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {openSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md"
                  >
                    <div className="text-sm">
                      <div className="font-medium">
                        {formatSlotDate(new Date(slot.start_at))}
                      </div>
                      <div className="text-muted-foreground">
                        {formatSlotTimeRange(
                          new Date(slot.start_at),
                          new Date(slot.end_at)
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDeleteExisting(slot.id)}
                      aria-label="Delete slot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Booked Slots Section (Read-only) */}
          {bookedSlots.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Booked</span>
                <Badge variant="secondary">
                  {bookedSlots.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {bookedSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-2 bg-muted/50 border rounded-md opacity-60"
                  >
                    <div className="text-sm">
                      <div className="font-medium">
                        {formatSlotDate(new Date(slot.start_at))}
                      </div>
                      <div className="text-muted-foreground">
                        {formatSlotTimeRange(
                          new Date(slot.start_at),
                          new Date(slot.end_at)
                        )}
                      </div>
                    </div>
                    <Badge variant="outline">Booked</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {draftSlots.length === 0 && openSlots.length === 0 && bookedSlots.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No slots selected</p>
              <p className="text-xs mt-1">
                Click a date and add time slots to set your availability
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Action Buttons */}
      <div className="space-y-2 mt-4 pt-4 border-t">
        <Button
          onClick={onConfirmSelection}
          disabled={hasNoDrafts || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Saving...' : 'Confirm Selection'}
        </Button>
        <Button
          variant="outline"
          onClick={onClearAllDrafts}
          disabled={hasNoDrafts || isSubmitting}
          className="w-full"
        >
          Clear All Drafts
        </Button>
      </div>
    </div>
  );
}
