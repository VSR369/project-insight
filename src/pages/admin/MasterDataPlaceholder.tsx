import { AdminLayout } from '@/components/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface MasterDataPlaceholderProps {
  title: string;
  description?: string;
}

export default function MasterDataPlaceholder({ title, description }: MasterDataPlaceholderProps) {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Construction className="h-5 w-5 text-yellow-500" />
              Under Construction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This admin page is being built. CRUD functionality will be available soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

// Export individual placeholder components for each route
export function ExpertiseLevelsPage() {
  return <MasterDataPlaceholder title="Expertise Levels" description="Define experience level tiers and requirements" />;
}

export function AcademicTaxonomyPage() {
  return <MasterDataPlaceholder title="Academic Taxonomy" description="Manage disciplines, streams, and subjects hierarchy" />;
}

export function ProficiencyTaxonomyPage() {
  return <MasterDataPlaceholder title="Proficiency Taxonomy" description="Manage areas, sub-domains, and specialities hierarchy" />;
}

export function QuestionBankPage() {
  return <MasterDataPlaceholder title="Question Bank" description="Manage assessment questions by speciality" />;
}

export function AdminSettingsPage() {
  return <MasterDataPlaceholder title="Admin Settings" description="Configure platform settings" />;
}
