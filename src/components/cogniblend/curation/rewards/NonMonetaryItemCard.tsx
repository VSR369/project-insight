/**
 * NonMonetaryItemCard — Individual non-monetary reward item card.
 */

import { Trash2, GripVertical, Award, Briefcase, Package, BookOpen, Key, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { NonMonetaryItem, NonMonetaryType } from '@/services/rewardStructureResolver';

interface NonMonetaryItemCardProps {
  item: NonMonetaryItem;
  editing: boolean;
  onUpdate: (patch: Partial<NonMonetaryItem>) => void;
  onDelete: () => void;
}

const TYPE_CONFIG: Record<NonMonetaryType, {
  icon: typeof Award;
  label: string;
  badgeClass: string;
}> = {
  recognition: {
    icon: Award,
    label: 'Recognition',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  opportunity: {
    icon: Briefcase,
    label: 'Opportunity',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
  },
  resource: {
    icon: Package,
    label: 'Resource',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  publication: {
    icon: BookOpen,
    label: 'Publication',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
  },
  access: {
    icon: Key,
    label: 'Access',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  other: {
    icon: HelpCircle,
    label: 'Other',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  },
};

export default function NonMonetaryItemCard({
  item,
  editing,
  onUpdate,
  onDelete,
}: NonMonetaryItemCardProps) {
  const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.other;
  const Icon = config.icon;

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-2 group hover:border-muted-foreground/30 hover:shadow-sm transition-all">
      {/* Header */}
      <div className="bg-muted/50 border-b border-border px-4 py-2.5 flex items-center gap-3">
        {editing && (
          <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
        )}
        <Icon className={cn('h-4 w-4 shrink-0', config.badgeClass.split(' ')[1])} />
        <span className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
          config.badgeClass,
        )}>
          {config.label}
        </span>
        {editing ? (
          <Input
            value={item.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Reward title"
            className="flex-1 border-none outline-none bg-transparent text-[13px] font-semibold h-7 p-0"
          />
        ) : (
          <span className="flex-1 text-[13px] font-semibold text-foreground">{item.title}</span>
        )}
        {editing && (
          <button
            type="button"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-1 transition-all"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-2.5">
        {editing ? (
          <Textarea
            value={item.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Describe this reward..."
            rows={2}
            className="border-none outline-none bg-transparent resize-none text-[12px] text-muted-foreground leading-relaxed w-full p-0"
          />
        ) : (
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {item.description || 'No description provided.'}
          </p>
        )}

        {item.isAISuggested && (
          <p className="text-[10px] text-purple-500 mt-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 inline-block" />
            AI suggested
          </p>
        )}
        {item.isFromSource && (
          <p className="text-[10px] text-primary mt-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
            From source
          </p>
        )}
      </div>
    </div>
  );
}
