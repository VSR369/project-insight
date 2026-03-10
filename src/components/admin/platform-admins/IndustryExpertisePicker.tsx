import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState } from 'react';
import { useIndustrySegments } from '@/hooks/queries/useMasterData';

interface IndustryExpertisePickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  maxItems?: number;
}

export function IndustryExpertisePicker({ value, onChange, disabled, maxItems }: IndustryExpertisePickerProps) {
  const [open, setOpen] = useState(false);
  const { data: industries } = useIndustrySegments();

  const selectedNames = industries?.filter((i) => value.includes(i.id)) ?? [];

  const isAtCap = maxItems != null && value.length >= maxItems;

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else if (!isAtCap) {
      onChange([...value, id]);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start" disabled={disabled}>
            {value.length > 0
              ? `${value.length}${maxItems ? `/${maxItems}` : ''} selected`
              : 'Select industries...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search industries..." />
            <CommandList>
              <CommandEmpty>No industries found.</CommandEmpty>
              <CommandGroup>
                {industries?.map((industry) => {
                  const isSelected = value.includes(industry.id);
                  const isDisabledItem = !isSelected && isAtCap;
                  return (
                    <CommandItem
                      key={industry.id}
                      onSelect={() => !isDisabledItem && toggle(industry.id)}
                      className={isDisabledItem ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    >
                      <div className={`mr-2 h-4 w-4 border rounded flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-input'}`}>
                        {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                      </div>
                      {industry.name}
                    </CommandItem>
                  );
                })}
                    </div>
                    {industry.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {isAtCap && (
        <p className="text-xs text-muted-foreground">Maximum {maxItems} allowed for this tier.</p>
      )}

      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedNames.map((ind) => (
            <Badge key={ind.id} variant="secondary" className="text-xs gap-1">
              {ind.name}
              {!disabled && (
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggle(ind.id)}
                />
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
