import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, User, ChevronDown, Shield, Settings, ShieldAlert } from 'lucide-react';
import { NotificationBell } from '@/components/admin/notifications/NotificationBell';
import { NotificationDrawer } from '@/components/admin/notifications/NotificationDrawer';
import { RoleReadinessNotifications } from '@/components/admin/notifications/RoleReadinessNotifications';
import { ExecutiveContactWarning } from '@/components/admin/system-config/ExecutiveContactWarning';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAdminTier } from '@/hooks/useAdminTier';
import { useMpaConfigValue } from '@/hooks/queries/useMpaConfig';
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

// Map paths to readable names
const pathNames: Record<string, string> = {
  'admin': 'Admin',
  'master-data': 'Master Data',
  'countries': 'Countries',
  'industry-segments': 'Industry Segments',
  'organization-types': 'Organization Types',
  'participation-modes': 'Participation Modes',
  'expertise-levels': 'Expertise Levels',
  'proficiency-taxonomy': 'Proficiency Taxonomy',
  'level-speciality-map': 'Level-Speciality Map',
  'questions': 'Question Bank',
  'invitations': 'Invitations',
  'settings': 'Settings',
  'assignment-audit-log': 'Assignment Audit Log',
  'system-config': 'System Config',
  'domain-weights': 'Domain Match Weights',
  'verification-knowledge-centre': 'Knowledge Centre',
};

export function AdminHeader() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRoles();
  const { tier, isSupervisor } = useAdminTier();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [readinessOpen, setReadinessOpen] = useState(false);
  const { data: escalationContactId, isLoading: configLoading } = useMpaConfigValue('executive_escalation_contact_id');
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const showEscalationWarning = isSupervisor && !configLoading && (!escalationContactId || escalationContactId === 'NULL');

  const firstName = user?.user_metadata?.first_name || 'Admin';
  const lastName = user?.user_metadata?.last_name || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0) || 'A'}`.toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  return (
    <>
      {showEscalationWarning && <ExecutiveContactWarning compact />}
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
                    <BreadcrumbLink href={path}>{name}</BreadcrumbLink>
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

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Role Readiness Alerts (SCR-12) */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          title="Role Readiness Alerts"
          onClick={() => setReadinessOpen(true)}
        >
          <ShieldAlert className="h-4 w-4" />
        </Button>
        <RoleReadinessNotifications open={readinessOpen} onOpenChange={setReadinessOpen} />

        {/* Notification Bell */}
        <NotificationBell onClick={() => setNotifOpen(true)} />
        <NotificationDrawer open={notifOpen} onOpenChange={setNotifOpen} />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-destructive/10 text-destructive text-sm">
                  <Shield className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium">{firstName} {lastName}</span>
                <span className="text-xs text-destructive">
                  {tier === 'supervisor' ? 'Supervisor' : tier === 'senior_admin' ? 'Senior Admin' : 'Admin'}
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
                <Badge variant="destructive" className="mt-1 w-fit text-[10px]">
                  {tier === 'supervisor' ? 'Supervisor' : tier === 'senior_admin' ? 'Senior Admin' : 'Admin'}
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
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </>
  );
}
