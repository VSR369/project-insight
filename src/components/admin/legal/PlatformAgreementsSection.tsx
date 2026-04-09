/**
 * PlatformAgreementsSection — Shows the 3 new platform agreements (SPA, SKPA, PWA).
 */
import { Shield } from 'lucide-react';
import { PlatformAgreementCard } from './PlatformAgreementCard';
import type { LegalDocTemplate, DocumentCode } from '@/types/legal.types';

const PLATFORM_CODES: DocumentCode[] = ['SPA', 'SKPA', 'PWA'];

interface PlatformAgreementsSectionProps {
  templates: LegalDocTemplate[];
  onEdit: (id: string) => void;
  onCreate: (code: DocumentCode) => void;
}

export function PlatformAgreementsSection({ templates, onEdit, onCreate }: PlatformAgreementsSectionProps) {
  const templatesByCode = templates.reduce<Record<string, LegalDocTemplate[]>>(
    (acc, t) => {
      if (t.document_code) {
        acc[t.document_code] = acc[t.document_code] || [];
        acc[t.document_code].push(t);
      }
      return acc;
    },
    {},
  );

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Platform Agreements (3)</h2>
      </div>
      <div className="rounded-lg border border-primary/10 bg-primary/5 p-3 mb-4">
        <p className="text-sm text-muted-foreground">
          These three agreements form the legal foundation for the platform. <strong>SPA</strong> governs
          solver participation, <strong>SKPA</strong> governs seeker organizations, and <strong>PWA</strong> covers
          challenge-specific prize and work terms.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {PLATFORM_CODES.map((code) => (
          <PlatformAgreementCard
            key={code}
            code={code}
            templates={templatesByCode[code] ?? []}
            onEdit={onEdit}
            onCreate={() => onCreate(code)}
          />
        ))}
      </div>
    </section>
  );
}
