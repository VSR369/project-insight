/**
 * CardVoteButton - Up/down vote button component
 */

import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CardVoteButtonProps {
  direction: 'up' | 'down';
  count: number;
  isActive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'default';
}

export function CardVoteButton({
  direction,
  count,
  isActive = false,
  disabled = false,
  onClick,
  size = 'sm',
}: CardVoteButtonProps) {
  const Icon = direction === 'up' ? ChevronUp : ChevronDown;
  
  const buttonSize = size === 'sm' ? 'h-8 px-2' : 'h-10 px-3';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <Button
      variant={isActive ? 'default' : 'outline'}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 transition-all min-w-[44px] min-h-[44px]",
        buttonSize,
        direction === 'up' && isActive && "bg-green-600 hover:bg-green-700 text-white",
        direction === 'down' && isActive && "bg-red-600 hover:bg-red-700 text-white",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      aria-label={`${direction === 'up' ? 'Upvote' : 'Downvote'} (${count})`}
      aria-pressed={isActive}
    >
      <Icon className={iconSize} aria-hidden="true" />
      <span className="text-sm font-medium">{count}</span>
    </Button>
  );
}
