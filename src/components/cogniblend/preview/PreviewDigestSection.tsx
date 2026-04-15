/**
 * PreviewDigestSection — Context digest with read-only display.
 */

import { AiContentRenderer } from '@/components/ui/AiContentRenderer';
import { Badge } from '@/components/ui/badge';
import type { DigestData } from './usePreviewData';

interface PreviewDigestSectionProps {
  digest: DigestData | null;
}

export function PreviewDigestSection({ digest }: PreviewDigestSectionProps) {
  if (!digest) {
    return <p className="text-sm text-muted-foreground">No context digest generated yet. Run "Analyse Challenge" in the curation workspace.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-[10px]">
          {digest.source_count} source{digest.source_count !== 1 ? 's' : ''}
        </Badge>
        <span>Generated {new Date(digest.generated_at).toLocaleDateString()}</span>
      </div>
      <AiContentRenderer content={digest.digest_text} compact />
    </div>
  );
}
