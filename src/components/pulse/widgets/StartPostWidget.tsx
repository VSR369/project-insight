import { useNavigate } from 'react-router-dom';
import { Film, Mic, Zap, FileText, Image, Layers } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StartPostWidgetProps {
  providerId?: string;
  providerName?: string;
  providerAvatar?: string | null;
  isFirstTime?: boolean;
  className?: string;
}

const CONTENT_TYPES = [
  { id: 'reel', label: 'Reel', icon: Film, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  { id: 'podcast', label: 'Podcast', icon: Mic, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { id: 'spark', label: 'Spark', icon: Zap, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  { id: 'article', label: 'Article', icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { id: 'gallery', label: 'Gallery', icon: Image, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { id: 'pulse-cards', label: 'Pulse Cards', icon: Layers, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
] as const;

export function StartPostWidget({
  providerName = 'there',
  providerAvatar,
  className,
}: StartPostWidgetProps) {
  const navigate = useNavigate();

  // Get initials from provider name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const handleInputClick = () => {
    // Navigate directly to Quick Post creator
    navigate('/pulse/create', { state: { type: 'post' } });
  };

  const handleContentTypeClick = (typeId: string) => {
    // Special case: Pulse Cards navigates directly to /pulse/cards
    if (typeId === 'pulse-cards') {
      navigate('/pulse/cards');
      return;
    }
    
    // All other types navigate to /pulse/create with the type pre-selected
    navigate('/pulse/create', { state: { type: typeId } });
  };

  return (
    <Card className={cn(
      'border-primary/20 bg-card p-3 sm:p-4 rounded-xl',
      className
    )}>
      {/* Top Row: Avatar + Input */}
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        {/* Avatar with green border */}
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-primary shrink-0">
          <AvatarImage src={providerAvatar || undefined} alt={providerName} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm sm:text-base">
            {getInitials(providerName)}
          </AvatarFallback>
        </Avatar>

        {/* Mock Input */}
        <button
          onClick={handleInputClick}
          className="flex-1 h-9 sm:h-11 px-3 sm:px-4 rounded-full border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-left text-muted-foreground text-xs sm:text-sm cursor-pointer min-w-0"
          aria-label="Start a post"
        >
          Start a Post
        </button>
      </div>

      {/* Quick Action Buttons Row - 3 cols on mobile, 6 on larger */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
        {CONTENT_TYPES.map(({ id, label, icon: Icon, color, bgColor }) => (
          <button
            key={id}
            onClick={() => handleContentTypeClick(id)}
            className={cn(
              'flex flex-col items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-lg transition-all min-h-[44px]',
              'hover:scale-105 hover:shadow-sm',
              bgColor
            )}
            aria-label={`Create ${label}`}
          >
            <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', color)} aria-hidden="true" />
            <span className={cn('text-[10px] sm:text-xs font-medium truncate max-w-full', color)}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
