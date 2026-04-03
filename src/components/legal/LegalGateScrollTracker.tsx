/**
 * LegalGateScrollTracker — Scroll progress bar + 90% detection component.
 * Extracted from LegalGateActions per spec decomposition requirements.
 */
import * as React from 'react';
import { Progress } from '@/components/ui/progress';

const SCROLL_THRESHOLD = 90;

interface LegalGateScrollTrackerProps {
  scrollRef: React.RefObject<HTMLDivElement>;
  onScrollProgressChange: (progress: number) => void;
  scrollProgress: number;
}

export function LegalGateScrollTracker({
  scrollRef,
  onScrollProgressChange,
  scrollProgress,
}: LegalGateScrollTrackerProps) {
  const scrollMet = scrollProgress >= SCROLL_THRESHOLD;

  const handleScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) {
      onScrollProgressChange(100);
      return;
    }
    const progress = Math.min(100, Math.round((el.scrollTop / scrollable) * 100));
    onScrollProgressChange(progress);
  }, [scrollRef, onScrollProgressChange]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    // Check if content fits without scroll
    if (el.scrollHeight <= el.clientHeight) {
      onScrollProgressChange(100);
    }
    return () => el.removeEventListener('scroll', handleScroll);
  }, [scrollRef, handleScroll, onScrollProgressChange]);

  if (scrollMet) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">
        Please scroll to read the entire document ({scrollProgress}%)
      </p>
      <Progress value={scrollProgress} className="h-1.5" />
    </div>
  );
}

export { SCROLL_THRESHOLD };
