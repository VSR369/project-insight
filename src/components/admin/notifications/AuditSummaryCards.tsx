/**
 * MOD-04 SCR-04-01: Summary stat cards for Notification Audit Log
 */
import { Card, CardContent } from '@/components/ui/card';
import { Mail, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

interface AuditSummaryCardsProps {
  totalToday: number;
  sentPct: number;
  retryQueued: number;
  exhausted: number;
}

export function AuditSummaryCards({ totalToday, sentPct, retryQueued, exhausted }: AuditSummaryCardsProps) {
  const cards = [
    { label: 'Total Today', value: totalToday, icon: Mail, color: 'text-primary' },
    { label: 'Sent %', value: `${sentPct}%`, icon: CheckCircle, color: 'text-green-600 dark:text-green-400' },
    { label: 'Retry Queued', value: retryQueued, icon: RefreshCw, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Exhausted', value: exhausted, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <c.icon className={`h-5 w-5 ${c.color}`} />
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-semibold">{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
