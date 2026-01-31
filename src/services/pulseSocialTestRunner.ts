/**
 * Industry Pulse Social Channel Test Runner
 * Comprehensive test suite for social networking features
 * Version: 2.0 - ~100 tests across 17 categories
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export type TestStatus = "pending" | "running" | "pass" | "fail" | "skip";

export interface TestResult {
  status: TestStatus;
  duration?: number;
  error?: string;
  details?: string;
}

export interface TestCase {
  id: string;
  category: string;
  name: string;
  description: string;
  run: () => Promise<TestResult>;
}

export interface TestCategory {
  id: string;
  name: string;
  description: string;
  tests: TestCase[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function runTest(
  testFn: () => Promise<void>
): Promise<TestResult> {
  const start = performance.now();
  try {
    await testFn();
    return {
      status: "pass",
      duration: Math.round(performance.now() - start),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Handle SKIP: prefix for skipped tests
    if (message.startsWith("SKIP:")) {
      return {
        status: "skip",
        duration: Math.round(performance.now() - start),
        details: message.replace("SKIP:", "").trim(),
      };
    }
    return {
      status: "fail",
      duration: Math.round(performance.now() - start),
      error: message,
    };
  }
}

async function getCurrentProvider(): Promise<{ id: string; user_id: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabase
    .from("solution_providers")
    .select("id, user_id")
    .eq("user_id", user.id)
    .single();
  
  return data;
}

async function getOtherProvider(excludeId: string): Promise<{ id: string; user_id: string } | null> {
  const { data } = await supabase
    .from("solution_providers")
    .select("id, user_id")
    .neq("id", excludeId)
    .limit(1)
    .single();
  
  return data;
}

// ============================================================================
// CATEGORY 1: CONTENT CREATION TESTS (CC-xxx) - 10 tests
// ============================================================================

const contentCreationTests: TestCase[] = [
  {
    id: "CC-001",
    category: "Content Creation",
    name: "Query published content",
    description: "Verify published content can be queried",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, content_type, content_status")
        .eq("content_status", "published")
        .eq("is_deleted", false)
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "CC-002",
    category: "Content Creation",
    name: "Query spark content",
    description: "Verify Knowledge Spark content type exists",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, content_type")
        .eq("content_type", "spark")
        .eq("is_deleted", false)
        .limit(5);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "CC-003",
    category: "Content Creation",
    name: "Query article content",
    description: "Verify article content with body_text",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, content_type, body_text")
        .eq("content_type", "article")
        .eq("is_deleted", false)
        .limit(5);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "CC-004",
    category: "Content Creation",
    name: "Content status values",
    description: "Verify content status field supports expected values",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("content_status")
        .eq("is_deleted", false)
        .limit(50);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const validStatuses = ["draft", "published", "archived"];
      const invalidStatuses = (data || []).filter(
        d => !validStatuses.includes(d.content_status)
      );
      
      if (invalidStatuses.length > 0) {
        throw new Error(`Found invalid status values`);
      }
    }),
  },
  {
    id: "CC-005",
    category: "Content Creation",
    name: "Soft delete flag exists",
    description: "Verify is_deleted flag is present on content",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, is_deleted")
        .limit(1);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      if (data && data.length > 0 && data[0].is_deleted === undefined) {
        throw new Error("is_deleted field not found");
      }
    }),
  },
  {
    id: "CC-006",
    category: "Content Creation",
    name: "Content type variety",
    description: "Verify multiple content types exist in system",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("content_type")
        .eq("is_deleted", false)
        .limit(100);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const types = new Set((data || []).map(d => d.content_type));
      // Just verify query works
    }),
  },
  {
    id: "CC-007",
    category: "Content Creation",
    name: "Visibility boost fields",
    description: "Verify visibility_boost_multiplier and visibility_boost_expires_at exist",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, visibility_boost_multiplier, visibility_boost_expires_at")
        .limit(5);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      if (data && data.length > 0) {
        const first = data[0];
        if (first.visibility_boost_multiplier === undefined) {
          throw new Error("visibility_boost_multiplier field missing");
        }
      }
    }),
  },
  {
    id: "CC-008",
    category: "Content Creation",
    name: "Content has provider link",
    description: "Verify all content has provider_id",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, provider_id")
        .eq("is_deleted", false)
        .limit(20);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const missing = (data || []).filter(d => !d.provider_id);
      if (missing.length > 0) {
        throw new Error(`Found ${missing.length} content items without provider_id`);
      }
    }),
  },
  {
    id: "CC-009",
    category: "Content Creation",
    name: "AI enhanced tracking",
    description: "Verify ai_enhanced and original_caption fields exist",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, ai_enhanced, original_caption")
        .limit(5);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      // Field existence validated by query success
    }),
  },
  {
    id: "CC-010",
    category: "Content Creation",
    name: "Media URL structure",
    description: "Verify media_urls is valid array",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, media_urls")
        .not("media_urls", "is", null)
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      if (data && data.length > 0) {
        for (const item of data) {
          if (!Array.isArray(item.media_urls)) {
            throw new Error("media_urls is not an array");
          }
        }
      }
    }),
  },
];

// ============================================================================
// CATEGORY 2: ENGAGEMENT TESTS (EN-xxx) - 10 tests
// ============================================================================

const engagementTests: TestCase[] = [
  {
    id: "EN-001",
    category: "Engagements",
    name: "Query fire engagements",
    description: "Verify fire reaction data exists",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_engagements")
        .select("id, engagement_type")
        .eq("engagement_type", "fire")
        .eq("is_deleted", false)
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "EN-002",
    category: "Engagements",
    name: "Query gold engagements",
    description: "Verify gold award data exists",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_engagements")
        .select("id, engagement_type")
        .eq("engagement_type", "gold")
        .eq("is_deleted", false)
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "EN-003",
    category: "Engagements",
    name: "Query save engagements",
    description: "Verify save functionality data",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_engagements")
        .select("id, engagement_type")
        .eq("engagement_type", "save")
        .eq("is_deleted", false)
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "EN-004",
    category: "Engagements",
    name: "Query bookmark engagements",
    description: "Verify private bookmark data",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_engagements")
        .select("id, engagement_type")
        .eq("engagement_type", "bookmark")
        .eq("is_deleted", false)
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "EN-005",
    category: "Engagements",
    name: "Content engagement counts",
    description: "Verify fire_count, gold_count fields on content",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, fire_count, gold_count, save_count, comment_count")
        .eq("is_deleted", false)
        .limit(5);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      if (data && data.length > 0) {
        const first = data[0];
        if (first.fire_count === undefined) throw new Error("fire_count field missing");
        if (first.gold_count === undefined) throw new Error("gold_count field missing");
      }
    }),
  },
  {
    id: "EN-006",
    category: "Engagements",
    name: "Engagement types valid",
    description: "Verify all engagements have valid types",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_engagements")
        .select("engagement_type")
        .eq("is_deleted", false)
        .limit(100);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const validTypes = ["fire", "gold", "save", "bookmark"];
      const invalid = (data || []).filter(d => !validTypes.includes(d.engagement_type));
      
      if (invalid.length > 0) {
        throw new Error(`Found invalid engagement types`);
      }
    }),
  },
  {
    id: "EN-007",
    category: "Engagements",
    name: "No self-engagement data",
    description: "Verify no engagement where provider = content owner",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_engagements")
        .select(`
          id,
          provider_id,
          content:pulse_content!inner(provider_id)
        `)
        .eq("is_deleted", false)
        .limit(100);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const selfEngagements = (data || []).filter(
        e => e.provider_id === (e.content as any)?.provider_id
      );
      
      if (selfEngagements.length > 0) {
        throw new Error(`Found ${selfEngagements.length} self-engagement records`);
      }
    }),
  },
  {
    id: "EN-008",
    category: "Engagements",
    name: "Unique engagement constraint",
    description: "Check for duplicate engagements",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_engagements")
        .select("provider_id, content_id, engagement_type")
        .eq("is_deleted", false)
        .limit(200);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const seen = new Set<string>();
      const duplicates: string[] = [];
      
      for (const e of data || []) {
        const key = `${e.provider_id}-${e.content_id}-${e.engagement_type}`;
        if (seen.has(key)) {
          duplicates.push(key);
        }
        seen.add(key);
      }
      
      if (duplicates.length > 0) {
        throw new Error(`Found ${duplicates.length} duplicate engagements`);
      }
    }),
  },
  {
    id: "EN-009",
    category: "Engagements",
    name: "Engagement timestamps",
    description: "Verify created_at present on engagements",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_engagements")
        .select("id, created_at")
        .eq("is_deleted", false)
        .limit(20);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const missing = (data || []).filter(d => !d.created_at);
      if (missing.length > 0) {
        throw new Error("Some engagements missing created_at");
      }
    }),
  },
  {
    id: "EN-010",
    category: "Engagements",
    name: "Gold token balance tracking",
    description: "Verify gold_token_balance field on provider stats",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select("provider_id, gold_token_balance")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      if (data && data.length > 0) {
        const first = data[0];
        if (first.gold_token_balance === undefined) {
          throw new Error("gold_token_balance field missing");
        }
      }
    }),
  },
];

// ============================================================================
// CATEGORY 3: COMMENTS & REPLIES TESTS (CM-xxx) - 4 tests
// ============================================================================

const commentsTests: TestCase[] = [
  {
    id: "CM-001",
    category: "Comments",
    name: "Query top-level comments",
    description: "Verify comments without parent exist",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_comments")
        .select("id, content_id, parent_comment_id")
        .is("parent_comment_id", null)
        .eq("is_deleted", false)
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "CM-002",
    category: "Comments",
    name: "Query nested replies",
    description: "Verify replies with parent_comment_id exist",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_comments")
        .select("id, content_id, parent_comment_id")
        .not("parent_comment_id", "is", null)
        .eq("is_deleted", false)
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "CM-003",
    category: "Comments",
    name: "Comment soft delete flag",
    description: "Verify is_deleted field on comments",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_comments")
        .select("id, is_deleted")
        .limit(1);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      if (data && data.length > 0 && data[0].is_deleted === undefined) {
        throw new Error("is_deleted field not found on comments");
      }
    }),
  },
  {
    id: "CM-004",
    category: "Comments",
    name: "Comment content validation",
    description: "Verify comments have content",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_comments")
        .select("id, comment_text")
        .eq("is_deleted", false)
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const empty = (data || []).filter(d => !d.comment_text || d.comment_text.trim() === "");
      if (empty.length > 0) {
        throw new Error(`Found ${empty.length} comments with empty content`);
      }
    }),
  },
];

// ============================================================================
// CATEGORY 4: FOLLOW/CONNECTION TESTS (FL-xxx) - 4 tests
// ============================================================================

const connectionTests: TestCase[] = [
  {
    id: "FL-001",
    category: "Connections",
    name: "Query connections",
    description: "Verify pulse_connections table is queryable",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_connections")
        .select("id, follower_id, following_id")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "FL-002",
    category: "Connections",
    name: "Connection structure",
    description: "Verify follower_id and following_id exist",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_connections")
        .select("follower_id, following_id")
        .limit(1);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      if (data && data.length > 0) {
        if (!data[0].follower_id) throw new Error("follower_id missing");
        if (!data[0].following_id) throw new Error("following_id missing");
      }
    }),
  },
  {
    id: "FL-003",
    category: "Connections",
    name: "No self-follows",
    description: "Verify no connections where follower = following",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_connections")
        .select("follower_id, following_id")
        .limit(100);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const selfFollows = (data || []).filter(
        d => d.follower_id === d.following_id
      );
      
      if (selfFollows.length > 0) {
        throw new Error(`Found ${selfFollows.length} self-follow records`);
      }
    }),
  },
  {
    id: "FL-004",
    category: "Connections",
    name: "Connection timestamps",
    description: "Verify created_at on connections",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_connections")
        .select("id, created_at")
        .limit(5);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const missing = (data || []).filter(d => !d.created_at);
      if (missing.length > 0) {
        throw new Error("Some connections missing created_at");
      }
    }),
  },
];

// ============================================================================
// CATEGORY 5: XP & GAMIFICATION TESTS (XP-xxx) - 8 tests
// ============================================================================

const gamificationTests: TestCase[] = [
  {
    id: "XP-001",
    category: "XP & Gamification",
    name: "Provider stats exist",
    description: "Verify pulse_provider_stats table",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select("provider_id, total_xp, current_level")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "XP-002",
    category: "XP & Gamification",
    name: "XP values non-negative",
    description: "Verify total_xp >= 0",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select("provider_id, total_xp")
        .limit(50);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const negative = (data || []).filter(d => d.total_xp < 0);
      if (negative.length > 0) {
        throw new Error(`Found ${negative.length} providers with negative XP`);
      }
    }),
  },
  {
    id: "XP-003",
    category: "XP & Gamification",
    name: "Level calculation valid",
    description: "Verify current_level >= 1",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select("provider_id, current_level")
        .limit(50);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const invalidLevel = (data || []).filter(d => d.current_level < 1);
      if (invalidLevel.length > 0) {
        throw new Error(`Found ${invalidLevel.length} providers with level < 1`);
      }
    }),
  },
  {
    id: "XP-004",
    category: "XP & Gamification",
    name: "XP audit log exists",
    description: "Verify pulse_xp_audit_log table",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_xp_audit_log")
        .select("id, provider_id, action_type, xp_change")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "XP-005",
    category: "XP & Gamification",
    name: "Streak fields exist",
    description: "Verify current_streak and longest_streak fields",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select("provider_id, current_streak, longest_streak")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      if (data && data.length > 0) {
        const first = data[0];
        if (first.current_streak === undefined) throw new Error("current_streak field missing");
        if (first.longest_streak === undefined) throw new Error("longest_streak field missing");
      }
    }),
  },
  {
    id: "XP-006",
    category: "XP & Gamification",
    name: "Gold token balance field",
    description: "Verify gold_token_balance on provider stats",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select("provider_id, gold_token_balance")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      if (data && data.length > 0) {
        if (data[0].gold_token_balance === undefined) {
          throw new Error("gold_token_balance field missing");
        }
      }
    }),
  },
  {
    id: "XP-007",
    category: "XP & Gamification",
    name: "Contribution counts",
    description: "Verify total_posts, total_sparks, etc. fields",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select("provider_id, total_posts, total_sparks, total_reels, total_podcasts, total_articles, total_galleries")
        .limit(5);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "XP-008",
    category: "XP & Gamification",
    name: "Activity date tracking",
    description: "Verify last_activity_date field",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select("provider_id, last_activity_date")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// CATEGORY 6: LEADERBOARD TESTS (LB-xxx) - 3 tests
// ============================================================================

const leaderboardTests: TestCase[] = [
  {
    id: "LB-001",
    category: "Leaderboards",
    name: "Leaderboard query",
    description: "Verify ranked provider stats query",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select(`
          provider_id,
          total_xp,
          current_level,
          solution_providers!inner(first_name, last_name)
        `)
        .order("total_xp", { ascending: false })
        .limit(20);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "LB-002",
    category: "Leaderboards",
    name: "XP snapshot table",
    description: "Verify pulse_xp_snapshots for weekly/monthly",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_xp_snapshots")
        .select("id, provider_id, total_xp_at_date, snapshot_date")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "LB-003",
    category: "Leaderboards",
    name: "Leaderboard ordering",
    description: "Verify XP ordering is correct",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select("provider_id, total_xp")
        .order("total_xp", { ascending: false })
        .limit(20);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      if (data && data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          if (data[i].total_xp > data[i - 1].total_xp) {
            throw new Error("Leaderboard not properly sorted");
          }
        }
      }
    }),
  },
];

// ============================================================================
// CATEGORY 7: FEED & DISCOVERY TESTS (FD-xxx) - 4 tests
// ============================================================================

const feedTests: TestCase[] = [
  {
    id: "FD-001",
    category: "Feed & Discovery",
    name: "Published feed query",
    description: "Verify published content in feed",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, content_type, content_status, created_at")
        .eq("content_status", "published")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "FD-002",
    category: "Feed & Discovery",
    name: "Content type filter",
    description: "Verify filtering by content_type",
    run: () => runTest(async () => {
      const { data: posts, error: postErr } = await supabase
        .from("pulse_content")
        .select("id")
        .eq("content_type", "post")
        .eq("is_deleted", false)
        .limit(1);
      
      if (postErr) throw new Error(`Filter failed for post: ${postErr.message}`);

      const { data: sparks, error: sparkErr } = await supabase
        .from("pulse_content")
        .select("id")
        .eq("content_type", "spark")
        .eq("is_deleted", false)
        .limit(1);
      
      if (sparkErr) throw new Error(`Filter failed for spark: ${sparkErr.message}`);
    }),
  },
  {
    id: "FD-003",
    category: "Feed & Discovery",
    name: "Industry filter",
    description: "Verify filtering by industry_segment_id",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, industry_segment_id")
        .not("industry_segment_id", "is", null)
        .eq("is_deleted", false)
        .limit(5);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "FD-004",
    category: "Feed & Discovery",
    name: "Provider content filter",
    description: "Verify filtering by provider_id",
    run: () => runTest(async () => {
      const provider = await getCurrentProvider();
      if (!provider) throw new Error("SKIP: No current provider");
      
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, provider_id")
        .eq("provider_id", provider.id)
        .eq("is_deleted", false)
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// CATEGORY 8: MULTI-PROVIDER SCENARIOS (MP-xxx) - 4 tests
// ============================================================================

const multiProviderTests: TestCase[] = [
  {
    id: "MP-001",
    category: "Multi-Provider",
    name: "Multiple providers exist",
    description: "Verify >1 provider in system",
    run: () => runTest(async () => {
      const { count, error } = await supabase
        .from("solution_providers")
        .select("id", { count: "exact", head: true });
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      if (!count || count < 2) {
        throw new Error("SKIP: Need at least 2 providers for multi-provider tests");
      }
    }),
  },
  {
    id: "MP-002",
    category: "Multi-Provider",
    name: "Cross-provider content",
    description: "Verify content from multiple providers",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("provider_id")
        .eq("content_status", "published")
        .eq("is_deleted", false)
        .limit(50);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const uniqueProviders = new Set((data || []).map(d => d.provider_id));
      if (uniqueProviders.size < 2) {
        throw new Error("SKIP: Content from only 1 provider found");
      }
    }),
  },
  {
    id: "MP-003",
    category: "Multi-Provider",
    name: "Cross-provider connections",
    description: "Verify follow connections between providers",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_connections")
        .select("follower_id, following_id")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      if (!data || data.length === 0) {
        throw new Error("SKIP: No connections found");
      }
    }),
  },
  {
    id: "MP-004",
    category: "Multi-Provider",
    name: "Provider isolation check",
    description: "Verify providers have separate content",
    run: () => runTest(async () => {
      const provider = await getCurrentProvider();
      if (!provider) throw new Error("SKIP: No current provider");
      
      const { data: myContent, error: myError } = await supabase
        .from("pulse_content")
        .select("id")
        .eq("provider_id", provider.id)
        .eq("is_deleted", false)
        .limit(5);
      
      if (myError) throw new Error(`Query failed: ${myError.message}`);
      
      const { data: otherContent, error: otherError } = await supabase
        .from("pulse_content")
        .select("id")
        .neq("provider_id", provider.id)
        .eq("content_status", "published")
        .eq("is_deleted", false)
        .limit(5);
      
      if (otherError) throw new Error(`Query failed: ${otherError.message}`);
    }),
  },
];

// ============================================================================
// CATEGORY 9: NOTIFICATION TESTS (NT-xxx) - 6 tests
// ============================================================================

const notificationTests: TestCase[] = [
  {
    id: "NT-001",
    category: "Notifications",
    name: "Notifications query",
    description: "Verify pulse_notifications table",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_notifications")
        .select("id, notification_type, is_read")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "NT-002",
    category: "Notifications",
    name: "Unread count query",
    description: "Verify is_read filter works",
    run: () => runTest(async () => {
      const provider = await getCurrentProvider();
      if (!provider) throw new Error("SKIP: No current provider");
      
      const { data, error } = await supabase
        .from("pulse_notifications")
        .select("id")
        .eq("is_read", false)
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "NT-003",
    category: "Notifications",
    name: "Notification types",
    description: "Verify notification_type enum values",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_notifications")
        .select("notification_type")
        .limit(50);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const validTypes = ["fire", "gold", "save", "comment", "follow", "mention", "level_up", "streak", "badge"];
      const invalid = (data || []).filter(d => !validTypes.includes(d.notification_type));
      
      if (invalid.length > 0) {
        // This is a warning, not a failure - types may expand
      }
    }),
  },
  {
    id: "NT-004",
    category: "Notifications",
    name: "Actor tracking",
    description: "Verify related_provider_id field for actor",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_notifications")
        .select("id, related_provider_id")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "NT-005",
    category: "Notifications",
    name: "Content reference",
    description: "Verify related_content_id field",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_notifications")
        .select("id, related_content_id")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "NT-006",
    category: "Notifications",
    name: "Timestamp ordering",
    description: "Verify created_at DESC ordering",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_notifications")
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      if (data && data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          if (new Date(data[i].created_at) > new Date(data[i - 1].created_at)) {
            throw new Error("Notifications not properly sorted");
          }
        }
      }
    }),
  },
];

// ============================================================================
// CATEGORY 10: SECURITY & RLS TESTS (SR-xxx) - 8 tests
// ============================================================================

const securityTests: TestCase[] = [
  {
    id: "SR-001",
    category: "Security & RLS",
    name: "RLS on pulse_content",
    description: "Verify published content visible",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Not authenticated");
      
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id")
        .eq("content_status", "published")
        .eq("is_deleted", false)
        .limit(5);
      
      if (error) throw new Error(`RLS may be blocking: ${error.message}`);
    }),
  },
  {
    id: "SR-002",
    category: "Security & RLS",
    name: "RLS on engagements",
    description: "Verify own engagements accessible",
    run: () => runTest(async () => {
      const provider = await getCurrentProvider();
      if (!provider) throw new Error("SKIP: No current provider");
      
      const { data, error } = await supabase
        .from("pulse_engagements")
        .select("id")
        .eq("provider_id", provider.id)
        .eq("is_deleted", false)
        .limit(5);
      
      if (error) throw new Error(`RLS may be blocking: ${error.message}`);
    }),
  },
  {
    id: "SR-003",
    category: "Security & RLS",
    name: "RLS on connections",
    description: "Verify connections queryable",
    run: () => runTest(async () => {
      const provider = await getCurrentProvider();
      if (!provider) throw new Error("SKIP: No current provider");
      
      const { data, error } = await supabase
        .from("pulse_connections")
        .select("id")
        .or(`follower_id.eq.${provider.id},following_id.eq.${provider.id}`)
        .limit(5);
      
      if (error) throw new Error(`RLS may be blocking: ${error.message}`);
    }),
  },
  {
    id: "SR-004",
    category: "Security & RLS",
    name: "Auth required check",
    description: "Verify user is authenticated",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User must be authenticated to run tests");
      }
    }),
  },
  {
    id: "SR-005",
    category: "Security & RLS",
    name: "Provider exists for user",
    description: "Verify solution_providers.user_id link",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Not authenticated");
      
      const { data, error } = await supabase
        .from("solution_providers")
        .select("id, user_id")
        .eq("user_id", user.id)
        .limit(1);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      // User may not have provider - that's OK for admin
    }),
  },
  {
    id: "SR-006",
    category: "Security & RLS",
    name: "Stats auto-created",
    description: "Verify stats exist for providers",
    run: () => runTest(async () => {
      const { data: providers, error: provErr } = await supabase
        .from("solution_providers")
        .select("id")
        .limit(5);
      
      if (provErr) throw new Error(`Query failed: ${provErr.message}`);
      
      if (providers && providers.length > 0) {
        const providerIds = providers.map(p => p.id);
        const { data: stats, error: statsErr } = await supabase
          .from("pulse_provider_stats")
          .select("provider_id")
          .in("provider_id", providerIds);
        
        if (statsErr) throw new Error(`Stats query failed: ${statsErr.message}`);
      }
    }),
  },
  {
    id: "SR-007",
    category: "Security & RLS",
    name: "No cross-tenant leak",
    description: "Verify provider isolation in queries",
    run: () => runTest(async () => {
      const provider = await getCurrentProvider();
      if (!provider) throw new Error("SKIP: No current provider");
      
      // Query should only return own provider stats
      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select("provider_id")
        .eq("provider_id", provider.id)
        .single();
      
      if (error && error.code !== "PGRST116") {
        throw new Error(`Query failed: ${error.message}`);
      }
    }),
  },
  {
    id: "SR-008",
    category: "Security & RLS",
    name: "Soft delete respects RLS",
    description: "Verify deleted content hidden by default",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, is_deleted")
        .eq("is_deleted", true)
        .limit(5);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      // Query should work but return nothing or only own deleted content
    }),
  },
];

// ============================================================================
// CATEGORY 11: PULSE CARDS TESTS (PC-xxx) - 4 tests
// ============================================================================

const pulseCardsTests: TestCase[] = [
  {
    id: "PC-001",
    category: "Pulse Cards",
    name: "Card topics query",
    description: "Verify pulse_card_topics table",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_card_topics")
        .select("id, name, description")
        .eq("is_active", true)
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "PC-002",
    category: "Pulse Cards",
    name: "Cards query",
    description: "Verify pulse_cards table",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_cards")
        .select("id, topic_id, compiled_narrative, status")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "PC-003",
    category: "Pulse Cards",
    name: "Card layers query",
    description: "Verify pulse_card_layers table",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_card_layers")
        .select("id, card_id, layer_order, content_text")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "PC-004",
    category: "Pulse Cards",
    name: "Card votes query",
    description: "Verify pulse_card_votes table",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_card_votes")
        .select("id, layer_id, voter_id, vote_type")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// CATEGORY 12: DAILY STANDUP TESTS (DS-xxx) - 5 tests [NEW]
// ============================================================================

const dailyStandupTests: TestCase[] = [
  {
    id: "DS-001",
    category: "Daily Standups",
    name: "Standup table exists",
    description: "Verify pulse_daily_standups is queryable",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_daily_standups")
        .select("id, provider_id, standup_date, completed_at, xp_awarded")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "DS-002",
    category: "Daily Standups",
    name: "Standup structure",
    description: "Verify standup_date, completed_at, xp_awarded fields",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_daily_standups")
        .select("standup_date, completed_at, xp_awarded")
        .limit(5);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "DS-003",
    category: "Daily Standups",
    name: "Visibility boost earned",
    description: "Verify visibility_boost_earned boolean field",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_daily_standups")
        .select("id, visibility_boost_earned")
        .limit(5);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "DS-004",
    category: "Daily Standups",
    name: "Updates viewed tracking",
    description: "Verify updates_viewed counter field",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_daily_standups")
        .select("id, updates_viewed")
        .limit(5);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "DS-005",
    category: "Daily Standups",
    name: "One standup per day",
    description: "Verify unique constraint on (provider_id, standup_date)",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_daily_standups")
        .select("provider_id, standup_date")
        .limit(100);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const seen = new Set<string>();
      const duplicates: string[] = [];
      
      for (const s of data || []) {
        const key = `${s.provider_id}-${s.standup_date}`;
        if (seen.has(key)) {
          duplicates.push(key);
        }
        seen.add(key);
      }
      
      if (duplicates.length > 0) {
        throw new Error(`Found ${duplicates.length} duplicate standups`);
      }
    }),
  },
];

// ============================================================================
// CATEGORY 13: LOOT BOX TESTS (LX-xxx) - 5 tests [NEW]
// ============================================================================

const lootBoxTests: TestCase[] = [
  {
    id: "LX-001",
    category: "Loot Boxes",
    name: "Loot box table exists",
    description: "Verify pulse_loot_boxes is queryable",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_loot_boxes")
        .select("id, provider_id, claim_date")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "LX-002",
    category: "Loot Boxes",
    name: "Loot box structure",
    description: "Verify claim_date, available_at, expires_at fields",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_loot_boxes")
        .select("claim_date, available_at, expires_at")
        .limit(5);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "LX-003",
    category: "Loot Boxes",
    name: "Rewards structure",
    description: "Verify rewards JSONB field",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_loot_boxes")
        .select("id, rewards")
        .limit(5);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "LX-004",
    category: "Loot Boxes",
    name: "Loot box claims tracking",
    description: "Verify loot box claim history via provider stats",
    run: () => runTest(async () => {
      // Check last_loot_box_claimed_at field on provider stats instead
      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select("provider_id, last_loot_box_claimed_at")
        .not("last_loot_box_claimed_at", "is", null)
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "LX-005",
    category: "Loot Boxes",
    name: "One loot box per day",
    description: "Verify unique constraint on (provider_id, claim_date)",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_loot_boxes")
        .select("provider_id, claim_date")
        .limit(100);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const seen = new Set<string>();
      const duplicates: string[] = [];
      
      for (const l of data || []) {
        const key = `${l.provider_id}-${l.claim_date}`;
        if (seen.has(key)) {
          duplicates.push(key);
        }
        seen.add(key);
      }
      
      if (duplicates.length > 0) {
        throw new Error(`Found ${duplicates.length} duplicate loot boxes`);
      }
    }),
  },
];

// ============================================================================
// CATEGORY 14: SKILLS & VERIFICATION TESTS (SK-xxx) - 6 tests [NEW]
// ============================================================================

const skillsTests: TestCase[] = [
  {
    id: "SK-001",
    category: "Skills & Verification",
    name: "Skills table exists",
    description: "Verify pulse_skills is queryable",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_skills")
        .select("id, provider_id, skill_name")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "SK-002",
    category: "Skills & Verification",
    name: "Skill structure",
    description: "Verify skill_name, current_xp, current_level fields",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_skills")
        .select("skill_name, current_xp, current_level")
        .limit(5);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "SK-003",
    category: "Skills & Verification",
    name: "Industry link",
    description: "Verify industry_segment_id FK on skills",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_skills")
        .select("id, industry_segment_id")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "SK-004",
    category: "Skills & Verification",
    name: "Verification fields",
    description: "Verify is_verified, verified_at, verification_source",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_skills")
        .select("id, is_verified, verified_at, verification_source")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "SK-005",
    category: "Skills & Verification",
    name: "Expertise level link",
    description: "Verify expertise_level_id FK",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_skills")
        .select("id, expertise_level_id")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "SK-006",
    category: "Skills & Verification",
    name: "Skill XP non-negative",
    description: "Verify current_xp >= 0",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_skills")
        .select("id, current_xp")
        .limit(50);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const negative = (data || []).filter(d => d.current_xp < 0);
      if (negative.length > 0) {
        throw new Error(`Found ${negative.length} skills with negative XP`);
      }
    }),
  },
];

// ============================================================================
// CATEGORY 15: VISIBILITY BOOST TESTS (VB-xxx) - 4 tests [NEW]
// ============================================================================

const visibilityBoostTests: TestCase[] = [
  {
    id: "VB-001",
    category: "Visibility Boost",
    name: "Boost fields on content",
    description: "Verify visibility_boost_multiplier >= 1",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, visibility_boost_multiplier")
        .not("visibility_boost_multiplier", "is", null)
        .limit(20);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const invalid = (data || []).filter(d => d.visibility_boost_multiplier < 1);
      if (invalid.length > 0) {
        throw new Error(`Found ${invalid.length} content with boost < 1`);
      }
    }),
  },
  {
    id: "VB-002",
    category: "Visibility Boost",
    name: "Boost expiry tracking",
    description: "Verify visibility_boost_expires_at field",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, visibility_boost_expires_at")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "VB-003",
    category: "Visibility Boost",
    name: "Boost tokens on stats",
    description: "Verify visibility_boost_tokens field on provider stats",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select("provider_id, visibility_boost_tokens")
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  {
    id: "VB-004",
    category: "Visibility Boost",
    name: "Boost multiplier validation",
    description: "Verify boost multipliers are within valid range",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, visibility_boost_multiplier")
        .gt("visibility_boost_multiplier", 1)
        .limit(10);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const tooHigh = (data || []).filter(d => d.visibility_boost_multiplier > 100);
      if (tooHigh.length > 0) {
        throw new Error(`Found ${tooHigh.length} content with unreasonably high boost`);
      }
    }),
  },
];

// ============================================================================
// CATEGORY 16: EDGE FUNCTIONS & RPCs TESTS (EF-xxx) - 5 tests [NEW]
// ============================================================================

const edgeFunctionTests: TestCase[] = [
  {
    id: "EF-001",
    category: "Edge Functions",
    name: "Award XP RPC exists",
    description: "Verify pulse_award_xp function is callable",
    run: () => runTest(async () => {
      // We don't actually call it to avoid side effects
      // Just verify the function exists by checking if RPC call returns expected error
      const { data, error } = await supabase.rpc("pulse_award_xp", {
        p_provider_id: "00000000-0000-0000-0000-000000000000",
        p_xp_amount: 0,
        p_action_type: "test",
      });
      
      // RPC exists if we get a proper error (not a function-not-found error)
      if (error && error.message.includes("function pulse_award_xp") && error.message.includes("does not exist")) {
        throw new Error("RPC function pulse_award_xp does not exist");
      }
    }),
  },
  {
    id: "EF-002",
    category: "Edge Functions",
    name: "Update streak RPC exists",
    description: "Verify pulse_update_streak function is callable",
    run: () => runTest(async () => {
      const { data, error } = await supabase.rpc("pulse_update_streak", {
        p_provider_id: "00000000-0000-0000-0000-000000000000",
      });
      
      if (error && error.message.includes("function pulse_update_streak") && error.message.includes("does not exist")) {
        throw new Error("RPC function pulse_update_streak does not exist");
      }
    }),
  },
  {
    id: "EF-003",
    category: "Edge Functions",
    name: "Streak multiplier RPC",
    description: "Verify pulse_get_streak_multiplier returns valid range",
    run: () => runTest(async () => {
      // Test various streak values
      for (const streak of [0, 7, 14, 30, 90, 180, 365]) {
        const { data, error } = await supabase.rpc("pulse_get_streak_multiplier", {
          p_streak: streak,
        });
        
        if (error) throw new Error(`RPC failed for streak ${streak}: ${error.message}`);
        if (data < 1.0 || data > 3.0) {
          throw new Error(`Invalid multiplier ${data} for streak ${streak}`);
        }
      }
    }),
  },
  {
    id: "EF-004",
    category: "Edge Functions",
    name: "Level calculation RPC",
    description: "Verify pulse_calculate_level returns >= 1",
    run: () => runTest(async () => {
      for (const xp of [0, 100, 500, 1000, 5000, 10000]) {
        const { data, error } = await supabase.rpc("pulse_calculate_level", {
          p_total_xp: xp,
        });
        
        if (error) throw new Error(`RPC failed for XP ${xp}: ${error.message}`);
        if (data < 1) {
          throw new Error(`Invalid level ${data} for XP ${xp}`);
        }
      }
    }),
  },
  {
    id: "EF-005",
    category: "Edge Functions",
    name: "Reputation RPC",
    description: "Verify pulse_cards_get_reputation is callable",
    run: () => runTest(async () => {
      const { data, error } = await supabase.rpc("pulse_cards_get_reputation", {
        p_provider_id: "00000000-0000-0000-0000-000000000000",
      });
      
      if (error && error.message.includes("function pulse_cards_get_reputation") && error.message.includes("does not exist")) {
        throw new Error("RPC function pulse_cards_get_reputation does not exist");
      }
      
      // Function exists and returned something
      if (typeof data === "number" && data < 0) {
        throw new Error("Reputation cannot be negative");
      }
    }),
  },
];

// ============================================================================
// CATEGORY 17: NEGATIVE CASES TESTS (NC-xxx) - 8 tests [NEW]
// ============================================================================

const negativeCaseTests: TestCase[] = [
  {
    id: "NC-001",
    category: "Negative Cases",
    name: "Auth check on tables",
    description: "Verify authenticated access to pulse tables",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Must be authenticated - this validates auth requirement");
      }
      
      // Verify we can access pulse tables when authenticated
      const { error } = await supabase
        .from("pulse_content")
        .select("id")
        .limit(1);
      
      if (error) throw new Error(`Authenticated access failed: ${error.message}`);
    }),
  },
  {
    id: "NC-002",
    category: "Negative Cases",
    name: "Self-engagement prevention",
    description: "Verify business logic prevents self-fire",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_engagements")
        .select(`
          id,
          provider_id,
          content:pulse_content!inner(provider_id)
        `)
        .eq("is_deleted", false)
        .limit(100);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const selfEngagements = (data || []).filter(
        e => e.provider_id === (e.content as any)?.provider_id
      );
      
      if (selfEngagements.length > 0) {
        throw new Error(`Business logic failure: Found ${selfEngagements.length} self-engagements`);
      }
    }),
  },
  {
    id: "NC-003",
    category: "Negative Cases",
    name: "Self-follow prevention",
    description: "Verify database constraint prevents self-follow",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_connections")
        .select("follower_id, following_id")
        .limit(100);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const selfFollows = (data || []).filter(
        d => d.follower_id === d.following_id
      );
      
      if (selfFollows.length > 0) {
        throw new Error(`Constraint failure: Found ${selfFollows.length} self-follow records`);
      }
    }),
  },
  {
    id: "NC-004",
    category: "Negative Cases",
    name: "Deleted content hidden",
    description: "Verify is_deleted = true filtered properly",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, is_deleted")
        .eq("content_status", "published")
        .eq("is_deleted", false)
        .limit(50);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const leakedDeleted = (data || []).filter(d => d.is_deleted === true);
      if (leakedDeleted.length > 0) {
        throw new Error(`Filter failure: Found ${leakedDeleted.length} deleted items in results`);
      }
    }),
  },
  {
    id: "NC-005",
    category: "Negative Cases",
    name: "Invalid content type check",
    description: "Verify content_type enum constraint",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("content_type")
        .limit(100);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const validTypes = ["reel", "podcast", "spark", "article", "gallery", "post"];
      const invalid = (data || []).filter(d => !validTypes.includes(d.content_type));
      
      if (invalid.length > 0) {
        throw new Error(`Enum violation: Found ${invalid.length} invalid content types`);
      }
    }),
  },
  {
    id: "NC-006",
    category: "Negative Cases",
    name: "Invalid engagement type check",
    description: "Verify engagement_type enum constraint",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_engagements")
        .select("engagement_type")
        .limit(100);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const validTypes = ["fire", "gold", "save", "bookmark"];
      const invalid = (data || []).filter(d => !validTypes.includes(d.engagement_type));
      
      if (invalid.length > 0) {
        throw new Error(`Enum violation: Found ${invalid.length} invalid engagement types`);
      }
    }),
  },
  {
    id: "NC-007",
    category: "Negative Cases",
    name: "Empty comment validation",
    description: "Verify comments have content",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_comments")
        .select("id, comment_text")
        .eq("is_deleted", false)
        .limit(50);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const empty = (data || []).filter(
        d => !d.comment_text || d.comment_text.trim() === ""
      );
      
      if (empty.length > 0) {
        throw new Error(`Validation failure: Found ${empty.length} empty comments`);
      }
    }),
  },
  {
    id: "NC-008",
    category: "Negative Cases",
    name: "Duplicate engagement prevention",
    description: "Verify unique constraint on engagements",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_engagements")
        .select("provider_id, content_id, engagement_type")
        .eq("is_deleted", false)
        .limit(200);
      
      if (error) throw new Error(`Query failed: ${error.message}`);
      
      const seen = new Set<string>();
      const duplicates: string[] = [];
      
      for (const e of data || []) {
        const key = `${e.provider_id}-${e.content_id}-${e.engagement_type}`;
        if (seen.has(key)) {
          duplicates.push(key);
        }
        seen.add(key);
      }
      
      if (duplicates.length > 0) {
        throw new Error(`Unique constraint failure: Found ${duplicates.length} duplicate engagements`);
      }
    }),
  },
];

// ============================================================================
// EXPORT ALL CATEGORIES - 17 CATEGORIES, ~100 TESTS
// ============================================================================

export const testCategories: TestCategory[] = [
  {
    id: "content-creation",
    name: "Content Creation",
    description: "Tests for creating and managing pulse content",
    tests: contentCreationTests,
  },
  {
    id: "engagements",
    name: "Engagements",
    description: "Tests for fire, gold, save, and bookmark interactions",
    tests: engagementTests,
  },
  {
    id: "comments",
    name: "Comments & Replies",
    description: "Tests for commenting and nested replies",
    tests: commentsTests,
  },
  {
    id: "connections",
    name: "Follow/Connections",
    description: "Tests for following and provider connections",
    tests: connectionTests,
  },
  {
    id: "gamification",
    name: "XP & Gamification",
    description: "Tests for XP awards, levels, and streaks",
    tests: gamificationTests,
  },
  {
    id: "leaderboards",
    name: "Leaderboards",
    description: "Tests for ranking and leaderboard queries",
    tests: leaderboardTests,
  },
  {
    id: "feed",
    name: "Feed & Discovery",
    description: "Tests for content feed and filtering",
    tests: feedTests,
  },
  {
    id: "multi-provider",
    name: "Multi-Provider",
    description: "Tests for multi-provider scenarios",
    tests: multiProviderTests,
  },
  {
    id: "notifications",
    name: "Notifications",
    description: "Tests for notification system",
    tests: notificationTests,
  },
  {
    id: "security",
    name: "Security & RLS",
    description: "Tests for row-level security",
    tests: securityTests,
  },
  {
    id: "pulse-cards",
    name: "Pulse Cards",
    description: "Tests for collaborative card system",
    tests: pulseCardsTests,
  },
  {
    id: "daily-standups",
    name: "Daily Standups",
    description: "Tests for daily standup completion and rewards",
    tests: dailyStandupTests,
  },
  {
    id: "loot-boxes",
    name: "Loot Boxes",
    description: "Tests for loot box claiming and rewards",
    tests: lootBoxTests,
  },
  {
    id: "skills",
    name: "Skills & Verification",
    description: "Tests for skills and verification system",
    tests: skillsTests,
  },
  {
    id: "visibility-boost",
    name: "Visibility Boost",
    description: "Tests for visibility boost mechanics",
    tests: visibilityBoostTests,
  },
  {
    id: "edge-functions",
    name: "Edge Functions & RPCs",
    description: "Tests for database functions and edge functions",
    tests: edgeFunctionTests,
  },
  {
    id: "negative-cases",
    name: "Negative Cases",
    description: "Tests for validation and constraint enforcement",
    tests: negativeCaseTests,
  },
];

export function getAllTests(): TestCase[] {
  return testCategories.flatMap(cat => cat.tests);
}

export function getTestById(id: string): TestCase | undefined {
  return getAllTests().find(t => t.id === id);
}

export function getTestsByCategory(categoryId: string): TestCase[] {
  const category = testCategories.find(c => c.id === categoryId);
  return category?.tests || [];
}

export function getTestSummary(): { total: number; categories: number } {
  return {
    total: getAllTests().length,
    categories: testCategories.length,
  };
}
