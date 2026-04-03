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
  BookOpen,
  BrainCircuit,
  Factory,
  Globe2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdminSidebarCounts } from '@/hooks/queries/useAdminSidebarCounts';
import { useAdminTier } from '@/hooks/useAdminTier';
import { usePlatformTierDepth } from '@/hooks/queries/useTierDepthConfig';
import { prefetchRoute, prefetchAdminRoutes } from '@/lib/routePrefetch';

// ═══════════════════════════════════════════════════════════
// Group 2: Reference Data (Master Data + Taxonomy merged)
// ═══════════════════════════════════════════════════════════
const referenceDataItems = [
  { title: 'Countries', icon: Globe, path: '/admin/master-data/countries' },
  { title: 'Industry Segments', icon: Briefcase, path: '/admin/master-data/industry-segments' },
  { title: 'Organization Types', icon: Building2, path: '/admin/master-data/organization-types' },
  { title: 'Participation Modes', icon: Users, path: '/admin/master-data/participation-modes' },
  { title: 'Expertise Levels', icon: Award, path: '/admin/master-data/expertise-levels' },
  { title: 'Departments', icon: Building2, path: '/admin/master-data/departments' },
  { title: 'Functional Areas', icon: Briefcase, path: '/admin/master-data/functional-areas' },
  { title: 'Proficiency Taxonomy', icon: Network, path: '/admin/master-data/proficiency-taxonomy' },
];

// ═══════════════════════════════════════════════════════════
// Group 3: Interview & Review
// ═══════════════════════════════════════════════════════════
const interviewItems = [
  { title: 'Interview KIT', icon: ClipboardList, path: '/admin/interview/kit' },
  { title: 'Quorum Requirements', icon: Calendar, path: '/admin/interview/quorum-requirements' },
  { title: 'Reviewer Availability', icon: CalendarClock, path: '/admin/interview/reviewer-availability' },
  { title: 'Reviewer Approvals', icon: UserCheck, path: '/admin/reviewer-approvals', hasBadge: true },
];

// ═══════════════════════════════════════════════════════════
// Group 6: Seeker Config (top-level, high-frequency access)
// ═══════════════════════════════════════════════════════════
const seekerConfigItems = [
  { title: 'Pricing Overview', icon: Activity, path: '/admin/seeker-config/pricing-overview' },
  { title: 'Subscription Tiers', icon: CreditCard, path: '/admin/seeker-config/subscription-tiers' },
  { title: 'Membership Tiers', icon: Award, path: '/admin/seeker-config/membership-tiers' },
  { title: 'Engagement Models', icon: Network, path: '/admin/seeker-config/engagement-models' },
  { title: 'Challenge Complexity', icon: Activity, path: '/admin/seeker-config/challenge-complexity' },
  { title: 'Solution Maturity', icon: Activity, path: '/admin/seeker-config/solution-maturity' },
  { title: 'Base Fee Config', icon: CreditCard, path: '/admin/seeker-config/base-fees' },
  { title: 'Platform Fees', icon: CreditCard, path: '/admin/seeker-config/platform-fees' },
  { title: 'Challenge Statuses', icon: ClipboardList, path: '/admin/seeker-config/challenge-statuses' },
  
  { title: 'Platform Terms', icon: ClipboardList, path: '/admin/seeker-config/platform-terms' },
  { title: 'Tax Formats', icon: ClipboardList, path: '/admin/seeker-config/tax-formats' },
  { title: 'Subsidized Pricing', icon: Activity, path: '/admin/seeker-config/subsidized-pricing' },
  { title: 'Postal Formats', icon: Globe, path: '/admin/seeker-config/postal-formats' },
  { title: 'Billing Cycles', icon: CreditCard, path: '/admin/seeker-config/billing-cycles' },
  { title: 'Payment Methods', icon: CreditCard, path: '/admin/seeker-config/payment-methods' },
  { title: 'Governance Rules', icon: Shield, path: '/admin/seeker-config/governance-rules' },
  { title: 'Governance Modes', icon: Settings, path: '/admin/seeker-config/governance-modes' },
  { title: 'Legal Templates', icon: FileText, path: '/admin/seeker-config/legal-templates' },
  { title: 'Role Convergence', icon: Network, path: '/admin/seeker-config/role-convergence' },
  { title: 'Tier Access', icon: KeyRound, path: '/admin/seeker-config/tier-access' },
  { title: 'AI Review Config', icon: Settings, path: '/admin/seeker-config/ai-review-config' },
  { title: 'Rate Cards', icon: CreditCard, path: '/admin/seeker-config/rate-cards' },
  { title: 'Non-Monetary Incentives', icon: Award, path: '/admin/seeker-config/incentives' },
];

