/**
 * Organization Settings Page (ORG-001)
 * 
 * Post-registration settings with 10 tabbed sections.
 */

import { Building2, CreditCard, Shuffle, History, UserCircle, ShieldCheck, FileText, Banknote, Settings2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

import { ProfileTab } from '@/components/org-settings/ProfileTab';
import { AdminDetailsTab } from '@/components/org-settings/AdminDetailsTab';
import { SubscriptionTab } from '@/components/org-settings/SubscriptionTab';
import { EngagementModelTab } from '@/components/org-settings/EngagementModelTab';
import { GovernanceProfileTab } from '@/components/org-settings/GovernanceProfileTab';
import { GovernanceOverridesSection } from '@/components/org-settings/GovernanceOverridesSection';
import { OrgLegalTemplatesTab } from '@/components/org-settings/OrgLegalTemplatesTab';
import { OrgFinanceTab } from '@/components/org-settings/OrgFinanceTab';
import { OrgComplianceTab } from '@/components/org-settings/OrgComplianceTab';
import { OrgCustomFieldsTab } from '@/components/org-settings/OrgCustomFieldsTab';
import { AuditTrailTable } from '@/components/org-settings/AuditTrailTable';

import { useOrgContext } from '@/contexts/OrgContext';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';

export default function OrgSettingsPage() {
  const { organizationId } = useOrgContext();
  const { data: currentOrg } = useCurrentOrg();

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">Organization Settings</h1>
          {currentOrg?.governanceProfile && (
            <GovernanceProfileBadge profile={currentOrg.governanceProfile} />
          )}
        </div>
        <p className="text-muted-foreground mt-1">Manage your organization profile, admin, subscription, and engagement model.</p>
      </div>
      <FeatureErrorBoundary featureName="Org Settings Tabs">
        <Tabs defaultValue="profile" className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="profile" className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" /><span className="hidden lg:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-1.5">
                <UserCircle className="h-4 w-4" /><span className="hidden lg:inline">Admin</span>
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4" /><span className="hidden lg:inline">Subscription</span>
              </TabsTrigger>
              <TabsTrigger value="engagement" className="flex items-center gap-1.5">
                <Shuffle className="h-4 w-4" /><span className="hidden lg:inline">Engagement</span>
              </TabsTrigger>
              <TabsTrigger value="governance" className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /><span className="hidden lg:inline">Governance</span>
              </TabsTrigger>
              <TabsTrigger value="legal-templates" className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" /><span className="hidden lg:inline">Legal</span>
              </TabsTrigger>
              <TabsTrigger value="finance" className="flex items-center gap-1.5">
                <Banknote className="h-4 w-4" /><span className="hidden lg:inline">Finance</span>
              </TabsTrigger>
              <TabsTrigger value="compliance" className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /><span className="hidden lg:inline">Compliance</span>
              </TabsTrigger>
              <TabsTrigger value="custom-fields" className="flex items-center gap-1.5">
                <Settings2 className="h-4 w-4" /><span className="hidden lg:inline">Custom Fields</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-1.5">
                <History className="h-4 w-4" /><span className="hidden lg:inline">Audit Trail</span>
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="profile" className="mt-6"><ProfileTab organizationId={organizationId} /></TabsContent>
          <TabsContent value="admin" className="mt-6"><AdminDetailsTab organizationId={organizationId} /></TabsContent>
          <TabsContent value="subscription" className="mt-6"><SubscriptionTab organizationId={organizationId} /></TabsContent>
          <TabsContent value="engagement" className="mt-6"><EngagementModelTab organizationId={organizationId} /></TabsContent>
          <TabsContent value="governance" className="mt-6">
            <div className="space-y-6">
              <GovernanceProfileTab organizationId={organizationId} />
              <GovernanceOverridesSection organizationId={organizationId} />
            </div>
          </TabsContent>
          <TabsContent value="legal-templates" className="mt-6"><OrgLegalTemplatesTab organizationId={organizationId} /></TabsContent>
          <TabsContent value="finance" className="mt-6"><OrgFinanceTab organizationId={organizationId} /></TabsContent>
          <TabsContent value="compliance" className="mt-6"><OrgComplianceTab organizationId={organizationId} /></TabsContent>
          <TabsContent value="custom-fields" className="mt-6"><OrgCustomFieldsTab organizationId={organizationId} /></TabsContent>
          <TabsContent value="audit" className="mt-6"><AuditTrailTable organizationId={organizationId} /></TabsContent>
        </Tabs>
      </FeatureErrorBoundary>
    </>
  );
}
