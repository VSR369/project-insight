/**
 * OrgFormFields — Editable form fields for organization context.
 * Extracted from OrgContextPanel.tsx.
 */

import React from 'react';
import { Globe, Linkedin, Twitter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface OrgFormFieldsProps {
  websiteUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
  tagline: string;
  description: string;
  isReadOnly: boolean;
  onFieldChange: (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setWebsiteUrl: React.Dispatch<React.SetStateAction<string>>;
  setLinkedinUrl: React.Dispatch<React.SetStateAction<string>>;
  setTwitterUrl: React.Dispatch<React.SetStateAction<string>>;
  setTagline: React.Dispatch<React.SetStateAction<string>>;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
}

export function OrgFormFields({
  websiteUrl, linkedinUrl, twitterUrl, tagline, description, isReadOnly,
  onFieldChange, setWebsiteUrl, setLinkedinUrl, setTwitterUrl, setTagline, setDescription,
}: OrgFormFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5"><Globe className="h-3 w-3" />Website</Label>
          <Input placeholder="https://example.com" value={websiteUrl} onChange={onFieldChange(setWebsiteUrl)} disabled={isReadOnly} className="text-sm h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5"><Linkedin className="h-3 w-3" />LinkedIn</Label>
          <Input placeholder="https://linkedin.com/company/..." value={linkedinUrl} onChange={onFieldChange(setLinkedinUrl)} disabled={isReadOnly} className="text-sm h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5"><Twitter className="h-3 w-3" />Twitter / X</Label>
          <Input placeholder="https://x.com/..." value={twitterUrl} onChange={onFieldChange(setTwitterUrl)} disabled={isReadOnly} className="text-sm h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tagline</Label>
          <Input placeholder="Brief tagline or motto" value={tagline} onChange={onFieldChange(setTagline)} disabled={isReadOnly} className="text-sm h-9" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Organization Description</Label>
        <Textarea
          placeholder="Describe the organization — industry, products/services, size, market position..."
          value={description} onChange={onFieldChange(setDescription)} disabled={isReadOnly}
          rows={5} className="text-sm resize-y min-h-[120px]"
        />
        <p className="text-[10px] text-muted-foreground">Providing a rich description helps the AI produce more contextually relevant challenge content.</p>
      </div>
    </>
  );
}
