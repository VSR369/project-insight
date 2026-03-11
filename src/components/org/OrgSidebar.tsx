/**
 * OrgSidebar — Sidebar for the Seeker Organization portal.
 * - PRIMARY admins see: Dashboard, Settings, Admin Management
 * - DELEGATED admins see: Dashboard only
 * - Non-admin org users see the full sidebar (preserves existing behavior)
 */

import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  Building2,
  Users,
  CreditCard,
  Crown,
  ArrowLeft,
  Network,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrgContext } from '@/contexts/OrgContext';
import { useCurrentSeekerAdmin } from '@/hooks/queries/useDelegatedAdmins';
import { useOrgDelegationEnabled } from '@/hooks/queries/useTierDepthConfig';
import { supabase } from '@/integrations/supabase/client';

export function OrgSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgName, tierCode, organizationId } = useOrgContext();
  const { data: currentAdmin } = useCurrentSeekerAdmin(organizationId);
  const { enabled: delegationEnabled } = useOrgDelegationEnabled();

  const isSOAdmin = !!currentAdmin;
  const isPrimary = currentAdmin?.admin_tier === 'PRIMARY';

  const isActive = (path: string) => location.pathname === path;

  // --- Navigation items ---

  const mainItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/org/dashboard' },
  ];

  // Only shown when NOT an SO Admin (regular org users)
  const challengeItems = [
    { title: 'All Challenges', icon: Briefcase, path: '/org/challenges' },
    { title: 'Create Challenge', icon: PlusCircle, path: '/org/challenges/create' },
  ];

  // Role Management — visible to SO Admins (both PRIMARY and DELEGATED)
  const roleManagementItems = isSOAdmin
    ? [{ title: 'Role Management', icon: ShieldCheck, path: '/org/role-management' }]
    : [];

  // Organization section — scoped by admin tier
  const orgItems = isSOAdmin
    ? (isPrimary && delegationEnabled
        ? [{ title: 'Admin Management', icon: ShieldCheck, path: '/org/admin-management' }]
        : [])
    : [
        { title: 'Settings', icon: Building2, path: '/org/settings' },
        { title: 'Team', icon: Users, path: '/org/team' },
        { title: 'Membership', icon: Crown, path: '/org/membership' },
        { title: 'Parent Dashboard', icon: Network, path: '/org/parent-dashboard' },
      ];

  const billingItems = [
    { title: 'Billing & Usage', icon: CreditCard, path: '/org/billing' },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/org/login');
  };

  const renderMenuSection = (items: typeof mainItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.path}>
          <SidebarMenuButton onClick={() => navigate(item.path)} isActive={isActive(item.path)}>
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate">{orgName}</span>
            {tierCode && (
              <Badge variant="outline" className="text-[10px] w-fit capitalize mt-0.5">
                {tierCode}
              </Badge>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main — always visible */}
        <SidebarGroup>
          <SidebarGroupContent>
            {renderMenuSection(mainItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Challenges — hidden for SO Admins */}
        {!isSOAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Challenges</SidebarGroupLabel>
            <SidebarGroupContent>
              {renderMenuSection(challengeItems)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Organization — scoped items */}
        <SidebarGroup>
          <SidebarGroupLabel>Organization</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuSection(orgItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Billing — hidden for SO Admins */}
        {!isSOAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Billing</SidebarGroupLabel>
            <SidebarGroupContent>
              {renderMenuSection(billingItems)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {isSOAdmin ? (
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to App
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}