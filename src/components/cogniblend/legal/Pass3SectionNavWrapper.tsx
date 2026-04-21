/**
 * Pass3SectionNavWrapper — Wraps LegalDocSectionNav and provides:
 *  - text-match section tagging that survives TipTap re-renders
 *  - MutationObserver-driven re-tagging on every editor DOM change
 *  - IntersectionObserver-driven active-section tracking on scroll
 *  - robust window-relative smooth scroll with sticky-header offset
 *
 * Pure presentation — no supabase access. Caller passes a ref to the rendered
 * legal-doc container so we can locate <h2> headings and scroll to them.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { toast } from 'sonner';
import {
  LegalDocSectionNav,
  LEGAL_SECTIONS,
  type LegalSectionStatus,
} from './LegalDocSectionNav';

const SCROLL_OFFSET_PX = 88;

export interface Pass3SectionNavWrapperProps {
  containerRef: RefObject<HTMLElement>;
  contentKey: string | number;
  isAccepted: boolean;
}

/** Normalize heading text: lowercase, strip leading enumeration, collapse ws. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/^\s*(?:section\s+)?\d+(?:\.\d+)*\s*[\.\)\-–—:]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tagHeadings(root: HTMLElement | null): Map<string, HTMLElement> {
  const found = new Map<string, HTMLElement>();
  if (!root) return found;
  const allH2 = Array.from(root.querySelectorAll('h2')).filter(
    (h) => !h.closest('.legal-diff-removed-section'),
  ) as HTMLElement[];
  // Clear stale tags first.
  root.querySelectorAll('h2[data-section]').forEach((h) => h.removeAttribute('data-section'));
  const used = new Set<HTMLElement>();
  for (const section of LEGAL_SECTIONS) {
    const target = normalize(section.label);
    const match = allH2.find(
      (h) => !used.has(h) && normalize(h.textContent ?? '').includes(target),
    );
    if (match) {
      match.setAttribute('data-section', section.id);
      found.set(section.id, match);
      used.add(match);
    }
  }
  return found;
}

export function Pass3SectionNavWrapper({
  containerRef,
  contentKey,
  isAccepted,
}: Pass3SectionNavWrapperProps) {
  const [activeSection, setActiveSection] = useState<string>(LEGAL_SECTIONS[0].id);
  const taggedRef = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    let rafId: number | null = null;
    let intersectionObs: IntersectionObserver | null = null;

    const rebuild = () => {
      taggedRef.current = tagHeadings(root);
      // Reattach IntersectionObserver to the fresh elements.
      intersectionObs?.disconnect();
      intersectionObs = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .map((e) => (e.target as HTMLElement).getAttribute('data-section'))
            .filter((id): id is string => Boolean(id));
          if (visible.length > 0) setActiveSection(visible[0]);
        },
        { rootMargin: '-100px 0px -60% 0px', threshold: 0 },
      );
      taggedRef.current.forEach((el) => intersectionObs?.observe(el));
    };

    const scheduleRebuild = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        rebuild();
      });
    };

    rebuild();
    const mutationObs = new MutationObserver(scheduleRebuild);
    mutationObs.observe(root, { childList: true, subtree: true });

    return () => {
      mutationObs.disconnect();
      intersectionObs?.disconnect();
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
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
    const root = containerRef.current;
    if (!root) return;
    let target = taggedRef.current.get(id) ?? null;
    if (!target || !root.contains(target)) {
      // Fallback: re-tag now in case observer hasn't fired yet.
      taggedRef.current = tagHeadings(root);
      target = taggedRef.current.get(id) ?? null;
    }
    if (!target) {
      toast.info("This section isn't present in the current draft.");
      return;
    }
    setActiveSection(id);
    if (typeof window.scrollTo === 'function') {
      const top = target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET_PX;
      window.scrollTo({ top, behavior: 'smooth' });
    } else {
      target.scrollIntoView({ block: 'start' });
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
