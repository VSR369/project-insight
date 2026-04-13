/**
 * Outcomes Tag Selector
 * 
 * Free-text tag input for selecting outcomes a provider can deliver.
 * Allows adding custom outcome tags with a max of 10.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTED_OUTCOMES = [
  'Cost Reduction',
  'Revenue Growth',
  'Process Optimization',
  'Digital Transformation',
  'Risk Mitigation',
  'Customer Experience',
  'Market Expansion',
  'Operational Efficiency',
  'Innovation Acceleration',
  'Compliance & Governance',
  'Sustainability Impact',
  'Talent Development',
];

interface OutcomesTagSelectorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  disabled?: boolean;
}

export function OutcomesTagSelector({
  value,
  onChange,
  maxTags = 10,
  disabled,
}: OutcomesTagSelectorProps) {
  const [input, setInput] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= maxTags) return;
    onChange([...value, trimmed]);
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(input);
    }
  };

  const unusedSuggestions = SUGGESTED_OUTCOMES.filter((s) => !value.includes(s));

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div className="flex gap-2">
        <Input
          placeholder="Type an outcome and press Enter..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || value.length >= maxTags}
          className="text-base"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => addTag(input)}
          disabled={disabled || !input.trim() || value.length >= maxTags}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {unusedSuggestions.length > 0 && value.length < maxTags && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Suggestions:</p>
          <div className="flex flex-wrap gap-1">
            {unusedSuggestions.slice(0, 8).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                disabled={disabled}
                className={cn(
                  'text-xs px-2 py-1 rounded-md border border-dashed',
                  'border-muted-foreground/30 text-muted-foreground',
                  'hover:border-primary hover:text-primary transition-colors',
                )}
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {value.length}/{maxTags} outcomes selected
      </p>
    </div>
  );
}
