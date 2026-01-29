/**
 * Spark Trend Chart Component
 * Auto-extracts statistics from insight text and displays mini bar chart
 * Per Phase E specification - FEED-011, SPRK-010
 */

import { useMemo } from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SparkTrendChartProps {
  insightText: string;
  className?: string;
}

// Regex patterns for extracting statistics
const STAT_PATTERNS = [
  { pattern: /(\d+(?:\.\d+)?)\s*%/, type: 'percentage' },
  { pattern: /\$(\d+(?:,\d{3})*(?:\.\d+)?)/, type: 'currency' },
  { pattern: /(\d+(?:,\d{3})*)\s*(million|billion|K|M|B)/i, type: 'large_number' },
  { pattern: /(\d+(?:\.\d+)?)\s*x/i, type: 'multiplier' },
  { pattern: /(\d+(?:\.\d+)?)\s*(increase|growth|rise|up)/i, type: 'growth' },
  { pattern: /(\d+(?:\.\d+)?)\s*(decrease|decline|drop|down)/i, type: 'decline' },
];

interface ExtractedStat {
  value: number;
  type: string;
  isPositive: boolean;
}

function extractStatistics(text: string): ExtractedStat | null {
  if (!text) return null;

  for (const { pattern, type } of STAT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      
      // Handle suffixes for large numbers
      if (type === 'large_number' && match[2]) {
        const suffix = match[2].toLowerCase();
        if (suffix === 'k') value *= 1000;
        else if (suffix === 'm' || suffix === 'million') value *= 1000000;
        else if (suffix === 'b' || suffix === 'billion') value *= 1000000000;
      }

      // Determine if positive or negative trend
      const isPositive = type !== 'decline' && 
        !/decrease|decline|drop|down|loss|fell|lost/i.test(text);

      return { value, type, isPositive };
    }
  }

  return null;
}

function generateTrendData(stat: ExtractedStat): Array<{ value: number; isTarget: boolean }> {
  const { value, isPositive } = stat;
  const dataPoints: Array<{ value: number; isTarget: boolean }> = [];
  
  // Generate 5 data points showing trend toward the stat
  const baseValue = isPositive ? value * 0.6 : value * 1.4;
  const step = isPositive ? (value - baseValue) / 4 : (baseValue - value) / 4;
  
  for (let i = 0; i < 5; i++) {
    const pointValue = isPositive 
      ? baseValue + step * i 
      : baseValue - step * i;
    dataPoints.push({ 
      value: pointValue, 
      isTarget: i === 4 
    });
  }

  return dataPoints;
}

export function SparkTrendChart({ insightText, className }: SparkTrendChartProps) {
  const { stat, trendData } = useMemo(() => {
    const extractedStat = extractStatistics(insightText);
    if (!extractedStat) return { stat: null, trendData: [] };
    
    return {
      stat: extractedStat,
      trendData: generateTrendData(extractedStat),
    };
  }, [insightText]);

  // Don't render if no statistics found
  if (!stat || trendData.length === 0) return null;

  const primaryColor = stat.isPositive ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';
  const mutedColor = stat.isPositive ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--destructive) / 0.3)';

  return (
    <div className={cn("flex items-center gap-2 mt-2", className)}>
      <TrendingUp 
        className={cn(
          "h-3 w-3 flex-shrink-0",
          stat.isPositive ? "text-primary" : "text-destructive"
        )} 
        aria-hidden="true" 
      />
      <div className="h-8 flex-1 max-w-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trendData} barGap={1}>
            <Bar 
              dataKey="value" 
              radius={[2, 2, 0, 0]}
            >
              {trendData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isTarget ? primaryColor : mutedColor}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Helper to check if insight has extractable stats
export function hasExtractableStats(text: string): boolean {
  return extractStatistics(text) !== null;
}
