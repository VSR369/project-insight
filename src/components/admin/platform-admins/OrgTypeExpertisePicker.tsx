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
import { useOrganizationTypes } from '@/hooks/queries/useMasterData';

interface OrgTypeExpertisePickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  maxItems?: number;
}

export function OrgTypeExpertisePicker({ value, onChange, disabled, maxItems }: OrgTypeExpertisePickerProps) {
  const [open, setOpen] = useState(false);
  const { data: orgTypes } = useOrganizationTypes();

  const selectedItems = orgTypes?.filter((ot) => value.includes(ot.id)) ?? [];

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start" disabled={disabled}>
            {value.length > 0 ? `${value.length} selected` : 'Select organization types...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search organization types..." />
            <CommandList>
              <CommandEmpty>No organization types found.</CommandEmpty>
              <CommandGroup>
                {orgTypes?.map((ot) => (
                  <CommandItem
                    key={ot.id}
                    onSelect={() => toggle(ot.id)}
                    className="cursor-pointer"
                  >
                    <div className={`mr-2 h-4 w-4 border rounded flex items-center justify-center ${value.includes(ot.id) ? 'bg-primary border-primary' : 'border-input'}`}>
                      {value.includes(ot.id) && <span className="text-primary-foreground text-xs">✓</span>}
                    </div>
                    {ot.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedItems.map((ot) => (
            <Badge key={ot.id} variant="secondary" className="text-xs gap-1">
              {ot.name}
              {!disabled && (
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggle(ot.id)} />
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
