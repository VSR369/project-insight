import { AdminLayout } from '@/components/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Lightbulb, 
  Target, 
  Database, 
  Users, 
  Sparkles 
} from 'lucide-react';

const universalCompetencies = [
  {
    title: 'Solution Design & Architecture Thinking',
    description: 'Universal ability to frame problems, design solutions, and think structurally.',
    icon: Lightbulb,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  {
    title: 'Execution & Governance',
    description: 'Applies to every domain—delivery discipline, accountability, and decision-making are non-negotiable everywhere.',
    icon: Target,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  {
    title: 'Data / Tech Readiness & Tooling Awareness',
    description: 'The tools may vary by industry, but readiness to use data and technology is universal.',
    icon: Database,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  {
    title: 'Soft Skills for Solution Provider Success',
    description: 'Communication, collaboration, leadership, and stakeholder management cut across all domains.',
    icon: Users,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  {
    title: 'Innovation & Co-creation Ability',
    description: 'Every industry now expects solution providers to co-create value, not just execute requirements.',
    icon: Sparkles,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
  },
];

export default function InterviewKitPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interview KIT</h1>
          <p className="text-muted-foreground">
            Universal competencies assessed across all solution providers
          </p>
        </div>

        <div className="grid gap-6">
          {universalCompetencies.map((competency, index) => (
            <Card 
              key={index}
              className={`${competency.bgColor} ${competency.borderColor} border-l-4`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-background shadow-sm`}>
                    <competency.icon className={`h-6 w-6 ${competency.color}`} />
                  </div>
                  <CardTitle className="text-lg">{competency.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-foreground/70">
                  {competency.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
