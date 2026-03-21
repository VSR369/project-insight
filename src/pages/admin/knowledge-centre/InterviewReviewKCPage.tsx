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
  ClipboardList,
  Calendar,
  CalendarClock,
  UserCheck,
  Users,
  FileQuestion,
} from 'lucide-react';

const GROUPS = [
  {
    title: 'Interview Configuration',
    items: [
      {
        id: 'interview-kit',
        icon: ClipboardList,
        title: 'Interview KIT',
        content: `The Interview KIT (Knowledge & Interview Toolkit) is a collection of structured questions that panel reviewers use during live interviews with providers.

**How it differs from the Question Bank:**
• The **Question Bank** contains multiple-choice assessment questions that providers answer independently (like an exam).
• The **Interview KIT** contains open-ended discussion questions that reviewers ask during a live panel interview.

**Structure:**
Each KIT question belongs to a **competency** (e.g., "Technical Depth," "Communication," "Problem Solving"). Questions are organised by:
• **Industry Segment** — Questions relevant to a specific industry.
• **Expertise Level** — Difficulty appropriate for the provider's declared level.
• **Competency** — The skill area being evaluated.

**When to use this screen:**
• You want to add new interview questions for a specific industry/level combination.
• You want to review or update expected answers for existing questions.
• You want to reorder questions so the most important ones appear first.

🏢 **Real-life example:** Your platform adds "Cybersecurity" as an industry segment. You create 15 KIT questions across 4 competencies for Senior-level cybersecurity providers. Reviewers interviewing cybersecurity candidates now have a structured guide with expected answers to compare against.

**Tip:** Include the expected answer for each question. This helps reviewers — especially new ones — judge responses consistently. The expected answer is never shown to the provider.`,
      },
      {
        id: 'quorum-requirements',
        icon: Calendar,
        title: 'Quorum Requirements',
        content: `Quorum Requirements define how many panel reviewers must participate in an interview for it to be valid.

**What is a quorum?**
A quorum is the minimum number of reviewers required. If fewer reviewers are available, the interview cannot be scheduled.

**How quorum is configured:**
Each combination of **industry segment** and **expertise level** can have its own quorum. If no specific combination is set, the expertise level's default quorum is used.

• **Interview Duration** — How many minutes each interview session lasts (e.g., 45 minutes for Level 2, 60 minutes for Level 4).
• **Required Quorum Count** — Minimum number of reviewers (e.g., 2 for Level 1, 3 for Level 3+).

**When to use this screen:**
• You want more rigorous interviews for senior providers — increase the quorum.
• Interviews are running too long — reduce the duration.
• A specific industry has more complex requirements — set a custom quorum for that industry/level pair.

🏢 **Real-life example:** Your healthcare vertical has stringent requirements. You set quorum to 3 reviewers for Healthcare × Level 3 (Senior), while all other Level 3 combinations use the default of 2. This ensures healthcare providers face a more thorough panel.

**Important:** Changing quorum requirements only affects future interview scheduling. Existing bookings keep their original quorum.`,
      },
    ],
  },
  {
    title: 'Reviewer Management',
    items: [
      {
        id: 'reviewer-availability',
        icon: CalendarClock,
        title: 'Reviewer Availability',
        content: `The Reviewer Availability screen shows a calendar view of all panel reviewers' availability slots.

**What you see:**
• A list of reviewers with their declared industries and expertise levels.
• Each reviewer's submitted availability slots (date + time ranges).
• Slot status: **Available** (open for booking), **Held** (tentatively reserved), **Booked** (confirmed interview), **Cancelled**.

**What you can do:**
• View which reviewers are available on a given date.
• Identify gaps — dates or industries with no available reviewers.
• Contact reviewers to request additional slots if there is a scheduling bottleneck.

**How slots become bookings:**
1. A provider reaches the interview stage in their enrollment.
2. The system finds composite slots (time blocks where enough reviewers are available to meet the quorum).
3. The provider selects a composite slot.
4. Individual reviewer slots are locked and the booking is created.

🏢 **Real-life example:** A Level 4 provider in Financial Services needs an interview, but no composite slots are available in the next 2 weeks. You check Reviewer Availability and see that 3 Financial Services reviewers have no slots submitted for next week. You email them asking to add availability, and within a day, new slots appear.`,
      },
      {
        id: 'reviewer-approvals',
        icon: UserCheck,
        title: 'Reviewer Approvals',
        content: `The Reviewer Approvals screen shows panel reviewer applications that are pending your review.

**The process:**
1. A person is invited to become a panel reviewer (via the Invitations screen).
2. They accept the invitation and fill out their reviewer profile (industries, expertise levels, credentials).
3. Their application appears in the Reviewer Approvals queue with a **Pending** status.
4. An admin reviews their profile and either **Approves** or **Rejects** the application.

**What to check before approving:**
• Do their declared industries and expertise levels make sense given their background?
• Have they provided sufficient credentials (LinkedIn, certifications, etc.)?
• Are they from a region/time zone that adds coverage to your existing reviewer pool?

**The badge count:**
The sidebar shows a red badge with the number of pending approvals. This count updates in real time.

🏢 **Real-life example:** Dr. Smith applies as a reviewer for Healthcare × Level 4 (Principal). You review her profile: 20 years in healthcare consulting, board certifications, and published research. You approve her. She can now submit availability slots and be assigned to interview panels.

**Rejecting an application:**
If credentials are insufficient, you can reject the application with a reason. The reviewer receives an email notification. They can re-apply after addressing the feedback.`,
      },
    ],
  },
];

function InterviewReviewKCContent() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/interview/kit')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interview & Review Knowledge Centre</h1>
          <p className="text-muted-foreground">Guides for Interview KIT, quorum settings, and reviewer management.</p>
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

export default function InterviewReviewKCPage() {
  return (
    <FeatureErrorBoundary featureName="Interview & Review Knowledge Centre">
      <InterviewReviewKCContent />
    </FeatureErrorBoundary>
  );
}
