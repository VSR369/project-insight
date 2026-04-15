/**
 * PreviewOrgSection — Organization context section for preview.
 * P5 FIX: Shows accepted sources with quality indicators per section.
 */

import { Badge } from '@/components/ui/badge';
import { Globe, Linkedin, Twitter } from 'lucide-react';
import type { OrgData, PreviewAttachment } from './usePreviewData';

interface PreviewOrgSectionProps {
  orgData: OrgData | null;
  operatingModel: string | null;
  solverAudience: string | null;
  extendedBrief: Record<string, unknown> | null;
  attachments: PreviewAttachment[];
}

const QUALITY_COLORS: Record<string, string> = {
  high: 'text-emerald-600 border-emerald-300',
  medium: 'text-amber-600 border-amber-300',
  low: 'text-orange-600 border-orange-300',
  seed: 'text-muted-foreground border-border',
};

export function PreviewOrgSection({
  orgData,
  operatingModel,
  solverAudience,
  extendedBrief,
  attachments,
}: PreviewOrgSectionProps) {
  if (!orgData) {
    return <p className="text-sm text-muted-foreground">Organization data not available.</p>;
  }

  const orgAttachments = attachments.filter((a) => a.section_key === 'org_profile');
  const creatorApproval = extendedBrief?.creator_approval_required === true;
  const communityAllowed = extendedBrief?.community_creation_allowed === true;
  const isAnonymous = extendedBrief?.anonymous_challenge === true;

  return (
    <div className="space-y-4">
      {/* Org identity */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">{orgData.organization_name ?? '—'}</h4>
          {orgData.organization_types?.name && (
            <Badge variant="outline" className="text-[10px]">{orgData.organization_types.name}</Badge>
          )}
        </div>
        {orgData.tagline && <p className="text-xs text-muted-foreground italic">{orgData.tagline}</p>}
      </div>

      {/* Description */}
      {orgData.organization_description && (
        <p className="text-sm text-foreground/85 leading-relaxed">{orgData.organization_description}</p>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {orgData.website_url && (
          <a href={orgData.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
            <Globe className="h-3 w-3" />{orgData.website_url}
          </a>
        )}
        {orgData.linkedin_url && (
          <a href={orgData.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
            <Linkedin className="h-3 w-3" />LinkedIn
          </a>
        )}
        {orgData.twitter_url && (
          <a href={orgData.twitter_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
            <Twitter className="h-3 w-3" />Twitter
          </a>
        )}
      </div>

      {/* Challenge Preferences */}
      <div className="pt-3 border-t border-border/50 space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Challenge Preferences</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground text-xs">Operating Model:</span> <Badge variant="outline" className="text-[10px] ml-1">{operatingModel ?? 'MP'}</Badge></div>
          <div><span className="text-muted-foreground text-xs">Audience:</span> <Badge variant="outline" className="text-[10px] ml-1">{solverAudience ?? 'ALL'}</Badge></div>
          <div><span className="text-muted-foreground text-xs">Creator Approval:</span> <span className="text-xs ml-1">{creatorApproval ? 'Required' : 'Not required'}</span></div>
          <div><span className="text-muted-foreground text-xs">Community:</span> <span className="text-xs ml-1">{communityAllowed ? 'Allowed' : 'Not allowed'}</span></div>
          <div><span className="text-muted-foreground text-xs">Anonymous:</span> <span className="text-xs ml-1">{isAnonymous ? 'Yes' : 'No'}</span></div>
        </div>
      </div>

      {/* Org documents with quality badges */}
      {orgAttachments.length > 0 && (
        <div className="pt-3 border-t border-border/50 space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Organization Documents</h4>
          {orgAttachments.map((att) => (
            <div key={att.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>📄</span>
              <span>{att.display_name ?? att.url_title ?? att.file_name ?? 'Document'}</span>
              {att.extraction_quality && (
                <Badge variant="outline" className={`text-[9px] ${QUALITY_COLORS[att.extraction_quality] ?? ''}`}>
                  {att.extraction_quality}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
