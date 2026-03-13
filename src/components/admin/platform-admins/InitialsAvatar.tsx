/**
 * Initials-based avatar component for platform admins.
 */

import { cn } from '@/lib/utils';

interface InitialsAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

export function InitialsAvatar({ name, size = 'md', className }: InitialsAvatarProps) {
  const initials = getInitials(name);
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0',
        SIZE_CLASSES[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
