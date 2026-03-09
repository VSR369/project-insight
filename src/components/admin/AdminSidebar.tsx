import { useState, useEffect, useCallback } from 'react';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  Globe,
  Building2,
  Users,
  GraduationCap,
  Briefcase,
  Award,
  Network,
  FileQuestion,
  Settings,
  ArrowLeft,
  Shield,
  Tags,
  Calendar,
  UserCheck,
  CalendarClock,
  ClipboardList,
  Mail,
  ChevronRight,
  Activity,
  BarChart3,
  TestTube2,
  CreditCard,
  Users2,
  User,
  ScrollText,
  ClipboardCheck,
  Bell,
  ArrowRightLeft,
  CalendarHeart,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePendingReviewerCount } from '@/hooks/queries/usePanelReviewers';
import { usePendingSeekerCount } from '@/hooks/queries/useSeekerOrgApprovals';
import { usePendingReassignmentCount } from '@/hooks/queries/useReassignmentRequests';
import { useAdminTier } from '@/hooks/useAdminTier';
import { usePlatformTierDepth } from '@/hooks/queries/useTierDepthConfig';
import { prefetchRoute, prefetchAdminRoutes } from '@/lib/routePrefetch';

const masterDataItems = [
  { title: 'Countries', icon: Globe, path: '/admin/master-data/countries' },
  { title: 'Industry Segments', icon: Briefcase, path: '/admin/master-data/industry-segments' },
  { title: 'Organization Types', icon: Building2, path: '/admin/master-data/organization-types' },
  { title: 'Participation Modes', icon: Users, path: '/admin/master-data/participation-modes' },
  { title: 'Expertise Levels', icon: Award, path: '/admin/master-data/expertise-levels' },
  { title: 'Departments', icon: Building2, path: '/admin/master-data/departments' },
  { title: 'Functional Areas', icon: Briefcase, path: '/admin/master-data/functional-areas' },
];

const seekerConfigItems = [
  { title: 'Pricing Overview', icon: Activity, path: '/admin/seeker-config/pricing-overview' },
  { title: 'Subscription Tiers', icon: CreditCard, path: '/admin/seeker-config/subscription-tiers' },
  { title: 'Membership Tiers', icon: Award, path: '/admin/seeker-config/membership-tiers' },
  { title: 'Engagement Models', icon: Network, path: '/admin/seeker-config/engagement-models' },
  { title: 'Challenge Complexity', icon: Activity, path: '/admin/seeker-config/challenge-complexity' },
  { title: 'Base Fee Config', icon: CreditCard, path: '/admin/seeker-config/base-fees' },
  { title: 'Platform Fees', icon: CreditCard, path: '/admin/seeker-config/platform-fees' },
  { title: 'Shadow Pricing', icon: Activity, path: '/admin/seeker-config/shadow-pricing' },
  { title: 'Challenge Statuses', icon: ClipboardList, path: '/admin/seeker-config/challenge-statuses' },
  { title: 'Platform Terms', icon: ClipboardList, path: '/admin/seeker-config/platform-terms' },
  { title: 'Tax Formats', icon: ClipboardList, path: '/admin/seeker-config/tax-formats' },
  { title: 'Subsidized Pricing', icon: Activity, path: '/admin/seeker-config/subsidized-pricing' },
  { title: 'Postal Formats', icon: Globe, path: '/admin/seeker-config/postal-formats' },
  { title: 'Billing Cycles', icon: CreditCard, path: '/admin/seeker-config/billing-cycles' },
  { title: 'Payment Methods', icon: CreditCard, path: '/admin/seeker-config/payment-methods' },
];

const complianceConfigItems = [
  { title: 'Export Control', icon: Shield, path: '/admin/seeker-config/export-control' },
  { title: 'Data Residency', icon: Globe, path: '/admin/seeker-config/data-residency' },
  { title: 'Blocked Domains', icon: Shield, path: '/admin/seeker-config/blocked-domains' },
];

const taxonomyItems = [
  { title: 'Academic Taxonomy', icon: GraduationCap, path: '/admin/master-data/academic-taxonomy' },
  { title: 'Proficiency Taxonomy', icon: Network, path: '/admin/master-data/proficiency-taxonomy' },
];

