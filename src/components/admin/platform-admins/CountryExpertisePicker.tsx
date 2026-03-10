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
import { useCountries } from '@/hooks/queries/useMasterData';

interface CountryExpertisePickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  maxItems?: number;
}

export function CountryExpertisePicker({ value, onChange, disabled, maxItems }: CountryExpertisePickerProps) {
  const [open, setOpen] = useState(false);
  const { data: countries } = useCountries();

  const selectedNames = countries?.filter((c) => value.includes(c.id)) ?? [];

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
              : 'Select countries...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search countries..." />
            <CommandList>
              <CommandEmpty>No countries found.</CommandEmpty>
              <CommandGroup>
                {countries?.map((country) => (
                  <CommandItem
                    key={country.id}
                    onSelect={() => toggle(country.id)}
                    className="cursor-pointer"
                  >
                    <div className={`mr-2 h-4 w-4 border rounded flex items-center justify-center ${value.includes(country.id) ? 'bg-primary border-primary' : 'border-input'}`}>
                      {value.includes(country.id) && <span className="text-primary-foreground text-xs">✓</span>}
                    </div>
                    {country.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedNames.map((c) => (
            <Badge key={c.id} variant="secondary" className="text-xs gap-1">
              {c.name}
              {!disabled && (
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggle(c.id)} />
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
