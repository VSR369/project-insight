import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Construction className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {description || 'This page is under construction and will be available soon.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AppLayout>
  );
}

// Individual placeholder pages
export function ProfilePage() {
  return <PlaceholderPage title="My Profile" description="View and edit your complete profile." />;
}

export function InvitationsPage() {
  return <PlaceholderPage title="Invitations" description="Manage your pending invitations." />;
}

export function AssessmentPage() {
  return <PlaceholderPage title="Assessment" description="Take your knowledge assessment." />;
}

export function KnowledgeCentrePage() {
  return <PlaceholderPage title="Knowledge Centre" description="Access help articles and resources." />;
}

export function SettingsPage() {
  return <PlaceholderPage title="Settings" description="Manage your account settings." />;
}
