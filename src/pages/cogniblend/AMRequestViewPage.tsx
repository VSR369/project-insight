/**
 * AMRequestViewPage — Read-only view of what the AM originally entered.
 * Shows only AM-scoped fields: Title, Problem, Outcomes, Budget, Timeline, Urgency.
 * Route: /cogni/my-requests/:id/view
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { SafeHtmlRenderer } from '@/components/ui/SafeHtmlRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

interface AMBriefData {
  id: string;
  title: string;
  problem_statement: string | null;
  scope: string | null;
  master_status: string | null;
  current_phase: number | null;
  phase_status: string | null;
  operating_model: string | null;
  reward_structure: any;
  phase_schedule: any;
  eligibility: any;
  extended_brief: any;
  created_at: string;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  IN_PREPARATION: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  ACTIVE: { label: 'Active', className: 'bg-blue-100 text-blue-700' },
  UNDER_REVIEW: { label: 'Under Review', className: 'bg-violet-100 text-violet-700' },
  PUBLISHED: { label: 'Published', className: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  RETURNED: { label: 'Returned', className: 'bg-orange-100 text-orange-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
};

const URGENCY_LABELS: Record<string, { label: string; className: string }> = {
  standard: { label: 'Standard', className: 'bg-muted text-muted-foreground' },
  urgent: { label: 'Urgent', className: 'bg-amber-100 text-amber-700' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function InfoField({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      <div className="text-sm text-foreground">{value || <span className="text-muted-foreground italic">Not provided</span>}</div>
    </div>
  );
}

export default function AMRequestViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: brief, isLoading, error } = useQuery({
    queryKey: ['am-request-view', id],
    queryFn: async (): Promise<AMBriefData> => {
      const { data, error } = await supabase
        .from('challenges')
        .select('id, title, problem_statement, scope, master_status, current_phase, phase_status, operating_model, reward_structure, phase_schedule, eligibility, extended_brief, created_at')
        .eq('id', id!)
        .single();
      if (error) throw new Error(error.message);
      return data as AMBriefData;
    },
    enabled: !!id,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Unable to load request details.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/cogni/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Parse structured fields
  const reward = typeof brief.reward_structure === 'string' ? JSON.parse(brief.reward_structure) : brief.reward_structure;
  const schedule = typeof brief.phase_schedule === 'string' ? JSON.parse(brief.phase_schedule) : brief.phase_schedule;
  const elig = typeof brief.eligibility === 'string' ? JSON.parse(brief.eligibility) : brief.eligibility;
  const extBrief = typeof brief.extended_brief === 'string' ? JSON.parse(brief.extended_brief) : brief.extended_brief;

  const currency = reward?.currency || 'USD';
  const budgetMin = reward?.budget_min;
  const budgetMax = reward?.budget_max;
  const timeline = schedule?.expected_timeline;
  const urgency = elig?.urgency || 'standard';
  const amApproval = extBrief?.am_approval_required;
  const statusBadge = STATUS_BADGE[brief.master_status ?? 'DRAFT'] ?? STATUS_BADGE.DRAFT;
  const urgencyBadge = URGENCY_LABELS[urgency] ?? URGENCY_LABELS.standard;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cogni/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Dashboard
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg font-bold text-foreground">{brief.title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Submitted {formatDate(brief.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className={statusBadge.className}>
                {statusBadge.label}
              </Badge>
              <Badge variant="secondary" className={urgencyBadge.className}>
                {urgencyBadge.label}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-5 space-y-6">
          {/* Problem Statement */}
          <InfoField
            label="Problem Summary"
            icon={FileText}
            value={
              brief.problem_statement ? (
                <SafeHtmlRenderer html={brief.problem_statement} />
              ) : null
            }
          />

          {/* Expected Outcomes / Solution Expectations */}
          <InfoField
            label="Expected Outcomes"
            value={
              brief.scope ? (
                <p className="whitespace-pre-wrap leading-relaxed">{brief.scope}</p>
              ) : null
            }
          />

          {/* Budget */}
          {(budgetMin || budgetMax) && (
            <InfoField
              label="Budget Range"
              icon={DollarSign}
              value={
                budgetMin && budgetMax
                  ? `${formatCurrency(budgetMin, currency)} – ${formatCurrency(budgetMax, currency)}`
                  : budgetMin
                    ? `From ${formatCurrency(budgetMin, currency)}`
                    : `Up to ${formatCurrency(budgetMax, currency)}`
              }
            />
          )}

          {/* Timeline Urgency */}
          {timeline && (
            <InfoField
              label="Expected Timeline"
              icon={Clock}
              value={timeline}
            />
          )}

          {/* AM Approval Toggle */}
          {amApproval !== undefined && (
            <InfoField
              label="Approval Before Publication"
              value={amApproval ? 'Yes — AM approval required before publishing' : 'No — Auto-publish when ready'}
            />
          )}

          {/* Beneficiaries Mapping (if provided) */}
          {extBrief?.beneficiaries_mapping && (
            <InfoField
              label="Beneficiaries & Benefits Mapping"
              value={<p className="whitespace-pre-wrap leading-relaxed">{extBrief.beneficiaries_mapping}</p>}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
