/**
 * OrgSidebar — Sidebar for the Seeker Organization portal.
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrgContext } from '@/contexts/OrgContext';

export function OrgSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgName, tierCode } = useOrgContext();

  const isActive = (path: string) => location.pathname === path;

  const mainItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/org/dashboard' },
  ];

  const challengeItems = [
    { title: 'All Challenges', icon: Briefcase, path: '/org/challenges' },
    { title: 'Create Challenge', icon: PlusCircle, path: '/org/challenges/create' },
  ];

  const orgItems = [
    { title: 'Settings', icon: Building2, path: '/org/settings' },
    { title: 'Team', icon: Users, path: '/org/team' },
    { title: 'Membership', icon: Crown, path: '/org/membership' },
    { title: 'Parent Dashboard', icon: Network, path: '/org/parent-dashboard' },
  ];

  const billingItems = [
    { title: 'Billing & Usage', icon: CreditCard, path: '/org/billing' },
  ];

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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton onClick={() => navigate(item.path)} isActive={isActive(item.path)}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Challenges</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {challengeItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton onClick={() => navigate(item.path)} isActive={isActive(item.path)}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Organization</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {orgItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton onClick={() => navigate(item.path)} isActive={isActive(item.path)}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Billing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {billingItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton onClick={() => navigate(item.path)} isActive={isActive(item.path)}>
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
        <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to App
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
