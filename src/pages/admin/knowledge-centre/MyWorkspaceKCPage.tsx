import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { AiContentRenderer } from '@/components/ui/AiContentRenderer';
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
  User,
  BarChart3,
  CalendarHeart,
  Settings,
  Users2,
  ScrollText,
  KeyRound,
  TestTube2,
  Shield,
} from 'lucide-react';

const GROUPS = [
  {
    title: 'Personal',
    items: [
      {
        id: 'my-profile',
        icon: User,
        title: 'My Profile',
        content: `My Profile shows your admin account details and expertise configuration.

**What you see:**
• **Personal Information** — Your name, email, and contact details.
• **Admin Tier** — Your current tier (Admin, Senior Admin, or Supervisor) and what permissions it grants.
• **Expertise Domains** — The industries, countries, and organisation types you have declared expertise in. These are used by the auto-assignment engine to match you with relevant verifications.
• **Activity Summary** — Quick stats on your recent verification activity.

**What you can edit:**
• Your expertise domains (industries, countries, org types) — within the caps set by system config if you are a basic Admin.
• Your contact details.

**What you cannot edit:**
• Your tier (only a supervisor can promote/demote).
• Your email address (tied to your authentication account).

🏢 **Real-life example:** You are an Admin who was hired for your expertise in healthcare. Your profile shows: Industries = "Healthcare & Life Sciences", Countries = "US, UK", Org Types = "Corporation, University." The auto-assignment engine uses these to send you healthcare-related organisation verifications.

**Tip:** Keep your expertise domains accurate. If you declare industries you are not familiar with, you will receive verifications you cannot process efficiently, leading to reassignment requests and lower performance metrics.`,
      },
      {
        id: 'my-performance',
        icon: BarChart3,
        title: 'My Performance',
        content: `My Performance shows your individual verification metrics:

• **Verifications Completed** — Total count of verifications you have finished (approved, rejected, or returned).
• **Average Processing Time** — The average number of hours from when you are assigned a verification to when you complete it.
• **SLA Compliance Rate** — What percentage of your verifications you completed within the SLA deadline.
• **SLA Breaches** — How many of your verifications exceeded the SLA deadline.
• **Queue Claims vs Auto-Assigned** — How many verifications you claimed yourself vs. those assigned to you by the engine.
• **Reassignments Sent / Received** — How many times you requested reassignment vs. received reassigned work.

**Why this matters:**
These metrics are visible to your supervisor. They are used for:
• Performance reviews.
• Identifying who needs additional training.
• Deciding who gets promoted to Senior Admin.

🏢 **Real-life example:** Your SLA Compliance Rate is 95% and your Average Processing Time is 18 hours. Your colleague has 78% compliance and 36 hours average. Your supervisor sees these metrics side-by-side and recognises your efficiency. Strong metrics can lead to promotion from Admin to Senior Admin.

**Tip:** Regularly check your performance. If your SLA compliance drops, you may be taking on too many verifications or encountering cases outside your expertise. Talk to your supervisor about adjusting your workload or expertise domains.`,
      },
      {
        id: 'my-availability',
        icon: CalendarHeart,
        title: 'My Availability',
        content: `My Availability lets you control whether the auto-assignment engine sends you new verifications.

**Availability statuses:**
• **Available** — You are ready to receive new auto-assigned verifications and can claim from the queue.
• **Unavailable** — The engine will not send you new work. Your existing assignments remain yours. You can still claim from the queue manually if you choose.

**When to set yourself as Unavailable:**
• Planned leave (vacation, sick day).
• When you are overwhelmed with current assignments and need to finish them first.
• When you are working on a complex, time-consuming verification that needs your full attention.

**Leave notifications:**
If you set yourself as Unavailable with a future start date (planned leave), the system sends you a reminder 3 days before (configurable) prompting you to complete or reassign your active verifications.

🏢 **Real-life example:** You have 5 active verifications and your vacation starts Friday. On Tuesday, you receive a notification: "You have 5 active verifications. Your leave begins in 3 days. Please complete or request reassignment." You finish 3, reassign 2, and go on vacation with a clear queue.`,
      },
      {
        id: 'settings',
        icon: Settings,
        title: 'Admin Settings',
        content: `The Settings page lets you configure personal preferences for the admin panel:

• **Notification Preferences** — Choose which notifications you want to receive (in-app, email, or both).
• **Display Preferences** — Date/time format, timezone, items per page in tables.
• **Security** — Change password, enable two-factor authentication (if available).

🏢 **Real-life example:** You are in Australia but the platform shows times in UTC. You go to Settings, change your timezone to "Australia/Sydney," and now all timestamps in the dashboard show AEST/AEDT.`,
      },
    ],
  },
  {
    title: 'Platform Administration (Supervisor)',
    supervisorOnly: true,
    items: [
      {
        id: 'platform-admins',
        icon: Users2,
        title: 'Platform Admins',
        content: `The Platform Admins screen is where you manage all admin accounts on the platform.

**What you can do:**
• **View all admins** — See every admin's name, tier, expertise, workload, and availability status.
• **Create new admins** — Add new admin accounts at any tier (Admin, Senior Admin, Supervisor).
• **Edit admin profiles** — Update their expertise domains, tier, and account status.
• **View workload bars** — Each admin has a visual bar showing current assignments vs. maximum capacity:
  🟢 Green (0–69%) — Comfortable.
  🟠 Orange (70–99%) — Approaching capacity.
  🔴 Red (100%) — Full.

**Creating a new admin:**
1. Click "Create Admin."
2. Enter their name, email, and select their tier.
3. Configure their expertise domains (industries, countries, org types).
4. Send them an access code for initial login.

🏢 **Real-life example:** Your team is growing. You hire two new admins for the APAC region. You create their accounts as "Admin" tier, set their countries to India, Singapore, and Australia, and set their industries to match their backgrounds. They receive access codes by email and set up their accounts.

**Promoting an admin:**
You can change an admin's tier (Admin → Senior Admin → Supervisor). Promotions take effect immediately — the admin sees additional sidebar menus and gains new permissions on their next page load.`,
      },
      {
        id: 'assignment-audit-log',
        icon: ScrollText,
        title: 'Assignment Audit Log',
        content: `The Assignment Audit Log shows a detailed history of how the auto-assignment engine processed each verification.

**What each entry shows:**
• **Verification ID** — Which organisation's verification was being processed.
• **Event Type** — AUTO_ASSIGNED, FALLBACK_TO_QUEUE, MANUAL_CLAIM, REASSIGNED.
• **To Admin** — Who was assigned (if auto-assigned or reassigned).
• **Scoring Snapshot** — The exact scores the engine calculated for each candidate admin (industry match %, country match %, org type match %, workload factor).
• **Reason** — Why this particular admin was chosen or why it fell back to the queue.
• **Timestamp** — When the event occurred.

**When to use this screen:**
• You want to verify the engine is matching correctly.
• An admin questions why they received a particular assignment.
• You need to debug why a verification ended up in the queue instead of being auto-assigned.

🏢 **Real-life example:** Admin B asks "Why did I get the Acme Corp verification? I don't know anything about manufacturing." You check the audit log and see: Industry Match = 65% (Admin B listed "Manufacturing" in their profile), Country Match = 100%, Org Type Match = 80%. Admin B's profile incorrectly included Manufacturing — you help them update their expertise domains.`,
      },
      {
        id: 'system-config',
        icon: Settings,
        title: 'System Config',
        content: `System Config is the centralised control panel for all platform-wide parameters. Every setting here affects how the entire platform behaves.

**What you configure (highlights):**
• **Admin Tier Depth** — How many levels of admin hierarchy exist (1, 2, or 3).
• **Assignment Mode** — Whether verifications are auto-assigned or placed in the open queue.
• **SLA Duration & Thresholds** — How long admins have to complete verifications and when warnings fire.
• **Domain Match Weights** — How much weight the auto-assignment engine gives to industry, country, and org type matching.
• **Admin Capacity Limits** — Maximum concurrent verifications per admin.
• **Escalation Contact** — Who receives critical SLA breach notifications.
• **SOA Provisioning** — Activation link expiry, delegated admin limits.

**For detailed explanations of every parameter, see the Operations Knowledge Centre** (the Knowledge Centre page linked from the Operations group in the sidebar). That page has extensive documentation with real-life examples for each configuration parameter.

🏢 **Real-life example:** Your team is experiencing too many SLA breaches. You go to System Config and reduce sla_duration_hours from 48 to 36, then adjust tier thresholds to give earlier warnings. You also increase minimum_admins_available from 2 to 3 to ensure coverage.

**Important:** Every change you make here is logged in the Config Audit Log with your identity, the previous value, the new value, and a timestamp.`,
      },
      {
        id: 'permissions',
        icon: KeyRound,
        title: 'Permissions',
        content: `The Permissions screen shows the complete permission matrix — which actions each admin tier can perform.

**This screen is read-only.** Permissions are defined by the platform architecture and cannot be changed through the UI. The purpose of this screen is transparency: so you can see exactly what each tier can and cannot do.

**Permission categories include:**
• **master_data.view / master_data.manage** — Reference data access.
• **seeker_config.view / seeker_config.manage** — Pricing and compliance config.
• **supervisor.configure_system** — System-wide settings.
• **admin_management.view_all_admins** — Manage other admin accounts.
• **marketplace.manage_config** — Marketplace configuration.

🏢 **Real-life example:** A Senior Admin asks "Can I change the SLA duration?" You check the Permissions page and see that "supervisor.configure_system" is required for System Config. Senior Admins do not have this permission — only Supervisors do. You explain this to the Senior Admin and offer to make the change yourself.`,
      },
      {
        id: 'dev-tools',
        icon: TestTube2,
        title: 'Dev Tools',
        content: `Dev Tools is a collapsible section containing testing utilities for supervisors:

• **Regression Test Kit** — Run automated checks against critical platform workflows to verify nothing is broken after an update. Tests include enrollment flow, verification pipeline, assignment engine, and notification delivery.

• **Social Channel Test** — Test the Pulse social feed integration. Send test posts and verify they appear correctly.

• **Smoke Test** — Quick health check of the Supabase connection, table accessibility, and basic CRUD operations.

**When to use:**
• After a platform update or migration.
• When users report unexpected behaviour.
• Before a major configuration change (run tests before and after).

🏢 **Real-life example:** You deploy a new version of the platform on Saturday. Before notifying the team, you run the Smoke Test (passes in 10 seconds), then the Regression Test Kit (runs 15 tests in 2 minutes — all pass). You are confident the update is stable.

**Important:** These tools do not modify production data. They create test records prefixed with "__SMOKE_TEST_" or "__REGRESSION_" that are automatically filtered from production views.`,
      },
    ],
  },
];

function MyWorkspaceKCContent() {
  const navigate = useNavigate();
  const { isSupervisor } = useAdminTier();

  const filteredGroups = useMemo(() => {
    if (isSupervisor) return GROUPS;
    return GROUPS.filter((g) => !('supervisorOnly' in g && g.supervisorOnly));
  }, [isSupervisor]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/my-profile')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Workspace Knowledge Centre</h1>
          <p className="text-muted-foreground">Guides for your profile, performance, availability, and admin tools.</p>
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
                    <div className="pl-7">
                      <AiContentRenderer content={item.content} compact />
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

export default function MyWorkspaceKCPage() {
  return (
    <FeatureErrorBoundary featureName="My Workspace Knowledge Centre">
      <MyWorkspaceKCContent />
    </FeatureErrorBoundary>
  );
}
