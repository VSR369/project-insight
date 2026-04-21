/**
 * LegalDocSectionNav — Vertical navigator for the 11 sections of the unified
 * Solution Provider Agreement. Shows per-section status indicators.
 */
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LegalSectionStatus = 'pending' | 'ai_modified' | 'reviewed' | 'approved';

export interface LegalSection {
  id: string;
  label: string;
}

export const LEGAL_SECTIONS: ReadonlyArray<LegalSection> = [
  { id: 'definitions', label: 'Definitions & Interpretation' },
  { id: 'engagement', label: 'Engagement Terms' },
  { id: 'ip', label: 'Intellectual Property' },
  { id: 'confidentiality', label: 'Confidentiality & NDA' },
  { id: 'data_protection', label: 'Data Protection & Privacy' },
  { id: 'submission', label: 'Submission & Evaluation' },
  { id: 'reward', label: 'Reward & Payment' },
  { id: 'liability', label: 'Liability & Indemnification' },
  { id: 'anti_disintermediation', label: 'Anti-Disintermediation' },
  { id: 'governing_law', label: 'Governing Law & Disputes' },
  { id: 'general', label: 'General Provisions' },
];

export interface LegalDocSectionNavProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  sectionStatuses?: Record<string, LegalSectionStatus>;
}

interface StatusIndicatorProps {
  status?: LegalSectionStatus;
}

function StatusIndicator({ status }: StatusIndicatorProps) {
  if (!status) return null;

  if (status === 'approved') {
    return (
      <CheckCircle2
        className="h-4 w-4 text-[hsl(var(--success,142_71%_45%))]"
        aria-label="Approved"
      />
    );
  }

  if (status === 'ai_modified') {
    return (
      <span className="inline-flex items-center gap-1" aria-label="AI modified">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="rounded bg-primary/10 px-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
          AI
        </span>
      </span>
    );
  }

  const dotClass =
    status === 'reviewed'
      ? 'bg-[hsl(var(--warning,38_92%_50%))]'
      : 'bg-muted-foreground/40';
  const aria = status === 'reviewed' ? 'Reviewed' : 'Pending';
  return <span className={cn('h-2 w-2 rounded-full', dotClass)} aria-label={aria} />;
}

export function LegalDocSectionNav({
  activeSection,
  onSectionChange,
  sectionStatuses,
}: LegalDocSectionNavProps) {
  return (
    <nav
      aria-label="Legal document sections"
      className="sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto w-[220px] shrink-0 rounded-md border bg-card p-2 hidden lg:block"
    >
      <ul className="flex flex-col gap-0.5">
        {LEGAL_SECTIONS.map((section, idx) => {
          const isActive = section.id === activeSection;
          const status = sectionStatuses?.[section.id];
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onSectionChange(section.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm border-l-2 border-transparent px-2 py-1.5 text-left text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive && 'border-primary bg-accent text-accent-foreground font-medium',
                )}
              >
                <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
                  {idx + 1}.
                </span>
                <span className="flex-1 truncate">{section.label}</span>
                <span className="flex shrink-0 items-center justify-end">
                  <StatusIndicator status={status} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default LegalDocSectionNav;
