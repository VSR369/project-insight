

# Pending Items: TechSpec v1.0 vs Current Implementation

## What's Done (not repeated here)
All items from the previous gap analysis (Chunks 1-10 + 7 remaining items) are complete: schema extensions, views, edge functions for scoring/certification/profile-strength/platform-stats, enrollment UI (Tab2 with geographies/outcomes/solution types), VIP admin page, background_jobs table, challenge access gating columns, submission classification columns.

---

## Remaining Gaps — Grouped by Priority

### P1: DB Schema Gaps (ALTER TABLE on existing tables)

**1. community_posts — add post_type + helpful_votes (Spec 3.3)**
The `community_posts` table exists but is missing two columns the spec requires for the performance scoring engine:
```sql
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS
  post_type TEXT DEFAULT 'post' CHECK (post_type IN ('post','article','peer_review','qa_answer'));
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS
  helpful_votes INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_cp_provider_type ON community_posts(provider_id, post_type);
```
Without these, Path 2 performance scoring (community_engagement + knowledge_contribution dimensions) cannot read real data.

**2. provider_performance_scores — mismatch with spec dimensions (Spec 2.6)**
Current table has 6 generic dimensions (quality, consistency, engagement, responsiveness, expertise_depth, community_impact). The spec defines 6 *different* dimensions with raw count columns:
- `community_posts`, `community_helpful_votes`, `articles_written`, `peer_reviews_given`
- `abstracts_submitted`, `full_solutions_submitted`, `solutions_accepted`
- `wins_platinum`, `wins_gold`, `wins_silver`, `avg_challenge_complexity`
- `score_community_engagement`, `score_abstracts_submitted`, `score_solution_quality`, `score_complexity_handled`, `score_win_achievement`, `score_knowledge_contrib`
- Plus `score_date DATE` for daily snapshots

This is a significant structural difference. The current table stores one row per provider (upsert on provider_id). The spec wants daily snapshots (unique on provider_id + score_date) with raw counts alongside weighted scores.

**Action:** ALTER TABLE to add the missing raw count columns + score_date + the 6 spec-named score columns. Update compute-performance-scores edge function to populate these.

---

### P2: Edge Functions Missing

**3. accept-vip-invitation (Spec 11)**
No edge function exists. The spec requires: validate invitation token, create provider profile, fire auto-certify trigger, return session. Currently VIP acceptance works via the generic `accept-provider-invitation` function but doesn't create a full provider_profiles row with VIP auto-cert flow.

**4. send-vip-invitation (Spec 11)**
No edge function for sending branded VIP invitation emails. The VIP admin page exists but has no email dispatch.

**5. grant-certification (Spec 11)**
No edge function for admin-granting Path 1 certification. Currently certification finalization exists in the enrollment wizard but not as a standalone callable edge function.

**6. Expire VIP invitations cron job (Spec 15)**
The spec requires a daily job at 06:00 UTC: `UPDATE vip_invitations SET status='expired' WHERE expires_at < NOW()`. The existing `expire-stale-invitations` function handles role invitations and delegated admin invitations but NOT VIP provider invitations from `solution_provider_invitations`.

---

### P3: Missing Components & Services

**7. matchScoreService.ts (Spec 10.1)**
No match score service exists. The spec requires per-provider match scoring against challenge tags (expertise, proficiency, geographies). This drives the MatchScoreBadge on challenge cards for Level 2+ providers at 65%+ profile strength.

**8. MatchScoreBadge component (Spec 10.1)**
No component exists. Should display a match percentage on each challenge card for logged-in providers with 65%+ profile.

**9. CertificationPathSelector component (Spec 10.1)**
No component exists for providers at 100% profile to choose between the 3 certification paths. Currently the experience track wizard exists but there's no entry point showing all 3 paths.

**10. PerformanceTrackDashboard component (Spec 10.1)**
No dashboard showing a provider's 6 performance dimensions, composite score, and progress toward auto-certification thresholds.

**11. DevEnvironmentModal (Spec 6.2)**
No dev-only quick-login modal with role buttons, demo provider dropdown, screen navigator, and DB state controls. Feature-flagged behind `VITE_SHOW_DEV_ENV=true`.

**12. VipWelcomeScreen (Spec 10.1)**
No crown welcome screen for VIP providers clicking their invitation link.

---

### P4: Level 0 Public Pages (Low Priority for MVP)

**13. Public HomePage + HeroSection with live stats (Spec 6.1-6.3)**
No public landing page exists. The `public-platform-stats` edge function exists and `platform_stats_cache` is populated, but no homepage consumes these stats.

**14. LiveChallengeSidebar (Spec 6.5)**
Right sidebar showing top 5 challenges by reward with realtime subscription. Not built.

**15. ChallengeDetailPublic page (Spec 6.6)**
Public challenge detail at `/challenges/[id]` with gated sections. Currently `BrowseChallengesPage` exists but no full public detail page.

**16. PlatformStatsBar (Spec 10.1)**
Homepage stats bar component. Not built (no homepage to consume it).

---

### P5: compute-performance-scores Edge Function Alignment

**17. Update scoring dimensions to match spec**
Current edge function uses generic dimensions (quality from assessments, engagement from submission count). The spec defines precise formulas:
- Community Engagement (10%): posts + articles + peer reviews + helpful votes
- Abstracts Submitted (15%): COUNT of abstract submissions
- Solution Quality (25%): full solutions × acceptance ratio
- Complexity Handled (20%): AVG challenge complexity level
- Win Achievement (20%): platinum×3 + gold×2 + silver×1
- Knowledge Contribution (10%): articles + peer reviews

The current `performance_score_weights` table also has the wrong dimension names (quality, consistency, engagement, responsiveness, expertise_depth, community_impact vs the spec's community_engagement, abstracts_submitted, solution_quality, complexity_handled, win_achievement, knowledge_contrib).

---

## Implementation Priority Recommendation

| Priority | Items | Effort |
|----------|-------|--------|
| P1 | community_posts columns + performance_scores schema alignment | 2 migrations |
| P2 | 4 edge functions (accept-vip, send-vip, grant-cert, expire-vip) | 4 edge functions |
| P3 | 6 components/services (matchScore, CertPathSelector, PerfDashboard, DevModal, VipWelcome, MatchBadge) | 6 new files |
| P4 | Public pages (HomePage, HeroSection, LiveSidebar, ChallengeDetail) | 4-5 new pages |
| P5 | Realign compute-performance-scores + weights to spec dimensions | 1 edge function update + 1 migration |

**Total remaining: 3-4 migrations, 4-5 edge functions, 10-11 new components/pages**

Would you like to proceed with all items, or focus on a specific priority group?

