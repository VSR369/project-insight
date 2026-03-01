import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/admin/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSeekerOrgList } from '@/hooks/queries/useSeekerOrgApprovals';
import { format } from 'date-fns';
import type { SeekerOrgListItem } from './types';

const PAGE_SIZE = 20;

const statusColors = {
  unverified: 'bg-muted text-muted-foreground',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  verified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
} as const satisfies Record<string, string>;

export default function SeekerOrgApprovalsPage() {
  const [tab, setTab] = useState('pending');
  const [page, setPage] = useState(0);
  const { data: orgs, isLoading } = useSeekerOrgList(tab);
  const navigate = useNavigate();

  // Reset page when tab changes
  const handleTabChange = (value: string) => {
    setTab(value);
    setPage(0);
  };

  const allOrgs = (orgs ?? []) as SeekerOrgListItem[];
  const totalPages = Math.ceil(allOrgs.length / PAGE_SIZE);
  const paginatedOrgs = allOrgs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Organization Approvals"
        description="Review and verify seeker organization registrations"
      />

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="unverified">Unverified</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !allOrgs.length ? (
            <div className="text-center py-12 text-muted-foreground">
              No organizations found.
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
                            {org.verification_status}
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
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
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
  );
}
