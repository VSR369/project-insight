import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FileText,
  GraduationCap,
  Mail,
  Settings,
  HelpCircle,
  ChevronRight,
  Building2,
  Target,
  TreePine,
  Award,
  CheckCircle,
  Lock,
  UserCircle,
  ClipboardCheck,
  BookOpen,
  ArrowLeft,
  Zap,
  Flame,
  Trophy,
  PlusCircle,
  Layers,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useOptionalEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useEnrollmentProficiencyAreas } from '@/hooks/queries/useEnrollmentExpertise';
import { calculateCurrentStep } from '@/components/auth/OnboardingGuard';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'My Profile', url: '/profile', icon: User },
  { title: 'Invitations', url: '/invitations', icon: Mail },
];

const pulseNavItems = [
  { title: 'Feed', url: '/pulse/feed', icon: Flame },
  { title: 'Sparks', url: '/pulse/sparks', icon: Zap },
  { title: 'Pulse Cards', url: '/pulse/cards', icon: Layers },
  { title: 'Create', url: '/pulse/create', icon: PlusCircle },
  { title: 'Leaderboard', url: '/pulse/ranks', icon: Trophy },
];

const profileBuildingItems = [
  { title: 'Registration', url: '/profile/build/registration', icon: UserCircle, step: 1 },
  { title: 'Choose Mode', url: '/profile/build/choose-mode', icon: Target, step: 2 },
  { title: 'Organization', url: '/profile/build/organization', icon: Building2, step: 3, conditional: true },
  { title: 'Expertise Level', url: '/profile/build/expertise', icon: GraduationCap, step: 4 },
  { title: 'Proficiency Areas', url: '/profile/build/proficiency', icon: TreePine, step: 5 },
  { title: 'Proof Points', url: '/profile/build/proof-points', icon: Award, step: 6 },
];

const assessmentItems = [
  { title: 'Assessment', url: '/assessment', icon: FileText },
];

const toolsItems = [
  { title: 'Regression Test', url: '/tools/regression-test', icon: ClipboardCheck },
  { title: 'Lifecycle Rules', url: '/tools/lifecycle-rules', icon: BookOpen },
];

const supportItems = [
  { title: 'Knowledge Centre', url: '/knowledge-centre', icon: HelpCircle },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { data: provider } = useCurrentProvider();
  const isOnDashboard = location.pathname === '/dashboard';
  const enrollmentContext = useOptionalEnrollmentContext();
  const activeEnrollment = enrollmentContext?.activeEnrollment ?? null;
  const activeEnrollmentId = enrollmentContext?.activeEnrollmentId ?? null;
  const { data: enrollmentProficiencyAreas } = useEnrollmentProficiencyAreas(activeEnrollmentId ?? undefined);

  const currentStep = calculateCurrentStep(provider, activeEnrollment, enrollmentProficiencyAreas);

  const isPulseActive = location.pathname.startsWith('/pulse');

  const isActive = (path: string) => location.pathname === path;
  const isProfileBuildActive = location.pathname.startsWith('/profile/build');

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'current';
    return 'locked';
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className={cn(
          "flex items-center gap-2 px-2 py-3",
          collapsed && "justify-center"
        )}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">CB</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-sidebar-foreground">CogniBlend</span>
              <span className="text-xs text-sidebar-foreground/60">Provider Platform</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-2"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Industry Pulse */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1">
            <Flame className="h-3 w-3 text-orange-500" />
            Industry Pulse
            {isPulseActive && (
              <ChevronRight className="h-3 w-3 text-primary" />
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pulseNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-2"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Profile Building */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1">
            Build Profile
            {isProfileBuildActive && (
              <ChevronRight className="h-3 w-3 text-primary" />
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {profileBuildingItems.map((item) => {
                const status = getStepStatus(item.step);
                const isLocked = status === 'locked';
                const isCompleted = status === 'completed';
                const isCurrent = status === 'current';

                // Skip conditional items (like Organization) for now
                // They're handled by the flow logic in ChooseMode

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild={!isLocked}
                      isActive={isActive(item.url)}
                      className={cn(
                        isLocked && "opacity-50 cursor-not-allowed",
                        isCompleted && "text-green-600"
                      )}
                    >
                      {isLocked ? (
                        <div className="flex items-center gap-2 px-2 py-1.5">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{item.title}</span>
                        </div>
                      ) : (
                        <NavLink 
                          to={item.url}
                          className="flex items-center gap-2"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <item.icon className={cn(
                              "h-4 w-4",
                              isCurrent && "text-primary"
                            )} />
                          )}
                          <span className={cn(
                            isCompleted && "text-green-600",
                            isCurrent && "font-medium"
                          )}>
                            {item.title}
                          </span>
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Assessment */}
        <SidebarGroup>
          <SidebarGroupLabel>Assessment</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {assessmentItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-2"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-2"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Support */}
        <SidebarGroup>
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-2"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        {!isOnDashboard && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/dashboard')}
            className={cn(
              "w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            {!collapsed && <span>Back to Dashboard</span>}
          </Button>
        )}
        <div className={cn(
          "px-2 py-2 text-xs text-sidebar-foreground/50",
          collapsed && "text-center"
        )}>
          {collapsed ? "v1.0" : "Version 1.0.0"}
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
