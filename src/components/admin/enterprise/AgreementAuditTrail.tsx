/**
 * Audit-trail viewer for an Enterprise agreement.
 */

import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useEnterpriseAgreementAudit } from '@/hooks/queries/useEnterpriseAgreement';

interface Props {
  agreementId: string;
}

export function AgreementAuditTrail({ agreementId }: Props) {
  const { data, isLoading } = useEnterpriseAgreementAudit(agreementId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit entries yet.</p>;
  }

  return (
    <div className="space-y-2">
      {data.map((row) => (
        <div key={row.id} className="rounded-md border border-border p-3 text-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{row.action}</Badge>
              {row.previous_status && row.new_status && (
                <span className="text-muted-foreground text-xs">
                  {row.previous_status} → {row.new_status}
                </span>
              )}
            </div>
            <time className="text-xs text-muted-foreground">
              {format(new Date(row.performed_at), 'PPpp')}
            </time>
          </div>
          {row.notes && <p className="mt-2 text-xs text-muted-foreground">{row.notes}</p>}
          {row.changed_fields && (
            <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-[11px] leading-tight">
              {JSON.stringify(row.changed_fields, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
