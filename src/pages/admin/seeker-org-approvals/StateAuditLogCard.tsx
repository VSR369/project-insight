import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface StateAuditEntry {
  id: string;
  previous_status: string;
  new_status: string;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
}

function useOrgStateAuditLog(orgId: string) {
  return useQuery({
    queryKey: ['org-state-audit', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_state_audit_log')
        .select('id, previous_status, new_status, changed_by, change_reason, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as StateAuditEntry[];
    },
    staleTime: 30 * 1000,
  });
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  payment_submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  under_verification: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  verified: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  returned_for_correction: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function StatusBadge({ status }: { status: string }) {
  const colorClass = statusColors[status] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

interface StateAuditLogCardProps {
  orgId: string;
}

export function StateAuditLogCard({ orgId }: StateAuditLogCardProps) {
  const { data: entries, isLoading } = useOrgStateAuditLog(orgId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Status History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading audit log…</p>
        ) : !entries || entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No status transitions recorded yet.</p>
        ) : (
          <div className="relative space-y-0">
            {entries.map((entry, idx) => (
              <div key={entry.id} className="flex items-start gap-3 pb-4 last:pb-0">
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  {idx < entries.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-1" />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={entry.previous_status} />
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <StatusBadge status={entry.new_status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                  {entry.change_reason && (
                    <p className="text-xs text-muted-foreground mt-0.5">Reason: {entry.change_reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
