import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Banknote } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { useEscrowFundingContext } from '@/hooks/cogniblend/useEscrowFundingContext';
import { isControlledMode } from '@/lib/governanceMode';

interface RecommendedEscrowCardProps {
  challengeId: string;
}

export function RecommendedEscrowCard({ challengeId }: RecommendedEscrowCardProps) {
  const contextQuery = useEscrowFundingContext(challengeId);

  if (contextQuery.isLoading) {
    return <Card><CardContent className="py-4"><Skeleton className="mb-2 h-5 w-1/3" /><Skeleton className="h-20 w-full" /></CardContent></Card>;
  }

  const context = contextQuery.data;
  if (!context) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Banknote className="h-4 w-4 text-primary" />
          Escrow Schedule Context
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">Source: reward milestones</Badge>
          <GovernanceProfileBadge profile={context.governanceMode ?? 'STRUCTURED'} compact />
          <Badge variant={isControlledMode(context.governanceMode ?? 'STRUCTURED') ? 'default' : 'outline'} className="text-[10px]">
            Escrow {isControlledMode(context.governanceMode ?? 'STRUCTURED') ? 'Mandatory' : 'Optional'}
          </Badge>
        </div>
        <div className="space-y-2 rounded-md border border-border bg-background/60 p-3">
          {context.normalizedSchedule.map((item) => (
            <div key={item.installmentNumber} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{item.scheduleLabel}</p>
                <p className="text-xs text-muted-foreground">{item.triggerEvent}</p>
              </div>
              <span className="font-mono">{item.currency} {item.scheduledAmount.toLocaleString()} · {item.scheduledPct}%</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 text-sm lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Total scheduled</p>
            <p className="font-mono font-semibold">{context.currency} {context.aggregate.totalScheduled.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Funded installments</p>
            <p className="font-medium">{context.aggregate.fundedCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending installments</p>
            <p className="font-medium">{context.aggregate.pendingCount}</p>
          </div>
        </div>
        {context.creatorEscrowComments ? <p className="text-sm whitespace-pre-line">{context.creatorEscrowComments}</p> : null}
        {context.escrowNotes ? <p className="text-sm whitespace-pre-line text-muted-foreground">{context.escrowNotes}</p> : null}
      </CardContent>
    </Card>
  );
}

export default RecommendedEscrowCard;
