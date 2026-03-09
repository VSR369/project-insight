/**
 * AdminManagementPage — Delegated Admin Management Console
 * PRIMARY admin can view, create, edit, and deactivate delegated admins.
 * Matches Figma reference: avatar initials, colored status badges,
 * Industry Segments + Proficiency Areas columns, footer count.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrgContext } from '@/contexts/OrgContext';
import { useDelegatedAdmins, useMaxDelegatedAdmins, useCurrentSeekerAdmin } from '@/hooks/queries/useDelegatedAdmins';
import { useIndustrySegments } from '@/hooks/queries/useMasterData';
import { useProficiencyAreasBySegments } from '@/hooks/queries/useScopeTaxonomy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Edit, UserMinus, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DeactivateAdminDialog } from '@/components/org/DeactivateAdminDialog';
import { SessionContextBanner } from '@/components/org/SessionContextBanner';
import type { DelegatedAdmin, DomainScope } from '@/hooks/queries/useDelegatedAdmins';
import { EMPTY_SCOPE } from '@/hooks/queries/useDelegatedAdmins';

/* ── Avatar color palette ── */
const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700',
];

function getInitials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/* ── Status badge config ── */
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  pending_activation: { label: 'Pending Activation', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  suspended: { label: 'Suspended', className: 'bg-red-100 text-red-700 border-red-200' },
  deactivated: { label: 'Deactivated', className: 'bg-muted text-muted-foreground border-border' },
};

/* ── Scope resolution helpers ── */
function IndustrySegmentBadges({ scope, industries }: { scope: DomainScope; industries: { id: string; name: string }[] }) {
  const names = scope.industry_segment_ids
    .map((id) => industries.find((i) => i.id === id)?.name)
    .filter(Boolean) as string[];

  if (names.length === 0) return <span className="text-xs text-muted-foreground">All</span>;

  return (
    <div className="flex flex-wrap gap-1 max-w-[220px]">
      {names.slice(0, 2).map((name) => (
        <Badge key={name} variant="outline" className="text-[10px] font-normal">{name}</Badge>
      ))}
      {names.length > 2 && (
        <Badge variant="secondary" className="text-[10px]">+{names.length - 2}</Badge>
      )}
    </div>
  );
}

function ProficiencyAreasCount({ scope }: { scope: DomainScope }) {
  const count = scope.proficiency_area_ids.length;
  if (count === 0) return <span className="text-xs text-muted-foreground">All</span>;
  return <span className="text-sm">{count} area{count !== 1 ? 's' : ''}</span>;
}

const PAGE_SIZE = 20;

export default function AdminManagementPage() {
  const navigate = useNavigate();
  const { organizationId } = useOrgContext();
  const { data: admins, isLoading } = useDelegatedAdmins(organizationId);
  const { data: maxAdmins = 5 } = useMaxDelegatedAdmins();
  const { data: industries = [] } = useIndustrySegments();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deactivateTarget, setDeactivateTarget] = useState<DelegatedAdmin | null>(null);

  const filteredAdmins = (admins ?? []).filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.full_name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q)
    );
  });

  const activeCount = (admins ?? []).filter((a) => a.status !== 'deactivated').length;
  const canAdd = activeCount < maxAdmins;

  // Reset page when search changes
  const totalFiltered = filteredAdmins.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const paginatedAdmins = filteredAdmins.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Context Banner */}
      <SessionContextBanner />

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Delegated Admins
              </CardTitle>
              <CardDescription>
                Manage your organisation's Delegated Administrators and their domain scopes
              </CardDescription>
            </div>
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full lg:w-64"
                />
              </div>
              <Button
                onClick={() => navigate('/org/admin-management/create')}
                disabled={!canAdd}
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                <span className="hidden lg:inline">Add Delegated Admin</span>
                <span className="lg:hidden">Add</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No delegated admins yet</p>
              <p className="text-xs mt-1">Add delegated admins to help manage your organization</p>
            </div>
          ) : (
            <>
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Industry Segments</TableHead>
                      <TableHead>Proficiency Areas</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAdmins.map((admin, index) => {
                      const statusCfg = STATUS_CONFIG[admin.status] ?? STATUS_CONFIG.deactivated;
                      const scope: DomainScope = (admin.domain_scope as DomainScope | null) ?? EMPTY_SCOPE;
                      const colorClass = AVATAR_COLORS[(startIdx + index) % AVATAR_COLORS.length];

                      return (
                        <TableRow key={admin.id}>
                          {/* Name with avatar */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-semibold shrink-0 ${colorClass}`}>
                                {getInitials(admin.full_name)}
                              </div>
                              <span className="font-medium">{admin.full_name ?? '—'}</span>
                            </div>
                          </TableCell>

                          {/* Email */}
                          <TableCell className="font-mono text-sm">{admin.email ?? '—'}</TableCell>

                          {/* Status */}
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.className}`}>
                              {statusCfg.label}
                            </span>
                          </TableCell>

                          {/* Industry Segments */}
                          <TableCell>
                            <IndustrySegmentBadges scope={scope} industries={industries} />
                          </TableCell>

                          {/* Proficiency Areas */}
                          <TableCell>
                            <ProficiencyAreasCount scope={scope} />
                          </TableCell>

                          {/* Created */}
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {new Date(admin.created_at).toLocaleDateString()}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              {admin.status !== 'deactivated' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/org/admin-management/${admin.id}/edit`)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeactivateTarget(admin)}
                                  >
                                    <UserMinus className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Footer count + pagination */}
              <div className="flex items-center justify-between pt-3">
                <span className="text-xs text-muted-foreground">
                  Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, totalFiltered)} of {totalFiltered} admins
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DeactivateAdminDialog
        admin={deactivateTarget}
        organizationId={organizationId}
        onClose={() => setDeactivateTarget(null)}
      />
    </div>
  );
}