const complianceConfigItems = [
  { title: 'Export Control', icon: Shield, path: '/admin/seeker-config/export-control' },
  { title: 'Data Residency', icon: Globe, path: '/admin/seeker-config/data-residency' },
  { title: 'Blocked Domains', icon: Shield, path: '/admin/seeker-config/blocked-domains' },
];

export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: sidebarCounts } = useAdminSidebarCounts();
  const pendingCount = sidebarCounts?.pendingReviewers;
  const pendingSeekerCount = sidebarCounts?.pendingSeekers;
  const pendingReassignmentCount = sidebarCounts?.pendingReassignments;
  const { tier, hasPermission, isLoading: tierLoading } = useAdminTier();
  const { depth } = usePlatformTierDepth();

  // Prefetch top admin routes on mount
  useEffect(() => {
    prefetchAdminRoutes();
  }, []);

  // Auto-expand invitations submenu if on an invitations route
  const [invitationsOpen, setInvitationsOpen] = useState(
    location.pathname.startsWith('/admin/invitations')
  );

  // Auto-expand dev tools if on a dev tool route
  const [devToolsOpen, setDevToolsOpen] = useState(
    location.pathname === '/admin/regression-test-kit' ||
    location.pathname === '/admin/pulse-social-test' ||
    location.pathname === '/admin/smoke-test' ||
    location.pathname === '/admin/test-setup'
  );

  const isActive = (path: string) => location.pathname === path;
  const isInvitationsActive = location.pathname.startsWith('/admin/invitations');

  // Prefetch on hover handler
  const handleMouseEnter = useCallback((path: string) => {
    prefetchRoute(path);
  }, []);

  // Memoized navigation handler to avoid inline arrow functions
  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  // Helper to render a simple menu item
  const renderMenuItem = (item: { title: string; icon: React.ElementType; path: string; hasBadge?: boolean }, badgeCount?: number) => (
    <SidebarMenuItem key={item.path}>
      <SidebarMenuButton
        onClick={() => handleNavigate(item.path)}
        onMouseEnter={() => handleMouseEnter(item.path)}
        isActive={isActive(item.path)}
        aria-current={isActive(item.path) ? "page" : undefined}
      >
        <item.icon className="h-4 w-4" />
        <span className="flex-1">{item.title}</span>
        {item.hasBadge && badgeCount && badgeCount > 0 && (
          <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 text-xs">
            {badgeCount}
          </Badge>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar className="border-r" aria-label="Admin Navigation">
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
        {/* ═══════════════════════════════════════════════════ */}
        {/* GROUP 1: Dashboard                                 */}
        {/* ═══════════════════════════════════════════════════ */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin')}
                  isActive={location.pathname === '/admin'}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="flex-1">Dashboard</span>
                  <span title="Dashboard Help" onClick={(e) => { e.stopPropagation(); navigate('/admin/kc/dashboard'); }} className="shrink-0 cursor-pointer">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ═══════════════════════════════════════════════════ */}
        {/* GROUP 2: Reference Data (Master Data + Taxonomy)   */}
        {/* ═══════════════════════════════════════════════════ */}
        {(hasPermission('master_data.view') || hasPermission('taxonomy.view')) && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1">
              <span className="flex-1">Reference Data</span>
              <span title="Reference Data Help" onClick={() => navigate('/admin/kc/reference-data')} className="shrink-0 cursor-pointer">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {hasPermission('master_data.view') && referenceDataItems
                  .filter((item) => item.path !== '/admin/master-data/proficiency-taxonomy')
                  .map((item) => renderMenuItem(item))}
                {hasPermission('taxonomy.view') && renderMenuItem(
                  referenceDataItems.find((item) => item.path === '/admin/master-data/proficiency-taxonomy')!
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* GROUP 3: Interview & Review                        */}
        {/* ═══════════════════════════════════════════════════ */}
        {hasPermission('interview.view') && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1">
              <span className="flex-1">Interview & Review</span>
              <span title="Interview & Review Help" onClick={() => navigate('/admin/kc/interview-review')} className="shrink-0 cursor-pointer">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {interviewItems.map((item) => renderMenuItem(item, pendingCount))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* GROUP 4: Operations                                */}
        {/* Verifications, Knowledge Centre, Reassignments,    */}
        {/* Org Approvals, Enterprise Agreements, Notif Audit  */}
        {/* ═══════════════════════════════════════════════════ */}
        {(hasPermission('verification.view_dashboard') || hasPermission('org_approvals.view')) && (
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1">
            <span className="flex-1">Operations</span>
            <span title="Operations Help" onClick={() => navigate('/admin/verification-knowledge-centre')} className="shrink-0 cursor-pointer">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasPermission('verification.view_dashboard') && (
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
              )}
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
              {hasPermission('supervisor.approve_reassignments') && (
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
              {/* Org Approvals — gated by org_approvals.view */}
              {hasPermission('org_approvals.view') && (
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
              )}
              {/* Enterprise Agreements — senior+ */}
              {hasPermission('org_approvals.manage_agreements') && (
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
              {/* Notification Audit — supervisor */}
              {hasPermission('supervisor.view_audit_logs') && (
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
              {/* Team Performance — supervisor */}
              {hasPermission('supervisor.view_team_performance') && (
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* GROUP 5: Marketplace                               */}
        {/* ═══════════════════════════════════════════════════ */}
        {hasPermission('marketplace.view') && (
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1">
            <span className="flex-1">Marketplace</span>
            <span title="Marketplace Help" onClick={() => navigate('/admin/kc/marketplace')} className="shrink-0 cursor-pointer">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
            </span>
          </SidebarGroupLabel>
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
              {hasPermission('marketplace.manage_config') && (
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
              {hasPermission('marketplace.manage_config') && (
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
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* GROUP 6: Seeker Config (top-level, high-frequency) */}
        {/* ═══════════════════════════════════════════════════ */}
        {hasPermission('seeker_config.view') && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1">
              <span className="flex-1">Seeker Config</span>
              <span title="Seeker Config Help" onClick={() => navigate('/admin/kc/seeker-config')} className="shrink-0 cursor-pointer">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {seekerConfigItems.map((item) => renderMenuItem(item))}
                {hasPermission('seeker_config.view_shadow_pricing') && (
                  <SidebarMenuItem key="/admin/seeker-config/shadow-pricing">
                    <SidebarMenuButton
                      onClick={() => navigate('/admin/seeker-config/shadow-pricing')}
                      onMouseEnter={() => handleMouseEnter('/admin/seeker-config/shadow-pricing')}
                      isActive={isActive('/admin/seeker-config/shadow-pricing')}
                    >
                      <Activity className="h-4 w-4" />
                      <span>Shadow Pricing</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {hasPermission('seeker_config.manage_compliance') && complianceConfigItems.map((item) => renderMenuItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* GROUP 7: Content & Invitations                     */}
        {/* ═══════════════════════════════════════════════════ */}
        {(hasPermission('content.view_questions') || hasPermission('invitations.view')) && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1">
              <span className="flex-1">Content & Invitations</span>
              <span title="Content & Invitations Help" onClick={() => navigate('/admin/kc/content-invitations')} className="shrink-0 cursor-pointer">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {hasPermission('content.view_questions') && (
                  <>
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
                  </>
                )}
                {hasPermission('invitations.view') && (
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
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* GROUP 8: My Workspace                              */}
        {/* Personal items + supervisor admin section           */}
        {/* ═══════════════════════════════════════════════════ */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1">
            <span className="flex-1">My Workspace</span>
            <span title="My Workspace Help" onClick={() => navigate('/admin/kc/my-workspace')} className="shrink-0 cursor-pointer">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* My Profile — always visible */}
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
              {/* My Performance — always visible */}
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
              {/* My Availability — always visible */}
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
              {/* Settings */}
              {hasPermission('admin_management.view_settings') && (
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

              {/* ── Supervisor section ── */}
              {hasPermission('admin_management.view_all_admins') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/platform-admins')}
                    onMouseEnter={() => handleMouseEnter('/admin/platform-admins')}
                    isActive={isActive('/admin/platform-admins')}
                  >
                    <Users2 className="h-4 w-4" />
                    <span>Platform Admins</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {hasPermission('supervisor.view_audit_logs') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/assignment-audit-log')}
                    onMouseEnter={() => handleMouseEnter('/admin/assignment-audit-log')}
                    isActive={isActive('/admin/assignment-audit-log')}
                  >
                    <ScrollText className="h-4 w-4" />
                    <span>Assignment Audit Log</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {hasPermission('supervisor.configure_system') && (
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
              {hasPermission('supervisor.manage_permissions') && (
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

              {/* AI Quality (Phase 10) — supervisor only */}
              {hasPermission('supervisor.configure_system') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/ai-quality')}
                    onMouseEnter={() => handleMouseEnter('/admin/ai-quality')}
                    isActive={location.pathname.startsWith('/admin/ai-quality')}
                  >
                    <BrainCircuit className="h-4 w-4" />
                    <span>AI Quality</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Phase 11: Industry + Geography Intelligence — supervisor only */}
              {hasPermission('supervisor.configure_system') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/industry-packs')}
                    onMouseEnter={() => handleMouseEnter('/admin/industry-packs')}
                    isActive={location.pathname.startsWith('/admin/industry-packs')}
                  >
                    <Factory className="h-4 w-4" />
                    <span>Industry Packs</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {hasPermission('supervisor.configure_system') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/geography-context')}
                    onMouseEnter={() => handleMouseEnter('/admin/geography-context')}
                    isActive={location.pathname.startsWith('/admin/geography-context')}
                  >
                    <Globe2 className="h-4 w-4" />
                    <span>Geography Context</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* ── Dev Tools (collapsible, supervisor only) ── */}
              {hasPermission('supervisor.configure_system') && (
                <Collapsible
                  open={devToolsOpen}
                  onOpenChange={setDevToolsOpen}
                  className="group/devtools"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={
                          isActive('/admin/regression-test-kit') ||
                          isActive('/admin/pulse-social-test') ||
                          isActive('/admin/smoke-test') ||
                          isActive('/admin/test-setup')
                        }
                      >
                        <TestTube2 className="h-4 w-4" />
                        <span className="flex-1">Dev Tools</span>
                        <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/devtools:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => navigate('/admin/regression-test-kit')}
                            onMouseEnter={() => handleMouseEnter('/admin/regression-test-kit')}
                            isActive={isActive('/admin/regression-test-kit')}
                            className="cursor-pointer"
                          >
                            <ChevronRight className="h-3 w-3 mr-1" />
                            Regression Test Kit
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => navigate('/admin/pulse-social-test')}
                            onMouseEnter={() => handleMouseEnter('/admin/pulse-social-test')}
                            isActive={isActive('/admin/pulse-social-test')}
                            className="cursor-pointer"
                          >
                            <ChevronRight className="h-3 w-3 mr-1" />
                            Social Channel Test
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => navigate('/admin/smoke-test')}
                            onMouseEnter={() => handleMouseEnter('/admin/smoke-test')}
                            isActive={isActive('/admin/smoke-test')}
                            className="cursor-pointer"
                          >
                            <ChevronRight className="h-3 w-3 mr-1" />
                            Smoke Test
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => navigate('/admin/test-setup')}
                            onMouseEnter={() => handleMouseEnter('/admin/test-setup')}
                            isActive={isActive('/admin/test-setup')}
                            className="cursor-pointer"
                          >
                            <ChevronRight className="h-3 w-3 mr-1" />
                            Test Scenario Setup
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
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
