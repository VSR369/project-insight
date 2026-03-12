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
  CheckCircle2,
  UserCog,
  Mail,
  BookOpen,
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
    ? [
        { title: 'Role Management', icon: ShieldCheck, path: '/org/role-management' },
        { title: 'Role Readiness', icon: CheckCircle2, path: '/org/role-readiness' },
      ]
    : [];

  // Admin & Operations — PRIMARY SO Admins only
  const adminOperationsItems = isSOAdmin
    ? [
        ...(isPrimary && delegationEnabled
          ? [{ title: 'Delegated Admins', icon: UserCog, path: '/org/admin-management' }]
          : []),
        { title: 'My Profile', icon: Users, path: '/org/contact-profile' },
        { title: 'Email Templates', icon: Mail, path: '/org/email-templates' },
      ]
    : [];

  // Organization section — non-admin org users
  const orgItems = isSOAdmin
    ? []
    : [
        { title: 'Settings', icon: Building2, path: '/org/settings' },
        { title: 'Team', icon: Users, path: '/org/team' },
        { title: 'Membership', icon: Crown, path: '/org/membership' },
        { title: 'Parent Dashboard', icon: Network, path: '/org/parent-dashboard' },
      ];

  // Knowledge Centre — SO Admins only
  const knowledgeCentreItems = isSOAdmin
    ? [{ title: 'Knowledge Centre', icon: BookOpen, path: '/org/knowledge-centre' }]
    : [];

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

        {/* Role Management — SO Admins only */}
        {isSOAdmin && roleManagementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Role Management</SidebarGroupLabel>
            <SidebarGroupContent>
              {renderMenuSection(roleManagementItems)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin & Operations — SO Admins only */}
        {isSOAdmin && adminOperationsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              {renderMenuSection(adminOperationsItems)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Organization — scoped items (non-admin org users) */}
        {orgItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Organization</SidebarGroupLabel>
            <SidebarGroupContent>
              {renderMenuSection(orgItems)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Knowledge Centre — SO Admins only */}
        {isSOAdmin && knowledgeCentreItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Resources</SidebarGroupLabel>
            <SidebarGroupContent>
              {renderMenuSection(knowledgeCentreItems)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

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