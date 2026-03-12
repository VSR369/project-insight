/**
 * PreviousTeamSuggestion — BR-ASSIGN-002
 * Shows previously assigned team members from same org for quick re-selection
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, UserPlus } from "lucide-react";
import { AvailabilityBadge } from "@/components/admin/marketplace/AvailabilityBadge";
import { useAvailabilityStatuses } from "@/hooks/queries/useAvailabilityStatuses";

interface PreviousTeamSuggestionProps {
  challengeId: string;
  orgId: string;
  roleCode: string;
  excludeMemberIds: string[];
  onSelect: (memberId: string) => void;
}

interface PreviousAssignment {
  pool_member_id: string;
  member_name: string;
  availability_status: string;
}

export function PreviousTeamSuggestion({
  challengeId,
  orgId,
  roleCode,
  excludeMemberIds,
  onSelect,
}: PreviousTeamSuggestionProps) {
  const { data: availStatuses } = useAvailabilityStatuses();

  const { data: previousMembers = [] } = useQuery({
    queryKey: ["previous-team", orgId, roleCode, challengeId],
    queryFn: async () => {
      // Find active assignments from other challenges for the same org and role
      const { data, error } = await supabase
        .from("challenge_role_assignments")
        .select(`
          pool_member_id, role_code,
          platform_provider_pool!challenge_role_assignments_pool_member_id_fkey (
            full_name, availability_status
          ),
          challenges!inner ( organization_id )
        `)
        .eq("role_code", roleCode)
        .eq("status", "active")
        .neq("challenge_id", challengeId)
        .order("assigned_at", { ascending: false })
        .limit(20);

      if (error) return [];

      // Filter by org and deduplicate
      const seen = new Set<string>();
      const result: PreviousAssignment[] = [];

      for (const row of (data ?? []) as any[]) {
        if (row.challenges?.organization_id !== orgId) continue;
        if (seen.has(row.pool_member_id)) continue;
        seen.add(row.pool_member_id);
        result.push({
          pool_member_id: row.pool_member_id,
          member_name: row.platform_provider_pool?.full_name ?? "Unknown",
          availability_status: row.platform_provider_pool?.availability_status ?? "available",
        });
      }

      return result;
    },
    enabled: !!orgId && !!roleCode,
    staleTime: 2 * 60 * 1000,
  });

  const getAvailLabel = (status: string) =>
    availStatuses?.find((s) => s.code === status)?.display_name ?? status;

  // Filter out already-excluded members
  const suggestions = previousMembers.filter(
    (m) => !excludeMemberIds.includes(m.pool_member_id)
  );

  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <History className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-medium text-foreground">Previously Assigned</p>
      </div>
      <div className="space-y-1.5">
        {suggestions.slice(0, 3).map((member) => (
          <div
            key={member.pool_member_id}
            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-background border"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{member.member_name}</p>
              <AvailabilityBadge
                status={member.availability_status}
                label={getAvailLabel(member.availability_status)}
              />
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              disabled={member.availability_status === "fully_booked"}
              onClick={() => onSelect(member.pool_member_id)}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Use
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
