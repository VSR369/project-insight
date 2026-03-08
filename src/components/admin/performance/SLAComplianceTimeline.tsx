import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';

// Placeholder data — replace with real historical data when available
const PLACEHOLDER_DATA = [
  { week: 'W1', rate: 88 },
  { week: 'W2', rate: 91 },
  { week: 'W3', rate: 93 },
  { week: 'W4', rate: 90 },
  { week: 'W5', rate: 94 },
  { week: 'W6', rate: 96 },
  { week: 'W7', rate: 95 },
  { week: 'W8', rate: 97 },
];

const chartConfig = {
  rate: { label: 'SLA Rate', color: 'hsl(var(--primary))' },
};

export function SLAComplianceTimeline() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">SLA Compliance Timeline</CardTitle>
          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Improving trend (+3% this month)</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Data updated daily</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <LineChart data={PLACEHOLDER_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine
              y={95}
              stroke="hsl(var(--destructive))"
              strokeDasharray="6 3"
              label={{ value: '95% Target', position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="var(--color-rate)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--color-rate)' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
