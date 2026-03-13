

# Plan: Expand Knowledge Centre — Full System Config Parameter Guide with Examples

## What Changes
Replace the current concise "System Config & Permissions" accordion item (item `system-config`, lines 241-257) with a **dedicated new group** called "System Configuration Reference" containing one accordion item per config group (9 groups, 24+ parameters). Each parameter gets a plain-language explanation plus a real-life example.

## Content Design

### New Group: "System Configuration Reference" (replaces the 3-paragraph summary)

The existing "Administration" group keeps items 11 (Availability) and 12 (Performance). Item 13 (System Config) is replaced by 9 new detailed accordion items below.

**1. Governance & Scaling** (3 params)
- `platform_admin_tier_depth` — Controls how many admin levels exist. Example: "A startup platform with 1 supervisor sets this to 1. As the team grows to 10 admins, set to 3 for full hierarchy."
- `org_admin_delegation_enabled` — Whether orgs can have delegated admins. Example: "A large university with multiple departments enables this so the main admin can delegate to department heads."

**2. Assignment Mode** (1 param)
- `org_verification_assignment_mode` — Auto-assign vs open claim. Example: "During low volume (5 orgs/day), use open_claim. During onboarding campaigns (50/day), switch to auto_assign."

**3. Domain Match Weights** (3 params, L1/L2/L3)
- Industry/Country/OrgType weights for auto-assignment scoring. Example: "Set L1=60% if your admins specialise by industry. Set L2=50% if country-specific regulations matter most."

**4. Admin Capacity** (3 params)
- `default_max_concurrent_verifications`, `partially_available_threshold`, `minimum_admins_available`. Example: "Set max concurrent to 5 during training, increase to 15 for experienced admins."

**5. Open Queue** (4 params)
- `queue_unclaimed_sla_hours`, `queue_escalation_interval_hours`, `admin_release_window_hours`, `sla_duration`. Example: "If unclaimed SLA is 4h and escalation interval is 2h, the supervisor gets pinged at 4h, 6h, 8h..."

**6. SLA Escalation** (3 params)
- Tier 1/2/3 thresholds. Example: "With SLA duration=48h: Tier1 at 80%=38.4h (amber warning), Tier2 at 100%=48h (breach), Tier3 at 150%=72h (critical)."

**7. Escalation Routing** (1 param)
- `executive_escalation_contact_id`. Example: "Set this to the VP of Operations. If all admins are unavailable during a holiday, this person gets the alert."

**8. Reassignment & Leave** (2 params)
- Max reassignments, leave reminder days. Example: "With max=3, a verification bounced 3 times locks and the supervisor must handle it directly."

**9. Expertise Caps** (3 params)
- Max industries/countries/org types for Basic Admins. Example: "Set to 3 so new admins focus on a narrow domain. Senior admins have no cap."

**10. SOA Provisioning** (2 params)
- `activation_link_expiry_hours`, `max_delegated_admins_per_org`. Example: "72h gives new org admins a weekend to activate. Set max delegated to 5 for enterprise orgs."

## File Changes

| File | Action |
|------|--------|
| `src/pages/admin/verifications/VerificationKnowledgeCentrePage.tsx` | Replace item `system-config` in Administration group with a new 5th group "System Configuration Reference" containing 10 accordion items covering all 24 parameters with real-life examples |

Single file edit. No routing, sidebar, or DB changes needed.

## Content Principles
- Every parameter: name, what it does, allowed values/range, default, real-life scenario
- Written for a non-technical supervisor who has never seen a config dashboard before
- Group headers match the System Config page exactly so users can cross-reference

