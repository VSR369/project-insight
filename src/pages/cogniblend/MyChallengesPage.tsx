/**
 * MyChallengesPage — Lists all challenges where the current user has an active role.
 * Shows status cards with context-appropriate actions per challenge state.
 * Route: /cogni/my-challenges
 */

import { useMemo, useState, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Folder, Eye, Pencil, Trash2, Loader2,
  Clock, CheckCircle2, XCircle, AlertCircle, AlertTriangle, Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useMyChallenges, type MyChallengeItem } from '@/hooks/cogniblend/useMyChallenges';
import { governanceLabel } from '@/lib/cogniblend/displayHelpers';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

/* ── Status helpers ──────────────────────────────────────── */

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  badgeClass: string;
}

function getStatusConfig(masterStatus: string, phase: number, phaseStatus?: string | null, governanceMode?: string): StatusConfig {
  if (phaseStatus === 'CR_APPROVAL_PENDING') {
    return { label: 'Awaiting Your Approval', icon: AlertCircle, badgeClass: 'bg-violet-50 text-violet-700 border-violet-300' };
  }
  if (masterStatus === 'IN_PREPARATION' && phase === 1) {
    return { label: 'Draft', icon: Pencil, badgeClass: 'bg-muted text-muted-foreground border-border' };
  }
  if (masterStatus === 'IN_PREPARATION') {
    if (governanceMode === 'QUICK') {
      return { label: 'Processing', icon: Clock, badgeClass: 'bg-blue-50 text-blue-700 border-blue-300' };
    }
    return { label: 'In Curation', icon: Clock, badgeClass: 'bg-amber-50 text-amber-700 border-amber-300' };
  }
  if (masterStatus === 'ACTIVE') {
    return { label: 'Published', icon: CheckCircle2, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300' };
  }
  if (masterStatus === 'COMPLETED') {
    return { label: 'Completed', icon: CheckCircle2, badgeClass: 'bg-blue-50 text-blue-700 border-blue-300' };
  }
  if (masterStatus === 'CANCELLED' || masterStatus === 'TERMINATED') {
    return { label: masterStatus === 'CANCELLED' ? 'Cancelled' : 'Terminated', icon: XCircle, badgeClass: 'bg-red-50 text-red-700 border-red-300' };
  }
  return { label: masterStatus || 'Unknown', icon: AlertCircle, badgeClass: 'bg-muted text-muted-foreground border-border' };
}

/* governanceLabel imported from displayHelpers */

/* ── Component ──────────────────────────────────────────── */

export default function MyChallengesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: challengesData, isLoading, error: challengesError } = useMyChallenges(user?.id);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  /* ── Grouped data ── */
  const items = challengesData?.items ?? [];

  /* ── Duplicate detection by title ── */
  const duplicateTitles = useMemo(() => {
    const titleCounts = new Map<string, number>();
    for (const c of items) {
      const t = c.title.trim().toLowerCase();
      titleCounts.set(t, (titleCounts.get(t) ?? 0) + 1);
    }
    return new Set([...titleCounts.entries()].filter(([, n]) => n > 1).map(([t]) => t));
  }, [items]);

  const filteredItems = useMemo(() => {
    let list = items;
    if (activeTab === 'drafts') list = list.filter((c) => c.master_status === 'IN_PREPARATION' && c.current_phase === 1);
    else if (activeTab === 'active') list = list.filter((c) => (c.master_status === 'IN_PREPARATION' && c.current_phase > 1) || c.master_status === 'ACTIVE');
    else if (activeTab === 'completed') list = list.filter((c) => c.master_status === 'COMPLETED' || c.master_status === 'CANCELLED' || c.master_status === 'TERMINATED');
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q));
    }
    return list;
  }, [items, activeTab, deferredSearch]);

  const draftCount = items.filter((c) => c.master_status === 'IN_PREPARATION' && c.current_phase === 1).length;
  const activeCount = items.filter((c) => (c.master_status === 'IN_PREPARATION' && c.current_phase > 1) || c.master_status === 'ACTIVE').length;
  const closedCount = items.filter((c) => c.master_status === 'COMPLETED' || c.master_status === 'CANCELLED' || c.master_status === 'TERMINATED').length;

  /* ── Delete draft handler ── */
  const handleDeleteDraft = async () => {
    if (!deleteTarget || !user?.id) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('challenges')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        } as any)
        .eq('id', deleteTarget)
        .eq('created_by', user.id)
        .eq('current_phase', 1);

      if (error) throw new Error(error.message);
      toast.success('Draft deleted');
      queryClient.invalidateQueries({ queryKey: ['cogni-my-challenges'] });
    } catch {
      toast.error('Failed to delete draft');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ── Error ── */
  if (challengesError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
        <AlertCircle className="h-10 w-10 text-destructive/60" />
        <p className="text-sm font-medium text-destructive">Could not load challenges</p>
        <p className="text-xs text-muted-foreground max-w-sm text-center">
          {(challengesError as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Challenges</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} challenge{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" onClick={() => navigate('/cogni/challenges/create')}>
          <Plus className="h-4 w-4 mr-1.5" />
          <span className="hidden lg:inline">New Challenge</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full lg:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search challenges..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-base"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({draftCount})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
          <TabsTrigger value="completed">Closed ({closedCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-3">
          {filteredItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Folder className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No challenges yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Create your first challenge to get started.
                </p>
                <Button size="sm" variant="outline" onClick={() => navigate('/cogni/challenges/create')}>
                  <Plus className="h-4 w-4 mr-1.5" /> Create Challenge
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredItems.map((ch) => (
              <ChallengeCard
                key={ch.challenge_id}
                challenge={ch}
                isDuplicate={duplicateTitles.has(ch.title.trim().toLowerCase())}
                onView={() => navigate(`/cogni/challenges/${ch.challenge_id}/view`)}
                onResume={() => navigate(`/cogni/challenges/create?draft=${ch.challenge_id}`)}
                onDelete={() => setDeleteTarget(ch.challenge_id)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this draft challenge. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDraft} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── ChallengeCard sub-component ──────────────────────────── */

interface ChallengeCardProps {
  challenge: MyChallengeItem;
  isDuplicate?: boolean;
  onView: () => void;
  onResume: () => void;
  onDelete: () => void;
}

function ChallengeCard({ challenge: ch, isDuplicate, onView, onResume, onDelete }: ChallengeCardProps) {
  const isDraft = ch.master_status === 'IN_PREPARATION' && ch.current_phase === 1;
  const isPendingApproval = ch.phase_status === 'CR_APPROVAL_PENDING';
  const governanceMode = (ch.governance_mode_override ?? ch.governance_profile ?? '').toUpperCase();
  const statusConfig = getStatusConfig(ch.master_status, ch.current_phase, ch.phase_status, governanceMode);
  const StatusIcon = statusConfig.icon;

  const formattedDate = ch.created_at
    ? format(new Date(ch.created_at), 'MMM d, yyyy · h:mm a')
    : null;

  return (
    <Card className="border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left: title + badges */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start gap-2">
              <StatusIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
                {ch.title}
              </h3>
            </div>
            {/* Problem excerpt */}
            {ch.problem_statement && (
              <p className="text-xs text-muted-foreground ml-6 line-clamp-1">
                {ch.problem_statement.replace(/<[^>]*>/g, '').substring(0, 140)}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 ml-6">
              <Badge className={`text-[10px] font-semibold border ${statusConfig.badgeClass}`} variant="outline">
                {statusConfig.label}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {governanceLabel(ch.governance_mode_override ?? ch.governance_profile)}
              </Badge>
              {ch.operating_model && (
                <Badge variant="outline" className="text-[10px]">
                  {ch.operating_model === 'MP' ? 'Marketplace' : 'Aggregator'}
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px]">
                Phase {ch.current_phase}
              </Badge>
              {isDuplicate && (
                <Badge variant="destructive" className="text-[10px]">
                  <AlertTriangle className="h-3 w-3 mr-0.5" />
                  Possible duplicate
                </Badge>
              )}
            </div>
            {/* Prize + domain tags */}
            <div className="flex flex-wrap items-center gap-2 ml-6 mt-1">
              {(() => {
                const rs = ch.reward_structure;
                const prize = Number(rs?.platinum_award ?? rs?.budget_max ?? 0);
                const curr = ch.currency_code || (rs?.currency as string) || 'USD';
                return prize > 0 ? (
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {curr} {prize.toLocaleString()}
                  </Badge>
                ) : null;
              })()}
              {ch.domain_tags?.slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{String(tag)}</Badge>
              ))}
            </div>
            {formattedDate && (
              <p className="text-[11px] text-muted-foreground ml-6">
                Created {formattedDate}
              </p>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 ml-6 lg:ml-0 shrink-0">
            {isDraft ? (
              <>
                <Button size="sm" variant="outline" onClick={onResume}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Resume
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : isPendingApproval ? (
              <Button size="sm" onClick={onView} className="bg-violet-600 hover:bg-violet-700 text-white">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Review & Approve
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onView}>
                <Eye className="h-3.5 w-3.5 mr-1" /> View
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
