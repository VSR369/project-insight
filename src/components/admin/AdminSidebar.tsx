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
  Store,
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
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdminSidebarCounts } from '@/hooks/queries/useAdminSidebarCounts';
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

// seekerItems inlined into sidebar JSX — Org Approvals visible to all, Enterprise Agreements senior+

export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: sidebarCounts } = useAdminSidebarCounts();
  const pendingCount = sidebarCounts?.pendingReviewers;
  const pendingSeekerCount = sidebarCounts?.pendingSeekers;
  const pendingReassignmentCount = sidebarCounts?.pendingReassignments;
  const { tier, isSupervisor, isSeniorAdmin, hasPermission, isLoading: tierLoading } = useAdminTier();
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

  // Tier-based visibility — depth controls creation only, not runtime access
  const effectiveSupervisor = isSupervisor;
  const canSeeTeamManagement = isSupervisor || isSeniorAdmin;
  const canSeeSeekerConfig = isSupervisor || isSeniorAdmin;

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

        {hasPermission('master_data.view') && (
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
        )}

        {hasPermission('taxonomy.view') && (
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
        )}

        {hasPermission('interview.view') && (
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
        )}

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
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/verification-knowledge-centre')}
                  onMouseEnter={() => handleMouseEnter('/admin/verification-knowledge-centre')}
                  isActive={location.pathname === '/admin/verification-knowledge-centre'}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>Knowledge Centre</span>
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
              {effectiveSupervisor && (
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
              {effectiveSupervisor && (
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
              {effectiveSupervisor && (
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

        {/* MARKETPLACE — core items visible to ALL tiers, config items senior+ */}
        <SidebarGroup>
          <SidebarGroupLabel>Marketplace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/marketplace')}
                  onMouseEnter={() => handleMouseEnter('/admin/marketplace')}
                  isActive={location.pathname === '/admin/marketplace'}
                >
                  <Store className="h-4 w-4" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/marketplace/resource-pool')}
                  onMouseEnter={() => handleMouseEnter('/admin/marketplace/resource-pool')}
                  isActive={location.pathname === '/admin/marketplace/resource-pool'}
                >
                  <Users className="h-4 w-4" />
                  <span>Resource Pool</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/marketplace/solution-requests')}
                  onMouseEnter={() => handleMouseEnter('/admin/marketplace/solution-requests')}
                  isActive={location.pathname === '/admin/marketplace/solution-requests'}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>Solution Requests</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/marketplace/assignment-history')}
                  onMouseEnter={() => handleMouseEnter('/admin/marketplace/assignment-history')}
                  isActive={location.pathname === '/admin/marketplace/assignment-history'}
                >
                  <ScrollText className="h-4 w-4" />
                  <span>Assignment History</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {canSeeTeamManagement && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/marketplace/admin-contact')}
                    onMouseEnter={() => handleMouseEnter('/admin/marketplace/admin-contact')}
                    isActive={location.pathname === '/admin/marketplace/admin-contact'}
                  >
                    <UserCog className="h-4 w-4" />
                    <span>Admin Contact</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {canSeeTeamManagement && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/marketplace/email-templates')}
                    onMouseEnter={() => handleMouseEnter('/admin/marketplace/email-templates')}
                    isActive={location.pathname === '/admin/marketplace/email-templates'}
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email Templates</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Org Approvals — ALL tiers; Enterprise Agreements — senior+ */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/seeker-org-approvals')}
                  onMouseEnter={() => handleMouseEnter('/admin/seeker-org-approvals')}
                  isActive={isActive('/admin/seeker-org-approvals')}
                >
                  <UserCheck className="h-4 w-4" />
                  <span className="flex-1">Org Approvals</span>
                  {pendingSeekerCount && pendingSeekerCount > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 text-xs">
                      {pendingSeekerCount}
                    </Badge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              {canSeeTeamManagement && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/saas-agreements')}
                    onMouseEnter={() => handleMouseEnter('/admin/saas-agreements')}
                    isActive={isActive('/admin/saas-agreements')}
                  >
                    <ClipboardList className="h-4 w-4" />
                    <span>Enterprise Agreements</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
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
                {effectiveSupervisor && complianceConfigItems.map((item) => (
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

        {/* Invitations — senior_admin+ */}
        {canSeeTeamManagement && (
          <SidebarGroup>
            <SidebarGroupLabel>Invitations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Question Bank & Capability Tags — senior_admin+ */}
        {canSeeTeamManagement && (
          <SidebarGroup>
            <SidebarGroupLabel>Content</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/questions')}
                    onMouseEnter={() => handleMouseEnter('/admin/questions')}
                    isActive={isActive('/admin/questions')}
                  >
                    <FileQuestion className="h-4 w-4" />
                    <span>Question Bank</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/capability-tags')}
                    onMouseEnter={() => handleMouseEnter('/admin/capability-tags')}
                    isActive={isActive('/admin/capability-tags')}
                  >
                    <Tags className="h-4 w-4" />
                    <span>Capability Tags</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Other</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
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

              {/* Settings — senior_admin+ */}
              {canSeeTeamManagement && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/settings')}
                    onMouseEnter={() => handleMouseEnter('/admin/settings')}
                    isActive={isActive('/admin/settings')}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Test items — supervisor only */}
              {effectiveSupervisor && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate('/admin/regression-test-kit')}
                      onMouseEnter={() => handleMouseEnter('/admin/regression-test-kit')}
                      isActive={isActive('/admin/regression-test-kit')}
                    >
                      <TestTube2 className="h-4 w-4" />
                      <span>Regression Test Kit</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate('/admin/pulse-social-test')}
                      onMouseEnter={() => handleMouseEnter('/admin/pulse-social-test')}
                      isActive={isActive('/admin/pulse-social-test')}
                    >
                      <Activity className="h-4 w-4" />
                      <span>Social Channel Test</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate('/admin/smoke-test')}
                      onMouseEnter={() => handleMouseEnter('/admin/smoke-test')}
                      isActive={isActive('/admin/smoke-test')}
                    >
                      <Shield className="h-4 w-4" />
                      <span>Smoke Test</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
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
