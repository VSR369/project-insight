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
    ],
  },
  {
    title: 'System Configuration Reference',
    items: [
      {
        id: 'config-governance',
        icon: Layers,
        title: 'Governance & Scaling',
        content: `This group controls how your admin team is structured and whether customer organisations can delegate their own admins.

**platform_admin_tier_depth** (Values: 1, 2, or 3 · Default: 3)
Controls how many levels of platform admin hierarchy can exist. **Important:** At depth 1, no other admin accounts can be created — you are the only operator.

• **Depth 1 — Solo Supervisor:** You handle every verification yourself. No Senior Admins or Admins can exist. Use this when the platform is brand new with very low volume (e.g., fewer than 10 organisations per month).

• **Depth 2 — Supervisor + Senior Admins:** You can now create Senior Admin accounts. Seniors handle day-to-day verifications while you focus on oversight, configuration, and escalations. Use this when volume grows enough that one person cannot keep up.

• **Depth 3 — Full Hierarchy (Supervisor → Senior Admin → Admin):** You can now also create basic Admin accounts who report to Senior Admins. Seniors supervise Admins within their assigned domains; the Supervisor oversees the entire team. Use this when you have enough volume to justify a multi-layered team.

🏢 **Real-life example — Growing the team step by step:**
1. **Month 1 (depth = 1):** You are the only Supervisor. You process 8 verifications per month yourself. No other admin accounts exist on the platform.
2. **Month 4 (depth → 2):** Volume has grown to 30/month. You change tier depth to 2, which unlocks the "Create Senior Admin" option. You onboard 2 Senior Admins to take over daily verifications.
3. **Month 9 (depth → 3):** Volume reaches 100/month. You change tier depth to 3, which unlocks the basic Admin tier. Your 2 Senior Admins each onboard 3 Admins under them, creating a team of 8. The change takes effect immediately — new tier options appear in the admin management screens.

**org_admin_delegation_enabled** (Values: true / false · Default: true)
Controls whether Seeking Organisations can have delegated (secondary) admins in addition to their one Primary Admin.
• **true:** The Primary Admin can invite additional (delegated) admins to share the workload of managing their organisation's account — up to the limit set by max_delegated_admins_per_org.
• **false:** Only the Primary Admin exists per organisation — the delegation UI is hidden across the entire platform.

🏢 **Real-life example:** A large university with 12 departments enables delegation so each department head can be added as a delegated admin, managing their own section. A small business with one owner disables delegation to keep things simple — only one person ever logs in.`,
      },
      {
        id: 'config-assignment',
        icon: Target,
        title: 'Assignment Mode',
        content: `This parameter controls how newly submitted organisation verifications are distributed to admins.

**org_verification_assignment_mode** (Values: auto_assign / open_claim · Default: auto_assign)

• **auto_assign:** When an organisation completes payment, the system automatically selects the best-fit admin using the domain-scoring engine (see Domain Match Weights below). The verification appears directly in the assigned admin's "My Assignments" tab.

• **open_claim:** Verifications land in the shared Open Queue. Any available admin can claim them on a first-come-first-served basis. An atomic database lock ensures only one admin can claim each organisation.

🏢 **Real-life example:** During normal operations (10 organisations/day), you use **auto_assign** so work is distributed evenly based on expertise. During an onboarding campaign (50 organisations/day from the same industry), you switch to **open_claim** so your industry-specialist admins can self-select the most relevant ones. The mode can be changed at any time from the System Config dashboard — it applies to all new submissions immediately.`,
      },
      {
        id: 'config-domain-weights',
        icon: Sliders,
        title: 'Domain Match Weights',
        content: `These three weights control how the auto-assignment scoring engine prioritises admin-to-organisation matching. They must always add up to 100%.

**industry_match_weight** (Range: 0–100% · Default: 50%)
How much weight is given to matching the organisation's industry to the admin's declared industry expertise. A higher value means industry-specialist admins are strongly preferred.

**country_match_weight** (Range: 0–100% · Default: 30%)
How much weight is given to matching the organisation's registered country to the admin's country expertise. Important when country-specific regulations differ significantly.

**org_type_match_weight** (Range: 0–100% · Default: 20%)
How much weight is given to matching the organisation type (e.g., University, Corporation, NGO) to the admin's experience with that type.

The scoring engine runs a 2-pass algorithm:
• **Pass 1:** Scores all "Available" admins. If a match is found above the threshold, that admin is assigned.
• **Pass 2:** If no Available admin scores high enough, the engine looks at "Partially Available" admins.

🏢 **Real-life example:** Your platform primarily serves one country but many industries. Set industry weight to 60%, country to 15%, org type to 25%. Now, when a fintech startup registers, the admin who listed "Financial Services" as their expertise gets priority — even if they are not in the same country.

⚙️ **How to change:** Navigate to System Config → Domain Match Weights → "Configure on tuning panel." Adjust the sliders. The three values must total 100% before you can save.`,
      },
      {
        id: 'config-capacity',
        icon: Users,
        title: 'Admin Capacity & Workload',
        content: `These parameters control how many verifications each admin can handle and when the system considers them "at capacity."

**default_max_concurrent_verifications** (Range: 1–50 · Default: 10)
The maximum number of active verifications an admin can hold at the same time. Once an admin reaches this limit, the auto-assignment engine skips them and assigns to the next best match.

🏢 **Real-life example:** During a training period, set this to 3 so new admins are not overwhelmed. Once they are experienced (after 2 months), increase to 12. Senior admins handling complex verifications might have a lower cap (e.g., 5) because each case takes longer.

**partially_available_threshold** (Range: 50–100% · Default: 80%)
When an admin's workload reaches this percentage of their max capacity, their status shifts to "Partially Available." The auto-assignment engine only considers partially available admins in Pass 2 (after all fully available admins have been scored).

🏢 **Real-life example:** Admin A has max concurrent = 10 and threshold = 80%. When they hold 8 verifications (80%), they become "Partially Available." New assignments go to other admins first. This prevents any single admin from being constantly maxed out.

**minimum_admins_available** (Range: 1–10 · Default: 2)
The system warns the supervisor when the number of fully available admins drops below this threshold. This is an early warning signal that you may need to adjust workloads or bring admins back from leave.

🏢 **Real-life example:** You have 6 admins. Set this to 2. If 5 are at capacity and only 1 is available, the supervisor gets a warning notification saying "Only 1 admin available — below minimum threshold of 2."`,
      },
      {
        id: 'config-queue',
        icon: Clock,
        title: 'Open Queue & SLA Duration',
        content: `These parameters control timing for unclaimed verifications and the overall processing deadline.

**sla_duration_hours** (Range: 1–720 · Default: 48)
The total number of hours from assignment to expected completion. This is the baseline that SLA tier percentages are calculated against.

🏢 **Real-life example:** With sla_duration = 48 hours, an admin assigned a verification on Monday 9 AM is expected to complete it by Wednesday 9 AM.

**queue_unclaimed_sla_hours** (Range: 1–48 · Default: 4)
How long an organisation can sit in the Open Queue without being claimed before the first escalation is triggered. Only relevant in open_claim mode.

🏢 **Real-life example:** Set to 4 hours. An organisation enters the queue at 10 AM. If nobody claims it by 2 PM, the supervisor receives an "Unclaimed verification" notification.

**queue_escalation_interval_hours** (Range: 1–24 · Default: 2)
After the initial unclaimed SLA fires, how often the system re-escalates. Each subsequent ping becomes more urgent.

🏢 **Real-life example:** Unclaimed SLA = 4h, escalation interval = 2h. The supervisor gets notified at 4h, 6h, 8h, and so on until someone claims it.

**admin_release_window_hours** (Range: 1–24 · Default: 2)
After an admin is assigned or claims a verification, they have this many hours to release it back to the Open Queue with no penalty. After this window closes, they must use "Request Reassignment" instead.

🏢 **Real-life example:** An admin claims a verification but realises it is for an industry they have no experience in. Within 2 hours, they can click "Release to Queue" and it goes back for another admin. After 2 hours, the button disappears.`,
      },
      {
        id: 'config-sla-thresholds',
        icon: Timer,
        title: 'SLA Escalation Thresholds',
        content: `These three parameters define the percentage of SLA duration at which each escalation tier is triggered. They work together with sla_duration_hours (see Open Queue section).

**sla_tier1_threshold_pct** (Range: 50–100% · Default: 80%)
Triggers the TIER 1 — Warning state. An amber banner appears on the admin's dashboard and the verification card shows a ⚠ badge.

**sla_tier2_threshold_pct** (Range: 80–150% · Default: 100%)
Triggers the TIER 2 — Breach state. A red banner appears. The supervisor is automatically notified that a breach has occurred.

**sla_tier3_threshold_pct** (Range: 100–200% · Default: 150%)
Triggers the TIER 3 — Critical state. The executive escalation contact is notified. The system may auto-reassign the verification depending on configuration.

📊 **How the maths works (example):**
With sla_duration = 48 hours:
• **Tier 1 at 80%** = 48 × 0.80 = **38.4 hours** → amber warning appears
• **Tier 2 at 100%** = 48 × 1.00 = **48 hours** → SLA breach, supervisor notified
• **Tier 3 at 150%** = 48 × 1.50 = **72 hours** → critical escalation, executive contacted

🏢 **Real-life example:** You want tighter deadlines. Change Tier 1 to 60% (warning at 28.8h), Tier 2 to 90% (breach at 43.2h), Tier 3 to 120% (critical at 57.6h). Admins will see warnings sooner and have less buffer before a breach is logged.

⚠️ **Important:** These thresholds must be in ascending order (Tier 1 < Tier 2 < Tier 3). The System Config page shows a visual bar chart so you can see the relative positions at a glance.`,
      },
      {
        id: 'config-escalation',
        icon: Mail,
        title: 'Escalation Routing',
        content: `This critical parameter determines who receives the final escalation when a Tier 3 breach occurs and all normal channels have failed.

**executive_escalation_contact_id** (Value: Admin profile ID · Default: Not set)
The platform admin profile designated as the executive fallback contact. This person is notified when:
• A TIER 3 critical SLA breach occurs.
• All admins are unavailable (e.g., during a public holiday).
• A verification has been reassigned the maximum number of times with no resolution.

⚠️ **If this is not set**, a red warning banner appears at the top of the System Config page and the Platform Admins page, reminding the supervisor to configure it.

🏢 **Real-life example:** Set this to your VP of Operations or Head of Compliance. During a holiday weekend, all 6 admins are set to "Unavailable." A new organisation submits payment. With no admin available and the verification sitting unclaimed for 72 hours, the system emails the VP saying "Critical: Verification for Acme Corp has breached Tier 3 with no available admin."

⚙️ **How to set it:** Go to System Config → Escalation Routing → select the admin from the dropdown. Only active Supervisor-tier admins appear in the list.`,
      },
      {
        id: 'config-reassignment',
        icon: RefreshCcw,
        title: 'Reassignment & Leave',
        content: `These parameters govern reassignment limits and leave notification timing.

**max_reassignments_per_verification** (Range: 1–10 · Default: 3)
The maximum number of times a single verification can be reassigned between admins. After hitting this limit, the verification is locked and only the supervisor can action it directly.

🏢 **Real-life example:** A complex university verification gets assigned to Admin A (unfamiliar with education sector), reassigned to Admin B (goes on leave), then to Admin C (finds a compliance issue and escalates). That is 3 reassignments. With max = 3, no further reassignments are possible — the supervisor must step in. This prevents verifications from endlessly bouncing between admins.

**leave_reminder_notification_days** (Range: 1–14 · Default: 3)
When an admin sets their status to "Unavailable" (planned leave), the system sends a reminder notification this many days before the leave starts, prompting the admin to reassign or complete their active verifications.

🏢 **Real-life example:** Admin B has 4 active verifications and schedules leave starting Friday. With this set to 3 days, on Tuesday morning, Admin B receives a notification: "You have 4 active verifications. Your leave begins in 3 days. Please complete or request reassignment."`,
      },
      {
        id: 'config-expertise-caps',
        icon: GraduationCap,
        title: 'Expertise Caps',
        content: `These parameters limit how many expertise domains a Basic Admin can declare in their profile. Senior Admins and Supervisors are not subject to these caps.

**basic_admin_max_industries** (Range: 1–20 · Default: 5)
Maximum number of industry segments a Basic Admin can select in their expertise profile.

**basic_admin_max_countries** (Range: 1–50 · Default: 5)
Maximum number of countries a Basic Admin can select.

**basic_admin_max_org_types** (Range: 1–20 · Default: 5)
Maximum number of organisation types a Basic Admin can select.

🏢 **Real-life example:** During onboarding, set all three to 3. This forces new admins to focus on a narrow domain where they have genuine expertise, improving verification quality. As admins gain experience and get promoted to Senior Admin, the caps are automatically lifted and they can declare broader expertise.

⚙️ **Why caps exist:** Without caps, a new admin might select all 15 industries thinking "I can handle anything." The auto-assignment engine would then send them verifications from industries they do not actually understand, leading to slower processing and more reassignments.`,
      },
      {
        id: 'config-soa-provisioning',
        icon: Link2,
        title: 'SOA Provisioning & Activation',
        content: `These parameters control how Seeking Organisation Admin (SOA) accounts are provisioned after an organisation is verified.

⚠️ **The One Primary Admin Rule**
Every organisation has **exactly one active Primary Admin at all times.** This is enforced by a database constraint — it is not possible for an organisation to have zero or two Primary Admins simultaneously.

• The Primary Admin is the person designated during the organisation registration process (either the registrant themselves or a separately nominated person).
• The Primary Admin is the only person who can create delegated admins, manage organisation settings, and submit challenges.
• **To change who the Primary Admin is,** a formal transfer request must be submitted. This request goes through Platform Admin approval before it takes effect. The previous Primary Admin is automatically moved to a "transferred" status once approved. (See the "Transfer Primary Admin" section in Organisation Settings → Admin Details.)

**activation_link_expiry_hours** (Range: 24–720 · Default: 72)
When an organisation is approved, the designated Primary Admin receives an activation email with a secure link. This parameter sets how many hours that link remains valid before it expires.

🏢 **Real-life example:** Set to 72 hours (3 days). The organisation is approved on Friday evening. The Primary Admin has until Monday evening to click the activation link and set up their account. If they miss it, the supervisor can resend the link from the admin dashboard.

**max_delegated_admins_per_org** (Range: 1–50 · Default: 5)
The maximum number of delegated (secondary) admins an organisation can have, **in addition to** their one Primary Admin. Only relevant when org_admin_delegation_enabled is true.

🏢 **Real-life example:** A small startup needs only its founder as admin — the Primary Admin handles everything alone. A large enterprise with multiple divisions might need 10 delegated admins (one per division). Set this to 5 as a reasonable default; organisations needing more can request an increase through their Primary Admin.

**Permissions (Supervisor-only):**
• View and manage which admins have access to specific features.
• Promote admins between tiers (Admin → Senior Admin → Supervisor).
• Generate and manage access codes for new admin onboarding.
• All configuration and permission changes are logged in the audit trail with the supervisor's identity, timestamp, and IP address.`,
      },
    ],
  },
];

/** Groups visible to each tier */
const SUPERVISOR_ONLY_GROUPS = ['System Configuration Reference'];
const SENIOR_PLUS_GROUPS = ['Queue & Assignment Management', 'System Configuration Reference'];

function VerificationKnowledgeCentreContent() {
  const navigate = useNavigate();
  const { tier, isSupervisor } = useAdminTier();

  const filteredGroups = useMemo(() => {
    return GROUPS.filter((group) => {
      // Supervisor sees everything
      if (isSupervisor) return true;
      // Senior Admin sees everything except System Config Reference
      if (tier === 'senior_admin') return !SUPERVISOR_ONLY_GROUPS.includes(group.title);
      // Basic Admin sees only Getting Started, Working a Verification, Administration
      return !SENIOR_PLUS_GROUPS.includes(group.title);
    }).map((group) => {
      // For Senior Admins, filter out "Supervisor Force Reassign" from Queue group
      if (tier === 'senior_admin' && group.title === 'Queue & Assignment Management') {
        return {
          ...group,
          items: group.items.filter((item) => item.id !== 'force-reassign'),
        };
      }
      return group;
    });
  }, [tier, isSupervisor]);

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

      {filteredGroups.map((group) => (
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
