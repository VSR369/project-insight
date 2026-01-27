import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Lightbulb, 
  Target, 
  Database, 
  Users, 
  Sparkles,
  Settings,
  ChevronRight,
  Download,
  FileUp
} from 'lucide-react';
import { useInterviewKitCompetencies, useInterviewKitQuestionCounts, useInterviewKitQuestions } from '@/hooks/queries/useInterviewKitQuestions';
import { COMPETENCY_CONFIG, type CompetencyCode } from '@/constants';
import { downloadInterviewKitTemplate, exportInterviewKitQuestions } from './InterviewKitExcelExport';
import { InterviewKitImportDialog } from './InterviewKitImportDialog';

// Icon mapping for dynamic rendering
const ICON_MAP = {
  Lightbulb,
  Target,
  Database,
  Users,
  Sparkles,
} as const;

export default function InterviewKitPage() {
  // All hooks at top level (per Project Knowledge Section 13)
  const [importOpen, setImportOpen] = useState(false);
  const { data: competencies = [], isLoading: competenciesLoading } = useInterviewKitCompetencies();
  const { data: questionCounts = {}, isLoading: countsLoading } = useInterviewKitQuestionCounts();
  const { data: allQuestions = [] } = useInterviewKitQuestions({ includeInactive: true });

  const isLoading = competenciesLoading || countsLoading;

  // Get config for a competency code
  const getConfig = (code: string) => {
    return COMPETENCY_CONFIG[code as CompetencyCode] || {
      icon: 'Lightbulb',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      borderColor: 'border-border',
    };
  };

  // Export handler
  const handleExport = () => {
    exportInterviewKitQuestions(allQuestions, competencies);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with navigation button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Interview KIT</h1>
            <p className="text-muted-foreground">
              Universal competencies assessed across all solution providers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadInterviewKitTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <FileUp className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={allQuestions.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button asChild>
              <Link to="/admin/interview/kit/questions">
                <Settings className="mr-2 h-4 w-4" />
                Manage All Questions
              </Link>
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="grid gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="border-l-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-6 w-64" />
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Competency cards - clickable */
          <div className="grid gap-6">
            {competencies.map((competency) => {
              const config = getConfig(competency.code);
              const IconComponent = ICON_MAP[config.icon as keyof typeof ICON_MAP] || Lightbulb;
              const count = questionCounts[competency.code] || 0;

              return (
                <Link
                  key={competency.id}
                  to={`/admin/interview/kit/questions?competency=${competency.id}`}
                  className="block"
                >
                  <Card 
                    className={`${config.bgColor} ${config.borderColor} border-l-4 hover:shadow-md transition-all cursor-pointer group`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-background shadow-sm">
                          <IconComponent className={`h-6 w-6 ${config.color}`} />
                        </div>
                        <CardTitle className="text-lg flex-1">{competency.name}</CardTitle>
                        <Badge variant="secondary" className="ml-auto">
                          {count} question{count !== 1 ? 's' : ''}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base text-foreground/70">
                        {competency.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Import Dialog */}
      <InterviewKitImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </AdminLayout>
  );
}
