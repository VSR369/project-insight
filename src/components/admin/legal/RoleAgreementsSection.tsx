/**
 * RoleAgreementsSection — Lists role-grant agreements.
 *
 * Only RA_R2 is rendered as its own template card. The 5 workforce roles
 * (Creator, Curator, Expert Reviewer, Finance Coordinator, Legal Coordinator)
 * are intentionally NOT listed — they share the single PWA template above,
 * which is interpolated per role at signature time via {{user_role}}.
 */
import { Users, Info } from 'lucide-react';
import { PlatformAgreementCard } from './PlatformAgreementCard';
import type { LegalDocTemplate, DocumentCode } from '@/types/legal.types';

interface RoleAgreementsSectionProps {
  templates: LegalDocTemplate[];
  onEdit: (id: string) => void;
  onCreate: (code: DocumentCode) => void;
}

export function RoleAgreementsSection({ templates, onEdit, onCreate }: RoleAgreementsSectionProps) {
  const raR2Templates = templates.filter((t) => t.document_code === 'RA_R2');

  return (
    <section id="role-agreements">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Role Agreements (1)</h2>
      </div>
      <div className="rounded-lg border border-primary/10 bg-primary/5 p-3 mb-4 flex gap-2">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          <strong>RA_R2</strong> is the personal role agreement signed by Seeker Org Admins
          (in addition to the org-level <strong>SKPA</strong>). The other 5 workforce roles —
          Creator, Curator, Expert Reviewer, Finance Coordinator and Legal Coordinator —
          are all governed by the single <strong>PWA</strong> template shown above. The role label
          is injected dynamically at signature time via the <code className="text-xs px-1 py-0.5 rounded bg-muted">{`{{user_role}}`}</code> variable.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PlatformAgreementCard
          code="RA_R2"
          templates={raR2Templates}
          onEdit={onEdit}
          onCreate={() => onCreate('RA_R2')}
        />
      </div>
    </section>
  );
}