const interviewItems = [
  { title: 'Interview KIT', icon: ClipboardList, path: '/admin/interview/kit' },
  { title: 'Quorum Requirements', icon: Calendar, path: '/admin/interview/quorum-requirements' },
  { title: 'Reviewer Availability', icon: CalendarClock, path: '/admin/interview/reviewer-availability' },
  { title: 'Reviewer Approvals', icon: UserCheck, path: '/admin/reviewer-approvals', hasBadge: true },
];

const seekerItems = [
  { title: 'Org Approvals', icon: UserCheck, path: '/admin/seeker-org-approvals', hasBadge: true },
  { title: 'Enterprise Agreements', icon: ClipboardList, path: '/admin/saas-agreements' },
];

const otherItems = [
  { title: 'Question Bank', icon: FileQuestion, path: '/admin/questions' },
  { title: 'Capability Tags', icon: Tags, path: '/admin/capability-tags' },
  
  { title: 'Regression Test Kit', icon: TestTube2, path: '/admin/regression-test-kit' },
  { title: 'Social Channel Test', icon: Activity, path: '/admin/pulse-social-test' },
  { title: 'Smoke Test', icon: Shield, path: '/admin/smoke-test' },
  { title: 'Settings', icon: Settings, path: '/admin/settings', requiresTier: true },
] as const;

