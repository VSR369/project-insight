/**
 * ChallengeManagePage — /cogni/challenges/:id/manage
 *
 * Post-publication management view with:
 *   Card 1 — Submission Tracker (count, countdown, anonymous listing)
 *   Card 2 — Challenge Package (version history + read-only snapshot modal)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertTriangle, FileText,
  Clock, Users, Package, Eye, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useManageChallenge, PackageVersion } from '@/hooks/cogniblend/useManageChallenge';
import { useAuth } from '@/hooks/useAuth';
import { ExtendDeadlineModal } from '@/components/cogniblend/manage/ExtendDeadlineModal';
import { AmendmentCard } from '@/components/cogniblend/manage/AmendmentCard';
import { QAManagementCard } from '@/components/cogniblend/manage/QAManagementCard';
import { DuplicateReviewPanel } from '@/components/cogniblend/DuplicateReviewPanel';
import { format } from 'date-fns';

/* ─── Countdown helper ───────────────────────────────────── */

function useCountdown(deadline: string | null) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!deadline) {
      setRemaining('No deadline set');
      return;
    }

    const tick = () => {
      const now = Date.now();
      const end = new Date(deadline).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setRemaining('Deadline passed');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setRemaining(`${days}d ${hours}h ${minutes}m remaining`);
    };

    tick();
    const interval = setInterval(tick, 60_000); // update every minute
    return () => clearInterval(interval);
  }, [deadline]);

  return remaining;
}

/* ─── Status colour map ──────────────────────────────────── */

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-[hsl(210,60%,95%)] text-[hsl(210,68%,40%)]',
  under_review: 'bg-[hsl(38,60%,92%)] text-[hsl(38,68%,35%)]',
  accepted: 'bg-[hsl(155,40%,93%)] text-[hsl(155,68%,30%)]',
  rejected: 'bg-[hsl(1,50%,93%)] text-[hsl(1,60%,45%)]',
};

/* ─── Page ───────────────────────────────────────────────── */

