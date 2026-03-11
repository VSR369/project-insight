/**
 * TeamCompletionReminder — Top-level reminder for stale incomplete assignments (>24h)
 * BRD Ref: BR-MP-ASSIGN-001, MOD-02
 */

import { useNavigate } from "react-router-dom";
import { Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SolutionRequestRow } from "@/hooks/queries/useSolutionRequests";

interface TeamCompletionReminderProps {
  requests: SolutionRequestRow[];
}

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export function TeamCompletionReminder({ requests }: TeamCompletionReminderProps) {
  const navigate = useNavigate();

  const now = Date.now();
  const staleIncomplete = requests.filter((r) => {
    if (r.team.isComplete || r.team.total === 0) return false;
    const age = now - new Date(r.created_at).getTime();
    return age > STALE_THRESHOLD_MS;
  });

  if (staleIncomplete.length === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
              {staleIncomplete.length} challenge{staleIncomplete.length > 1 ? "s" : ""} with incomplete team assignments
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              Complete expert reviewer assignments to unblock progress.
            </p>
            <div className="mt-3 space-y-2">
              {staleIncomplete.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 p-2 rounded-md bg-amber-100/50 dark:bg-amber-900/20"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground">{r.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({r.team.missingRoles.map((m) => `${m.required - m.assigned}× ${m.displayName || m.role}`).join(", ")} missing)
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs shrink-0"
                    onClick={() => navigate(`/admin/marketplace/assignment-history?challenge=${r.id}`)}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Complete Assignment
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
