/**
 * ContextLibraryCard — Right-rail summary card for the Context Library.
 * Shows source count, pending suggestion count, and digest status.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  useContextSourceCount,
  usePendingSuggestionCount,
  useContextDigest,
} from '@/hooks/cogniblend/useContextLibrary';

interface ContextLibraryCardProps {
  challengeId: string;
  onOpenLibrary: () => void;
}

export function ContextLibraryCard({ challengeId, onOpenLibrary }: ContextLibraryCardProps) {
  const { data: sourceCount = 0 } = useContextSourceCount(challengeId);
  const { data: pendingCount = 0 } = usePendingSuggestionCount(challengeId);
  const { data: digest } = useContextDigest(challengeId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4" />
          Context Library
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {sourceCount} source{sourceCount !== 1 ? 's' : ''}
            {pendingCount > 0 && (
              <span className="text-primary font-medium ml-1">· {pendingCount} AI suggested</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Digest:</span>
          {digest?.digest_text ? (
            <Badge variant="outline" className="gap-1 text-xs">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              Generated ({digest.source_count} sources)
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              Not generated yet
            </Badge>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onOpenLibrary}
        >
          Open Library
        </Button>
      </CardContent>
    </Card>
  );
}
