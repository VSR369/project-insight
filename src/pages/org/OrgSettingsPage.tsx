/**
 * Organization Settings Page (ORG-001)
 * 
 * Post-registration settings page with tabbed layout:
 * Profile | Admin | Subscription | Engagement Model | Audit Trail
 */

import { Building2, CreditCard, Shuffle, History, UserCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ProfileTab } from '@/components/org-settings/ProfileTab';
import { AdminDetailsTab } from '@/components/org-settings/AdminDetailsTab';
import { SubscriptionTab } from '@/components/org-settings/SubscriptionTab';
import { EngagementModelTab } from '@/components/org-settings/EngagementModelTab';
import { AuditTrailTable } from '@/components/org-settings/AuditTrailTable';

import { useOrgContext } from '@/contexts/OrgContext';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { OrgLayout } from '@/components/org/OrgLayout';

export default function OrgSettingsPage() {
  const { organizationId } = useOrgContext();

  return (
    <OrgLayout
      title="Organization Settings"
      description="Manage your organization profile, admin, subscription, and engagement model."
      breadcrumbs={[{ label: 'Settings' }]}
    >
      <FeatureErrorBoundary featureName="Org Settings Tabs">
        <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden lg:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            <span className="hidden lg:inline">Admin</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden lg:inline">Subscription</span>
          </TabsTrigger>
          <TabsTrigger value="engagement" className="flex items-center gap-2">
            <Shuffle className="h-4 w-4" />
            <span className="hidden lg:inline">Engagement</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden lg:inline">Audit Trail</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="admin" className="mt-6">
          <AdminDetailsTab organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <SubscriptionTab organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="engagement" className="mt-6">
          <EngagementModelTab organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditTrailTable organizationId={organizationId} />
        </TabsContent>
        </Tabs>
      </FeatureErrorBoundary>
    </OrgLayout>
  );
}
