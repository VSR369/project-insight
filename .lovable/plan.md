

# Revised Deviation Matrix — Current Module vs Postponed

The 9 gaps from the previous analysis are reclassified below. Gaps tied to challenge lifecycle events (mid-challenge reassignment, archive triggers, phase-aware assignment) are deferred since that module doesn't exist yet.

---

## Current Module Gaps (Resource Pool + Role Induction)

| # | Gap | BRD Rule | Severity | Action |
|---|-----|----------|----------|--------|
| 1 | Proficiency Level not enforced as mandatory in pool member validation | BR-PP-004 | Low | Add required validation to `poolMemberSchema` |
| 2 | Supervisor-approval gate missing for Senior Admin deactivating Supervisor-created members (currently self-confirm) | BR-PP-002 | Low | Add approval request flow or at minimum a notification to Supervisor |
| 3 | Delegated admin slot 80%/100% threshold notifications | BR-SOA-005 | Low | Add threshold check + toast/notification on delegated admin add |
| 4 | Delegated admin scope-narrowing orphan check + warning | BR-DEL-002 | Medium | Add impact analysis before saving narrowed scope |
| 5 | Delegated admin deactivation reassignment wizard | BR-RL-010 | Medium | Add orphan detection + reassignment UI before deactivation |
| 6 | Contact routing by engagement model for role gaps (MP → Platform Admin, AGG → SOA) | BR-CORE-005 | Medium | Add model-aware contact display in readiness panels |

## Postponed to Challenge Lifecycle Management Phase

| # | Gap | BRD Rule | Severity | Reason |
|---|-----|----------|----------|--------|
| 7 | Mid-challenge reassignment workflow with reason capture | BR-ASSIGN-005 | High | Requires challenge lifecycle states and active challenge context |
| 8 | Multi-phase reviewer assignment (abstract screening vs full evaluation) | BR-ASSIGN-006 | Medium | Requires challenge phase definitions not yet built |
| 9 | Archive-triggered availability recalculation | BR-AVAIL-002 | High | Requires challenge archive status transition, which is part of lifecycle module |

---

**Recommendation**: Address items 4, 5, and 6 (Medium severity) in the current phase since they relate to role configuration and readiness — not challenge execution. Items 1–3 are low severity quick wins. Items 7–9 naturally belong in the challenge lifecycle module.

