/**
 * TopicSelector - Select topic for card creation
 */

import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { usePulseCardTopics } from '@/hooks/queries/usePulseCardTopics';
import { useState } from 'react';

interface TopicSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function TopicSelector({
  value,
  onChange,
  disabled = false,
  className,
}: TopicSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: topics = [], isLoading } = usePulseCardTopics();

  const selectedTopic = topics.find((t) => t.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select topic"
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between min-h-[44px]",
            !value && "text-muted-foreground",
            className
          )}
        >
          {selectedTopic ? (
            <span className="flex items-center gap-2">
              {selectedTopic.icon && <span>{selectedTopic.icon}</span>}
              {selectedTopic.name}
            </span>
          ) : (
            "Select a topic..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search topics..." />
          <CommandList>
            <CommandEmpty>No topics found.</CommandEmpty>
            <CommandGroup>
              {topics.map((topic) => (
                <CommandItem
                  key={topic.id}
                  value={topic.name}
                  onSelect={() => {
                    onChange(topic.id);
                    setOpen(false);
                  }}
                  className="min-h-[44px]"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === topic.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex items-center gap-2">
                    {topic.icon && <span>{topic.icon}</span>}
                    {topic.name}
                  </span>
                  {topic.card_count > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {topic.card_count} cards
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
