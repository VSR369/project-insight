/**
 * DomainWeightsPage — SCR-07-02: Domain Match Weights Tuning Panel.
 * Supervisor-only. Sliders + live score preview.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { useMpaConfig } from '@/hooks/queries/useMpaConfig';
import { useUpdateDomainWeights } from '@/hooks/queries/useUpdateDomainWeights';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WeightSliders } from '@/components/admin/system-config/WeightSliders';
import { ScorePreviewTable } from '@/components/admin/system-config/ScorePreviewTable';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { AlertTriangle, Sliders } from 'lucide-react';

/** Fetch admin profiles for preview */
function useAdminProfiles() {
  return useQuery({
    queryKey: ['admin-profiles-preview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_admin_profiles')
        .select('id, full_name, industry_expertise, country_region_expertise, org_type_expertise')
        .eq('availability_status', 'available');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 60 * 1000,
  });
}

/** Fetch industry segments for dropdown */
function useIndustrySegments() {
  return useQuery({
    queryKey: ['industry-segments-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('industry_segments')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch countries for dropdown */
function useCountries() {
  return useQuery({
    queryKey: ['countries-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch org types for dropdown */
function useOrgTypes() {
  return useQuery({
    queryKey: ['org-types-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_types')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function DomainWeightsContent() {
  const navigate = useNavigate();
  const { data: config, isLoading } = useMpaConfig();
  const updateWeights = useUpdateDomainWeights();
  const { data: admins } = useAdminProfiles();
  const { data: industries } = useIndustrySegments();
  const { data: countries } = useCountries();
  const { data: orgTypes } = useOrgTypes();

  // Current DB values
  const currentL1 = parseInt(config?.find((c) => c.param_key === 'domain_weight_l1_industry')?.param_value ?? '50');
  const currentL2 = parseInt(config?.find((c) => c.param_key === 'domain_weight_l2_country')?.param_value ?? '30');
  const currentL3 = parseInt(config?.find((c) => c.param_key === 'domain_weight_l3_org_type')?.param_value ?? '20');

  // Local slider state
  const [l1, setL1] = useState<number | null>(null);
  const [l2, setL2] = useState<number | null>(null);
  const [l3, setL3] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Preview filters
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedOrgType, setSelectedOrgType] = useState<string | null>(null);

  // Use local values if set, otherwise current DB values
  const effectiveL1 = l1 ?? currentL1;
  const effectiveL2 = l2 ?? currentL2;
  const effectiveL3 = l3 ?? currentL3;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save all three weights sequentially (server validates sum)
      await updateConfig.mutateAsync({ paramKey: 'domain_weight_l1_industry', newValue: String(effectiveL1), changeReason: reason || undefined });
      await updateConfig.mutateAsync({ paramKey: 'domain_weight_l2_country', newValue: String(effectiveL2), changeReason: reason || undefined });
      await updateConfig.mutateAsync({ paramKey: 'domain_weight_l3_org_type', newValue: String(effectiveL3), changeReason: reason || undefined });
      setL1(null); setL2(null); setL3(null); setReason('');
    } catch {
      // Error handled by mutation
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => { setL1(50); setL2(30); setL3(20); };
  const handleCancel = () => { setL1(null); setL2(null); setL3(null); setReason(''); navigate('/admin/system-config'); };

  const adminProfiles = useMemo(() => (admins ?? []).map((a: any) => ({
    id: a.id,
    full_name: a.full_name ?? 'Unknown',
    expertise_industry_ids: a.industry_expertise ?? [],
    expertise_country_ids: a.country_region_expertise ?? [],
    expertise_org_type_ids: a.org_type_expertise ?? [],
  })), [admins]);

  if (isLoading) {
    return <div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-5xl">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/system-config">System Config</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Domain Match Weights</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        <Sliders className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Domain Match Weights</h1>
          <p className="text-sm text-muted-foreground">Tune how industry, country, and org type are weighted in auto-assignment</p>
        </div>
      </div>

      <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-300">
          Weight changes affect the <strong>next</strong> auto-assignment. Existing assignments are unaffected.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Sliders */}
        <div className="bg-card border rounded-lg p-5">
          <h2 className="font-semibold mb-4">Weight Configuration</h2>
          <WeightSliders
            l1={effectiveL1} l2={effectiveL2} l3={effectiveL3}
            onL1Change={setL1} onL2Change={setL2} onL3Change={setL3}
            reason={reason} onReasonChange={setReason}
            onSave={handleSave} onCancel={handleCancel} onReset={handleReset}
            isSaving={isSaving}
          />
        </div>

        {/* Right: Preview */}
        <div className="bg-card border rounded-lg p-5">
          <h2 className="font-semibold mb-4">Live Score Preview</h2>
          <div className="grid grid-cols-1 gap-3 mb-4">
            <Select value={selectedIndustry ?? ''} onValueChange={(v) => setSelectedIndustry(v || null)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select Industry" />
              </SelectTrigger>
              <SelectContent>
                {(industries ?? []).map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCountry ?? ''} onValueChange={(v) => setSelectedCountry(v || null)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select Country" />
              </SelectTrigger>
              <SelectContent>
                {(countries ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedOrgType ?? ''} onValueChange={(v) => setSelectedOrgType(v || null)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select Org Type" />
              </SelectTrigger>
              <SelectContent>
                {(orgTypes ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ScorePreviewTable
            admins={adminProfiles}
            currentWeights={{ l1: currentL1, l2: currentL2, l3: currentL3 }}
            proposedWeights={{ l1: effectiveL1, l2: effectiveL2, l3: effectiveL3 }}
            selectedIndustry={selectedIndustry}
            selectedCountry={selectedCountry}
            selectedOrgType={selectedOrgType}
          />
        </div>
      </div>
    </div>
  );
}

export default function DomainWeightsPage() {
  return (
    <FeatureErrorBoundary featureName="Domain Weights Tuning">
      <DomainWeightsContent />
    </FeatureErrorBoundary>
  );
}
