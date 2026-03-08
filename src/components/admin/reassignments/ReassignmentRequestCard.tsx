/**
 * ReassignmentRequestCard — Card for SCR-06-01 inbox
 * Shows org name, tier badge, requesting admin, reason, SLA bar, actions
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, AlertTriangle, Clock } from 'lucide-react';
import { useDeclineReassignment, type ReassignmentRequest } from '@/hooks/queries/useReassignmentRequests';

interface Props {
  request: ReassignmentRequest;
  isPending: boolean;
  onAssign: () => void;
}

function getTierBadge(tier: string | null | undefined) {
  if (!tier || tier === 'NONE') return null;
  const config: Record<string, { label: string; className: string }> = {
    TIER1: { label: '⚠ T1', className: 'bg-amber-100 text-amber-800 border-amber-300' },
    TIER2: { label: '🔴 T2', className: 'bg-red-100 text-red-800 border-red-300' },
    TIER3: { label: '🚨 T3', className: 'bg-red-200 text-red-900 border-red-400' },
  };
  const c = config[tier];
  if (!c) return null;
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}

function CompactSLABar({ slaStartAt, slaDurationSeconds }: { slaStartAt: string | null; slaDurationSeconds: number | null }) {
  if (!slaStartAt || !slaDurationSeconds) return <span className="text-xs text-muted-foreground">No SLA</span>;
  const elapsed = (Date.now() - new Date(slaStartAt).getTime()) / 1000;
  const pct = Math.min((elapsed / slaDurationSeconds) * 100, 100);
  const remaining = slaDurationSeconds - elapsed;
  const remainingDays = Math.max(remaining / 86400, 0).toFixed(1);
  const isBreached = elapsed > slaDurationSeconds;

  return (
    <div className="flex items-center gap-2">
      <div className="w-[120px] h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isBreached ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs ${isBreached ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
        {isBreached ? 'Breached' : `${remainingDays}d left`}
      </span>
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
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => v?.id && navigate(`/admin/verifications/${v.id}`)}
            className="font-semibold text-sm hover:underline text-left"
          >
            {orgName}
          </button>
          {getTierBadge(v?.sla_breach_tier)}
        </div>
        <CompactSLABar
          slaStartAt={v?.sla_start_at ?? null}
          slaDurationSeconds={v?.sla_duration_seconds ?? null}
        />
      </div>

      {/* Requesting admin */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Requested by: <strong className="text-foreground">{request.requesting_admin?.full_name ?? '—'}</strong></span>
        {request.requesting_admin?.availability_status && (
          <Badge variant="outline" className="text-xs">
            {request.requesting_admin.availability_status}
          </Badge>
        )}
      </div>

      {/* Reason */}
      <div className="text-sm">
        <span className="text-muted-foreground">Reason: </span>
        <span>{truncatedReason}</span>
        {request.reason.length > 80 && (
          <button
            onClick={() => setShowFullReason(!showFullReason)}
            className="ml-1 text-primary text-xs hover:underline"
          >
            {showFullReason ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Suggested admin */}
      {request.suggested_admin && (
        <p className="text-xs text-muted-foreground italic">
          Suggested target: {request.suggested_admin.full_name}
        </p>
      )}

      {/* Near-limit warning */}
      {isNearLimit && (
        <div className="flex items-center gap-1.5 rounded bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>This is the last allowed reassignment ({v?.reassignment_count}/3)</span>
        </div>
      )}

      {/* Status for non-pending */}
      {!isPending && (
        <div className="flex items-center gap-2 text-xs">
          <Badge variant={request.status === 'APPROVED' ? 'default' : 'destructive'}>
            {request.status}
          </Badge>
          {request.actioned_at && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
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
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="gap-1.5" onClick={onAssign}>
            Assign <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          {!showDecline ? (
            <Button size="sm" variant="outline" onClick={() => setShowDecline(true)}>
              Decline
            </Button>
          ) : (
            <div className="flex-1 flex items-end gap-2">
              <div className="flex-1">
                <Textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Reason for declining (min 20 chars)..."
                  rows={2}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground mt-0.5">{declineReason.length}/20</p>
              </div>
              <div className="flex gap-1">
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
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowDecline(false); setDeclineReason(''); }}>
                  ✕
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
