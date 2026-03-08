/**
 * ConfigGroupAccordion — Accordion section for a param group in SCR-07-01.
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ConfigParamRow } from './ConfigParamRow';
import type { MpaConfigEntry } from '@/hooks/queries/useMpaConfig';

interface ConfigGroupAccordionProps {
  groupKey: string;
  title: string;
  description?: string;
  entries: MpaConfigEntry[];
  adminNameMap?: Record<string, string>;
  children?: React.ReactNode;
}

export function ConfigGroupAccordion({
  groupKey,
  title,
  description,
  entries,
  adminNameMap,
  children,
}: ConfigGroupAccordionProps) {
  return (
    <AccordionItem value={groupKey} id={`config-group-${groupKey}`}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{title}</span>
          <Badge variant="outline" className="text-xs">
            {entries.length} params
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {description && (
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
        )}
        {children}
        {entries.map((entry) => (
          <ConfigParamRow key={entry.id} entry={entry} adminNameMap={adminNameMap} />
        ))}
      </AccordionContent>
    </AccordionItem>
  );
}
