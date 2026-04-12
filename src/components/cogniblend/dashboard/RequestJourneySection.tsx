/**
 * RequestJourneySection — Lifecycle timeline for a selected request.
 * Shows state transitions from audit_trail with phase labels and ownership.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, ChevronDown, ChevronRight, User, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

/** Lightweight row shape for journey display (previously from useMyRequests) */
export interface RequestRow {
  id: string;
  title: string;
  master_status: string;
  operating_model: string | null;
  current_phase: number | null;
  phase_status: string | null;
  created_at: string;
  updated_at: string | null;
  urgency: string;
  architect_name: string | null;
}

/* ── Phase constants ──────────────────────────────── */

const PHASE_LABELS: Record<number, string> = {
  1: 'Intake', 2: 'Spec Review', 3: 'Legal Docs', 4: 'Curation',
  5: 'Approval', 6: 'Publication', 7: 'Submissions', 8: 'Evaluation',
  9: 'Award', 10: 'Escrow', 11: 'Legal Close', 12: 'Payout', 13: 'Archive',
};

const PHASE_OWNER: Record<number, string> = {
  1: 'Challenge Creator (CR)', 2: 'Challenge Creator (CR)', 3: 'Legal Coordinator (LC)', 4: 'Curator (CU)',
  5: 'Curator (CU)', 6: 'Curator (CU)', 7: 'Solution Providers (Open)',
  8: 'Evaluation Reviewer (ER)', 9: 'Curator (CU)', 10: 'Finance Controller (FC)',
  11: 'Legal Coordinator (LC)', 12: 'Finance Controller (FC)', 13: 'Challenge Creator (CR)',
};

const ALL_PHASES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

interface AuditEvent {
  action: string;
  created_at: string;
  phase_from: number | null;
  phase_to: number | null;
  details: any;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function humanizeAction(action: string): string {
  return (action ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Journey for a single request ─────────────────── */

function RequestJourney({ request }: { request: RequestRow }) {
  const [expanded, setExpanded] = useState(false);
  const currentPhase = request.current_phase ?? 1;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['request-journey', request.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_trail')
        .select('action, created_at, phase_from, phase_to, details')
        .eq('challenge_id', request.id)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as AuditEvent[];
    },
    enabled: expanded,
    staleTime: 60_000,
  });

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{request.title}</p>
          <p className="text-xs text-muted-foreground">
            Phase {currentPhase}: {PHASE_LABELS[currentPhase] ?? `Phase ${currentPhase}`}
            <span className="mx-1.5">·</span>
            With: {PHASE_OWNER[currentPhase] ?? 'Unknown'}
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px] shrink-0">
          {request.master_status}
        </Badge>
      </button>

      {/* Expanded: Phase progress + audit timeline */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4 bg-accent/20">
          {/* Phase progress bar */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Lifecycle Progress
            </p>
            <div className="flex gap-0.5">
              {ALL_PHASES.map((phase) => {
                const isCurrent = phase === currentPhase;
                const isCompleted = phase < currentPhase;
                return (
                  <div
                    key={phase}
                    className={cn(
                      'flex-1 h-2 rounded-sm transition-colors',
                      isCompleted && 'bg-primary',
                      isCurrent && 'bg-primary/60 animate-pulse',
                      !isCompleted && !isCurrent && 'bg-muted',
                    )}
                    title={PHASE_LABELS[phase]}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">Intake</span>
              <span className="text-[10px] text-muted-foreground">Archive</span>
            </div>
          </div>

          {/* Current state summary */}
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>Current: <strong className="text-foreground">{PHASE_LABELS[currentPhase]}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>With: <strong className="text-foreground">{PHASE_OWNER[currentPhase] ?? '—'}</strong></span>
            </div>
          </div>

          {/* Audit timeline */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Transition History
            </p>
            {isLoading ? (
              <Skeleton className="h-16 w-full rounded" />
            ) : events.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No transitions recorded yet.</p>
            ) : (
              <div className="relative border-l-2 border-border pl-4 space-y-2.5">
                {events.map((evt, i) => {
                  const phaseInfo = evt.phase_to
                    ? ` → ${PHASE_LABELS[evt.phase_to] ?? `Phase ${evt.phase_to}`}`
                    : '';
                  const owner = evt.phase_to ? PHASE_OWNER[evt.phase_to] : null;

                  return (
                    <div key={i} className="relative">
                      <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                      <p className="text-xs text-foreground font-medium">
                        {humanizeAction(evt.action)}{phaseInfo}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(evt.created_at)}
                        </span>
                        {owner && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {owner}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Section ─────────────────────────────────── */

export function RequestJourneySection({ requests }: { requests: RequestRow[] }) {
  if (requests.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-base lg:text-lg font-bold text-foreground mb-3">
        Request Lifecycle Journey
      </h2>
      <div className="space-y-2">
        {requests.map((req) => (
          <RequestJourney key={req.id} request={req} />
        ))}
      </div>
    </section>
  );
}
