/**
 * Organization Settings Page (ORG-001)
 *
 * Tabbed control center for the Seeker Organization. The active tab is bound
 * to the `?tab=` URL search param so the OrgSidebar can deep-link directly
 * to Legal Templates, Governance, Finance, Compliance, etc.
 *
 * Tier gating:
 *   - PRIMARY admin & non-admin org users: full set of tabs.
 *   - DELEGATED admin: read-only Profile + Subscription only (sensitive
 *     configuration is hidden — they can still view it via direct URL but
 *     mutations are blocked at the RLS layer).
 */

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  Shuffle,
  History,
  UserCircle,
  ShieldCheck,
  FileText,
  Banknote,
  Settings2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
import { useCurrentAdminTier } from '@/hooks/useCurrentAdminTier';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';

type TabId =
  | 'profile'
  | 'admin'
  | 'subscription'
  | 'engagement'
  | 'governance'
  | 'legal-templates'
  | 'finance'
  | 'compliance'
  | 'custom-fields'
  | 'audit';

const ALL_TABS: TabId[] = [
  'profile',
  'admin',
  'subscription',
  'engagement',
  'governance',
  'legal-templates',
  'finance',
  'compliance',
  'custom-fields',
  'audit',
];

// Tabs visible to a DELEGATED admin (sensitive config tabs hidden).
const DELEGATED_TABS: TabId[] = ['profile', 'admin', 'subscription'];

export default function OrgSettingsPage() {
  const { organizationId } = useOrgContext();
  const { data: currentOrg } = useCurrentOrg();
  const { data: currentAdmin } = useCurrentSeekerAdmin(organizationId);

  const isSOAdmin = !!currentAdmin;
  const isPrimary = currentAdmin?.admin_tier === 'PRIMARY';
  const isDelegated = isSOAdmin && !isPrimary;

  const visibleTabs: TabId[] = useMemo(
    () => (isDelegated ? DELEGATED_TABS : ALL_TABS),
    [isDelegated],
  );

  const [search, setSearch] = useSearchParams();
  const requestedTab = (search.get('tab') as TabId) || 'profile';
  const activeTab: TabId = visibleTabs.includes(requestedTab) ? requestedTab : 'profile';

  const handleTabChange = (next: string) => {
    const nextParams = new URLSearchParams(search);
    nextParams.set('tab', next);
    setSearch(nextParams, { replace: true });
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">Organization Settings</h1>
          {currentOrg?.governanceProfile && (
            <GovernanceProfileBadge profile={currentOrg.governanceProfile} />
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          Manage your organization profile, admin, subscription, and engagement model.
        </p>
        {isDelegated && (
          <Alert className="mt-3">
            <AlertDescription>
              You are signed in as a Delegated Admin. Sensitive configuration (Governance,
              Legal, Finance, Compliance, Custom Fields, Audit Trail) is restricted to the
              Primary Admin.
            </AlertDescription>
          </Alert>
        )}
      </div>
      <FeatureErrorBoundary featureName="Org Settings Tabs">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-max">
              {visibleTabs.includes('profile') && (
                <TabsTrigger value="profile" className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" /><span className="hidden lg:inline">Profile</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes('admin') && (
                <TabsTrigger value="admin" className="flex items-center gap-1.5">
                  <UserCircle className="h-4 w-4" /><span className="hidden lg:inline">Admin</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes('subscription') && (
                <TabsTrigger value="subscription" className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4" /><span className="hidden lg:inline">Subscription</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes('engagement') && (
                <TabsTrigger value="engagement" className="flex items-center gap-1.5">
                  <Shuffle className="h-4 w-4" /><span className="hidden lg:inline">Engagement</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes('governance') && (
                <TabsTrigger value="governance" className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /><span className="hidden lg:inline">Governance</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes('legal-templates') && (
                <TabsTrigger value="legal-templates" className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4" /><span className="hidden lg:inline">Legal</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes('finance') && (
                <TabsTrigger value="finance" className="flex items-center gap-1.5">
                  <Banknote className="h-4 w-4" /><span className="hidden lg:inline">Finance</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes('compliance') && (
                <TabsTrigger value="compliance" className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /><span className="hidden lg:inline">Compliance</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes('custom-fields') && (
                <TabsTrigger value="custom-fields" className="flex items-center gap-1.5">
                  <Settings2 className="h-4 w-4" /><span className="hidden lg:inline">Custom Fields</span>
                </TabsTrigger>
              )}
              {visibleTabs.includes('audit') && (
                <TabsTrigger value="audit" className="flex items-center gap-1.5">
                  <History className="h-4 w-4" /><span className="hidden lg:inline">Audit Trail</span>
                </TabsTrigger>
              )}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="profile" className="mt-6"><ProfileTab organizationId={organizationId} /></TabsContent>
          <TabsContent value="admin" className="mt-6"><AdminDetailsTab organizationId={organizationId} /></TabsContent>
          <TabsContent value="subscription" className="mt-6"><SubscriptionTab organizationId={organizationId} /></TabsContent>
          {visibleTabs.includes('engagement') && (
            <TabsContent value="engagement" className="mt-6"><EngagementModelTab organizationId={organizationId} /></TabsContent>
          )}
          {visibleTabs.includes('governance') && (
            <TabsContent value="governance" className="mt-6">
              <div className="space-y-6">
                <GovernanceProfileTab organizationId={organizationId} />
                <GovernanceOverridesSection organizationId={organizationId} />
              </div>
            </TabsContent>
          )}
          {visibleTabs.includes('legal-templates') && (
            <TabsContent value="legal-templates" className="mt-6"><OrgLegalTemplatesTab organizationId={organizationId} /></TabsContent>
          )}
          {visibleTabs.includes('finance') && (
            <TabsContent value="finance" className="mt-6"><OrgFinanceTab organizationId={organizationId} /></TabsContent>
          )}
          {visibleTabs.includes('compliance') && (
            <TabsContent value="compliance" className="mt-6"><OrgComplianceTab organizationId={organizationId} /></TabsContent>
          )}
          {visibleTabs.includes('custom-fields') && (
            <TabsContent value="custom-fields" className="mt-6"><OrgCustomFieldsTab organizationId={organizationId} /></TabsContent>
          )}
          {visibleTabs.includes('audit') && (
            <TabsContent value="audit" className="mt-6"><AuditTrailTable organizationId={organizationId} /></TabsContent>
          )}
        </Tabs>
      </FeatureErrorBoundary>
    </>
  );
}
