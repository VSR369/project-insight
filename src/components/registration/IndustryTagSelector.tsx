/**
 * Industry Tag Selector (REG-001)
 * 
 * Multi-select tag component for choosing industries.
 * Shows selected industries as removable badges.
 */

import { useIndustries } from '@/hooks/queries/useRegistrationData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface IndustryTagSelectorProps {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function IndustryTagSelector({ value, onChange, disabled }: IndustryTagSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: industries, isLoading } = useIndustries();

  if (isLoading) return <Skeleton className="h-10 w-full" />;

  const items = industries ?? [];
  const selectedItems = items.filter((i) => value.includes(i.id));

  const toggleItem = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const removeItem = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between text-base font-normal h-auto min-h-10 py-2"
          >
            <span className="text-muted-foreground">
              {value.length === 0
                ? 'Select industries...'
                : `${value.length} selected`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full min-w-[300px] p-2" align="start">
          <div className="max-h-60 overflow-y-auto space-y-1">
            {items.map((item) => {
              const isSelected = value.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors text-left',
                    isSelected && 'bg-accent',
                  )}
                >
                  <div className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border shrink-0',
                    isSelected
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-input',
                  )}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  {item.name}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected tags */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((item) => (
            <Badge key={item.id} variant="secondary" className="gap-1 pr-1">
              {item.name}
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
