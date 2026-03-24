/**
 * TagInputSectionRenderer — View/edit for tag-input sections.
 * Used for: domain_tags
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tag, X } from "lucide-react";

const DEFAULT_SUGGESTIONS = [
  'AI/ML', 'Biotech', 'Clean Energy', 'Materials Science',
  'Digital Health', 'Manufacturing', 'Software', 'Sustainability',
  'Cybersecurity', 'FinTech', 'IoT', 'Robotics',
  'Data Analytics', 'Supply Chain', 'Telecommunications',
];

interface TagInputSectionRendererProps {
  tags: string[];
  readOnly: boolean;
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  suggestions?: string[];
}

export function TagInputSectionRenderer({
  tags,
  readOnly,
  onAdd,
  onRemove,
  suggestions = DEFAULT_SUGGESTIONS,
}: TagInputSectionRendererProps) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = input
    ? suggestions.filter(
        (tag) => tag.toLowerCase().includes(input.toLowerCase()) && !tags.includes(tag),
      )
    : [];

  if (readOnly) {
    if (tags.length === 0) return <p className="text-sm text-muted-foreground italic">No tags</p>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs gap-1">
            <Tag className="h-3 w-3" />{tag}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No domain tags — type below to add.</p>
        )}
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
            <Tag className="h-3 w-3" />{tag}
            <button onClick={() => onRemove(tag)} className="ml-0.5 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <Input
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowDropdown(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              e.preventDefault();
              onAdd(input);
              setInput("");
            }
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder="Type to search or add a tag…"
          className="text-sm"
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 w-full max-h-40 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
            {filtered.map((tag) => (
              <button
                key={tag}
                onClick={() => { onAdd(tag); setInput(""); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
