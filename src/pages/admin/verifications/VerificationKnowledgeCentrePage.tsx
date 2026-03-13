import { useNavigate } from 'react-router-dom';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowLeft,
  LayoutDashboard,
  AlertTriangle,
  BarChart3,
  ListTodo,
  ClipboardCheck,
  CheckCircle2,
  MessageSquare,
  Undo2,
  ArrowRightLeft,
  ShieldAlert,
  Activity,
  TrendingUp,
  Settings,
  Layers,
  Target,
  Sliders,
  Users,
  Clock,
  Timer,
  Mail,
  RefreshCcw,
  GraduationCap,
  Link2,
} from 'lucide-react';

const GROUPS = [
  {
    title: 'Getting Started',
    items: [
      {
        id: 'dashboard-overview',
        icon: LayoutDashboard,
        title: 'Verification Dashboard Overview',
        content: `The Verification Dashboard is your central hub for managing organization verifications. It has two main tabs:

• **My Assignments** — Shows every verification currently assigned to you. Each row displays the organization name, submission date, SLA status, and assignment method. The count badge on the tab tells you how many active assignments you have.

• **Open Queue** — Lists organizations awaiting verification that have not yet been claimed by any admin. You can claim an entry from here to start working on it.

Use the tab badges to quickly see how many items need your attention without opening each tab.`,
      },
      {
        id: 'sla-tiers',
        icon: AlertTriangle,
        title: 'Understanding SLA Tiers',
        content: `Every verification has an SLA (Service Level Agreement) clock that starts when the organization is assigned. The system automatically calculates breach tiers:

• **TIER 1 (⚠ Warning)** — You have reached 80% of the allowed processing time. An amber banner appears on the dashboard. Action: prioritise this verification to avoid a breach.

• **TIER 2 (🔴 Breach)** — The SLA deadline has passed (100%). A red banner appears. The supervisor is notified. Action: complete the verification immediately or request reassignment if blocked.

• **TIER 3 (🚨 Critical)** — Processing time has exceeded 150% of the SLA. The system may automatically reassign the verification. Escalation contacts are notified. Action: speak with your supervisor.

The coloured badges (T1, T2, T3) on each row and the banner at the top of the dashboard help you spot at-risk verifications at a glance.`,
      },
      {
        id: 'team-overview',
        icon: BarChart3,
        title: 'Team Overview Cards (Supervisors)',
        content: `If you are a Supervisor, you will see a row of KPI cards at the top of the Verification Dashboard. These cards summarise team-wide metrics:

• **Total Active** — How many verifications are currently in progress across all admins.
• **Open Queue Size** — How many unassigned verifications are waiting to be claimed.
• **SLA Compliance Rate** — The percentage of verifications completed within the SLA window over the current period.
• **Average Processing Time** — The mean time from assignment to completion.

These cards update in real time. Use them to identify bottlenecks, redistribute workload, or spot admins who may need support.`,
      },
    ],
  },
  {
    title: 'Working a Verification',
    items: [
      {
        id: 'claiming',
        icon: ListTodo,
        title: 'Claiming from the Open Queue',
        content: `When an organization submits payment and enters the verification pipeline, it appears in the Open Queue if it has not been auto-assigned.

**How to claim:**
1. Go to the **Open Queue** tab.
2. Click the **Claim** button on the row you want to work on.
3. The system performs an atomic lock — if another admin claims it at the same moment, only one will succeed. If your claim fails, the row will disappear and you can pick another.

Once claimed, the organization moves to your **My Assignments** tab. The assignment method badge will show "Queue Claimed" to distinguish it from auto-assigned or reassigned work.`,
      },
      {
        id: 'v1-v6-checklist',
        icon: ClipboardCheck,
        title: 'The V1–V6 Verification Checklist',
        content: `Every verification follows a sequential six-check process. You must complete checks V1 through V5 before V6 becomes available.

• **V1 — Domain Verification:** Confirm the organization's website domain matches the registration details. Check for WHOIS consistency, active website, and matching business name.

• **V2 — Identity Verification:** Verify the identity of the primary contact. Cross-reference the submitted ID document against the contact's name and the organization's registration.

• **V3 — Document Verification:** Review all uploaded documents — business registration certificate, tax ID, incorporation papers. Check that documents are legible, current (not expired), and match the organization details.

• **V4 — Compliance Verification:** Confirm the organization is not on any sanctions or restricted-party lists (OFAC). Verify the registered country is permitted on the platform.

• **V5 — Admin Identity Verification:** Verify the designated Primary Seeking Org Admin's identity — the person who will manage the organization on the platform after approval.

• **V6 — Final Review (Gate Check):** This check unlocks only after V1–V5 are all marked as Pass. Review the overall verification holistically. If everything is satisfactory, the Approve button becomes active.

Each check can be marked as **Pass**, **Fail**, or **Needs Clarification**. Add notes to document your findings — these notes are visible in the audit trail.`,
      },
      {
        id: 'terminal-actions',
        icon: CheckCircle2,
        title: 'Terminal Actions: Approve, Reject, Return',
        content: `After completing the checklist, you take one of three terminal actions from the action bar at the bottom of the screen:

**✅ Approve**
• Available only when V6 is marked as Pass.
• A confirmation dialog asks you to confirm. Once approved, the organization transitions to "Verified" status and the Primary Seeking Org Admin account is automatically provisioned.
• You are redirected to the dashboard.

**❌ Reject**
• Opens a dialog requiring you to enter a rejection reason (mandatory).
• The organization is marked as "Rejected." The registrant receives an email notification with the reason.
• This is a terminal state — the registrant must re-register to try again.

**🔄 Return for Correction**
• Opens a dialog requiring you to describe what needs to be corrected (mandatory).
• The organization is moved back to the registrant's inbox for corrections. They receive an email notification.
• Once the registrant resubmits, the organization re-enters the verification queue.

All terminal actions are atomic database operations — they cannot be partially completed.`,
      },
      {
        id: 'registrant-comms',
        icon: MessageSquare,
        title: 'Registrant Communications',
        content: `The Verification Detail page includes a communications thread where you can message the registrant directly.

**When to use it:**
• When a document is unclear and you need clarification before marking V3.
• When the domain check (V1) raises questions that the registrant can explain.
• When you need additional information not covered by the uploaded documents.

**How it works:**
1. Open the verification detail page.
2. Scroll to the Communications section.
3. Type your message and send. The registrant receives an email notification with your message.
4. When the registrant replies, you receive an in-app notification.

Keep messages professional and specific. Reference the check (e.g., "Regarding V3 — Document Verification…") so the registrant knows exactly what you need.`,
      },
    ],
  },
  {
    title: 'Queue & Assignment Management',
    items: [
      {
        id: 'release-to-queue',
        icon: Undo2,
        title: 'Releasing to Queue',
        content: `If you have claimed or been assigned a verification but cannot complete it, you can release it back to the Open Queue — but only within the first 2 hours of assignment.

**How to release:**
1. Open the verification detail page.
2. In the action bar at the bottom, click **Release to Queue** (visible only within the 2-hour window).
3. Confirm in the dialog. The verification returns to the Open Queue for another admin to claim.

A countdown timer next to the button shows how much time remains in the release window. After 2 hours, the button disappears and you must use **Request Reassignment** instead.`,
      },
      {
        id: 'request-reassignment',
        icon: ArrowRightLeft,
        title: 'Requesting Reassignment',
        content: `If you cannot complete a verification and the 2-hour release window has passed, you can request reassignment.

**How to request:**
1. Open the verification detail page.
2. Click **Request Reassignment** in the action bar.
3. Enter a justification explaining why you cannot continue (mandatory).
4. Submit. The request goes to your supervisor for approval.

**Limits:** Each verification can be reassigned a maximum of 3 times. After 3 reassignments, the button is disabled and the supervisor must handle it directly.

**What the supervisor sees:** The request appears in the Reassignments page with your justification. They can approve (assigning to another admin) or deny the request.`,
      },
      {
        id: 'force-reassign',
        icon: ShieldAlert,
        title: 'Supervisor Force Reassign',
        content: `Supervisors can reassign any verification directly, without the admin requesting it.

**When to use:**
• An admin is unavailable (sick leave, out of office).
• An SLA breach requires immediate redistribution.
• Workload balancing across the team.

**How it works:**
1. Go to the **Reassignments** page in the sidebar.
2. Select the verification to reassign.
3. Choose the target admin from the list (shows current workload for each admin).
4. Enter a reason and confirm.

The original admin receives a notification that their assignment was reassigned. The new admin receives the verification in their My Assignments tab. An audit log entry is created for every force reassignment.`,
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        id: 'availability-workload',
        icon: Activity,
        title: 'My Availability & Workload',
        content: `Your availability status determines whether the system auto-assigns new verifications to you.

**Availability statuses:**
• **Available** — You can receive new auto-assignments and claim from the Open Queue.
• **Unavailable** — No new auto-assignments. Existing assignments remain yours. You can still claim from the queue manually.

**Workload bar:** On the Platform Admins page, each admin's workload bar shows current assignments vs. maximum capacity:
• 🟢 Green (0–69%) — Comfortable workload.
• 🟠 Orange (70–99%) — Approaching capacity. Auto-assignment priority decreases.
• 🔴 Red (100%) — At capacity. No new auto-assignments until a slot opens.

Your workload bar updates in real time as you complete or receive verifications.`,
      },
      {
        id: 'performance-metrics',
        icon: TrendingUp,
        title: 'My Performance Metrics',
        content: `The Performance page tracks your verification activity over time:

• **Verifications Completed** — Total count of verifications you have taken to a terminal state (approved, rejected, or returned).
• **Average Processing Time** — Mean hours from assignment to completion.
• **SLA Compliance Rate** — Percentage of your verifications completed within the SLA window.
• **SLA Breached Count** — Number of verifications that exceeded the SLA deadline.
• **Open Queue Claims** — How many verifications you claimed from the queue (vs. auto-assigned).
• **Reassignments Sent / Received** — How many times you requested reassignment vs. received reassigned work.

These metrics are computed periodically and help supervisors evaluate team performance and identify training needs.`,
      },
      {
        id: 'system-config',
        icon: Settings,
        title: 'System Config & Permissions (Supervisors)',
        content: `Supervisors have access to additional configuration and governance tools:

**System Config:**
• **SLA Thresholds** — Set the time limits (in hours) for TIER1 warning, TIER2 breach, and TIER3 critical escalation. Changes take effect immediately for all active verifications.
• **Executive Escalation Contact** — Configure the contact person notified when a TIER3 critical breach occurs. If this is not set, a warning banner appears in the header.
• **Auto-Assignment Rules** — Configure how new verifications are distributed: round-robin, workload-balanced, or affinity-based (matching admin expertise to organization industry).

**Permissions:**
• View and manage which admins have access to specific features.
• Promote admins between tiers (Admin → Senior Admin → Supervisor).
• Access codes for new admin onboarding.

All configuration changes are logged in the audit trail with the supervisor's identity and timestamp.`,
      },
    ],
  },
];

function VerificationKnowledgeCentreContent() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/verifications')}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Verification Knowledge Centre
          </h1>
          <p className="text-muted-foreground">
            Step-by-step guides for every part of the verification workflow.
          </p>
        </div>
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            {group.title}
          </h2>
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
                          return (
                            <strong key={i} className="text-foreground font-semibold">
                              {segment.slice(2, -2)}
                            </strong>
                          );
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

export default function VerificationKnowledgeCentrePage() {
  return (
    <FeatureErrorBoundary featureName="Verification Knowledge Centre">
      <VerificationKnowledgeCentreContent />
    </FeatureErrorBoundary>
  );
}
