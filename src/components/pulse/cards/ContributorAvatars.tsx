/**
 * ContributorAvatars - Overlapping avatar row with hover tooltips
 */

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface Contributor {
  id: string;
  first_name: string;
  last_name: string;
}

interface ContributorAvatarsProps {
  contributors: Contributor[];
  maxVisible?: number;
  size?: 'sm' | 'md';
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
}

function getAvatarColor(id: string): string {
  // Generate consistent color from ID
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

export function ContributorAvatars({ 
  contributors, 
  maxVisible = 5,
  size = 'md' 
}: ContributorAvatarsProps) {
  const visibleContributors = contributors.slice(0, maxVisible);
  const remainingCount = contributors.length - maxVisible;

  const sizeClasses = size === 'sm' 
    ? 'h-6 w-6 text-[10px] -ml-1.5 first:ml-0' 
    : 'h-8 w-8 text-xs -ml-2 first:ml-0';

  return (
    <TooltipProvider>
      <div className="flex items-center">
        {visibleContributors.map((contributor) => (
          <Tooltip key={contributor.id}>
            <TooltipTrigger asChild>
              <Avatar 
                className={cn(
                  sizeClasses,
                  "border-2 border-background cursor-pointer transition-transform hover:scale-110 hover:z-10"
                )}
              >
                <AvatarFallback 
                  className={cn(
                    getAvatarColor(contributor.id),
                    "text-white font-medium"
                  )}
                >
                  {getInitials(contributor.first_name, contributor.last_name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>{contributor.first_name} {contributor.last_name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar 
                className={cn(
                  sizeClasses,
                  "border-2 border-background cursor-pointer"
                )}
              >
                <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                  +{remainingCount}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>{remainingCount} more contributor{remainingCount > 1 ? 's' : ''}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
