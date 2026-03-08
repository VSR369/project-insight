/**
 * MOD-04 SCR-04-01: Summary stat cards for Notification Audit Log
 * Figma: no icons, colored numbers, larger font
 */
import { Card, CardContent } from '@/components/ui/card';

interface AuditSummaryCardsProps {
  totalToday: number;
  sentPct: number;
  retryQueued: number;
  exhausted: number;
}

export function AuditSummaryCards({ totalToday, sentPct, retryQueued, exhausted }: AuditSummaryCardsProps) {
  const cards = [
    { label: 'Total Today', value: totalToday, color: 'text-primary' },
    { label: 'Delivered', value: `${sentPct}%`, color: 'text-green-600 dark:text-green-400' },
    { label: 'Retry Queued', value: retryQueued, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Exhausted', value: exhausted, color: 'text-red-600 dark:text-red-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
