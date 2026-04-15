/**
 * PreviewSideNav — Sticky left scroll-spy navigation.
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface NavGroup {
  id: string;
  label: string;
  icon: string;
}

interface PreviewSideNavProps {
  groups: NavGroup[];
  filledCount: number;
  totalCount: number;
}

export function PreviewSideNav({ groups, filledCount, totalCount }: PreviewSideNavProps) {
  const [activeGroup, setActiveGroup] = useState(groups[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('preview-group-', '');
            setActiveGroup(id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    for (const g of groups) {
      const el = document.getElementById(`preview-group-${g.id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [groups]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(`preview-group-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="w-48 shrink-0 sticky top-16 self-start space-y-0.5 print:hidden hidden lg:block">
      {groups.map((g) => (
        <button
          key={g.id}
          onClick={() => scrollTo(g.id)}
          className={cn(
            'w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors',
            activeGroup === g.id
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          )}
        >
          <span className="mr-1.5">{g.icon}</span>
          {g.label}
        </button>
      ))}
      <div className="pt-3 mt-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground px-3">
          {filledCount}/{totalCount} complete
        </p>
      </div>
    </nav>
  );
}
