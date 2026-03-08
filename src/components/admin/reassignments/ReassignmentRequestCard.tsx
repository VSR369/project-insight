/**
 * ReassignmentRequestCard — Card for SCR-06-01 inbox
 * Shows org name, tier badge, admin + status, reason, SLA bar, actions
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { AdminStatusBadge } from '@/components/admin/platform-admins/AdminStatusBadge';
import { useDeclineReassignment, type ReassignmentRequest } from '@/hooks/queries/useReassignmentRequests';

interface Props {
  request: ReassignmentRequest;
  isPending: boolean;
  onAssign: () => void;
}

function getTierBadge(tier: string | null | undefined) {
  if (!tier || tier === 'NONE') return null;
  const config: Record<string, { label: string; className: string }> = {
    TIER1: { label: '▲ T1', className: 'bg-amber-500 text-white border-amber-600' },
    TIER2: { label: '▲ T2', className: 'bg-red-600 text-white border-red-700' },
    TIER3: { label: '▲ T3', className: 'bg-red-800 text-white border-red-900' },
  };
  const c = config[tier];
  if (!c) return null;
  return <Badge className={c.className}>{c.label}</Badge>;
}

function FullWidthSLABar({ slaStartAt, slaDurationSeconds }: { slaStartAt: string | null; slaDurationSeconds: number | null }) {
  if (!slaStartAt || !slaDurationSeconds) return <span className="text-xs text-muted-foreground">No SLA</span>;
  const elapsed = (Date.now() - new Date(slaStartAt).getTime()) / 1000;
  const pct = Math.min((elapsed / slaDurationSeconds) * 100, 100);
  const remaining = slaDurationSeconds - elapsed;
  const isBreached = elapsed > slaDurationSeconds;

  let timeText: string;
  if (isBreached) {
    const hoursAgo = Math.max(Math.round((elapsed - slaDurationSeconds) / 3600), 1);
    timeText = `Breached ${hoursAgo}h ago`;
  } else {
    const remainingDays = Math.max(remaining / 86400, 0).toFixed(1);
    timeText = `${remainingDays}d left`;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={isBreached ? 'text-destructive font-medium' : 'text-muted-foreground'}>
          {timeText}
        </span>
        <span className="text-muted-foreground">{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isBreached ? 'bg-destructive' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ReassignmentRequestCard({ request, isPending, onAssign }: Props) {
  const navigate = useNavigate();
  const [showFullReason, setShowFullReason] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const declineMutation = useDeclineReassignment();

  const v = request.verification;
  const orgName = v?.organization?.organization_name ?? 'Unknown';
  const truncatedReason = request.reason.length > 80 && !showFullReason
    ? request.reason.slice(0, 80) + '…'
    : request.reason;

  const isNearLimit = (v?.reassignment_count ?? 0) >= 2;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header: Org name + tier badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => v?.id && navigate(`/admin/verifications/${v.id}`)}
          className="text-lg font-bold hover:underline text-left"
        >
          {orgName}
        </button>
        {getTierBadge(v?.sla_breach_tier)}
      </div>

      {/* Admin name · status badge */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{request.requesting_admin?.full_name ?? '—'}</span>
        {request.requesting_admin?.availability_status && (
          <>
            <span className="text-muted-foreground">·</span>
            <AdminStatusBadge status={request.requesting_admin.availability_status} />
          </>
        )}
      </div>

      {/* Reason */}
      <div className="text-sm text-muted-foreground italic">
        <span>{truncatedReason}</span>
        {request.reason.length > 80 && (
          <button
            onClick={() => setShowFullReason(!showFullReason)}
            className="ml-1 text-primary text-xs hover:underline not-italic"
          >
            {showFullReason ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Suggested admin */}
      {request.suggested_admin && (
        <p className="text-xs text-muted-foreground">
          Suggested target: {request.suggested_admin.full_name}
        </p>
      )}

      {/* SLA bar — full width */}
      <FullWidthSLABar
        slaStartAt={v?.sla_start_at ?? null}
        slaDurationSeconds={v?.sla_duration_seconds ?? null}
      />

      {/* Near-limit warning */}
      {isNearLimit && (
        <div className="flex items-center gap-1.5 rounded bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>Last allowed reassignment after this, Supervisor override required.</span>
        </div>
      )}

      {/* Status for non-pending */}
      {!isPending && (
        <div className="flex items-center gap-2 text-xs">
          <Badge variant={request.status === 'APPROVED' ? 'default' : 'destructive'}>
            {request.status}
          </Badge>
          {request.actioned_at && (
            <span className="text-muted-foreground">
              {new Date(request.actioned_at).toLocaleDateString()}
            </span>
          )}
          {request.decline_reason && (
            <span className="text-muted-foreground">— {request.decline_reason}</span>
          )}
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onAssign}>
              Assign →
            </Button>
            {!showDecline && (
              <Button size="sm" variant="outline" onClick={() => setShowDecline(true)}>
                Decline
              </Button>
            )}
          </div>

          {showDecline && (
            <div className="space-y-2">
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Decline reason (required)"
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">{declineReason.length}/20 characters minimum</p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={declineReason.trim().length < 20 || declineMutation.isPending}
                  onClick={() => {
                    declineMutation.mutate(
                      { requestId: request.id, declineReason: declineReason.trim() },
                      { onSuccess: () => { setShowDecline(false); setDeclineReason(''); } },
                    );
                  }}
                >
                  Confirm Decline
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowDecline(false); setDeclineReason(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
