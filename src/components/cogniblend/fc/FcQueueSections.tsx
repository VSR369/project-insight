import { format } from 'date-fns';
import { ArrowRight, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { FcQueueItem } from '@/hooks/cogniblend/useFcChallengeQueue';

interface FcQueueSectionsProps {
  awaitingItems: FcQueueItem[];
  upcomingItems: FcQueueItem[];
  onOpenChallenge: (challengeId: string) => void;
}

function FcQueueRow({
  item,
  mode,
  onOpenChallenge,
}: {
  item: FcQueueItem;
  mode: 'awaiting' | 'upcoming';
  onOpenChallenge: (challengeId: string) => void;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                Reward:{' '}
                <span className="font-medium text-foreground">
                  {item.currency} {item.rewardTotal.toLocaleString()}
                </span>
              </span>
              <Badge
                variant={item.escrowStatus === 'FUNDED' ? 'default' : 'secondary'}
                className="text-[10px]"
              >
                {item.escrowStatus ?? 'Pending Deposit'}
              </Badge>
              <span>Phase {item.currentPhase}</span>
              {mode === 'upcoming' && (
                <Badge variant="outline" className="text-[10px]">
                  Context only
                </Badge>
              )}
              <span>·</span>
              <span>{format(new Date(item.createdAt), 'MMM d, yyyy · h:mm a')}</span>
            </div>
          </div>

          <Button
            size="sm"
            variant={mode === 'upcoming' ? 'outline' : 'default'}
            onClick={() => onOpenChallenge(item.challengeId)}
            className="shrink-0"
          >
            {mode === 'upcoming' ? (
              <>
                <Eye className="mr-1 h-3.5 w-3.5" /> View challenge context
              </>
            ) : (
              <>
                Open Finance Workspace <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function FcQueueSections({
  awaitingItems,
  upcomingItems,
  onOpenChallenge,
}: FcQueueSectionsProps) {
  return (
    <>
      {awaitingItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Awaiting your action ({awaitingItems.length})
          </h2>
          {awaitingItems.map((item) => (
            <FcQueueRow
              key={item.challengeId}
              item={item}
              mode="awaiting"
              onOpenChallenge={onOpenChallenge}
            />
          ))}
        </section>
      )}

      {upcomingItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Upcoming (in curation) ({upcomingItems.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            These challenges are still being curated. You can review challenge context here,
            but Finance Coordinator completion starts once the challenge enters the FC workspace.
          </p>
          {upcomingItems.map((item) => (
            <FcQueueRow
              key={item.challengeId}
              item={item}
              mode="upcoming"
              onOpenChallenge={onOpenChallenge}
            />
          ))}
        </section>
      )}
    </>
  );
}