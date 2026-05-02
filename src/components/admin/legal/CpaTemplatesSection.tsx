/**
 * CpaTemplatesSection — Three Challenge Participation Agreement templates,
 * one per governance mode (Quick / Structured / Controlled).
 */
import { ScrollText } from 'lucide-react';
import { PlatformAgreementCard } from './PlatformAgreementCard';
import { CPA_CODE_MAP, CPA_GOVERNANCE_MODES, CPA_MODE_DESCRIPTIONS } from '@/constants/cpaDefaults.constants';
import type { LegalDocTemplate, DocumentCode } from '@/types/legal.types';

interface CpaTemplatesSectionProps {
  templates: LegalDocTemplate[];
  onEdit: (id: string) => void;
  onCreate: (code: DocumentCode) => void;
}

export function CpaTemplatesSection({ templates, onEdit, onCreate }: CpaTemplatesSectionProps) {
  const byCode = templates.reduce<Record<string, LegalDocTemplate[]>>((acc, t) => {
    if (t.document_code) {
      acc[t.document_code] = acc[t.document_code] || [];
      acc[t.document_code].push(t);
    }
    return acc;
  }, {});

  return (
    <section id="cpa-templates">
      <div className="flex items-center gap-2 mb-4">
        <ScrollText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Challenge Participation Agreements ({CPA_GOVERNANCE_MODES.length})</h2>
      </div>
      <div className="rounded-lg border border-primary/10 bg-primary/5 p-3 mb-4">
        <p className="text-sm text-muted-foreground">
          One CPA template per governance mode. Each is assembled into a per-challenge CPA
          (with variables like <code className="text-xs px-1 py-0.5 rounded bg-muted">{`{{challenge_title}}`}</code>,{' '}
          <code className="text-xs px-1 py-0.5 rounded bg-muted">{`{{total_fee}}`}</code>) when a challenge is published in that mode.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {CPA_GOVERNANCE_MODES.map((mode) => {
          const code = CPA_CODE_MAP[mode] as DocumentCode;
          return (
            <div key={mode} className="space-y-2">
              <PlatformAgreementCard
                code={code}
                templates={byCode[code] ?? []}
                onEdit={onEdit}
                onCreate={() => onCreate(code)}
              />
              <p className="text-xs text-muted-foreground px-1">{CPA_MODE_DESCRIPTIONS[mode]}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
