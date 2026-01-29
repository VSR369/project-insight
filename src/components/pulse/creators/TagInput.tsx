/**
 * Tag Input Component
 * Autocomplete tag selection from pulse_tags table
 */

import { useState, useCallback } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { usePulseTags, useCreatePulseTag } from '@/hooks/queries/usePulseStats';
import { toast } from 'sonner';

interface TagInputProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  disabled?: boolean;
}

export function TagInput({ 
  selectedTags, 
  onChange, 
  maxTags = 10,
  disabled 
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: allTags = [] } = usePulseTags();
  const createTag = useCreatePulseTag();

  // Filter suggestions based on input
  const suggestions = allTags
    .filter(tag => 
      tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedTags.includes(tag.id)
    )
    .slice(0, 5);

  const handleAddTag = useCallback((tagId: string) => {
    if (selectedTags.length >= maxTags) {
      toast.error(`Maximum ${maxTags} tags allowed`);
      return;
    }
    if (!selectedTags.includes(tagId)) {
      onChange([...selectedTags, tagId]);
    }
    setInputValue('');
    setShowSuggestions(false);
  }, [selectedTags, maxTags, onChange]);

  const handleRemoveTag = useCallback((tagId: string) => {
    onChange(selectedTags.filter(id => id !== tagId));
  }, [selectedTags, onChange]);

  const handleCreateTag = async () => {
    if (!inputValue.trim()) return;
    if (selectedTags.length >= maxTags) {
      toast.error(`Maximum ${maxTags} tags allowed`);
      return;
    }

    try {
      const newTag = await createTag.mutateAsync({ name: inputValue.trim() });
      handleAddTag(newTag.id);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleAddTag(suggestions[0].id);
      } else if (inputValue.trim()) {
        handleCreateTag();
      }
    }
  };

  // Get tag names for display
  const selectedTagObjects = allTags.filter(tag => selectedTags.includes(tag.id));

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-1.5">
        <Tag className="h-4 w-4" />
        Tags
        <span className="text-muted-foreground font-normal">
          ({selectedTags.length}/{maxTags})
        </span>
      </Label>

      {/* Selected Tags */}
      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedTagObjects.map(tag => (
            <Badge 
              key={tag.id} 
              variant="secondary"
              className="gap-1 pr-1"
            >
              #{tag.name}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                disabled={disabled}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input with suggestions */}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Search or create tags..."
            disabled={disabled || selectedTags.length >= maxTags}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCreateTag}
            disabled={disabled || !inputValue.trim() || selectedTags.length >= maxTags}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && inputValue && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
            {suggestions.map(tag => (
              <button
                key={tag.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                onClick={() => handleAddTag(tag.id)}
              >
                #{tag.name}
                <span className="text-muted-foreground ml-2">
                  ({tag.usage_count || 0} uses)
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