export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: pendingCount } = usePendingReviewerCount();
  const { data: pendingSeekerCount } = usePendingSeekerCount();
  const { data: pendingReassignmentCount } = usePendingReassignmentCount();
  const { tier, isSupervisor, isSeniorAdmin, isLoading: tierLoading } = useAdminTier();
  const { depth } = usePlatformTierDepth();

  // Prefetch top admin routes on mount
  useEffect(() => {
    prefetchAdminRoutes();
  }, []);

  // Auto-expand invitations submenu if on an invitations route
  const [invitationsOpen, setInvitationsOpen] = useState(
    location.pathname.startsWith('/admin/invitations')
  );

  const isActive = (path: string) => location.pathname === path;
  const isInvitationsActive = location.pathname.startsWith('/admin/invitations');

  // Tier-based visibility — depth=1 means everyone is effectively supervisor
  const effectiveSupervisor = isSupervisor || depth === 1;
  const canSeeTeamManagement = effectiveSupervisor || isSeniorAdmin;
  const canSeeSeekerConfig = effectiveSupervisor || isSeniorAdmin;

  // Build team management items based on tier
  const teamManagementItems = [
    ...(canSeeTeamManagement ? [{ title: 'Platform Admins', icon: Users2, path: '/admin/platform-admins' }] : []),
    ...(effectiveSupervisor ? [{ title: 'Assignment Audit Log', icon: ScrollText, path: '/admin/assignment-audit-log' }] : []),
    ...(canSeeTeamManagement ? [{ title: 'My Profile', icon: User, path: '/admin/my-profile' }] : []),
  ];

  // Prefetch on hover handler
  const handleMouseEnter = useCallback((path: string) => {
    prefetchRoute(path);
  }, []);

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <div className="flex flex-col">
            <span className="text-lg font-semibold">Admin Panel</span>
            {!tierLoading && tier && depth > 1 && (
              <span className="text-xs text-muted-foreground capitalize">
                {tier === 'senior_admin' ? 'Senior Admin' : tier}
              </span>
            )}
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin')}
                  isActive={location.pathname === '/admin'}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Master Data</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {masterDataItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    onMouseEnter={() => handleMouseEnter(item.path)}
                    isActive={isActive(item.path)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Taxonomy Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {taxonomyItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    onMouseEnter={() => handleMouseEnter(item.path)}
                    isActive={isActive(item.path)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Interview Setup</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {interviewItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    onMouseEnter={() => handleMouseEnter(item.path)}
                    isActive={isActive(item.path)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.title}</span>
                    {item.hasBadge && pendingCount && pendingCount > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 text-xs">
                        {pendingCount}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Verification</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/verifications')}
                  onMouseEnter={() => handleMouseEnter('/admin/verifications')}
                  isActive={location.pathname.startsWith('/admin/verifications')}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span>Verifications</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {effectiveSupervisor && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/reassignments')}
                    onMouseEnter={() => handleMouseEnter('/admin/reassignments')}
                    isActive={location.pathname === '/admin/reassignments'}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    <span className="flex-1">Reassignments</span>
                    {pendingReassignmentCount && pendingReassignmentCount > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 text-xs">
                        {pendingReassignmentCount}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {effectiveSupervisor && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/notifications/audit')}
                    onMouseEnter={() => handleMouseEnter('/admin/notifications/audit')}
                    isActive={location.pathname === '/admin/notifications/audit'}
                  >
                    <Bell className="h-4 w-4" />
                    <span>Notification Audit</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isSupervisor && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/performance')}
                    onMouseEnter={() => handleMouseEnter('/admin/performance')}
                    isActive={location.pathname === '/admin/performance'}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Team Performance</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/my-performance')}
                  onMouseEnter={() => handleMouseEnter('/admin/my-performance')}
                  isActive={location.pathname === '/admin/my-performance'}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>My Performance</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* GAP-3: My Availability as distinct sidebar item */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/availability')}
                  onMouseEnter={() => handleMouseEnter('/admin/availability')}
                  isActive={isActive('/admin/availability')}
                >
                  <CalendarHeart className="h-4 w-4" />
                  <span>My Availability</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* System Config — supervisor only */}
              {isSupervisor && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/system-config')}
                    onMouseEnter={() => handleMouseEnter('/admin/system-config')}
                    isActive={location.pathname.startsWith('/admin/system-config')}
                  >
                    <Settings className="h-4 w-4" />
                    <span>System Config</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {/* GAP-2: Permissions Management — supervisor only */}
              {isSupervisor && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/permissions')}
                    onMouseEnter={() => handleMouseEnter('/admin/permissions')}
                    isActive={isActive('/admin/permissions')}
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>Permissions</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Seeker Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {seekerItems
                .filter((item) => {
                  // Enterprise Agreements requires senior_admin+
                  if (item.path === '/admin/saas-agreements') return isSupervisor || isSeniorAdmin;
                  return true;
                })
                .map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    onMouseEnter={() => handleMouseEnter(item.path)}
                    isActive={isActive(item.path)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.title}</span>
                    {item.hasBadge && pendingSeekerCount && pendingSeekerCount > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 text-xs">
                        {pendingSeekerCount}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {canSeeTeamManagement && (
          <SidebarGroup>
            <SidebarGroupLabel>Team Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {teamManagementItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      onMouseEnter={() => handleMouseEnter(item.path)}
                      isActive={isActive(item.path)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {canSeeSeekerConfig && (
          <SidebarGroup>
            <SidebarGroupLabel>Seeker Config</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
              {seekerConfigItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      onMouseEnter={() => handleMouseEnter(item.path)}
                      isActive={isActive(item.path)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {isSupervisor && complianceConfigItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      onMouseEnter={() => handleMouseEnter(item.path)}
                      isActive={isActive(item.path)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Other</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Invitations Collapsible Submenu */}
              <Collapsible
                open={invitationsOpen}
                onOpenChange={setInvitationsOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isInvitationsActive}>
                      <Mail className="h-4 w-4" />
                      <span className="flex-1">Invitations</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => navigate('/admin/invitations')}
                          onMouseEnter={() => handleMouseEnter('/admin/invitations')}
                          isActive={isActive('/admin/invitations')}
                          className="cursor-pointer"
                        >
                          <ChevronRight className="h-3 w-3 mr-1" />
                          Solution Provider
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => navigate('/admin/invitations/panel-reviewers')}
                          onMouseEnter={() => handleMouseEnter('/admin/invitations/panel-reviewers')}
                          isActive={isActive('/admin/invitations/panel-reviewers')}
                          className="cursor-pointer"
                        >
                          <ChevronRight className="h-3 w-3 mr-1" />
                          Panel Reviewer
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              {/* My Profile — shown here for basic admin since Team Management is hidden */}
              {!canSeeTeamManagement && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/my-profile')}
                    onMouseEnter={() => handleMouseEnter('/admin/my-profile')}
                    isActive={isActive('/admin/my-profile')}
                  >
                    <User className="h-4 w-4" />
                    <span>My Profile</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Other menu items */}
              {otherItems
                .filter((item) => {
                  if ('requiresSupervisor' in item && item.requiresSupervisor) return isSupervisor;
                  if ('requiresTier' in item && item.requiresTier) return isSupervisor || isSeniorAdmin;
                  return true;
                })
                .map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    onMouseEnter={() => handleMouseEnter(item.path)}
                    isActive={isActive(item.path)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to App
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
