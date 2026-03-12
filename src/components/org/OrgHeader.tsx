/**
 * OrgHeader — Header for the Seeker Organization portal.
 * Breadcrumbs, org name, tier badge, user dropdown.
 */

import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { LogOut, User, ChevronDown, Building2, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrgContext } from '@/contexts/OrgContext';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { toast } from 'sonner';

const pathNames: Record<string, string> = {
  org: 'Organization',
  dashboard: 'Dashboard',
  challenges: 'Challenges',
  create: 'Create',
  settings: 'Settings',
  team: 'Team',
  billing: 'Billing',
  membership: 'Membership',
  'parent-dashboard': 'Parent Dashboard',
};

export function OrgHeader() {
  const { user, signOut } = useAuth();
  const { orgName, orgRole, tierCode } = useOrgContext();
  const location = useLocation();
  const navigate = useNavigate();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const firstName = user?.user_metadata?.first_name || 'User';
  const lastName = user?.user_metadata?.last_name || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0) || 'O'}`.toUpperCase();

  const handleSignOut = async () => {
    sessionStorage.removeItem('activePortal');
    await signOut();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const roleBadgeColor = orgRole === 'owner' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground';

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {pathSegments.map((segment, index) => {
            const path = '/' + pathSegments.slice(0, index + 1).join('/');
            const isLast = index === pathSegments.length - 1;
            const name = pathNames[segment] || segment;

            return (
              <React.Fragment key={path}>
                <BreadcrumbItem>
                  {!isLast ? (
                    <BreadcrumbLink asChild>
                      <Link to={path}>{name}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{name}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1" />

      {/* Org + Tier Badge */}
      <div className="flex items-center gap-2 mr-2 bg-muted/50 rounded-md px-2 py-1 border border-border/50">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-foreground truncate max-w-[120px] sm:max-w-[250px]">{orgName}</span>
        {tierCode && (
          <Badge variant="outline" className="text-xs capitalize hidden sm:inline-flex">{tierCode}</Badge>
        )}
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-medium">{firstName} {lastName}</span>
              <span className="text-xs text-muted-foreground capitalize">{orgRole}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{firstName} {lastName}</span>
              <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              <Badge className={`mt-1 w-fit text-[10px] ${roleBadgeColor}`}>
                {orgRole}
              </Badge>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/org/settings')}>
            <Building2 className="mr-2 h-4 w-4" />
            Org Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Account Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
