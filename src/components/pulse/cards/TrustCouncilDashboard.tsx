/**
 * TrustCouncilDashboard - Moderation dashboard for Trust Council members
 * Shows pending flags and allows resolution with transparent reasoning
 */

import { useState } from 'react';
import { Shield, AlertTriangle, Check, X, ChevronRight, Crown, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { 
  usePendingFlags, 
  useTrustCouncil, 
  useIsCouncilMember, 
  useResolveFlag,
  useModerationActions,
  type PulseCardFlag 
} from '@/hooks/queries/usePulseModeration';
import { FLAG_TYPES, MODERATION_ACTIONS } from '@/constants/pulseCards.constants';
import { useCurrentProvider } from '@/hooks/queries/useProvider';

interface ResolveFlagDialogProps {
  flag: PulseCardFlag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ResolveFlagDialog({ flag, open, onOpenChange }: ResolveFlagDialogProps) {
  const [outcome, setOutcome] = useState<'upheld' | 'rejected'>('rejected');
  const [actionType, setActionType] = useState<string>('no_action');
  const [reasoning, setReasoning] = useState('');
  
  const resolveFlag = useResolveFlag();
  
  const handleResolve = () => {
    if (!flag || !reasoning.trim()) return;
    
    resolveFlag.mutate({
      flagId: flag.id,
      outcome,
      reasoning: reasoning.trim(),
      actionType: outcome === 'upheld' ? actionType as keyof typeof MODERATION_ACTIONS : 'no_action',
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setReasoning('');
        setOutcome('rejected');
        setActionType('no_action');
      }
    });
  };

  if (!flag) return null;

  const flagType = FLAG_TYPES[flag.flag_type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Resolve Flag Report
          </DialogTitle>
          <DialogDescription>
            Review and decide on this flagged content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Flag Details */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {flagType?.emoji} {flagType?.label || flag.flag_type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {flag.target_type === 'card' ? 'Card' : 'Layer'} reported
              </span>
            </div>
            {flag.description && (
              <p className="text-sm text-muted-foreground">{flag.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Reported by: {flag.reporter?.first_name} {flag.reporter?.last_name}
            </p>
          </div>

          {/* Outcome Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Decision</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={outcome === 'rejected' ? 'default' : 'outline'}
                onClick={() => setOutcome('rejected')}
                className="justify-start"
              >
                <X className="mr-2 h-4 w-4" />
                Reject Flag
              </Button>
              <Button
                type="button"
                variant={outcome === 'upheld' ? 'destructive' : 'outline'}
                onClick={() => setOutcome('upheld')}
                className="justify-start"
              >
                <Check className="mr-2 h-4 w-4" />
                Uphold Flag
              </Button>
            </div>
          </div>

          {/* Action Type (only if upheld) */}
          {outcome === 'upheld' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Moderation Action</label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MODERATION_ACTIONS).map(([key, action]) => (
                    <SelectItem key={key} value={key}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reasoning (required) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Public Reasoning <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Explain your decision (visible to the community)..."
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This will be publicly visible for transparency.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleResolve}
            disabled={!reasoning.trim() || resolveFlag.isPending}
          >
            {resolveFlag.isPending ? 'Resolving...' : 'Submit Decision'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FlagCard({ flag, onResolve }: { flag: PulseCardFlag; onResolve: () => void }) {
  const flagType = FLAG_TYPES[flag.flag_type];
  
  return (
    <div className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {flagType?.emoji} {flagType?.label || flag.flag_type}
            </Badge>
            <span className="text-xs text-muted-foreground capitalize">
              {flag.target_type}
            </span>
          </div>
          {flag.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {flag.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {format(new Date(flag.created_at), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onResolve}>
        Review
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}

export function TrustCouncilDashboard() {
  const { data: provider } = useCurrentProvider();
  const { isCouncilMember } = useIsCouncilMember(provider?.id);
  const { data: council, isLoading: councilLoading } = useTrustCouncil();
  const { data: pendingFlags, isLoading: flagsLoading } = usePendingFlags();
  const { data: recentActions } = useModerationActions(10);
  
  const [selectedFlag, setSelectedFlag] = useState<PulseCardFlag | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);

  // Access check
  if (!isCouncilMember) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Crown className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Trust Council Access Required</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            You need 1,000+ reputation to join the Trust Council and access moderation tools.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Council Status Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Trust Council Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Active council members this week
              </p>
              {councilLoading ? (
                <Skeleton className="h-6 w-20 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{council?.length || 0}</p>
              )}
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Crown className="h-3 w-3" />
              Council Member
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pending Flags Queue */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Pending Reviews
            </CardTitle>
            {!flagsLoading && pendingFlags && (
              <Badge variant="destructive">
                {pendingFlags.length} pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {flagsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : pendingFlags && pendingFlags.length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              {pendingFlags.map(flag => (
                <FlagCard
                  key={flag.id}
                  flag={flag}
                  onResolve={() => {
                    setSelectedFlag(flag);
                    setResolveDialogOpen(true);
                  }}
                />
              ))}
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Check className="h-10 w-10 text-green-500 mb-3" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground">
                No pending flags to review
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Moderation Actions (Transparency) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5" />
            Recent Decisions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentActions && recentActions.length > 0 ? (
            <ScrollArea className="max-h-[300px]">
              {recentActions.map(action => (
                <div
                  key={action.id}
                  className="flex items-start gap-3 p-4 border-b last:border-b-0"
                >
                  <Badge
                    variant={action.outcome === 'upheld' ? 'destructive' : 'secondary'}
                    className="mt-0.5"
                  >
                    {action.outcome}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">{action.reasoning}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(action.created_at), 'MMM d, yyyy')} • 
                      {MODERATION_ACTIONS[action.action_type]?.label || action.action_type}
                    </p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No recent moderation actions
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Flag Dialog */}
      <ResolveFlagDialog
        flag={selectedFlag}
        open={resolveDialogOpen}
        onOpenChange={setResolveDialogOpen}
      />
    </div>
  );
}
