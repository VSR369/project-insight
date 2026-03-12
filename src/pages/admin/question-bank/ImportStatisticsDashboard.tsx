import * as React from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Tags,
  FileQuestion,
} from "lucide-react";

// Chart colors using HSL from design system
const DIFFICULTY_COLORS: Record<string, string> = {
  introductory: "hsl(142, 76%, 36%)", // green
  applied: "hsl(217, 91%, 60%)", // blue
  advanced: "hsl(45, 93%, 47%)", // amber
  strategic: "hsl(0, 84%, 60%)", // red
};

const QUESTION_TYPE_COLORS: Record<string, string> = {
  conceptual: "hsl(217, 91%, 60%)", // blue
  scenario: "hsl(142, 76%, 36%)", // green
  experience: "hsl(280, 67%, 60%)", // purple
  decision: "hsl(45, 93%, 47%)", // amber
  proof: "hsl(0, 84%, 60%)", // red
};

const USAGE_MODE_COLORS: Record<string, string> = {
  self_assessment: "hsl(217, 91%, 60%)", // blue
  interview: "hsl(142, 76%, 36%)", // green
  both: "hsl(280, 67%, 60%)", // purple
};

export interface ImportStatistics {
  totalImported: number;
  totalFailed: number;
  totalDeleted: number;
  tagsCreated: number;
  tagsLinked: number;
  durationMs: number;
  wasCancelled: boolean;
  
  // Distribution data
  byDifficulty: { name: string; count: number }[];
  byQuestionType: { name: string; count: number }[];
  byUsageMode: { name: string; count: number }[];
  bySpeciality: { name: string; count: number }[];
}

interface ImportStatisticsDashboardProps {
  statistics: ImportStatistics;
}

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-2 text-sm">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">{payload[0].value.toLocaleString()} questions</p>
      </div>
    );
  }
  return null;
};

// Format duration for display
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds % 60}s`;
};

// Format label for display
const formatLabel = (label: string): string => {
  return label
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

export function ImportStatisticsDashboard({ statistics }: ImportStatisticsDashboardProps) {
  const {
    totalImported,
    totalFailed,
    totalDeleted,
    tagsCreated,
    tagsLinked,
    durationMs,
    wasCancelled,
    byDifficulty,
    byQuestionType,
    byUsageMode,
    bySpeciality,
  } = statistics;

  // Sort speciality data by count for better visualization
  const topSpecialities = React.useMemo(() => {
    return [...bySpeciality]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [bySpeciality]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {totalImported.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 dark:text-green-500">Imported</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {totalFailed > 0 && (
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {totalFailed.toLocaleString()}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-500">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {totalDeleted > 0 && (
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {totalDeleted.toLocaleString()}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">Replaced</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {formatDuration(durationMs)}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-500">Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {tagsCreated > 0 && (
          <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                    {tagsCreated}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-500">New Tags</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {wasCancelled && (
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg text-sm text-amber-700 dark:text-amber-300 text-center">
          Import was cancelled before completion
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Difficulty Distribution - Pie Chart */}
        {byDifficulty.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" />
                By Difficulty
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byDifficulty}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) => `${formatLabel(name)} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {byDifficulty.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={DIFFICULTY_COLORS[entry.name] || `hsl(${index * 90}, 70%, 50%)`}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {byDifficulty.map((item) => (
                  <Badge 
                    key={item.name} 
                    variant="outline" 
                    className="text-xs"
                    style={{ borderColor: DIFFICULTY_COLORS[item.name] }}
                  >
                    {formatLabel(item.name)}: {item.count.toLocaleString()}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question Type Distribution - Pie Chart */}
        {byQuestionType.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileQuestion className="h-4 w-4" />
                By Question Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byQuestionType}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) => `${formatLabel(name)} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {byQuestionType.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={QUESTION_TYPE_COLORS[entry.name] || `hsl(${index * 72}, 70%, 50%)`}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {byQuestionType.map((item) => (
                  <Badge 
                    key={item.name} 
                    variant="outline" 
                    className="text-xs"
                    style={{ borderColor: QUESTION_TYPE_COLORS[item.name] }}
                  >
                    {formatLabel(item.name)}: {item.count.toLocaleString()}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage Mode Distribution - Horizontal Bar */}
        {byUsageMode.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                By Usage Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byUsageMode.map(item => ({ ...item, displayName: formatLabel(item.name) }))}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis type="category" dataKey="displayName" className="text-xs" width={75} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {byUsageMode.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={USAGE_MODE_COLORS[entry.name] || `hsl(${index * 120}, 70%, 50%)`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Specialities - Horizontal Bar */}
        {topSpecialities.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Top {Math.min(10, topSpecialities.length)} Specialities
              </CardTitle>
              <CardDescription className="text-xs">
                {bySpeciality.length} total specialities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-4">
                  {topSpecialities.map((item, index) => {
                    const percentage = (item.count / totalImported) * 100;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate max-w-[200px]" title={item.name}>
                            {index + 1}. {item.name}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            {item.count.toLocaleString()} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.max(percentage, 1)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
