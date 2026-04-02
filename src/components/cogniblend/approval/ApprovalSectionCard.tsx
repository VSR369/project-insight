/**
 * ApprovalSectionCard — Single section in the Creator approval view.
 * Shows Creator original vs Curator version with approve/request change actions.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { SafeHtmlRenderer } from '@/components/ui/SafeHtmlRenderer';
import { Check, MessageSquare, ChevronDown, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApprovalSectionCardProps {
  sectionKey: string;
  label: string;
  curatorContent: unknown;
  creatorContent: unknown;
  approvalStatus: 'pending' | 'approved' | 'change_requested' | null;
  onApprove: () => void;
  onRequestChange: (comment: string) => void;
  isControlled: boolean;
}

function renderContent(content: unknown) {
  if (typeof content === 'string') {
    return <SafeHtmlRenderer html={content} />;
  }
  if (content && typeof content === 'object') {
    return (
      <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-2 rounded overflow-auto max-h-40">
        {JSON.stringify(content, null, 2)}
      </pre>
    );
  }
  return <span className="text-muted-foreground text-sm italic">No content</span>;
}

const STATUS_CONFIG = {
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  change_requested: { label: 'Changes Requested', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  pending: { label: 'Pending', className: 'bg-muted text-muted-foreground' },
} as const;

export function ApprovalSectionCard({
  label, curatorContent, creatorContent, approvalStatus,
  onApprove, onRequestChange, isControlled,
}: ApprovalSectionCardProps) {
  const [showChangeInput, setShowChangeInput] = useState(false);
  const [comment, setComment] = useState('');
  const isApproved = approvalStatus === 'approved';
  const statusCfg = approvalStatus ? STATUS_CONFIG[approvalStatus] : null;

  const handleSubmitChange = () => {
    if (comment.trim()) {
      onRequestChange(comment.trim());
      setComment('');
      setShowChangeInput(false);
    }
  };

  return (
    <Card className={cn('transition-colors', isApproved && 'border-emerald-200 bg-emerald-50/30')}>
      <CardContent className="py-3 px-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">{label}</h4>
          {statusCfg && (
            <Badge variant="outline" className={cn('text-[10px]', statusCfg.className)}>
              {statusCfg.label}
            </Badge>
          )}
        </div>

        {creatorContent && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Eye className="h-3 w-3" />
              Your Original Input
              <ChevronDown className="h-3 w-3" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-2.5 bg-muted/50 rounded-md text-sm border border-muted">
                {renderContent(creatorContent)}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="text-sm">{renderContent(curatorContent)}</div>

        {!isApproved && (
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onApprove}>
              <Check className="h-3 w-3" /> Approve
            </Button>
            <Button
              size="sm" variant="ghost" className="h-7 text-xs gap-1"
              onClick={() => setShowChangeInput(!showChangeInput)}
            >
              <MessageSquare className="h-3 w-3" /> Request Change
            </Button>
          </div>
        )}

        {showChangeInput && !isApproved && (
          <div className="space-y-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe the change you'd like…"
              className="text-sm min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={handleSubmitChange} disabled={!comment.trim()}>
                Submit
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowChangeInput(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
