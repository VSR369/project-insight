/**
 * RoleTemplateOverridesSection
 *
 * Renders one card per role-level legal document the seeker organization is
 * allowed to override, mirroring the engagement-model rules enforced by the
 * SQL function `resolve_active_legal_template`.
 *
 *   Marketplace (MP)   → only PWA(LC/FC) overridable.
 *   Aggregator  (AGG)  → SPA, SKPA, PWA(CU/ER), PWA(LC/FC) all overridable.
 *
 * When no org override exists the card shows "Platform default in use" and
 * offers a "Create override" action that pre-fills with the platform template.
 *
 * NOTE: We model PWA-for-CU/ER and PWA-for-LC/FC as a single PWA template per
 * org. The SQL resolver returns the same row regardless of role bucket — this
 * matches platform behaviour where the org has one PWA. The two cards exist
 * only to communicate which roles the override applies to.
 */
import { useMemo, useState } from 'react';
import { Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useOrgLegalTemplates, useCreateOrgLegalTemplate, useUpdateOrgLegalTemplate, type OrgLegalTemplateRow } from '@/hooks/queries/useOrgLegalTemplates';
import { usePlatformLegalTemplate } from '@/hooks/queries/usePlatformLegalTemplate';

interface RoleTemplateOverridesSectionProps {
  organizationId: string;
  tenantId: string;
  /** 'MP' | 'AGG' (case-insensitive); anything else is treated as MP. */
  engagementModel: string | undefined;
}

interface OverrideSpec {
  docCode: 'SPA' | 'SKPA' | 'PWA';
  /** Distinct UI bucket — used as React key + label */
  bucket: 'SPA' | 'SKPA' | 'PWA_CU_ER' | 'PWA_LC_FC';
  title: string;
  appliesToRoles: string;
  description: string;
}

const ALL_OVERRIDES: OverrideSpec[] = [
  {
    docCode: 'SPA',
    bucket: 'SPA',
    title: 'Solution Provider Platform Agreement',
    appliesToRoles: 'External Solution Providers (Solvers)',
    description:
      'Signed once by every Solution Provider on first login when participating in your AGG challenges.',
  },
  {
    docCode: 'SKPA',
    bucket: 'SKPA',
    title: 'Seeking Organization Platform Agreement',
    appliesToRoles: 'Seeking-Org Admins, Challenge Creators',
    description:
      'Signed once by every Seeker Admin and Challenge Creator on first login.',
  },
  {
    docCode: 'PWA',
    bucket: 'PWA_CU_ER',
    title: 'Prize & Work Agreement — Curators / Expert Reviewers',
    appliesToRoles: 'Curators (CU), Expert Reviewers (ER)',
    description:
      'Signed by curators and expert reviewers on first login. AGG-only override.',
  },
  {
    docCode: 'PWA',
    bucket: 'PWA_LC_FC',
    title: 'Prize & Work Agreement — Legal / Finance Coordinators',
    appliesToRoles: 'Legal Coordinator (LC), Finance Coordinator (FC)',
    description:
      'Signed by Legal and Finance coordinators on first login. Always overridable by the seeker organization (both MP and AGG).',
  },
];

function isAggregator(engagementModel: string | undefined): boolean {
  if (!engagementModel) return false;
  const m = engagementModel.toUpperCase();
  return m === 'AGG' || m === 'AGGREGATOR';
}

function visibleOverrides(engagementModel: string | undefined): OverrideSpec[] {
  const agg = isAggregator(engagementModel);
  // Mirror of resolve_active_legal_template logic
  return ALL_OVERRIDES.filter((o) => {
    if (o.bucket === 'PWA_LC_FC') return true; // both models
    return agg;                                  // SPA / SKPA / PWA_CU_ER => AGG only
  });
}

