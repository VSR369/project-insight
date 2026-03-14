import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { useAdminTier } from '@/hooks/useAdminTier';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowLeft,
  LayoutDashboard,
  Shield,
  BarChart3,
  Navigation,
  Bell,
  Users,
} from 'lucide-react';

const GROUPS = [
  {
    title: 'Understanding the Dashboard',
    items: [
      {
        id: 'dashboard-landing',
        icon: LayoutDashboard,
        title: 'What is the Admin Dashboard?',
        content: `The Admin Dashboard is the first screen you see when you log in to the Admin Panel. It provides a snapshot of your platform's current activity and health.

Think of it as the "home screen" of your admin experience — from here, you can quickly assess how things are going and decide what needs your attention first.

🏢 **Real-life example:** You log in on a Monday morning. The dashboard shows 4 verifications in your queue, 2 pending org approvals, and 1 SLA warning. You immediately know where to start your day.`,
      },
      {
        id: 'navigation-basics',
        icon: Navigation,
        title: 'Navigating the Admin Panel',
        content: `The Admin Panel uses a sidebar on the left for navigation. Each group in the sidebar represents a different area of responsibility:

• **Reference Data** — Master data tables that define what options are available across the platform (countries, industries, expertise levels, etc.).
• **Interview & Review** — Everything related to panel reviewer interviews and approvals.
• **Operations** — Day-to-day verification work, reassignments, and org approvals.
• **Marketplace** — Managing the solution provider resource pool and challenge assignments.
• **Seeker Config** — Pricing, subscription tiers, and compliance settings for seeking organisations.
• **Content & Invitations** — Question bank management and sending invitations.
• **My Workspace** — Your profile, performance metrics, availability, and (for supervisors) platform admin management.

Each group has a small 📖 help icon next to its label — clicking it opens the Knowledge Centre page for that specific group.

🏢 **Real-life example:** You need to add a new country. You look at the sidebar, find "Reference Data," and click "Countries." If you are unsure what a screen does, click the 📖 icon next to the group label for explanations.`,
      },
    ],
  },
  {
    title: 'Roles & Permissions',
    items: [
      {
        id: 'tier-badges',
        icon: Shield,
        title: 'Admin Tier Badges',
        content: `Every admin has a tier that determines what they can see and do. Your tier is shown as a coloured badge next to your name in the top-right corner:

• **Admin** — The base tier. You can process verifications, claim from the queue, view your own performance, and manage your availability. You see a subset of the sidebar menus.

• **Senior Admin** — Everything an Admin can do, plus: manage reference data (countries, industries, etc.), configure seeker pricing, send invitations, manage interview setup, and view the question bank.

• **Supervisor** — Full access to everything. You can create and manage other admin accounts, configure system parameters, view audit logs, approve reassignments, manage permissions, and access dev tools.

🏢 **Real-life example:** You are a Senior Admin. You can see Reference Data, Seeker Config, and Content & Invitations in the sidebar. Your colleague who is a basic Admin sees only Operations, Marketplace, and My Workspace. Neither of you can see System Config — only the Supervisor can.`,
      },
      {
        id: 'kpi-cards',
        icon: BarChart3,
        title: 'Dashboard KPI Cards (Supervisors)',
        supervisorOnly: true,
        content: `Supervisors see summary KPI (Key Performance Indicator) cards at the top of the dashboard. These cards give you a birds-eye view of the entire team's activity:

• **Active Verifications** — Total number of verifications currently being processed across all admins.
• **Open Queue** — How many organisations are waiting to be claimed from the queue.
• **SLA Compliance** — The percentage of verifications completed within the allowed time across the team.
• **Pending Approvals** — Combined count of pending org approvals and reassignment requests.

These numbers update automatically. Use them to spot bottlenecks early — for example, if the Open Queue is growing while Active Verifications stays flat, you may need to bring more admins online.

🏢 **Real-life example:** It is Friday afternoon. The Open Queue shows 12 items, but only 2 admins are marked as Available. You reassign some work and mark a third admin as Available to prevent an SLA breach over the weekend.`,
      },
      {
        id: 'notifications-header',
        icon: Bell,
        title: 'Header Notifications',
        content: `The top-right corner of the Admin Panel has two notification icons:

• **Bell icon (🔔)** — Shows your personal notifications: new assignments, SLA warnings, reassignment requests, and system announcements. A red dot appears when you have unread notifications. Click it to open the notification drawer.

• **Shield icon (🛡)** — Role Readiness Alerts. Shows warnings if the platform detects configuration issues (e.g., no admins are available, escalation contact is not set). Only visible when there are active alerts.

🏢 **Real-life example:** You see a red dot on the bell icon. You click it and see: "Verification for TechCorp has reached SLA Tier 1 — 80% of time used." You know you need to prioritise that case before it breaches.`,
      },
    ],
  },
];

const SUPERVISOR_ONLY_IDS = ['kpi-cards'];

function DashboardKCContent() {
  const navigate = useNavigate();
  const { isSupervisor } = useAdminTier();

  const filteredGroups = useMemo(() => {
    if (isSupervisor) return GROUPS;
    return GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !('supervisorOnly' in item && item.supervisorOnly)
      ),
    })).filter((group) => group.items.length > 0);
  }, [isSupervisor]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Knowledge Centre</h1>
          <p className="text-muted-foreground">Learn how to use the Admin Dashboard and navigate the panel.</p>
        </div>
      </div>

      {filteredGroups.map((group) => (
        <section key={group.title} className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">{group.title}</h2>
          <Accordion type="multiple" className="rounded-lg border bg-card">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <AccordionItem key={item.id} value={item.id} className="last:border-b-0">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <span>{item.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line pl-7">
                      {item.content.split(/(\*\*.*?\*\*)/g).map((segment, i) => {
                        if (segment.startsWith('**') && segment.endsWith('**')) {
                          return <strong key={i} className="text-foreground font-semibold">{segment.slice(2, -2)}</strong>;
                        }
                        return <span key={i}>{segment}</span>;
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </section>
      ))}
    </div>
  );
}

export default function DashboardKCPage() {
  return (
    <FeatureErrorBoundary featureName="Dashboard Knowledge Centre">
      <DashboardKCContent />
    </FeatureErrorBoundary>
  );
}
