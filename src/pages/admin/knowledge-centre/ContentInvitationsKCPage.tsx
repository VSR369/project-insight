import { useNavigate } from 'react-router-dom';
import { AiContentRenderer } from '@/components/ui/AiContentRenderer';
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
  FileQuestion,
  Tags,
  Mail,
  UserPlus,
} from 'lucide-react';

const GROUPS = [
  {
    title: 'Content Management',
    items: [
      {
        id: 'question-bank',
        icon: FileQuestion,
        title: 'Question Bank',
        content: `The Question Bank contains multiple-choice assessment questions that providers answer during their enrollment process. These are automated tests — not live interview questions (for live interview questions, see the Interview KIT in the Interview & Review group).

**Question structure:**
Each question has:
• **Question Text** — The question itself.
• **Options** — 4 multiple-choice answers (A, B, C, D).
• **Correct Answer** — Which option is correct.
• **Industry Segment** — Which industry this question applies to.
• **Expertise Level** — What difficulty level (Level 1 questions are easier than Level 4).
• **Proficiency Area** — Which specific skill area the question tests.

**How questions are used:**
When a provider reaches the assessment stage of enrollment:
1. The system selects questions matching the provider's declared industry and expertise level.
2. Questions are randomised and presented as a timed test.
3. The provider's score determines whether they pass to the interview stage.

**When to use this screen:**
• You need to add new questions for a recently added industry or proficiency area.
• You want to review and update questions that have low discrimination value (e.g., everyone gets them right or wrong).
• You want to import questions in bulk via Excel upload.

🏢 **Real-life example:** You add "Generative AI" as a proficiency area under the AI industry. You now need assessment questions for it. You create 20 questions across Levels 1–4, covering topics like prompt engineering, fine-tuning, and responsible AI. Providers enrolling with "Generative AI" expertise will now receive these questions in their assessment.

**Excel Import:** You can upload questions in bulk using the Excel import feature. Download the template first — it includes a column guide and validation rules. The system validates each row and reports errors by row number.`,
      },
      {
        id: 'capability-tags',
        icon: Tags,
        title: 'Capability Tags',
        content: `Capability Tags are short labels that describe specific skills or capabilities beyond the industry/proficiency taxonomy. Think of them as "keywords" that add extra searchability.

**Examples of tags:**
• "SAP S/4HANA"
• "Agile Coach"
• "HIPAA Compliance"
• "Kubernetes"
• "Bilingual (EN/ES)"

**How tags are used:**
• Providers can add tags to their profile during or after enrollment.
• Organisations can filter the resource pool by tags.
• The assignment engine considers tag matches as a bonus factor.

**When to use this screen:**
• You want to add commonly requested skills that are not in the proficiency taxonomy.
• You want to standardise tags (e.g., merge "k8s" and "Kubernetes" into one tag).
• You want to deactivate outdated tags.

🏢 **Real-life example:** Multiple organisations are searching for "ISO 27001" expertise, but no tag exists. You add it. Now providers can tag themselves, and organisations can filter by it. This improves matching without changing the full taxonomy.

**Difference from Proficiency Taxonomy:** The taxonomy is a structured hierarchy (Area → Sub-Domain → Speciality) used for assessments and formal skill verification. Tags are free-form keywords for discoverability. Both are valuable but serve different purposes.`,
      },
    ],
  },
  {
    title: 'Invitations',
    items: [
      {
        id: 'provider-invitations',
        icon: Mail,
        title: 'Solution Provider Invitations',
        content: `The Solution Provider Invitations screen lets you invite professionals to join the platform as solution providers.

**How to send an invitation:**
1. Click "Send Invitation."
2. Enter the person's email address and name.
3. Optionally pre-select their industry and expertise level.
4. Click Send.

**What happens next:**
1. The invitee receives an email with a unique invitation link.
2. They click the link and are taken to the registration page (pre-filled with their email).
3. They complete the enrollment wizard (profile → assessment → interview → certification).
4. Once verified, they appear in the Resource Pool.

**Invitation statuses:**
• **Pending** — Sent but not yet accepted.
• **Accepted** — The invitee clicked the link and started registration.
• **Expired** — The invitation link expired (configurable, typically 30 days).
• **Declined** — The invitee explicitly declined.

🏢 **Real-life example:** You are at a conference and meet 10 senior cloud architects. Back at your desk, you send 10 invitations. Over the next week, 7 accept, 2 are pending, and 1 expired (they never opened the email). You resend the expired one.

**Bulk invitations:** You can upload a CSV file with multiple email addresses to send invitations in bulk. The system deduplicates — if someone is already invited or registered, they are skipped with a warning.`,
      },
      {
        id: 'reviewer-invitations',
        icon: UserPlus,
        title: 'Panel Reviewer Invitations',
        content: `Panel Reviewer Invitations work similarly to provider invitations, but the invitee joins as a panel reviewer — someone who interviews and evaluates providers.

**How to send:**
1. Go to the "Panel Reviewer" tab in the Invitations screen.
2. Enter the reviewer's email, name, and their areas of expertise.
3. Send the invitation.

**What happens next:**
1. The invitee receives an email explaining the reviewer role.
2. They click the link and fill out their reviewer profile (credentials, industries, expertise levels, availability preferences).
3. Their application goes to the Reviewer Approvals queue (see Interview & Review group).
4. Once approved, they can submit availability slots and be assigned to interview panels.

**Key difference from provider invitations:**
Reviewers are external experts who evaluate providers. They do not need to go through the enrollment assessment themselves. However, their credentials are reviewed by an admin before approval.

🏢 **Real-life example:** Your platform needs more reviewers for the Healthcare industry. You reach out to 5 healthcare executives you know and send them reviewer invitations. 3 accept and complete their profiles. You approve them in Reviewer Approvals, and they start submitting availability for interview panels.`,
      },
    ],
  },
];

function ContentInvitationsKCContent() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/questions')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content & Invitations Knowledge Centre</h1>
          <p className="text-muted-foreground">Guides for the question bank, capability tags, and sending invitations.</p>
        </div>
      </div>

      {GROUPS.map((group) => (
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

export default function ContentInvitationsKCPage() {
  return (
    <FeatureErrorBoundary featureName="Content & Invitations Knowledge Centre">
      <ContentInvitationsKCContent />
    </FeatureErrorBoundary>
  );
}