export function RoleTemplateOverridesSection({
  organizationId,
  tenantId,
  engagementModel,
}: RoleTemplateOverridesSectionProps) {
  const { data: orgTemplates = [], isLoading } = useOrgLegalTemplates(organizationId);
  const overrides = useMemo(() => visibleOverrides(engagementModel), [engagementModel]);

  const [editing, setEditing] = useState<OverrideSpec | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Role-Level Legal Templates</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Override the platform&apos;s default first-login agreements with your organization&apos;s
        own wording. Each override goes through the same {'{{variable}}'} interpolation as the
        platform default.
      </p>

      {!isAggregator(engagementModel) && (
        <Alert>
          <AlertDescription className="text-sm">
            Your engagement model is <strong>Marketplace (MP)</strong>. Only the
            <strong> Legal / Finance Coordinator PWA</strong> can be overridden by your
            organization. SPA, SKPA and Curator/Expert PWA always use the platform default.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {overrides.map((spec) => (
          <OverrideCard
            key={spec.bucket}
            spec={spec}
            orgTemplate={orgTemplates.find((t) => t.document_code === spec.docCode)}
            onEdit={() => setEditing(spec)}
          />
        ))}
      </div>

      {editing && (
        <RoleTemplateEditorDialog
          open
          spec={editing}
          organizationId={organizationId}
          tenantId={tenantId}
          existing={orgTemplates.find((t) => t.document_code === editing.docCode)}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

/* ───────────────────────────────────────────────────────── */

function OverrideCard({
  spec,
  orgTemplate,
  onEdit,
}: {
  spec: OverrideSpec;
  orgTemplate: OrgLegalTemplateRow | undefined;
  onEdit: () => void;
}) {
  const hasOverride = !!orgTemplate;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>{spec.title}</span>
          <Badge variant={hasOverride ? 'default' : 'secondary'}>
            {hasOverride ? 'Org override' : 'Platform default'}
          </Badge>
        </CardTitle>
        <CardDescription>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Applies to
          </span>
          <br />
          <span className="text-sm">{spec.appliesToRoles}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{spec.description}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {hasOverride ? `v${orgTemplate?.version ?? '1.0'}` : 'No override created'}
          </span>
          <Button size="sm" variant={hasOverride ? 'outline' : 'default'} onClick={onEdit}>
            {hasOverride ? 'Edit override' : 'Create override'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────────────────────────────────────── */

function RoleTemplateEditorDialog({
  open,
  spec,
  organizationId,
  tenantId,
  existing,
  onClose,
}: {
  open: boolean;
  spec: OverrideSpec;
  organizationId: string;
  tenantId: string;
  existing: OrgLegalTemplateRow | undefined;
  onClose: () => void;
}) {
  const { data: platformTemplate } = usePlatformLegalTemplate(spec.docCode);
  const createMut = useCreateOrgLegalTemplate();
  const updateMut = useUpdateOrgLegalTemplate();

  // existing.template_content is the user's saved override; fall back to platform default
  const initial =
    (existing as unknown as { template_content?: string | null })?.template_content ??
    platformTemplate?.content ??
    '';

  const [content, setContent] = useState<string>(initial);
  // Keep local state in sync if platform template loads after open
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { if (!existing && platformTemplate?.content && !content) setContent(platformTemplate.content); }, [platformTemplate?.content]);

  const handleSave = () => {
    if (existing) {
      updateMut.mutate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ id: existing.id, organization_id: organizationId, template_content: content } as any),
        { onSuccess: onClose },
      );
    } else {
      createMut.mutate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({
          organization_id: organizationId,
          tenant_id: tenantId,
          document_name: spec.title,
          document_code: spec.docCode,
          document_type: spec.docCode,
          template_content: content,
          version: '1.0',
          version_status: 'ACTIVE',
        } as any),
        { onSuccess: onClose },
      );
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {existing ? 'Edit' : 'Create'} override — {spec.title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-2">
          <Alert>
            <AlertDescription className="text-xs">
              Use {'{{variable}}'} placeholders. Common variables: <code>seeker_org_name</code>,{' '}
              <code>seeker_org_address</code>, <code>user_full_name</code>, <code>user_role</code>,{' '}
              <code>jurisdiction</code>, <code>governing_law</code>, <code>acceptance_date</code>.
            </AlertDescription>
          </Alert>
          <Label>Template content</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[360px] font-mono text-sm"
            placeholder="Paste your organization's agreement here…"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending || !content.trim()}>
            {isPending ? 'Saving…' : existing ? 'Save override' : 'Create override'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
