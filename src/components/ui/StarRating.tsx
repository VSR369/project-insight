/**
 * Star Rating Component
 * 
 * Displays certification star rating (0-3 stars).
 */

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStarRatingDisplay } from '@/types/certification.types';

interface StarRatingProps {
  rating: number | null;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function StarRating({
  rating,
  maxStars = 3,
  size = 'md',
  showLabel = false,
  className,
}: StarRatingProps) {
  const displayConfig = getStarRatingDisplay(rating);
  const starCount = rating ?? 0;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Stars */}
      <div className="flex items-center">
        {Array.from({ length: maxStars }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              sizeClasses[size],
              index < starCount
                ? displayConfig?.colorClass ?? 'text-amber-500'
                : 'text-muted-foreground/30'
            )}
            fill={index < starCount ? 'currentColor' : 'none'}
          />
        ))}
      </div>

      {/* Optional label */}
      {showLabel && displayConfig && (
        <span className={cn('text-xs font-medium ml-1', displayConfig.textClass)}>
          {displayConfig.label}
        </span>
      )}
    </div>
  );
}
