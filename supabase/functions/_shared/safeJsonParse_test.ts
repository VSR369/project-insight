/**
 * safeJsonParse_test.ts — covers checklist items B3 (Pass-1 truncation)
 * and C5 (Pass-2 split-retry malformed JSON recovery).
 *
 * 12 broken-payload scenarios drawn from production logs.
 * Run with: deno test --allow-env --allow-net supabase/functions/_shared/safeJsonParse_test.ts
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { safeJsonParse, parseSummaryAndKeyData } from "./safeJsonParse.ts";

Deno.test("safeJsonParse — direct valid JSON object", () => {
  const out = safeJsonParse<{ a: number } | null>('{"a":1}', null);
  assertEquals(out, { a: 1 });
});

Deno.test("safeJsonParse — direct valid JSON array", () => {
  const out = safeJsonParse<number[]>("[1,2,3]", []);
  assertEquals(out, [1, 2, 3]);
});

Deno.test("safeJsonParse — strips ```json fences", () => {
  const out = safeJsonParse<{ x: string } | null>('```json\n{"x":"y"}\n```', null);
  assertEquals(out, { x: "y" });
});

Deno.test("safeJsonParse — strips bare ``` fences", () => {
  const out = safeJsonParse<{ x: number } | null>('```\n{"x":42}\n```', null);
  assertEquals(out, { x: 42 });
});

Deno.test("safeJsonParse — fixes trailing comma in object", () => {
  const out = safeJsonParse<{ a: number; b: number } | null>('{"a":1,"b":2,}', null);
  assertEquals(out, { a: 1, b: 2 });
});

Deno.test("safeJsonParse — fixes trailing comma in array", () => {
  const out = safeJsonParse<number[]>("[1,2,3,]", []);
  assertEquals(out, [1, 2, 3]);
});

Deno.test("safeJsonParse — patches truncated array (missing closing bracket)", () => {
  const out = safeJsonParse<Array<{ id: number }>>('[{"id":1},{"id":2}', []);
  assertEquals(out.length, 2);
});

Deno.test("safeJsonParse — patches truncated object (missing closing brace)", () => {
  const out = safeJsonParse<{ a: number; b: number } | null>('{"a":1,"b":2', null);
  assertEquals(out, { a: 1, b: 2 });
});

Deno.test("safeJsonParse — drops trailing partial entry", () => {
  // simulates Pass 2 truncated mid-object
  const out = safeJsonParse<Array<{ id: number }>>('[{"id":1},{"id":2},{"id":', []);
  // partial entry stripped; first two retained
  assertEquals(out.length, 2);
});

Deno.test("safeJsonParse — extracts JSON object embedded in prose", () => {
  const raw = 'Sure! Here is the result:\n{"answer":42}\nLet me know if you need anything else.';
  const out = safeJsonParse<{ answer: number } | null>(raw, null);
  assertEquals(out, { answer: 42 });
});

Deno.test("safeJsonParse — extracts JSON array embedded in prose", () => {
  const raw = "Some preamble [1,2,3] some trailing text";
  const out = safeJsonParse<number[]>(raw, []);
  assertEquals(out, [1, 2, 3]);
});

Deno.test("safeJsonParse — empty string returns fallback", () => {
  assertEquals(safeJsonParse("", { fallback: true }), { fallback: true });
});

Deno.test("safeJsonParse — non-string input returns fallback", () => {
  // deno-lint-ignore no-explicit-any
  assertEquals(safeJsonParse(undefined as any, "fb"), "fb");
  // deno-lint-ignore no-explicit-any
  assertEquals(safeJsonParse(null as any, 0), 0);
});

Deno.test("safeJsonParse — completely garbage input returns fallback", () => {
  assertEquals(safeJsonParse<null>("this is not json at all", null), null);
});

Deno.test("parseSummaryAndKeyData — well-formed Tier 2 output", () => {
  const raw = `SUMMARY: This document outlines the project objectives in detail.
KEY_DATA: {"budget":50000,"timeline_weeks":12}`;
  const out = parseSummaryAndKeyData(raw);
  assertEquals(out.summary?.startsWith("This document"), true);
  assertEquals(out.keyData?.budget, 50000);
});

Deno.test("parseSummaryAndKeyData — KEY_DATA inside fenced block", () => {
  const raw = "SUMMARY: A clear summary that exceeds the minimum length.\n```json\n{\"score\":88}\n```";
  const out = parseSummaryAndKeyData(raw);
  assertEquals(out.keyData?.score, 88);
});

Deno.test("parseSummaryAndKeyData — headerless plain text falls back to summary", () => {
  const raw = "Just a plain block of bullet points without any SUMMARY header that nonetheless exceeds fifty characters in length.";
  const out = parseSummaryAndKeyData(raw);
  assertEquals(typeof out.summary, "string");
  assertEquals((out.summary?.length ?? 0) > 0, true);
});
