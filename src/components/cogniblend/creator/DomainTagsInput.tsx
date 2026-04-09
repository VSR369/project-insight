/**
 * DomainTagsInput — Free-form tag input for challenge domain tags.
 * Users type custom tags and press Enter/comma to add. No fixed dropdown.
 * Shows removable badge chips and a few clickable suggestion chips.
 */

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { X, Tag } from 'lucide-react';

const SUGGESTION_CHIPS = [
  'AI/ML', 'Supply Chain', 'IoT', 'Digital Transformation',
  'Sustainability', 'Cybersecurity', 'Data Analytics', 'Robotics',
  'FinTech', 'Clean Energy', 'Biotech', 'Manufacturing',
];

interface DomainTagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
  required?: boolean;
}

export function DomainTagsInput({ value, onChange, error, required }: DomainTagsInputProps) {
  const [input, setInput] = useState('');

  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
  }, [value, onChange]);

  const removeTag = useCallback((tag: string) => {
    onChange(value.filter((t) => t !== tag));
  }, [value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      addTag(input);
      setInput('');
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }, [input, value, addTag, removeTag]);

  const unusedSuggestions = SUGGESTION_CHIPS.filter((s) => !value.includes(s));

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        Domain Tags {required && <span className="text-destructive">*</span>}
      </Label>
      <p className="text-xs text-muted-foreground">
        Add tags that describe the challenge domain — type and press Enter, or click suggestions below.
      </p>

      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {value.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No domain tags yet.</p>
        )}
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
            <Tag className="h-3 w-3" />{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Input */}
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a domain tag and press Enter (e.g., AI/ML, Supply Chain, IoT)"
        className="text-base"
      />

      {/* Suggestion chips */}
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unusedSuggestions.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
