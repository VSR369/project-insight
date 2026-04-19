/**
 * Pass3SectionNavWrapper — Wraps LegalDocSectionNav and provides:
 *  - active-section tracking
 *  - smooth scroll to the corresponding `data-section` heading
 *  - per-section status derived from `isAccepted` (all sections start as
 *    `ai_modified` after Pass 3 runs, flip to `approved` on acceptance)
 *
 * Pure presentation — no supabase access. Caller passes container ref so we
 * can post-process H2 headings and attach `data-section` attributes that
 * match LEGAL_SECTIONS section ids.
 */
import { useEffect, useMemo, useState, type RefObject } from 'react';
import {
  LegalDocSectionNav,
  LEGAL_SECTIONS,
  type LegalSectionStatus,
} from './LegalDocSectionNav';

export interface Pass3SectionNavWrapperProps {
  /** Ref to the container element holding the rendered legal-doc HTML. */
  containerRef: RefObject<HTMLElement>;
  /** Re-run keying — bump to re-tag headings after content swaps. */
  contentKey: string | number;
  /** Whether Pass 3 has been accepted (drives section status). */
  isAccepted: boolean;
}

function tagHeadings(root: HTMLElement | null): void {
  if (!root) return;
  const headings = root.querySelectorAll('h2');
  let idx = 0;
  headings.forEach((h) => {
    if (idx >= LEGAL_SECTIONS.length) return;
    const sec = LEGAL_SECTIONS[idx];
    h.setAttribute('data-section', sec.id);
    idx += 1;
  });
}

export function Pass3SectionNavWrapper({
  containerRef,
  contentKey,
  isAccepted,
}: Pass3SectionNavWrapperProps) {
  const [activeSection, setActiveSection] = useState<string>(LEGAL_SECTIONS[0].id);

  // Tag headings whenever the content changes.
  useEffect(() => {
    // Defer until TipTap has flushed the DOM update.
    const id = window.setTimeout(() => tagHeadings(containerRef.current), 50);
    return () => window.clearTimeout(id);
  }, [containerRef, contentKey]);

  const sectionStatuses = useMemo<Record<string, LegalSectionStatus>>(() => {
    const status: LegalSectionStatus = isAccepted ? 'approved' : 'ai_modified';
    return LEGAL_SECTIONS.reduce<Record<string, LegalSectionStatus>>(
      (acc, s) => {
        acc[s.id] = status;
        return acc;
      },
      {},
    );
  }, [isAccepted]);

  const handleChange = (id: string) => {
    setActiveSection(id);
    const root = containerRef.current;
    if (!root) return;
    const target = root.querySelector(`[data-section="${id}"]`);
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <LegalDocSectionNav
      activeSection={activeSection}
      onSectionChange={handleChange}
      sectionStatuses={sectionStatuses}
    />
  );
}

export default Pass3SectionNavWrapper;
