import { useState } from 'react';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/admin/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSeekerOrgList, useMyAssignedOrgIds } from '@/hooks/queries/useSeekerOrgApprovals';
import { useCurrentAdminProfile } from '@/hooks/queries/useCurrentAdminProfile';
import { format } from 'date-fns';
import type { SeekerOrgListItem } from './types';

const PAGE_SIZE = 20;

const statusColors: Record<string, string> = {
  unverified: 'bg-muted text-muted-foreground',
  payment_submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  under_verification: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  verified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  returned_for_correction: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export default function SeekerOrgApprovalsPage() {
  const [tab, setTab] = useState('payment_submitted');
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useCurrentAdminProfile();
  const isSupervisor = profile?.admin_tier === 'supervisor';

  // For non-supervisors: get their assigned org IDs
  const { data: assignedOrgIds, isLoading: assignedLoading } = useMyAssignedOrgIds(
    !isSupervisor && profile?.id ? profile.id : undefined
  );

  // Determine filtering
  const isUnassignedTab = tab === 'unassigned';
  const effectiveStatus = isUnassignedTab ? 'payment_submitted' : tab;

  const { data: orgs, isLoading: orgsLoading } = useSeekerOrgList(
    effectiveStatus,
    // Non-supervisors: filter to assigned orgs (except on unassigned tab which is supervisor-only)
    isSupervisor ? null : (assignedOrgIds ?? null),
    // Unassigned tab: filter to orgs without an admin
    isUnassignedTab ? true : false
  );

  const isLoading = profileLoading || assignedLoading || orgsLoading;

  const handleTabChange = (value: string) => {
    setTab(value);
    setPage(0);
  };

  const allOrgs = (orgs ?? []) as SeekerOrgListItem[];
  const totalPages = Math.ceil(allOrgs.length / PAGE_SIZE);
  const paginatedOrgs = allOrgs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <FeatureErrorBoundary featureName="SeekerOrgApprovals">
    <div>
      <PageHeader
        title="Organization Approvals"
        description={isSupervisor
          ? 'Review and verify seeker organization registrations (all orgs)'
          : 'Review and verify your assigned seeker organization registrations'}
      />

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="payment_submitted">Payment Submitted</TabsTrigger>
          <TabsTrigger value="under_verification">Under Verification</TabsTrigger>
          <TabsTrigger value="returned_for_correction">Returned</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="suspended">Suspended</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          {isSupervisor && (
            <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
          )}
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !allOrgs.length ? (
            <div className="text-center py-12 text-muted-foreground">
              {isUnassignedTab
                ? 'No unassigned organizations in the queue.'
                : 'No organizations found.'}
            </div>
          ) : (
            <>
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrgs.map((org) => (
                      <TableRow
                        key={org.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/admin/seeker-org-approvals/${org.id}`)}
                      >
                        <TableCell className="font-medium">{org.organization_name}</TableCell>
                        <TableCell>{org.countries?.name ?? '—'}</TableCell>
                        <TableCell>{org.organization_types?.name ?? '—'}</TableCell>
                        <TableCell>{format(new Date(org.created_at), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{org.registration_step}/5</TableCell>
                        <TableCell>
                          <Badge className={statusColors[org.verification_status] ?? ''}>
                            {org.verification_status.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allOrgs.length)} of {allOrgs.length}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </FeatureErrorBoundary>
  );
}
