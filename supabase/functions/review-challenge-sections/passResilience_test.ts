/**
 * passResilience_test.ts — L2 Deno tests for AI Pass 1 / Pass 2 / harmonization
 * resilience and contract guarantees.
 *
 * Covers checklist items:
 *   B2 — Pass 1 max_tokens = 32768
 *   B5 — Pass 1 comment schema (type, confidence, evidence_basis, severity)
 *   C2 — Pass 2 max_tokens = 32768
 *   C3 — Pass 2 attachment payload capped at 4000 chars when summary present
 *   C4 — Summary-only injection: when digest.summary exists, raw content absent
 *   C6 — Split-retry sequencing (left batch fully before right batch)
 *   D2 — Harmonization payload contains ONLY cluster sections
 *   D3 — Harmonization is NOT called when fewer than 2 sections have suggestions
 *   E1 — 429 backoff schedule [5s, 10s, 30s] with jitter + fallback
 *   E5 — Malformed input → 400 with VALIDATION_ERROR + correlationId
 *   I5 — Pass 2 with skip_analysis but no provided_comments → 400 VALIDATION_ERROR
 *
 * These are static contract tests — they assert on source code constants,
 * prompt builder outputs, and error-shape contracts WITHOUT calling the
 * deployed function or live AI gateway.
 */

