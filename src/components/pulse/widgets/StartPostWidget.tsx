import { useNavigate } from 'react-router-dom';
import { MessageSquare, Film, Mic, FileText, Zap, Layers } from 'lucide-react';
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
  { id: 'quick_post', label: 'Quick Post', icon: MessageSquare, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { id: 'reel', label: 'Reel', icon: Film, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  { id: 'podcast', label: 'Podcast', icon: Mic, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { id: 'article', label: 'Article', icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { id: 'spark', label: 'Spark', icon: Zap, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  { id: 'pulse_card', label: 'Pulse Cards', icon: Layers, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
] as const;

export function StartPostWidget({
  providerId,
  providerName = 'there',
  providerAvatar,
  isFirstTime = false,
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
    if (isFirstTime) {
      navigate('/welcome');
    } else {
      navigate('/pulse/create');
    }
  };

  const handleContentTypeClick = (typeId: string) => {
    if (isFirstTime) {
      navigate('/welcome');
    } else {
      navigate('/pulse/create', { state: { selectedType: typeId } });
    }
  };

  return (
    <Card className={cn(
      'border-primary/20 bg-card p-4 rounded-xl',
      className
    )}>
      {/* Top Row: Avatar + Input */}
      <div className="flex items-center gap-3 mb-4">
        {/* Avatar with green border */}
        <Avatar className="h-12 w-12 ring-2 ring-primary shrink-0">
          <AvatarImage src={providerAvatar || undefined} alt={providerName} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {getInitials(providerName)}
          </AvatarFallback>
        </Avatar>

        {/* Mock Input */}
        <button
          onClick={handleInputClick}
          className="flex-1 h-11 px-4 rounded-full border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-left text-muted-foreground text-sm cursor-pointer"
          aria-label="Start a post"
        >
          Start a Post
        </button>
      </div>

      {/* Quick Action Buttons Row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {CONTENT_TYPES.map(({ id, label, icon: Icon, color, bgColor }) => (
          <button
            key={id}
            onClick={() => handleContentTypeClick(id)}
            className={cn(
              'flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all',
              'hover:scale-105 hover:shadow-sm',
              bgColor
            )}
            aria-label={`Create ${label}`}
          >
            <Icon className={cn('h-5 w-5', color)} aria-hidden="true" />
            <span className={cn('text-xs font-medium truncate', color)}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
