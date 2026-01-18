import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, User, ClipboardCheck, ChevronDown, Check } from 'lucide-react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface PortalOption {
  id: string;
  label: string;
  shortLabel: string;
  path: string;
  icon: typeof Shield;
  color: string;
  bgColor: string;
  checkPath: (path: string) => boolean;
}

const PORTALS: PortalOption[] = [
  {
    id: 'admin',
    label: 'Admin Portal',
    shortLabel: 'Admin',
    path: '/admin',
    icon: Shield,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    checkPath: (path) => path.startsWith('/admin'),
  },
  {
    id: 'provider',
    label: 'Provider Portal',
    shortLabel: 'Provider',
    path: '/dashboard',
    icon: User,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    checkPath: (path) => 
      path.startsWith('/dashboard') || 
      path.startsWith('/enroll') || 
      path.startsWith('/tools') ||
      path.startsWith('/profile') ||
      path === '/',
  },
  {
    id: 'reviewer',
    label: 'Reviewer Portal',
    shortLabel: 'Reviewer',
    path: '/reviewer/dashboard',
    icon: ClipboardCheck,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    checkPath: (path) => path.startsWith('/reviewer'),
  },
];

export function RoleSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isProvider, isReviewer, isLoading } = useUserRoles();

  // Determine which portals the user has access to
  const availablePortals = PORTALS.filter((portal) => {
    if (portal.id === 'admin') return isAdmin;
    if (portal.id === 'provider') return isProvider || isAdmin; // Admins can access provider view
    if (portal.id === 'reviewer') return isReviewer;
    return false;
  });

  // Show loading skeleton
  if (isLoading) {
    return <Skeleton className="h-8 w-24" />;
  }

  // Don't show if no portals available
  if (availablePortals.length === 0) {
    return null;
  }

  // Find current portal
  const currentPortal = availablePortals.find((p) => p.checkPath(location.pathname)) || availablePortals[0];
  const CurrentIcon = currentPortal.icon;

  // If only one portal, show as a badge (no dropdown needed)
  if (availablePortals.length === 1) {
    return (
      <Badge variant="outline" className="gap-2 py-1.5 px-3">
        <CurrentIcon className={`h-4 w-4 ${currentPortal.color}`} />
        <span className="hidden sm:inline">{currentPortal.shortLabel}</span>
      </Badge>
    );
  }

  const handleSwitch = (portal: PortalOption) => {
    if (portal.id === currentPortal.id) return;
    navigate(portal.path);
    toast.info(`Switched to ${portal.label}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CurrentIcon className={`h-4 w-4 ${currentPortal.color}`} />
          <span className="hidden sm:inline">{currentPortal.shortLabel}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Switch Portal
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availablePortals.map((portal) => {
          const Icon = portal.icon;
          const isActive = portal.id === currentPortal.id;
          return (
            <DropdownMenuItem
              key={portal.id}
              onClick={() => handleSwitch(portal)}
              className={`gap-2 ${isActive ? 'bg-muted' : ''}`}
            >
              <div className={`p-1 rounded ${portal.bgColor}`}>
                <Icon className={`h-3.5 w-3.5 ${portal.color}`} />
              </div>
              <span className="flex-1">{portal.label}</span>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}