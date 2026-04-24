/**
 * OrgSidebar — Sidebar for the Seeker Organization portal.
 *
 * Visibility model (additive groups, not mutually exclusive):
 *   PRIMARY SO Admin   → Workspace + Role Management + Org Configuration
 *                        + Operations + Resources + Account
 *   DELEGATED SO Admin → Workspace + Role Management + Resources
 *   Non-admin org user → Workspace + Organization + Resources + Account
 *
 * Org Configuration items deep-link into OrgSettingsPage via ?tab=… so the
 * Primary admin can reach the Legal Templates / Governance / Finance /
 * Compliance / Audit Trail tabs that previously had no entry point in the nav.
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
  DollarSign,
  FileText,
  Banknote,
  History,
  Settings2,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrgContext } from '@/contexts/OrgContext';
import { useCurrentSeekerAdmin } from '@/hooks/queries/useDelegatedAdmins';
import { useOrgDelegationEnabled } from '@/hooks/queries/useTierDepthConfig';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  title: string;
  icon: typeof LayoutDashboard;
  path: string;
}

export function OrgSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgName, tierCode, organizationId } = useOrgContext();
  const { data: currentAdmin } = useCurrentSeekerAdmin(organizationId);
  const { enabled: delegationEnabled } = useOrgDelegationEnabled();

  const isSOAdmin = !!currentAdmin;
  const isPrimary = currentAdmin?.admin_tier === 'PRIMARY';

  const isActive = (path: string) => {
    // For settings deep-links, also match when query param matches
    if (path.includes('?tab=')) {
      const [base, qs] = path.split('?');
      const tab = new URLSearchParams(qs).get('tab');
      const currentTab = new URLSearchParams(location.search).get('tab');
      return location.pathname === base && currentTab === tab;
    }
    return location.pathname === path && !location.search;
  };

  // ── Workspace (everyone) ────────────────────────────────────────────────
  const workspaceItems: NavItem[] = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/org/dashboard' },
    { title: 'All Challenges', icon: Briefcase, path: '/org/challenges' },
    { title: 'Create Challenge', icon: PlusCircle, path: '/org/challenges/create' },
  ];

  // ── Role Management (SO Admins only) ────────────────────────────────────
  const roleManagementItems: NavItem[] = isSOAdmin
    ? [
        { title: 'Role Management', icon: ShieldCheck, path: '/org/role-management' },
        { title: 'Role Readiness', icon: CheckCircle2, path: '/org/role-readiness' },
        ...(isPrimary && delegationEnabled
          ? [{ title: 'Delegated Admins', icon: UserCog, path: '/org/admin-management' }]
          : []),
      ]
    : [];

  // ── Org Configuration (PRIMARY only) — deep-links into OrgSettingsPage ──
  const orgConfigItems: NavItem[] = isPrimary
    ? [
        { title: 'Profile & Subscription', icon: Building2, path: '/org/settings?tab=profile' },
        { title: 'Engagement Model', icon: Settings, path: '/org/settings?tab=engagement' },
        { title: 'Governance', icon: ShieldCheck, path: '/org/settings?tab=governance' },
        { title: 'Legal Templates', icon: FileText, path: '/org/settings?tab=legal-templates' },
        { title: 'Finance', icon: Banknote, path: '/org/settings?tab=finance' },
        { title: 'Compliance', icon: ShieldCheck, path: '/org/settings?tab=compliance' },
        { title: 'Custom Fields', icon: Settings2, path: '/org/settings?tab=custom-fields' },
        { title: 'Audit Trail', icon: History, path: '/org/settings?tab=audit' },
      ]
    : [];

  // ── Operations (PRIMARY only) ───────────────────────────────────────────
  const operationsItems: NavItem[] = isPrimary
    ? [
        { title: 'Email Templates', icon: Mail, path: '/org/email-templates' },
        { title: 'Shadow Pricing', icon: DollarSign, path: '/org/shadow-pricing' },
      ]
    : [];

  // ── Organization (non-admin org users) ──────────────────────────────────
  const orgItems: NavItem[] = !isSOAdmin
    ? [
        { title: 'Settings', icon: Building2, path: '/org/settings' },
        { title: 'Team', icon: Users, path: '/org/team' },
        { title: 'Membership', icon: Crown, path: '/org/membership' },
        { title: 'Parent Dashboard', icon: Network, path: '/org/parent-dashboard' },
      ]
    : [];

  // ── Resources (admins + non-admins) ─────────────────────────────────────
  const resourceItems: NavItem[] = [
    { title: 'My Profile', icon: Users, path: '/org/contact-profile' },
    ...(isSOAdmin
      ? [{ title: 'Knowledge Centre', icon: BookOpen, path: '/org/knowledge-centre' }]
      : []),
  ];

  // ── Account (PRIMARY admin + non-admin org users own billing) ───────────
  const accountItems: NavItem[] = isPrimary || !isSOAdmin
    ? [
        ...(!isSOAdmin
          ? [
              { title: 'Team', icon: Users, path: '/org/team' },
              { title: 'Membership', icon: Crown, path: '/org/membership' },
            ]
          : []),
        { title: 'Billing & Usage', icon: CreditCard, path: '/org/billing' },
      ]
    : [];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/org/login');
  };

  const renderMenuSection = (items: NavItem[]) => (
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

  const renderGroup = (label: string | null, items: NavItem[]) =>
    items.length > 0 && (
      <SidebarGroup>
        {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
        <SidebarGroupContent>{renderMenuSection(items)}</SidebarGroupContent>
      </SidebarGroup>
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
        {renderGroup(null, workspaceItems)}
        {renderGroup('Role Management', roleManagementItems)}
        {renderGroup('Org Configuration', orgConfigItems)}
        {renderGroup('Operations', operationsItems)}
        {renderGroup('Organization', orgItems)}
        {renderGroup('Resources', resourceItems)}
        {renderGroup('Account', accountItems)}
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
