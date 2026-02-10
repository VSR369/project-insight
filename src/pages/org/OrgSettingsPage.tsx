/**
 * Organization Settings Page (ORG-001)
 * 
 * Post-registration settings page with tabbed layout:
 * Profile | Subscription | Engagement Model | Audit Trail
 */

import { Building2, CreditCard, Shuffle, History } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ProfileTab } from '@/components/org-settings/ProfileTab';
import { SubscriptionTab } from '@/components/org-settings/SubscriptionTab';
import { EngagementModelTab } from '@/components/org-settings/EngagementModelTab';
import { AuditTrailTable } from '@/components/org-settings/AuditTrailTable';

// TODO: Replace with real org ID resolution from auth context / tenant mapping
// For now we accept it via URL search params or use a placeholder
import { useSearchParams } from 'react-router-dom';

export default function OrgSettingsPage() {
  const [searchParams] = useSearchParams();
  const organizationId = searchParams.get('orgId') || '';

  if (!organizationId) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-center py-20 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Organization Not Found</h2>
          <p>Please navigate here from your organization dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Organization Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organization profile, subscription, and engagement model.
        </p>
      </div>

      {/* Tabbed Layout */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden lg:inline">Profile</span>
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
    </div>
  );
}