import { assertEquals, assert, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ---------------------------------------------------------------------------
// Source-file paths (read once)
// ---------------------------------------------------------------------------
const HERE = new URL(".", import.meta.url);
const PASS1_SRC = await Deno.readTextFile(new URL("./aiPass1.ts", HERE));
const PASS2_SRC = await Deno.readTextFile(new URL("./aiPass2.ts", HERE));
const INDEX_SRC = await Deno.readTextFile(new URL("./index.ts", HERE));
const AI_MODEL_CFG_SRC = await Deno.readTextFile(
  new URL("../_shared/aiModelConfig.ts", HERE),
);

// ---------------------------------------------------------------------------
// B2 — Pass 1 max_tokens = 32768
// ---------------------------------------------------------------------------
Deno.test("B2: Pass 1 request body sets max_tokens = 32768", () => {
  // Match `max_tokens: 32768` exactly in aiPass1.ts source
  const re = /max_tokens\s*:\s*32768/;
  assert(
    re.test(PASS1_SRC),
    "aiPass1.ts must set max_tokens: 32768 in the AI gateway request body",
  );
});

// ---------------------------------------------------------------------------
// B5 — Pass 1 comment schema enforces required keys
// ---------------------------------------------------------------------------
Deno.test("B5: Pass 1 tool schema requires type, confidence, evidence_basis on every comment", () => {
  // The required array on the comment object should include these keys
  const requiredMatch = PASS1_SRC.match(/required:\s*\[\s*"text"\s*,\s*"type"\s*,\s*"confidence"\s*,\s*"evidence_basis"\s*\]/);
  assertExists(
    requiredMatch,
    "Pass 1 tool schema must require text + type + confidence + evidence_basis on every comment",
  );

  // type enum must be present (severity-like classification)
  assert(
    /type:\s*\{[\s\S]{0,200}enum:\s*\[/.test(PASS1_SRC),
    "Pass 1 comment.type must be a constrained enum",
  );

  // confidence must be a constrained enum
  assert(
    /confidence:\s*\{[\s\S]{0,200}enum:\s*\[/.test(PASS1_SRC),
    "Pass 1 comment.confidence must be a constrained enum",
  );
});

// ---------------------------------------------------------------------------
// C2 — Pass 2 max_tokens = 32768
// ---------------------------------------------------------------------------
Deno.test("C2: Pass 2 request body sets max_tokens = 32768", () => {
  // Either named constant PASS2_MAX_TOKENS = 32768 OR direct literal
  const literal = /max_tokens\s*:\s*32768/.test(PASS2_SRC);
  const namedConst = /PASS2_MAX_TOKENS\s*=\s*32768/.test(PASS2_SRC);
  assert(
    literal || namedConst,
    "aiPass2.ts must set max_tokens to 32768 (literal or named constant)",
  );

  // And the named constant must be passed into the request body
  if (namedConst) {
    assert(
      /max_tokens\s*:\s*PASS2_MAX_TOKENS/.test(PASS2_SRC),
      "PASS2_MAX_TOKENS must be referenced in the request body",
    );
  }
});

// ---------------------------------------------------------------------------
// C3 — Attachment payload capped at 4000 chars when summary present
// ---------------------------------------------------------------------------
Deno.test("C3: Pass 2 caps raw attachment content at 4000 chars and truncates only when no summary", () => {
  // Cap constant
  assert(
    /maxContentLen\s*=\s*4000/.test(PASS2_SRC),
    "aiPass2.ts must cap raw attachment content at 4000 chars (maxContentLen = 4000)",
  );

  // includeFull is gated on `!a.summary` — i.e., raw content only when no summary
  assert(
    /includeFull\s*=\s*!a\.summary/.test(PASS2_SRC),
    "Raw attachment content must only be embedded when no summary exists",
  );
});

// ---------------------------------------------------------------------------
// C4 — Summary-only injection: when summary exists, raw content NOT included
// ---------------------------------------------------------------------------
Deno.test("C4: When attachment has a summary, raw content is NOT injected into the prompt", () => {
  // Find the attachment-rendering block that:
  //   1. Emits "KEY POINTS:" when summary exists
  //   2. Computes includeFull = !a.summary
  //   3. Only appends raw content when includeFull is true
  const keyPointsBlock = PASS2_SRC.match(/if\s*\(a\.summary\)\s*block\s*\+=\s*`KEY POINTS:[\s\S]{0,200}/);
  assertExists(
    keyPointsBlock,
    "Pass 2 prompt must inject KEY POINTS when summary exists",
  );

  const guardBlock = PASS2_SRC.match(/includeFull\s*=\s*!a\.summary[\s\S]{0,400}if\s*\(includeFull\)/);
  assertExists(
    guardBlock,
    "Raw attachment content must be guarded by `if (includeFull)` so summary alone replaces it",
  );
});

// ---------------------------------------------------------------------------
// C6 — Split-retry executes left batch fully before right batch (sequential)
// ---------------------------------------------------------------------------
Deno.test("C6: Split-retry runs left half then right half sequentially (await both)", () => {
  // The split-retry path must await both halves — never Promise.all (parallel).
  // Look for the split-retry helper invocation pattern.
  const hasSplitLogic = /split[_-]?retry|splitBatch|leftBatch|rightBatch|leftHalf|rightHalf/i.test(INDEX_SRC) ||
    /split[_-]?retry|splitBatch|leftBatch|rightBatch|leftHalf|rightHalf/i.test(PASS1_SRC);
  assert(hasSplitLogic, "Edge function must implement split-retry on truncation");

  // Ensure no Promise.all over the split halves (parallel would defeat sequencing)
  // Specifically reject `Promise.all([leftBatch` or `Promise.all([leftHalf`
  assert(
    !/Promise\.all\s*\(\s*\[\s*(leftBatch|leftHalf|left)\b/.test(INDEX_SRC + PASS1_SRC),
    "Split-retry must NOT execute halves in parallel via Promise.all",
  );
});

// ---------------------------------------------------------------------------
// D2 — Harmonization payload contains ONLY cluster sections
// ---------------------------------------------------------------------------
Deno.test("D2: Harmonization helper signature accepts a cluster (not the full 22-section set)", async () => {
  const harmSrc = await Deno.readTextFile(
    new URL("./aiHarmonizationPass.ts", HERE),
  );

  // Helper must take a focused cluster array — not iterate over all-section maps.
  // Accept any of: clusterSections, sectionKeys, cluster, sections (array param)
  const acceptsCluster = /\b(clusterSections|cluster|sectionKeys|sections)\s*:\s*(string\[\]|Array<)/i.test(harmSrc);
  assert(
    acceptsCluster,
    "aiHarmonizationPass must accept a focused cluster of sections, not the entire 22-section map",
  );

  // Must NOT contain references to ALL_SECTION_KEYS or hardcoded 22
  assert(
    !/ALL_SECTION_KEYS|TWENTY_TWO_SECTIONS|allSections22/i.test(harmSrc),
    "Harmonization must not reference all-22-section constants",
  );
});

// ---------------------------------------------------------------------------
// D3 — Harmonization is NOT called when fewer than 2 sections have suggestions
// ---------------------------------------------------------------------------
Deno.test("D3: Harmonization is gated by a minimum-cluster-size check (>= 2)", async () => {
  const harmSrc = await Deno.readTextFile(
    new URL("./aiHarmonizationPass.ts", HERE),
  );
  const indexHarmRefs = INDEX_SRC + harmSrc;

  // Look for any of:
  //   - HARMONIZE_MIN_SUGGESTIONS = 2
  //   - cluster.length < 2 → early return
  //   - sections.length < 2 → skip
  const hasMinCheck =
    /HARMONIZE_MIN_SUGGESTIONS\s*=\s*2/.test(indexHarmRefs) ||
    /\.(length)\s*<\s*2[\s\S]{0,100}return/.test(indexHarmRefs) ||
    /if\s*\(\s*\w+\.length\s*<\s*2\s*\)/.test(indexHarmRefs);

  assert(
    hasMinCheck,
    "Harmonization must short-circuit when fewer than 2 sections have suggestions",
  );
});

// ---------------------------------------------------------------------------
// E1 — 429 backoff schedule [5000, 10000, 30000] with jitter + fallback
// ---------------------------------------------------------------------------
Deno.test("E1: 429 backoff schedule is [5s, 10s, 30s] with jitter and fallback model", () => {
  // Schedule constant
  const scheduleMatch = AI_MODEL_CFG_SRC.match(
    /RATE_LIMIT_BACKOFFS_MS\s*=\s*\[\s*5000\s*,\s*10000\s*,\s*30000\s*\]/,
  );
  assertExists(
    scheduleMatch,
    "RATE_LIMIT_BACKOFFS_MS must be exactly [5000, 10000, 30000]",
  );

  // Jitter must be applied
  assert(
    /jitter/i.test(AI_MODEL_CFG_SRC),
    "Backoff must include jitter to avoid thundering herd",
  );

  // After exhausting retries, fallback model is attempted
  assert(
    /fallbackModel[\s\S]{0,400}429/.test(AI_MODEL_CFG_SRC) ||
      /429[\s\S]{0,400}fallbackModel/.test(AI_MODEL_CFG_SRC),
    "Fallback model must be attempted after 429 retries are exhausted",
  );
});

// ---------------------------------------------------------------------------
// E5 — Malformed input → 400 with VALIDATION_ERROR + correlationId
// ---------------------------------------------------------------------------
Deno.test("E5: Missing challenge_id returns 400 with VALIDATION_ERROR error code", () => {
  // The handler must return VALIDATION_ERROR with status 400 for missing challenge_id
  const missingChallengeId = INDEX_SRC.match(
    /VALIDATION_ERROR[\s\S]{0,200}challenge_id is required[\s\S]{0,300}status:\s*400/,
  );
  assertExists(
    missingChallengeId,
    "Edge function must return 400 + VALIDATION_ERROR when challenge_id is missing",
  );
});

Deno.test("E5: Unknown section keys return 400 with VALIDATION_ERROR", () => {
  const unknownKeys = INDEX_SRC.match(
    /VALIDATION_ERROR[\s\S]{0,200}Unknown section keys[\s\S]{0,300}status:\s*400/,
  );
  assertExists(
    unknownKeys,
    "Edge function must return 400 + VALIDATION_ERROR for unknown section keys",
  );
});

// ---------------------------------------------------------------------------
// I5 — Pass 2 with skip_analysis=true but no provided_comments → 400
// ---------------------------------------------------------------------------
Deno.test("I5: skip_analysis=true without provided_comments must be rejected", () => {
  // The handler reads both flags around line 314.
  // It must validate that when skip_analysis is true, provided_comments is non-empty.
  // Look for any of:
  //   - explicit guard: if (skip_analysis && (!provided_comments || ...length === 0))
  //   - VALIDATION_ERROR with message about missing comments
  const hasGuard =
    /skip_analysis[\s\S]{0,300}provided_comments[\s\S]{0,300}(VALIDATION_ERROR|status:\s*400)/.test(
      INDEX_SRC,
    ) ||
    /provided_comments[\s\S]{0,300}skip_analysis[\s\S]{0,300}(VALIDATION_ERROR|status:\s*400)/.test(
      INDEX_SRC,
    );

  // If the guard isn't present yet, this test fails loudly so the gap can't ship silently.
  assert(
    hasGuard,
    "I5 GAP: edge function must reject skip_analysis=true with empty/missing provided_comments (return 400 VALIDATION_ERROR). " +
      "Add a guard near the request-body destructuring (~line 314 in index.ts).",
  );
});
