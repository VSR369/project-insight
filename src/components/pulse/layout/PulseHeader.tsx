import { ArrowLeft, Bell, Search, LayoutDashboard, ChevronRight, LogOut, User } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useUnreadNotificationCount } from '@/hooks/queries/usePulseSocial';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { cn } from '@/lib/utils';

interface BreadcrumbConfig {
  parentLabel: string;
  parentPath: string;
  currentLabel: string;
}

interface PulseHeaderProps {
  // For primary pages (Feed, Sparks, Cards, Create, Ranks, Profile)
  isPrimaryPage?: boolean;
  
  // For detail pages - shows breadcrumb
  breadcrumb?: BreadcrumbConfig;
  
  // Legacy props (deprecated, use isPrimaryPage/breadcrumb instead)
  title?: string;
  showBackButton?: boolean;
  parentRoute?: string;
  
  // Optional: hide search/notifications
  hideActions?: boolean;
}

export function PulseHeader({ 
  isPrimaryPage = false,
  breadcrumb,
  title,
  showBackButton = false,
  parentRoute,
  hideActions = false,
}: PulseHeaderProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: provider } = useCurrentProvider();
  const { data: unreadCount = 0 } = useUnreadNotificationCount(provider?.id);

  // User initials for avatar
  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';
  const initials = firstName && lastName 
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() 
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  // Determine navigation mode
  const isDetailPage = !!breadcrumb || showBackButton;
  const showDashboardExit = isPrimaryPage || (!breadcrumb && !showBackButton);

  const handleBackClick = () => {
    if (breadcrumb?.parentPath) {
      navigate(breadcrumb.parentPath);
    } else if (parentRoute) {
      navigate(parentRoute);
    } else if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/pulse/feed');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-sm border-b border-border z-50">
      <div className="h-full w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {/* Primary pages: Dashboard exit + Pulse branding */}
          {showDashboardExit && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="h-9 w-9 flex-shrink-0"
                title="Exit to Dashboard"
              >
                <LayoutDashboard className="h-5 w-5" />
              </Button>
              <span className="font-bold text-xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent ml-1">
                Pulse
              </span>
            </>
          )}
          
          {/* Detail pages: Back arrow + Breadcrumb */}
          {isDetailPage && !showDashboardExit && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackClick}
                className="h-9 w-9 flex-shrink-0"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              {breadcrumb ? (
                <nav className="flex items-center gap-1 min-w-0 ml-1" aria-label="Breadcrumb">
                  <Link 
                    to={breadcrumb.parentPath}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    {breadcrumb.parentLabel}
                  </Link>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium truncate">
                    {breadcrumb.currentLabel}
                  </span>
                </nav>
              ) : title ? (
                <h1 className="font-semibold text-lg ml-1 truncate">{title}</h1>
              ) : null}
            </>
          )}
        </div>

        {/* Right section - Search, Notifications, and User Menu */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!hideActions && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/pulse/search')}
                className="h-9 w-9"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/pulse/notifications')}
                className="h-9 w-9 relative"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
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
            </>
          )}
          
          {/* User Menu with Logout */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{firstName} {lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/pulse/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
