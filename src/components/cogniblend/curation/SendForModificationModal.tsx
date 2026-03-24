/**
 * SendForModificationModal — Rich text comment modal for curator to send
 * modification requests to Legal Coordinator or Finance Controller.
 *
 * Auto-addresses based on section key:
 *  - legal_docs → Legal Coordinator (LC)
 *  - escrow_funding → Finance Controller (FC)
 *
 * Supports pre-filled comments from AI review (initialComment) and stores
 * original AI comments separately for audit (aiOriginalComments).
 */

import React, { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, User } from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SECTION_ADDRESSEE: Record<string, { role: string; label: string }> = {
  legal_docs: { role: "LC", label: "Legal Coordinator" },
  escrow_funding: { role: "FC", label: "Finance Controller" },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SendForModificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  sectionKey: string;
  sectionLabel: string;
  /** Pre-filled comment text (e.g. from edited AI review comments) */
  initialComment?: string;
  /** Original unedited AI comments for audit trail */
  aiOriginalComments?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SendForModificationModal({
  open,
  onOpenChange,
  challengeId,
  sectionKey,
  sectionLabel,
  initialComment,
  aiOriginalComments,
}: SendForModificationModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const addressee = SECTION_ADDRESSEE[sectionKey] ?? { role: "Unknown", label: "Unknown" };

  const [comment, setComment] = useState(initialComment ?? "");
  const [priority, setPriority] = useState<string>("normal");

  // Sync initialComment when modal opens with new pre-filled content
  useEffect(() => {
    if (open && initialComment) {
      setComment(initialComment);
    }
  }, [open, initialComment]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!comment.trim()) throw new Error("Comment is required");

      // Insert curator_section_actions record
      const { error: actionError } = await supabase
        .from("curator_section_actions" as any)
        .insert({
          challenge_id: challengeId,
          section_key: sectionKey,
          action_type: "modification_request",
          status: "sent",
          addressed_to: addressee.role,
          comment_html: comment.trim(),
          ai_original_comments: aiOriginalComments?.trim() || null,
          priority,
          created_by: user.id,
        });
      if (actionError) throw new Error(actionError.message);

      // Also create a notification for the addressee
      const { error: notifError } = await supabase
        .from("cogni_notifications")
        .insert({
          user_id: user.id, // placeholder — in prod this would be the LC/FC user
          notification_type: "modification_request",
          title: `Modification Request: ${sectionLabel}`,
          message: `Curator has requested modifications to "${sectionLabel}" section. Priority: ${priority}.`,
          challenge_id: challengeId,
        });
      if (notifError) {
        console.warn("Failed to create notification:", notifError.message);
      }
    },
    onSuccess: () => {
      toast.success(`Comments sent to ${addressee.label}`);
      queryClient.invalidateQueries({ queryKey: ["curator-section-actions", challengeId] });
      setComment("");
      setPriority("normal");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to send: ${error.message}`);
    },
  });

  const handleSend = useCallback(() => {
    if (!comment.trim()) {
      toast.error("Please enter a comment before sending.");
      return;
    }
    sendMutation.mutate();
  }, [comment, sendMutation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-base">
            Send to {addressee.label}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Send review comments for <span className="font-medium text-foreground">{sectionLabel}</span>
          </p>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
          {/* Auto-addressed To field */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">To</label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{addressee.label}</span>
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {addressee.role}
              </Badge>
            </div>
          </div>

          {/* Section */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Section</label>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <span className="text-sm text-foreground">{sectionLabel}</span>
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Comment — editable, pre-filled with AI comments if provided */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Comments / Instructions
              {initialComment && (
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  (Pre-filled from AI review — edit before sending)
                </span>
              )}
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe what needs to be modified and any specific instructions..."
              rows={5}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sendMutation.isPending || !comment.trim()}
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Send className="h-4 w-4 mr-1.5" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
