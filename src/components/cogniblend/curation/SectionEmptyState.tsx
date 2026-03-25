/**
 * SectionEmptyState — Format-aware contextual empty state for curator sections.
 * Replaces the generic "Click to add content or Generate with AI" placeholder.
 */

import { FileText, List, Table, Calendar, CircleDot, Sparkles } from "lucide-react";
import { SECTION_FORMAT_CONFIG } from "@/lib/cogniblend/curationSectionFormats";

interface SectionEmptyStateProps {
  sectionKey: string;
  label: string;
}

const FORMAT_EMPTY_STATES: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}> = {
  rich_text: {
    icon: FileText,
    message: "Write content or generate with AI",
  },
  line_items: {
    icon: List,
    message: "Add items or let AI generate them",
  },
  table: {
    icon: Table,
    message: "Add criteria rows or generate with AI",
  },
  schedule_table: {
    icon: Calendar,
    message: "Define schedule phases or generate with AI",
  },
  single_select: {
    icon: CircleDot,
    message: "Select an option from the available choices",
  },
  multi_select: {
    icon: CircleDot,
    message: "Select one or more options",
  },
  date: {
    icon: Calendar,
    message: "Set a date for this section",
  },
};

export function SectionEmptyState({ sectionKey, label }: SectionEmptyStateProps) {
  const formatConfig = SECTION_FORMAT_CONFIG[sectionKey];
  const format = formatConfig?.format ?? "rich_text";
  const emptyState = FORMAT_EMPTY_STATES[format] ?? FORMAT_EMPTY_STATES.rich_text;
  const Icon = emptyState.icon;

  return (
    <div className="border-2 border-dashed border-border rounded-xl bg-muted/30 py-10 flex flex-col items-center justify-center gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-5 w-5" />
        <Sparkles className="h-4 w-4 text-amber-400" />
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        {emptyState.message}
      </p>
    </div>
  );
}
