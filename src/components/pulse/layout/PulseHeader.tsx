import { ArrowLeft, Bell, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUnreadNotificationCount } from '@/hooks/queries/usePulseSocial';
import { useCurrentProvider } from '@/hooks/queries/useProvider';

interface PulseHeaderProps {
  title?: string;
  showBackButton?: boolean;
}

export function PulseHeader({ title, showBackButton = false }: PulseHeaderProps) {
  const navigate = useNavigate();
  const { data: provider } = useCurrentProvider();
  const { data: unreadCount = 0 } = useUnreadNotificationCount(provider?.id);

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-sm border-b border-border z-50">
      <div className="h-full max-w-lg mx-auto px-4 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-2">
          {showBackButton ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : null}
          {title ? (
            <h1 className="font-semibold text-lg">{title}</h1>
          ) : (
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Pulse
            </span>
          )}
        </div>

        {/* Right section - Search and Notifications */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/pulse/search')}
            className="h-9 w-9"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/pulse/notifications')}
            className="h-9 w-9 relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