export default function ChallengeManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading, error } = useManageChallenge(id, user?.id);

  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);
  const [activeSnapshot, setActiveSnapshot] = useState<PackageVersion | null>(null);
  const [extendModalOpen, setExtendModalOpen] = useState(false);

  const countdown = useCountdown(data?.submissionDeadline ?? null);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Failed to load challenge data.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Go Back
        </Button>
      </div>
    );
  }

  /* ── Handlers ── */
  const openSnapshot = (v: PackageVersion) => {
    setActiveSnapshot(v);
    setSnapshotModalOpen(true);
  };

  /* ── Render ── */
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8 space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/cogni/portfolio')} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" /> Portfolio
      </Button>

      {/* Title + Status */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
        <h1 className="text-lg lg:text-xl font-bold text-foreground leading-tight">
          {data.title}
        </h1>
        <Badge className="w-fit bg-[hsl(155,50%,42%)] hover:bg-[hsl(155,50%,38%)] text-white text-[11px]">
          {data.masterStatus}
        </Badge>
      </div>

      {/* ──────────────── Duplicate Review Panel ──────────────── */}
      {id && <DuplicateReviewPanel challengeId={id} />}

      {/* ──────────────── CARD 1 — Submission Tracker ──────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Users className="h-4.5 w-4.5 text-primary" />
            Submissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Counter + Countdown */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-6">
            <div>
              <span className="text-3xl lg:text-4xl font-extrabold text-foreground">
                {data.submissionCount}
              </span>
              <span className="ml-2 text-sm text-muted-foreground">abstracts received</span>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{countdown}</span>
            </div>
          </div>

          {/* Extend Deadline (ID only) */}
          {data.canExtendDeadline && (
            <Button
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary/10"
              onClick={() => setExtendModalOpen(true)}
            >
              Extend Deadline
            </Button>
          )}

          <Separator />

          {/* Submission list */}
          {data.submissions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              No submissions yet. Solvers can submit until the deadline.
            </p>
          ) : (
            <div className="relative w-full overflow-auto">
              <table className="w-full text-left text-xs lg:text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 pr-4 font-semibold text-muted-foreground">Solver</th>
                    <th className="pb-2 pr-4 font-semibold text-muted-foreground">Date</th>
                    <th className="pb-2 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.submissions.map((s) => {
                    const statusKey = s.status.toLowerCase().replace(/\s+/g, '_');
                    const style = STATUS_STYLE[statusKey] ?? STATUS_STYLE.draft;
                    return (
                      <tr key={s.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 font-medium text-foreground">
                          {data.governanceProfile !== 'LIGHTWEIGHT' ? (
                            <span className="flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                              {s.solverLabel}
                            </span>
                          ) : (
                            s.solverLabel
                          )}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {format(new Date(s.submittedAt), 'dd MMM yyyy')}
                        </td>
                        <td className="py-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] lg:text-xs font-medium capitalize ${style}`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data.governanceProfile !== 'LIGHTWEIGHT' && data.submissions.length > 0 && (
            <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Solver identities anonymised until evaluation phase.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ──────────────── CARD 2 — Challenge Package ──────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Package className="h-4.5 w-4.5 text-primary" />
            Published Version
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.packageVersions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No package versions found.</p>
          ) : (
            <>
              {/* Current version headline */}
              {(() => {
                const latest = data.packageVersions[data.packageVersions.length - 1];
                return (
                  <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                    <span className="text-sm font-semibold text-foreground">
                      Version {latest.versionNumber}.0
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Published {format(new Date(latest.createdAt), 'dd MMM yyyy, HH:mm')}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit gap-1.5 border-primary text-primary hover:bg-primary/10"
                      onClick={() => openSnapshot(latest)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Package
                    </Button>
                  </div>
                );
              })()}

              {/* Version history table (show if >1 version) */}
              {data.packageVersions.length > 1 && (
                <>
                  <Separator />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Version History
                  </h3>
                  <div className="relative w-full overflow-auto">
                    <table className="w-full text-left text-xs lg:text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-2 pr-4 font-semibold text-muted-foreground">Version</th>
                          <th className="pb-2 pr-4 font-semibold text-muted-foreground">Date</th>
                          <th className="pb-2 pr-4 font-semibold text-muted-foreground">Changes</th>
                          <th className="pb-2 font-semibold text-muted-foreground" />
                        </tr>
                      </thead>
                      <tbody>
                        {data.packageVersions.map((v) => (
                          <tr key={v.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2 pr-4 font-medium text-foreground">
                              v{v.versionNumber}.0
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">
                              {format(new Date(v.createdAt), 'dd MMM yyyy')}
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground max-w-[200px] truncate">
                              {v.changeSummary ?? '—'}
                            </td>
                            <td className="py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-primary"
                                onClick={() => openSnapshot(v)}
                              >
                                <FileText className="h-3 w-3" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ──────────────── CARD 3 — Amendments ──────────────── */}
      <AmendmentCard
        challengeId={data.challengeId}
        challengeTitle={data.title}
        userId={user?.id ?? ''}
        canInitiate={data.canExtendDeadline}
      />

      {/* ──────────────── CARD 4 — Q&A Management ──────────────── */}
      <QAManagementCard
        challengeId={data.challengeId}
        challengeTitle={data.title}
        userId={user?.id ?? ''}
        governanceProfile={data.governanceProfile}
      />

      {/* ──────────────── Snapshot Modal ──────────────── */}
      <Dialog open={snapshotModalOpen} onOpenChange={setSnapshotModalOpen}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base font-bold">
              Challenge Package — v{activeSnapshot?.versionNumber ?? 1}.0
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4">
              {activeSnapshot?.snapshot ? (
                <pre className="text-xs leading-relaxed font-mono whitespace-pre-wrap break-words text-muted-foreground bg-muted/50 rounded-lg p-4">
                  {JSON.stringify(activeSnapshot.snapshot, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground italic">No snapshot data available.</p>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="shrink-0">
            <Button variant="outline" size="sm" onClick={() => setSnapshotModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──────────────── Extend Deadline Modal ──────────────── */}
      <ExtendDeadlineModal
        open={extendModalOpen}
        onOpenChange={setExtendModalOpen}
        challengeId={data.challengeId}
        challengeTitle={data.title}
        currentDeadline={data.submissionDeadline}
        userId={user?.id ?? ''}
      />
    </div>
  );
}
