import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, User, ChevronDown, Shield, ArrowLeftRight, LayoutDashboard, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EnrollmentSwitcher } from './EnrollmentSwitcher';
import { toast } from 'sonner';

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const location = useLocation();

  const firstName = user?.user_metadata?.first_name || 'User';
  const lastName = user?.user_metadata?.last_name || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  
  const isInAdminArea = location.pathname.startsWith('/admin');
  const roleName = isAdmin ? 'Platform Admin' : 'Solution Provider';
  const roleColor = isAdmin ? 'text-destructive' : 'text-primary';

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const handleViewSwitch = () => {
    if (isInAdminArea) {
      navigate('/dashboard');
      toast.info('Switched to Provider View');
    } else {
      navigate('/admin');
      toast.info('Switched to Admin View');
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background px-4 sm:px-6">
      {/* Mobile menu trigger */}
      <SidebarTrigger className="-ml-2" />

      {/* Industry Enrollment Switcher - Provider area only */}
      {!isInAdminArea && <EnrollmentSwitcher />}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* View Switcher - Admin Only */}
        {isAdmin && !rolesLoading && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={isInAdminArea ? 'outline' : 'default'}
                size="sm"
                onClick={handleViewSwitch}
                className="gap-2"
              >
                {isInAdminArea ? (
                  <>
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Provider View</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Admin View</span>
                  </>
                )}
                <ArrowLeftRight className="h-3 w-3 opacity-50" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isInAdminArea ? 'Switch to Provider Dashboard' : 'Switch to Admin Dashboard'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            2
          </Badge>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className={`${isAdmin ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'} text-sm`}>
                  {isAdmin ? <Shield className="h-4 w-4" /> : initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium">{firstName} {lastName}</span>
                <span className={`text-xs ${roleColor}`}>
                  {rolesLoading ? '...' : roleName}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{firstName} {lastName}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                <Badge 
                  variant={isAdmin ? 'destructive' : 'default'} 
                  className="mt-1 w-fit text-[10px]"
                >
                  {roleName}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleViewSwitch}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  {isInAdminArea ? 'Switch to Provider View' : 'Switch to Admin View'}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
