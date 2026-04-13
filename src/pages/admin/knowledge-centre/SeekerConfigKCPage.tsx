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
  Activity,
  CreditCard,
  Award,
  Network,
  ClipboardList,
  Globe,
  Shield,
} from 'lucide-react';

const GROUPS = [
  {
    title: 'Pricing & Fees',
    items: [
      {
        id: 'pricing-overview',
        icon: Activity,
        title: 'Pricing Overview',
        content: `The Pricing Overview screen gives you a consolidated view of how pricing is structured across the platform. It shows the relationship between subscription tiers, membership tiers, base fees, and platform fees.

**Think of it as a pricing map:**
• Subscription Tiers determine what features an organisation gets.
• Membership Tiers determine how many challenges they can post.
• Base Fees are the consulting charges for each challenge.
• Platform Fees are what the platform charges on top.

🏢 **Real-life example:** An organisation on the "Professional" subscription tier with "Gold" membership can post up to 10 challenges per quarter. Each challenge incurs a base fee of $5,000 (consulting) + $500 (platform fee). The Pricing Overview shows all of this in one place.`,
      },
      {
        id: 'subscription-tiers',
        icon: CreditCard,
        title: 'Subscription Tiers',
        content: `Subscription Tiers define the feature access levels for seeking organisations. Each tier has:

• **Name** — e.g., "Starter," "Professional," "Enterprise."
• **Price** — Monthly or annual fee.
• **Feature Set** — What features are included (e.g., number of admin seats, analytics access, priority support).
• **Challenge Limits** — How many challenges can be active simultaneously.

**When to use this screen:**
• You are introducing a new pricing tier.
• You need to adjust what features a tier includes.
• You want to retire an old tier (deactivate it — existing subscribers keep it until renewal).

🏢 **Real-life example:** You launch an "Enterprise" tier at $2,000/month that includes unlimited challenges, dedicated support, and advanced analytics. Organisations upgrading from "Professional" ($500/month) get the new features immediately. Downgrading takes effect at the next billing cycle.`,
      },
      {
        id: 'membership-tiers',
        icon: Award,
        title: 'Membership Tiers',
        content: `Membership Tiers define loyalty or volume-based tiers that organisations can earn or purchase:

• **Bronze** — Entry level, limited monthly challenge allowance.
• **Silver** — Mid-level, increased allowance, minor fee discounts.
• **Gold** — High-level, large allowance, significant discounts.
• **Platinum** — Premium, unlimited challenges, custom SLA, dedicated account manager.

Each tier has configurable parameters: challenge allowance, discount percentage on base fees, priority in the assignment queue, and custom SLA terms.

🏢 **Real-life example:** A university starts at Bronze (2 challenges/month). After 6 months of active usage, they are upgraded to Silver (5 challenges/month with 10% fee discount). This encourages platform stickiness and rewards loyal organisations.`,
      },
      {
        id: 'base-fees',
        icon: CreditCard,
        title: 'Base Fee Configuration',
        content: `Base Fees define the consulting fee charged for each challenge, typically based on complexity and engagement model.

**Fee components:**
• **Consulting Fee** — The core charge for the provider's time and expertise.
• **Management Fee** — Platform management overhead.
• **Shadow Fee** — Additional charge when a "shadow" (junior observer) is assigned alongside the primary provider.

**How fees are calculated:**
Fees can be flat-rate or tiered based on challenge complexity and engagement model. The system multiplies the base rate by the complexity multiplier and applies any membership tier discounts.

🏢 **Real-life example:** A "Standard" complexity challenge using the "Advisory" engagement model has a base consulting fee of $3,000. A "Complex" challenge using "Hands-on Delivery" has a base of $8,000. The membership tier discount (e.g., Gold = 15% off) is applied on top.`,
      },
      {
        id: 'platform-fees',
        icon: CreditCard,
        title: 'Platform Fees',
        content: `Platform Fees are the charges the platform applies on top of consulting fees. These are your platform's revenue.

**Fee types:**
• **Percentage-based** — A percentage of the consulting fee (e.g., 10%).
• **Flat-rate** — A fixed amount per challenge (e.g., $200).
• **Tiered** — Different rates based on the organisation's membership tier.

🏢 **Real-life example:** Your platform charges a 12% platform fee on all consulting fees. For a $5,000 consulting engagement, the platform fee is $600. Gold members get a reduced rate of 8% ($400). The fee breakdown is shown to organisations during challenge creation.`,
      },
      {
        id: 'shadow-pricing',
        icon: Activity,
        title: 'Shadow Pricing',
        supervisorOnly: true,
        content: `Shadow Pricing configures the fee structure for "shadow" assignments — where a junior provider observes and assists a senior provider on a challenge.

**Purpose of shadows:**
• Training — Junior providers learn from senior experts.
• Capacity building — Gradually build the junior's capabilities.
• Quality assurance — Having a second pair of eyes.

**Configuration options:**
• **Shadow Fee Percentage** — What percentage of the main consulting fee applies to the shadow (e.g., 30%).
• **Eligible Expertise Levels** — Which levels can be assigned as shadows (typically Level 1–2).
• **Maximum Shadows Per Challenge** — How many shadow slots are allowed (usually 1).

🏢 **Real-life example:** A Level 4 Pioneer is assigned to a complex challenge at $10,000. A Level 1 provider is assigned as a shadow at 30% = $3,000. The organisation pays the total ($13,000) but gets both expertise and knowledge transfer.`,
      },
    ],
  },
  {
    title: 'Challenge & Engagement Configuration',
    items: [
      {
        id: 'engagement-models',
        icon: Network,
        title: 'Engagement Models',
        content: `Engagement Models define how providers work with organisations on challenges:

• **Advisory** — Provider gives recommendations and strategic advice. Shortest engagement, lowest fee.
• **Collaborative** — Provider works alongside the organisation's team. Medium engagement.
• **Hands-on Delivery** — Provider leads the execution. Longest engagement, highest fee.
• **Training & Enablement** — Provider trains the organisation's staff. Duration varies.

Each model has a base duration range and a fee multiplier that adjusts the consulting fee.

🏢 **Real-life example:** An organisation needs help with their data strategy. They choose "Advisory" (2-week engagement, $3,000). Later, they need someone to build a data pipeline — they choose "Hands-on Delivery" (3-month engagement, $15,000). Same industry, different models.`,
      },
      {
        id: 'challenge-complexity',
        icon: Activity,
        title: 'Challenge Complexity Levels',
        content: `Challenge Complexity defines how difficult or involved a challenge is, which directly impacts pricing:

• **Simple** — Straightforward scope, well-defined requirements, short duration. Fee multiplier: 1.0x.
• **Standard** — Moderate scope, some ambiguity, medium duration. Fee multiplier: 1.5x.
• **Complex** — Broad scope, multiple stakeholders, long duration. Fee multiplier: 2.5x.
• **Enterprise** — Organisation-wide impact, multi-phase, strategic. Fee multiplier: 4.0x.

🏢 **Real-life example:** A startup needs a simple code review (Simple, 1.0x multiplier, $2,000 base = $2,000). A multinational needs a global cloud migration strategy (Enterprise, 4.0x multiplier, $2,000 base = $8,000).`,
      },
      {
        id: 'challenge-statuses',
        icon: ClipboardList,
        title: 'Challenge Statuses',
        content: `Challenge Statuses define the lifecycle of a challenge from creation to completion:

• **Draft** — Organisation is still creating the challenge. Not visible to the platform.
• **Published** — Challenge is live and the assignment engine can match providers.
• **Assigned** — All roles have been filled with providers.
• **In Progress** — Work has started.
• **Completed** — All deliverables submitted and accepted.
• **Archived** — Historical record, no longer active.

**When to use this screen:**
• You need to add a new status (rare — e.g., "On Hold" for paused challenges).
• You want to rename a status for clarity.

🏢 **Real-life example:** Organisations keep asking what "Published" means. You rename it to "Open for Applications" and add a description: "Your challenge is visible to matched providers who can accept the assignment." Clearer for everyone.`,
      },
    ],
  },
  {
    title: 'Billing & Formats',
    items: [
      {
        id: 'platform-terms',
        icon: ClipboardList,
        title: 'Platform Terms',
        content: `Platform Terms are the legal terms and conditions that organisations agree to when subscribing. Each term version has:

• **Version Number** — Incrementing version (e.g., v1.0, v2.0).
• **Effective Date** — When this version takes effect.
• **Content** — The full text of the terms.
• **Status** — Draft, Active, or Superseded.

Only one version can be "Active" at a time. When you publish a new version, the previous one becomes "Superseded."

🏢 **Real-life example:** Your legal team updates the data processing clause. You create v2.0, set it as Active, and v1.0 becomes Superseded. New subscribers see v2.0. Existing subscribers see a notification that terms have changed at their next login.`,
      },
      {
        id: 'tax-formats',
        icon: ClipboardList,
        title: 'Tax ID Formats',
        content: `Tax Formats define the tax identification number patterns accepted for each country. This ensures organisations enter valid tax IDs during registration.

Each entry has:
• **Country** — Which country this format applies to.
• **Format Pattern** — A regex or description of the valid format (e.g., "XX-XXXXXXX" for US EIN).
• **Label** — What to call the field (e.g., "EIN" in the US, "GST Number" in India, "VAT Number" in the UK).

🏢 **Real-life example:** An Indian organisation registers and enters their GST number. The system validates it against the pattern: 2 digits + 10 alphanumeric + 1 digit + "Z" + 1 alphanumeric (e.g., "22AAAAA0000A1Z5"). If the format is wrong, the registrant sees an error before submitting.`,
      },
      {
        id: 'postal-formats',
        icon: Globe,
        title: 'Postal Code Formats',
        content: `Postal Formats define the postal/zip code patterns accepted for each country. Similar to Tax Formats, but for addresses.

🏢 **Real-life example:** A US organisation enters "1234" as their zip code. The system checks the US postal format (5 digits or 5+4 with hyphen) and shows an error: "US zip code must be 5 digits (e.g., 10001) or 5+4 format (e.g., 10001-1234)."`,
      },
      {
        id: 'billing-cycles',
        icon: CreditCard,
        title: 'Billing Cycles',
        content: `Billing Cycles define how often organisations are billed for their subscriptions:

• **Monthly** — Billed every month. No discount.
• **Quarterly** — Billed every 3 months. Typically 5% discount.
• **Annual** — Billed yearly. Typically 15–20% discount.

Each cycle has a **discount percentage** that is applied to the subscription tier price. This incentivises longer commitments.

🏢 **Real-life example:** The "Professional" tier costs $500/month. On an annual cycle with 15% discount: $500 × 12 × 0.85 = $5,100/year (saving $900). Organisations see this comparison during plan selection.`,
      },
      {
        id: 'payment-methods',
        icon: CreditCard,
        title: 'Payment Methods',
        content: `Payment Methods define what payment options organisations can use:

• Credit/Debit Card
• Bank Transfer / Wire
• Invoice (net-30, net-60)
• Digital Wallet

Each method can be enabled or disabled per country or subscription tier.

🏢 **Real-life example:** In India, you enable UPI and bank transfer. In the US, you enable credit card and invoice. Enterprise-tier organisations get the "Invoice (net-60)" option that is not available to Starter tier.`,
      },
      {
        id: 'subsidized-pricing',
        icon: Activity,
        title: 'Subsidized Pricing',
        content: `Subsidized Pricing allows you to offer discounted rates to specific categories of organisations (e.g., non-profits, educational institutions, government agencies).

**How it works:**
• You define a subsidy rule: which organisation types qualify, what discount percentage applies, and whether it applies to subscription fees, consulting fees, or both.
• When a qualifying organisation subscribes or creates a challenge, the discount is automatically applied.

🏢 **Real-life example:** You create a rule: "Non-Profit organisations get 40% off subscription fees and 20% off consulting fees." A registered NGO subscribes to the Professional tier ($500/month) and pays $300/month instead. Their challenges also have reduced consulting fees.`,
      },
    ],
  },
  {
    title: 'Compliance Settings',
    supervisorOnly: true,
    items: [
      {
        id: 'export-control',
        icon: Shield,
        title: 'Export Control',
        content: `Export Control settings enforce restrictions on cross-border service delivery based on regulatory requirements (e.g., US Export Administration Regulations, EU dual-use regulations).

**What you configure:**
• **Restricted Country Pairs** — Which country-to-country service combinations are blocked (e.g., US providers cannot serve sanctioned countries).
• **Industry Restrictions** — Some industries have extra export controls (e.g., defence, nuclear, advanced technology).
• **Override Rules** — Exceptional permissions with documented justification.

**How it affects the platform:**
When a challenge is created, the system checks if any export control rules apply based on the organisation's country, the provider's country, and the industry. If a restriction matches, the assignment is blocked with a clear message.

🏢 **Real-life example:** A US-based cybersecurity provider is matched to a challenge from an organisation in a sanctioned country. The system blocks the assignment and logs: "Export Control: US→[Country] restricted for Cybersecurity." The admin sees this in the assignment audit log.`,
      },
      {
        id: 'data-residency',
        icon: Globe,
        title: 'Data Residency',
        content: `Data Residency settings define where data must be stored based on regulatory requirements:

• **Region Rules** — Which countries' data must stay within specific geographic regions (e.g., EU data in EU data centres under GDPR).
• **Industry Rules** — Some industries have additional data locality requirements (e.g., healthcare data in the same country as the provider).

🏢 **Real-life example:** Under GDPR, data from EU organisations must be stored within the EU. You configure a data residency rule: "Country Group = EU → Data Region = eu-west-1." Now, all EU organisation data is routed to the EU data centre.`,
      },
      {
        id: 'blocked-domains',
        icon: Shield,
        title: 'Blocked Domains',
        content: `Blocked Domains is a list of email domains that are not allowed to register on the platform. This prevents:

• **Disposable email signups** — Domains like "tempmail.com" or "guerrillamail.com."
• **Competitor domains** — If you want to block registrations from competing platforms.
• **Known fraudulent domains** — Domains associated with previous fraud attempts.

**How it works:**
When someone registers with an email from a blocked domain, the registration is rejected with a message: "This email domain is not permitted. Please use your organisation email."

🏢 **Real-life example:** You notice several fake registrations from "yopmail.com." You add it to the blocked domains list. Future registration attempts from that domain are immediately rejected. Existing accounts with that domain are not affected (handle those on a case-by-case basis).`,
      },
    ],
  },
];

function SeekerConfigKCContent() {
  const navigate = useNavigate();
  const { tier, isSupervisor } = useAdminTier();

  const filteredGroups = useMemo(() => {
    if (isSupervisor) return GROUPS;
    return GROUPS.filter((g) => !('supervisorOnly' in g && g.supervisorOnly))
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => !('supervisorOnly' in item && (item as any).supervisorOnly)),
      }));
  }, [isSupervisor]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/seeker-config/pricing-overview')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seeker Config Knowledge Centre</h1>
          <p className="text-muted-foreground">Guides for pricing, subscriptions, billing, and compliance settings.</p>
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

export default function SeekerConfigKCPage() {
  return (
    <FeatureErrorBoundary featureName="Seeker Config Knowledge Centre">
      <SeekerConfigKCContent />
    </FeatureErrorBoundary>
  );
}
