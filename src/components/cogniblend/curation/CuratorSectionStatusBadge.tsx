/**
 * CuratorSectionStatusBadge — Status badge component for CuratorSectionPanel.
 * Extracted to reduce panel file size.
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  Eye,
  ShieldCheck,
  Clock,
} from "lucide-react";
import type { SectionStatus } from "./CuratorSectionPanel";

export function StatusBadge({ status }: { status: SectionStatus }) {
  const badgeBase = "text-[11px] px-2 py-0.5";
  switch (status) {
    case "pass":
      return (
        <Badge className={cn(badgeBase, "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100")}>
          <CheckCircle2 className="h-3 w-3 mr-1" />Reviewed ✓
        </Badge>
      );
    case "warning":
      return (
        <Badge className={cn(badgeBase, "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100")}>
          <AlertTriangle className="h-3 w-3 mr-1" />Warning
        </Badge>
      );
    case "needs_revision":
      return (
        <Badge className={cn(badgeBase, "bg-red-100 text-red-800 border-red-300 hover:bg-red-100")}>
          Needs Revision
        </Badge>
      );
    case "stale":
      return (
        <Badge className={cn(badgeBase, "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100")}>
          <AlertTriangle className="h-3 w-3 mr-1" />Stale — re-review
        </Badge>
      );
    case "view_only":
      return (
        <Badge className={cn(badgeBase, "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100")}>
          <Eye className="h-3 w-3 mr-1" />View Only
        </Badge>
      );
    case "ai_reviewed":
      return (
        <Badge className={cn(badgeBase, "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100")}>
          AI Reviewed
        </Badge>
      );
    case "pending_response":
    case "pending_modification":
      return (
        <Badge className={cn(badgeBase, "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100")}>
          <Clock className="h-3 w-3 mr-1" />Pending Response
        </Badge>
      );
    case "response_received":
      return (
        <Badge className={cn(badgeBase, "bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-100")}>
          Response Received
        </Badge>
      );
    case "accepted":
    case "curator_approved":
      return (
        <Badge className={cn(badgeBase, "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100")}>
          <ShieldCheck className="h-3 w-3 mr-1" />Accepted
        </Badge>
      );
    default:
      return null;
  }
}
