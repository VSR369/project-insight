/**
 * CreatorOrgEditableFields — Editable form fields for org context gaps.
 * Extracted from CreatorOrgContextCard.tsx for R1 compliance.
 */

import { Globe, Linkedin, Twitter, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface CreatorOrgEditableFieldsProps {
  description: string;
  tagline: string;
  website: string;
  linkedin: string;
  twitter: string;
  onDescriptionChange: (val: string) => void;
  onTaglineChange: (val: string) => void;
  onWebsiteChange: (val: string) => void;
  onLinkedinChange: (val: string) => void;
  onTwitterChange: (val: string) => void;
}

export function CreatorOrgEditableFields({
  description, tagline, website, linkedin, twitter,
  onDescriptionChange, onTaglineChange, onWebsiteChange, onLinkedinChange, onTwitterChange,
}: CreatorOrgEditableFieldsProps) {
  return (
    <div className="space-y-3 pt-2">
      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          About Your Organization
          {!description.trim() && (
            <span className="text-amber-600 text-[10px]">(empty — please add)</span>
          )}
        </label>
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="What does your organization do? Describe your core business, market, and key capabilities in 2-3 sentences."
          className={cn(
            'text-sm min-h-[80px] resize-y',
            !description.trim() && 'border-amber-500/40',
          )}
        />
        {description.trim() && description.trim().length < 200 && (
          <p className="text-[10px] text-muted-foreground">
            {description.trim().length}/200 chars — more detail helps AI generate better specs
          </p>
        )}
      </div>

      {/* Tagline */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Tagline</label>
        <Input
          value={tagline}
          onChange={(e) => onTaglineChange(e.target.value)}
          placeholder="Your organization's tagline or motto"
          className="text-sm"
        />
      </div>

      {/* URLs row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Website
            {!website.trim() && (
              <span className="text-amber-600 text-[10px]">(empty)</span>
            )}
          </label>
          <Input
            value={website}
            onChange={(e) => onWebsiteChange(e.target.value)}
            placeholder="https://www.example.com"
            className={cn('text-sm', !website.trim() && 'border-amber-500/40')}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Linkedin className="h-3.5 w-3.5" />
            LinkedIn
          </label>
          <Input
            value={linkedin}
            onChange={(e) => onLinkedinChange(e.target.value)}
            placeholder="https://linkedin.com/company/..."
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Twitter className="h-3.5 w-3.5" />
            Twitter / X
          </label>
          <Input
            value={twitter}
            onChange={(e) => onTwitterChange(e.target.value)}
            placeholder="https://twitter.com/..."
            className="text-sm"
          />
        </div>
      </div>
    </div>
  );
}
