/**
 * EnterpriseAgreementsPage — Platform admin console for negotiated
 * Enterprise contracts. Routed at /admin/enterprise-agreements
 * (guarded by PermissionGuard at the route level).
 *
 * Composition only — heavy lifting lives in /components/admin/enterprise/.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

import { PageHeader } from '@/components/admin/PageHeader';
import {
  type AgreementStatus,
  useEnterpriseAgreement,
  useEnterpriseAgreements,
} from '@/hooks/queries/useEnterpriseAgreement';
import { AgreementEditorForm } from '@/components/admin/enterprise/AgreementEditorForm';
import { AgreementStatusControls } from '@/components/admin/enterprise/AgreementStatusControls';
import { AgreementAuditTrail } from '@/components/admin/enterprise/AgreementAuditTrail';
import { OrgPicker } from '@/components/admin/enterprise/OrgPicker';

function useOrgNames(orgIds: string[]) {
  return useQuery({
    queryKey: ['enterprise', 'org-names', orgIds.slice().sort().join(',')],
    queryFn: async (): Promise<Record<string, string>> => {
      if (orgIds.length === 0) return {};
      const { data, error } = await supabase
        .from('seeker_organizations')
        .select('id, legal_entity_name')
        .in('id', orgIds);
      if (error) throw new Error(error.message);
      const map: Record<string, string> = {};
      for (const r of data ?? []) map[r.id] = r.legal_entity_name ?? r.id;
      return map;
    },
    enabled: orgIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export default function EnterpriseAgreementsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creatingForOrg, setCreatingForOrg] = useState<{ id: string; name: string } | null>(null);

  const { data: agreements, isLoading } = useEnterpriseAgreements();
  const { data: selected } = useEnterpriseAgreement(selectedId);

  const orgIds = useMemo(
    () => Array.from(new Set((agreements ?? []).map((a) => a.organization_id))),
    [agreements],
  );
  const { data: orgNames } = useOrgNames(orgIds);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Agreements"
        description="Negotiated contracts, override caps, and feature gates for Enterprise customers."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Left: list + create */}
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">Agreements</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedId(null);
                setCreatingForOrg({ id: '', name: '' });
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> New Agreement
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <Skeleton className="h-10 w-full" />}
            {!isLoading && (agreements?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">No agreements yet.</p>
            )}
            {(agreements ?? []).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setSelectedId(a.id);
                  setCreatingForOrg(null);
                }}
                className={`w-full text-left rounded-md border border-border p-3 hover:bg-accent transition ${
                  selectedId === a.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {orgNames?.[a.organization_id] ?? a.organization_id}
                  </span>
                  <Badge variant={a.agreement_status === 'active' ? 'default' : 'secondary'}>
                    {a.agreement_status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {a.currency_code} {a.acv_amount?.toLocaleString() ?? '—'} •{' '}
                  {a.contract_start_date ? format(new Date(a.contract_start_date), 'PP') : '—'}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Right: detail */}
        <div className="min-w-0">
          {creatingForOrg && !creatingForOrg.id && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pick an organization</CardTitle>
                <CardDescription>
                  Choose the customer org this agreement applies to.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OrgPicker
                  onSelect={(id, name) => setCreatingForOrg({ id, name })}
                />
              </CardContent>
            </Card>
          )}

          {creatingForOrg?.id && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  New agreement — {creatingForOrg.name || creatingForOrg.id}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AgreementEditorForm
                  organizationId={creatingForOrg.id}
                  agreement={null}
                  onSaved={(id) => {
                    setSelectedId(id);
                    setCreatingForOrg(null);
                  }}
                />
              </CardContent>
            </Card>
          )}

          {selected && !creatingForOrg && (
            <Tabs defaultValue="editor" className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-base font-semibold">
                  {orgNames?.[selected.organization_id] ?? selected.organization_id}
                </h3>
                <AgreementStatusControls
                  id={selected.id}
                  organizationId={selected.organization_id}
                  status={selected.agreement_status as AgreementStatus}
                />
              </div>
              <TabsList>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="audit">Audit Trail</TabsTrigger>
              </TabsList>
              <TabsContent value="editor">
                <AgreementEditorForm
                  organizationId={selected.organization_id}
                  agreement={selected}
                />
              </TabsContent>
              <TabsContent value="audit">
                <AgreementAuditTrail agreementId={selected.id} />
              </TabsContent>
            </Tabs>
          )}

          {!selected && !creatingForOrg && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                Select an agreement on the left, or create a new one.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
