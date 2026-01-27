import { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePendingReviewerCount } from '@/hooks/queries/usePanelReviewers';

const masterDataItems = [
  { title: 'Countries', icon: Globe, path: '/admin/master-data/countries' },
  { title: 'Industry Segments', icon: Briefcase, path: '/admin/master-data/industry-segments' },
  { title: 'Organization Types', icon: Building2, path: '/admin/master-data/organization-types' },
  { title: 'Participation Modes', icon: Users, path: '/admin/master-data/participation-modes' },
  { title: 'Expertise Levels', icon: Award, path: '/admin/master-data/expertise-levels' },
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

const otherItems = [
  { title: 'Question Bank', icon: FileQuestion, path: '/admin/questions' },
  { title: 'Capability Tags', icon: Tags, path: '/admin/capability-tags' },
  { title: 'Smoke Test', icon: Shield, path: '/admin/smoke-test' },
  { title: 'Settings', icon: Settings, path: '/admin/settings' },
];

export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: pendingCount } = usePendingReviewerCount();

  // Auto-expand invitations submenu if on an invitations route
  const [invitationsOpen, setInvitationsOpen] = useState(
    location.pathname.startsWith('/admin/invitations')
  );

  const isActive = (path: string) => location.pathname === path;
  const isInvitationsActive = location.pathname.startsWith('/admin/invitations');

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Admin Panel</span>
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

              {/* Other menu items */}
              {otherItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
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
