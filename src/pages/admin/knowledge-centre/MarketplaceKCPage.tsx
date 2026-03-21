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
  Store,
  Users,
  ClipboardList,
  ScrollText,
  UserCog,
  Mail,
} from 'lucide-react';

const GROUPS = [
  {
    title: 'Marketplace Overview',
    items: [
      {
        id: 'marketplace-dashboard',
        icon: Store,
        title: 'Marketplace Dashboard',
        content: `The Marketplace Dashboard gives you a summary view of the platform's solution provider ecosystem.

**What you see:**
• **Verified Providers** — Total count of providers who have completed verification and are available in the resource pool.
• **Active Challenges** — How many challenges are currently open and seeking solutions.
• **Pending Assignments** — Challenges where role assignments are in progress.
• **Recent Activity** — A feed of the latest marketplace events (new providers verified, challenges created, assignments completed).

**What is the Marketplace?**
The Marketplace connects seeking organisations (who post challenges) with verified solution providers (who offer expertise). As an admin, you oversee this ecosystem — ensuring the pool is healthy, assignments are fair, and the process runs smoothly.

🏢 **Real-life example:** The dashboard shows 50 verified providers but only 3 in the "Cybersecurity" industry. Meanwhile, 5 cybersecurity challenges are pending. You know you need to invite more cybersecurity providers to balance supply and demand.`,
      },
    ],
  },
  {
    title: 'Resource Pool & Assignments',
    items: [
      {
        id: 'resource-pool',
        icon: Users,
        title: 'Resource Pool',
        content: `The Resource Pool is the master list of all verified solution providers on the platform.

**What each provider record shows:**
• **Name & Contact** — The provider's identity.
• **Industries & Expertise Level** — What they specialise in and at what seniority.
• **Verification Status** — Whether they are fully verified and active.
• **Pool Status** — Whether they are currently available for assignments.
• **Assignment History** — How many challenges they have been assigned to and their track record.

**What you can do:**
• Search and filter providers by industry, expertise level, country, or status.
• View a provider's detailed profile by clicking their row.
• See their assessment scores, interview results, and proof points.

🏢 **Real-life example:** An organisation posts a challenge requiring "Senior Financial Analyst with SAP experience." You search the Resource Pool for Finance × Level 3 providers and find 4 matches. You can view their profiles to see who has the best assessment scores and most relevant proof points.

**Note:** You cannot directly assign providers to challenges from this screen. Assignments happen through the Solution Requests workflow (see below).`,
      },
      {
        id: 'solution-requests',
        icon: ClipboardList,
        title: 'Solution Requests',
        content: `Solution Requests are challenges submitted by seeking organisations that need provider assignments.

**The workflow:**
1. An organisation creates a challenge specifying their requirements (industry, expertise level, description).
2. The challenge appears in Solution Requests as a pending request.
3. The assignment engine (or manual process) matches providers from the resource pool to the challenge roles.
4. Providers are notified and can accept or decline.
5. Once all roles are filled, the challenge moves to "Assigned" status.

**What you see on this screen:**
• List of all solution requests with their status (Pending, In Progress, Assigned, Completed).
• Challenge details: organisation name, industry, required roles, fee structure.
• Assignment status for each role within the challenge.

🏢 **Real-life example:** TechCorp posts a challenge: "We need 2 Senior Cloud Architects and 1 DevOps Lead for a 3-month migration project." You see 3 role slots in the request. The engine matches providers and assigns them. You monitor progress — if a provider declines, the engine re-matches.`,
      },
      {
        id: 'assignment-history',
        icon: ScrollText,
        title: 'Assignment History',
        content: `Assignment History shows a chronological record of all role assignments across the platform.

**What each entry shows:**
• **Challenge** — Which challenge the assignment belongs to.
• **Provider** — Who was assigned.
• **Role** — What role they were assigned to (e.g., "Lead Consultant," "Shadow").
• **Assignment Phase** — Whether it was the initial assignment or a replacement.
• **Status** — Active, Completed, Reassigned, Declined.
• **Timestamps** — When assigned, accepted, completed, or reassigned.

**When to use this screen:**
• You want to audit the assignment trail for a specific challenge.
• You need to check if a provider has been over-assigned recently.
• You are investigating a dispute about who was assigned and when.

🏢 **Real-life example:** A provider claims they were unfairly removed from a challenge. You search Assignment History by their name and see: assigned on March 1, reassigned on March 5 with reason "Provider unresponsive for 48 hours." The audit trail gives you the full story.`,
      },
    ],
  },
  {
    title: 'Marketplace Configuration',
    seniorOnly: true,
    items: [
      {
        id: 'admin-contact',
        icon: UserCog,
        title: 'Admin Contact Profile',
        content: `The Admin Contact Profile is the public-facing contact information that providers and organisations see when they need platform support regarding marketplace matters.

**What it contains:**
• **Contact Name** — The admin designated as the marketplace contact.
• **Email** — The support email displayed to users.
• **Phone** — Optional phone number for urgent matters.
• **Office Hours** — When the contact is available.

**Why this matters:**
When a provider has a question about an assignment or an organisation needs help with a challenge, they see this contact information. It is not your personal email — it should be a shared or role-based contact.

🏢 **Real-life example:** You set the contact to "Marketplace Support" with email "marketplace@yourplatform.com." Now, all marketplace-related inquiries go to a shared inbox that your team monitors, rather than to one person's personal email.`,
      },
      {
        id: 'email-templates',
        icon: Mail,
        title: 'Email Templates',
        content: `Email Templates define the automated emails sent during marketplace workflows. Each template has:

• **Template Name** — What triggers this email (e.g., "Provider Assigned to Challenge," "Challenge Completed").
• **Subject Line** — The email subject.
• **Body** — The email content with variable placeholders (e.g., {{provider_name}}, {{challenge_title}}).

**Available templates include:**
• Provider assignment notification
• Provider role acceptance confirmation
• Challenge completion summary
• Reassignment notification
• Deadline reminder

**When to use this screen:**
• You want to customise the wording of automated emails.
• You need to add platform branding or compliance disclaimers.
• You want to preview what providers receive when they are assigned.

🏢 **Real-life example:** Your legal team requires a new disclaimer in all assignment emails. You edit the "Provider Assigned to Challenge" template, add the disclaimer paragraph at the bottom, and save. All future assignment emails include the new text.

**Important:** Template changes apply to future emails only. Already-sent emails are not affected. Always preview the email before saving changes.`,
      },
    ],
  },
];

function MarketplaceKCContent() {
  const navigate = useNavigate();
  const { tier, isSupervisor } = useAdminTier();

  const filteredGroups = useMemo(() => {
    if (isSupervisor || tier === 'senior_admin') return GROUPS;
    return GROUPS.filter((group) => !('seniorOnly' in group && group.seniorOnly));
  }, [tier, isSupervisor]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketplace')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketplace Knowledge Centre</h1>
          <p className="text-muted-foreground">Guides for the resource pool, solution requests, and marketplace config.</p>
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

export default function MarketplaceKCPage() {
  return (
    <FeatureErrorBoundary featureName="Marketplace Knowledge Centre">
      <MarketplaceKCContent />
    </FeatureErrorBoundary>
  );
}
