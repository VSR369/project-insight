/**
 * PreviewBottomBar — Sticky footer with progress and navigation.
 */

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PreviewBottomBarProps {
  challengeId: string;
  filledCount: number;
  totalCount: number;
}

export function PreviewBottomBar({ challengeId, filledCount, totalCount }: PreviewBottomBarProps) {
  const navigate = useNavigate();

  return (
    <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur border-t border-border px-6 py-3 flex items-center justify-between print:hidden">
      <span className="text-xs text-muted-foreground">
        {filledCount}/{totalCount} sections complete
      </span>
      <Button variant="outline" size="sm" onClick={() => navigate(`/cogni/curation/${challengeId}`)}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Curation
      </Button>
    </div>
  );
}
