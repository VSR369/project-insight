/**
 * SystemConfigPage — SCR-07-01: System Configuration Dashboard.
 * Supervisor-only. Accordion groups + audit history tab.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { useMpaConfig } from '@/hooks/queries/useMpaConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfigGroupAccordion } from '@/components/admin/system-config/ConfigGroupAccordion';
import { AuditHistoryTable } from '@/components/admin/system-config/AuditHistoryTable';
import { ExecutiveContactWarning } from '@/components/admin/system-config/ExecutiveContactWarning';
import { SlaOrderingBar } from '@/components/admin/system-config/SlaOrderingBar';
import { Settings, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

/** Fetch admin names for updated_by display */
function useAdminNameMap() {
  return useQuery({
    queryKey: ['admin-name-map'],
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_admin_profiles')
        .select('id, full_name');
      return (data ?? []).reduce((acc, a) => {
        acc[a.id] = a.full_name || 'Unknown';
        return acc;
      }, {} as Record<string, string>);
    },
    staleTime: 5 * 60 * 1000,
  });
}

const GROUP_META: Record<string, { title: string; description?: string }> = {
  DOMAIN_WEIGHTS: { title: 'Domain Match Weights', description: 'Controls how industry, country, and org type matches are scored during auto-assignment.' },
  CAPACITY: { title: 'Admin Capacity', description: 'Concurrent verification limits and availability thresholds.' },
  QUEUE: { title: 'Open Queue', description: 'Timing controls for unclaimed verifications and escalation intervals.' },
  SLA_THRESHOLDS: { title: 'SLA Escalation', description: 'Percentage thresholds that trigger SLA warning tiers.' },
  ESCALATION: { title: 'Escalation Routing', description: 'Executive fallback contact for Tier 3 escalations.' },
  REASSIGNMENT: { title: 'Reassignment & Leave', description: 'Limits on reassignments and leave notification timing.' },
};

const GROUP_ORDER = ['DOMAIN_WEIGHTS', 'CAPACITY', 'QUEUE', 'SLA_THRESHOLDS', 'ESCALATION', 'REASSIGNMENT'];

function SystemConfigContent() {
  const { data: config, isLoading } = useMpaConfig();
  const { data: adminNameMap } = useAdminNameMap();
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    if (!config) return {};
    return config.reduce((acc, entry) => {
      const g = entry.param_group || 'GENERAL';
      if (!acc[g]) acc[g] = [];
      acc[g].push(entry);
      return acc;
    }, {} as Record<string, typeof config>);
  }, [config]);

  const escalationContact = config?.find((c) => c.param_key === 'executive_escalation_contact_id');
  const showEscalationWarning = !isLoading && (!escalationContact?.param_value || escalationContact.param_value === 'NULL');

  // SLA values for bar
  const t1 = parseInt(config?.find((c) => c.param_key === 'sla_tier1_threshold_pct')?.param_value ?? '80');
  const t2 = parseInt(config?.find((c) => c.param_key === 'sla_tier2_threshold_pct')?.param_value ?? '100');
  const t3 = parseInt(config?.find((c) => c.param_key === 'sla_tier3_threshold_pct')?.param_value ?? '150');

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">System Configuration</h1>
          <p className="text-sm text-muted-foreground">Manage platform parameters and governance settings</p>
        </div>
      </div>

      {showEscalationWarning && <ExecutiveContactWarning />}

      <Tabs defaultValue="parameters">
        <TabsList>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="audit">Audit History</TabsTrigger>
        </TabsList>

        <TabsContent value="parameters">
          <Accordion type="multiple" defaultValue={GROUP_ORDER} className="space-y-1">
            {GROUP_ORDER.map((groupKey) => {
              const meta = GROUP_META[groupKey];
              const entries = grouped[groupKey] ?? [];

              if (groupKey === 'DOMAIN_WEIGHTS') {
                return (
                  <ConfigGroupAccordion
                    key={groupKey}
                    groupKey={groupKey}
                    title={meta.title}
                    description={meta.description}
                    entries={[]}
                    adminNameMap={adminNameMap}
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-3 py-2">
                      {entries.map((e) => (
                        <Badge key={e.param_key} variant="secondary" className="text-xs font-mono">
                          {e.label?.replace(' Match Weight ', ' ')}: {e.param_value ?? '0'}%
                        </Badge>
                      ))}
                      <Button
                        variant="link"
                        size="sm"
                        className="text-xs h-auto p-0"
                        onClick={() => navigate('/admin/system-config/domain-weights')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Configure on tuning panel →
                      </Button>
                    </div>
                  </ConfigGroupAccordion>
                );
              }

              return (
                <ConfigGroupAccordion
                  key={groupKey}
                  groupKey={groupKey}
                  title={meta.title}
                  description={meta.description}
                  entries={entries}
                  adminNameMap={adminNameMap}
                >
                  {groupKey === 'SLA_THRESHOLDS' && (
                    <SlaOrderingBar t1={t1} t2={t2} t3={t3} />
                  )}
                </ConfigGroupAccordion>
              );
            })}
          </Accordion>
        </TabsContent>

        <TabsContent value="audit">
          <AuditHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SystemConfigPage() {
  return (
    <FeatureErrorBoundary featureName="System Configuration">
      <SystemConfigContent />
    </FeatureErrorBoundary>
  );
}
