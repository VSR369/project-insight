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
  Globe,
  Briefcase,
  Building2,
  Users,
  Award,
  Network,
} from 'lucide-react';

const GROUPS = [
  {
    title: 'Core Reference Tables',
    items: [
      {
        id: 'countries',
        icon: Globe,
        title: 'Countries',
        content: `The Countries screen manages the list of countries that organisations and providers can select during registration. Each country record includes:

• **Code** — The 2-letter ISO code (e.g., "IN" for India, "US" for United States).
• **Name** — The country's full name displayed in dropdown menus.
• **Phone Code** — International dialling code (e.g., "+91" for India). This is auto-filled in phone number fields.
• **Currency Symbol & Code** — Used for pricing displays (e.g., "₹" / "INR").
• **Date & Number Formats** — Controls how dates and numbers are displayed for users in that country.
• **OFAC Restricted** — If checked, organisations from this country are blocked from registering (sanctions compliance).

**When to use this screen:**
• A new country needs to be supported on the platform — add it here.
• A country becomes sanctioned — check the "OFAC Restricted" flag.
• A phone code is incorrect — edit the country record.

🏢 **Real-life example:** Your platform expands to serve Brazil. You add a record: Code = "BR", Name = "Brazil", Phone Code = "+55", Currency = "R$" / "BRL", Date Format = "dd/MM/yyyy". Now Brazilian organisations can register and see prices in Reais.

**Common mistake to avoid:** Deactivating a country that has existing organisations. This does not delete those organisations, but they may encounter display issues. Always check active organisation count before deactivating.`,
      },
      {
        id: 'industry-segments',
        icon: Briefcase,
        title: 'Industry Segments',
        content: `Industry Segments define the industries that the platform serves. They are used in three critical ways:

1. **Provider enrollment** — Providers select which industries they specialise in.
2. **Organisation registration** — Organisations select their industry during sign-up.
3. **Auto-assignment matching** — The verification engine matches admins to organisations by industry expertise.

Each segment has:
• **Code** — A short unique identifier (e.g., "FINTECH", "HEALTHCARE").
• **Name** — The display name (e.g., "Financial Technology", "Healthcare & Life Sciences").
• **Parent** — Optional parent segment for hierarchical industries (e.g., "Banking" under "Financial Services").

**When to use this screen:**
• The platform needs to support a new industry — add it here.
• An industry name is confusing to users — rename it.
• Two industries should be merged — deactivate one and redirect.

🏢 **Real-life example:** You notice providers are confused between "IT Services" and "Software Development." You rename "IT Services" to "IT Consulting & Services" and add a description clarifying the difference. The change takes effect immediately — existing records keep working because they reference the ID, not the name.`,
      },
      {
        id: 'org-types',
        icon: Building2,
        title: 'Organisation Types',
        content: `Organisation Types categorise the kinds of entities that register on the platform. Examples include:

• Corporation
• University / Educational Institution
• Government Agency
• Non-Profit / NGO
• Startup (< 2 years)

**Why this matters:**
• The verification checklist may differ by type (e.g., universities require accreditation documents).
• The auto-assignment engine uses org type as one of its matching criteria.
• Pricing tiers may vary by type.

**When to use this screen:**
• You need to distinguish a new kind of organisation (e.g., "Research Lab").
• You want to rename an existing type for clarity.

🏢 **Real-life example:** A government defence agency registers. The admin sees "Organisation Type: Government Agency" and knows to apply extra compliance checks during V4 (Compliance Verification). If "Government Agency" did not exist as a type, this context would be lost.`,
      },
      {
        id: 'participation-modes',
        icon: Users,
        title: 'Participation Modes',
        content: `Participation Modes define how a provider can engage with the platform. The two standard modes are:

• **Individual** — A solo professional offering their expertise.
• **Organisation** — A company or firm whose employees provide services.

**Why this matters:**
• The enrollment wizard shows different screens depending on the mode (individuals skip organisation details).
• Matching and pricing can differ by mode.
• Contracts and legal terms may differ.

**When to use this screen:**
• You are adding a new mode (rare — e.g., "Consortium" for groups of organisations).
• You want to disable a mode temporarily (e.g., pause individual registrations during a pilot with enterprises only).

🏢 **Real-life example:** During the platform's early launch, you only want organisations. You deactivate the "Individual" mode. The enrollment wizard no longer shows the individual option. When you are ready to accept individuals, you reactivate it — no data is lost.`,
      },
      {
        id: 'expertise-levels',
        icon: Award,
        title: 'Expertise Levels',
        content: `Expertise Levels define the seniority tiers that providers can claim during enrollment. Typical levels include:

• **Level 1 — Entry** (0–3 years experience)
• **Level 2 — Mid** (3–7 years)
• **Level 3 — Senior** (7–15 years)
• **Level 4 — Principal** (15+ years)

Each level has:
• **Level Number** — Numeric rank used for ordering and comparison.
• **Min/Max Years** — Experience range that qualifies.
• **Default Quorum Count** — How many panel reviewers are required for interviews at this level (higher levels need more reviewers).

**When to use this screen:**
• You want to split a level (e.g., separate "Senior" into "Senior" and "Staff").
• You need to adjust the experience year ranges.
• You want to change how many reviewers are required for an interview at a given level.

🏢 **Real-life example:** Your platform currently requires 2 reviewers for Level 3 interviews. Feedback shows this is not rigorous enough. You change the quorum to 3. All future Level 3 interviews now require 3 reviewers — existing bookings are not affected.`,
      },
    ],
  },
  {
    title: 'Hierarchical Data',
    items: [
      {
        id: 'departments',
        icon: Building2,
        title: 'Departments',
        content: `Departments represent the organisational divisions that challenges and resources can be categorised into. Examples: Engineering, Marketing, Finance, Operations, Human Resources.

**How departments work:**
• Each department can have multiple Functional Areas beneath it (see next article).
• Departments appear in filters and categorisation screens.
• They help match solution providers to the right organisational context.

**When to use this screen:**
• Your platform needs a new department category (e.g., "Data Science").
• A department name needs updating for consistency.

🏢 **Real-life example:** A client organisation has a "Digital Transformation" division that does not fit neatly into "Engineering" or "Operations." You add it as a new department, and now challenges from that division can be properly categorised.`,
      },
      {
        id: 'functional-areas',
        icon: Briefcase,
        title: 'Functional Areas',
        content: `Functional Areas are sub-categories within departments. For example, under the "Engineering" department, you might have:

• Software Development
• Quality Assurance
• DevOps & Infrastructure
• Architecture

Each functional area belongs to exactly one department. They add a second layer of specificity when categorising challenges and matching providers.

**When to use this screen:**
• You need to add a new specialisation within an existing department.
• You want to rename or consolidate areas.

🏢 **Real-life example:** Under the "Marketing" department, you currently have "Digital Marketing" and "Content." A client asks for "Performance Marketing" specifically. You add it as a new functional area. Now challenges can be tagged more precisely, and providers with performance marketing expertise are matched more accurately.`,
      },
      {
        id: 'proficiency-taxonomy',
        icon: Network,
        title: 'Proficiency Taxonomy',
        content: `The Proficiency Taxonomy is a three-level hierarchy that defines what providers can be proficient in, organized by industry and expertise level:

**Level 1 → Proficiency Areas** (broadest)
Example: "Cloud Computing" within the IT industry at Senior level.

**Level 2 → Sub-Domains** (mid-level)
Example: "Infrastructure as Code" within Cloud Computing.

**Level 3 → Specialities** (most specific)
Example: "Terraform" within Infrastructure as Code.

**Why this exists:**
• Providers select their proficiencies during enrollment — this taxonomy defines what they can choose.
• The assessment question bank is mapped to proficiency areas — questions are selected based on the provider's declared specialities.
• The Level-Speciality Map determines which specialities are testable at each expertise level.

**When to use this screen:**
• A new technology or skill area emerges (e.g., "Generative AI" under the AI proficiency area).
• You need to reorganise the hierarchy because two sub-domains overlap.
• You want to deactivate an outdated speciality (e.g., a legacy technology).

🏢 **Real-life example:** A new cloud provider gains market share. You add a new speciality "Oracle Cloud Infrastructure" under the "Cloud Platforms" sub-domain within the "Cloud Computing" proficiency area. Now providers can declare OCI expertise and get relevant assessment questions.

**Important:** Changes to the taxonomy affect future enrollments and assessments only. Existing provider profiles keep their previously selected proficiencies. If you deactivate a speciality, providers who already have it in their profile will see it as "(Retired)" but it is not removed from their history.`,
      },
    ],
  },
];

function ReferenceDataKCContent() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/master-data/countries')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reference Data Knowledge Centre</h1>
          <p className="text-muted-foreground">Guides for Countries, Industries, Org Types, and all master data tables.</p>
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

export default function ReferenceDataKCPage() {
  return (
    <FeatureErrorBoundary featureName="Reference Data Knowledge Centre">
      <ReferenceDataKCContent />
    </FeatureErrorBoundary>
  );
}
