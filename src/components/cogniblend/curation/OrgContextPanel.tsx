/**
 * OrgContextPanel — Organization Context for Curation Review
 *
 * Flat card content showing org details (auto-populated from seeker_organizations)
 * with editable fields for curator enrichment and file upload for org profile docs.
 * Rendered as Tab 0 in the wave progress strip.
 */

import React from 'react';
import { Building2, Zap, Save, Loader2, Activity } from 'lucide-react';
import { scoreOrgContext } from '@/lib/cogniblend/orgContextScorer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrgContextData } from '@/hooks/cogniblend/useOrgContextData';
import { OrgFormFields } from './OrgFormFields';
import { OrgAttachmentList } from './OrgAttachmentList';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrgContextPanelProps {
  challengeId: string;
  organizationId: string;
  isReadOnly?: boolean;
}

interface OrgData {
  organization_name: string;
  orgTypeName: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  organization_description: string | null;
  tagline: string | null;
}

// ---------------------------------------------------------------------------
// Helper: check if org tab is "complete" (name + at least one enrichment)
// ---------------------------------------------------------------------------

export function isOrgTabComplete(orgData: OrgData | undefined, attachmentCount: number): boolean {
  if (!orgData?.organization_name) return false;
  const hasField = [orgData.website_url, orgData.linkedin_url, orgData.twitter_url, orgData.organization_description]
    .some(v => v && v.trim().length > 0);
  return hasField || attachmentCount > 0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrgContextPanel({ challengeId, organizationId, isReadOnly = false }: OrgContextPanelProps) {
  const {
    orgData, orgLoading, attachments,
    websiteUrl, setWebsiteUrl,
    linkedinUrl, setLinkedinUrl,
    twitterUrl, setTwitterUrl,
    description, setDescription,
    tagline, setTagline,
    isDirty, saveMutation,
    handleFileUpload, deleteAttachment, handleFieldChange,
  } = useOrgContextData(challengeId, organizationId, isReadOnly);

  if (orgLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded" />
        <div className="h-9 w-full bg-muted rounded" />
        <div className="h-9 w-full bg-muted rounded" />
      </div>
    );
  }

  const filledCount = [websiteUrl, linkedinUrl, twitterUrl, description].filter(v => v.trim()).length;

  // Org context score for AI quality badge
  const orgScore = scoreOrgContext({
    name: orgData?.organization_name,
    description: description || orgData?.organization_description || undefined,
    website: websiteUrl || orgData?.website_url || undefined,
  });
  const scoreColor = orgScore.score >= 80 ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
    : orgScore.score >= 50 ? 'text-amber-700 border-amber-300 bg-amber-50'
    : 'text-destructive border-destructive/30 bg-destructive/5';

  return (
    <div className="space-y-5">
      {/* AI context notice + org context score */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <Zap className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-700">
          <strong>AI uses this context</strong> — Providing organization details helps the AI produce more relevant and contextually accurate challenge content.
        </p>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`text-[10px] ${scoreColor}`}>
            <Activity className="h-2.5 w-2.5 mr-0.5" />
            AI Context: {orgScore.score}%
          </Badge>
          {filledCount < 3 && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {filledCount}/4 fields filled
            </Badge>
          )}
        </div>
      </div>

      {/* Read-only org info */}
      <div className="flex items-center gap-6 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground">Organization</p>
          <p className="text-sm font-semibold">{orgData?.organization_name || '—'}</p>
        </div>
        {orgData?.orgTypeName && (
          <div>
            <p className="text-xs text-muted-foreground">Type</p>
            <Badge variant="secondary" className="text-xs">{orgData.orgTypeName}</Badge>
          </div>
        )}
      </div>

      {/* Editable fields */}
      <OrgFormFields
        websiteUrl={websiteUrl}
        linkedinUrl={linkedinUrl}
        twitterUrl={twitterUrl}
        tagline={tagline}
        description={description}
        isReadOnly={isReadOnly}
        onFieldChange={handleFieldChange}
        setWebsiteUrl={setWebsiteUrl}
        setLinkedinUrl={setLinkedinUrl}
        setTwitterUrl={setTwitterUrl}
        setTagline={setTagline}
        setDescription={setDescription}
      />

      {/* Save button */}
      {!isReadOnly && isDirty && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            Save Organization Details
          </Button>
        </div>
      )}

      {/* Org profile documents */}
      <OrgAttachmentList
        attachments={attachments}
        isReadOnly={isReadOnly}
        onUpload={handleFileUpload}
        onDelete={deleteAttachment}
      />
    </div>
  );
}
