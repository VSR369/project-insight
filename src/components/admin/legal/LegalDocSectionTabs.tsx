/**
 * LegalDocSectionTabs — Tab bar for IPAA sectioned documents.
 * Sections: abstract, milestone, detailed, final_award.
 */
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const IPAA_SECTIONS = [
  { value: 'abstract', label: 'Abstract' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'final_award', label: 'Final Award' },
] as const;

export type IpaaSectionKey = (typeof IPAA_SECTIONS)[number]['value'];

interface LegalDocSectionTabsProps {
  activeSection: IpaaSectionKey;
  onSectionChange: (section: IpaaSectionKey) => void;
}

export function LegalDocSectionTabs({
  activeSection,
  onSectionChange,
}: LegalDocSectionTabsProps) {
  return (
    <Tabs
      value={activeSection}
      onValueChange={(v) => onSectionChange(v as IpaaSectionKey)}
      className="px-4 pt-2"
    >
      <TabsList className="grid w-full grid-cols-4">
        {IPAA_SECTIONS.map((s) => (
          <TabsTrigger key={s.value} value={s.value}>
            {s.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
