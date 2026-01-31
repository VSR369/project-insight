

# Fix Social Channel Test Failures & Skips

## Problem Analysis

### 4 Failed Tests - Wrong Column Names

The test queries reference **non-existent columns**. Here's the actual vs expected:

| Test ID | Issue | Fix |
|---------|-------|-----|
| LB-002 | Uses `total_xp` | Change to `total_xp_at_date` |
| PC-002 | Uses `seed_text` | Change to `compiled_narrative` (or remove column from select) |
| PC-003 | Uses `layer_number` | Change to `layer_order` |
| PC-004 | Uses `provider_id` | Change to `voter_id` |

### 7 Skipped Tests - Missing Prerequisites

These tests SHOULD skip when prerequisites aren't met - this is **correct behavior**:

| Test ID | Skip Condition | Why It's Valid |
|---------|----------------|----------------|
| FD-004, MP-004, NT-002, SR-002, SR-003 | "No current provider" | User is admin without provider profile |
| MP-002 | "Only 1 provider content" | Not enough multi-provider data |
| MP-003 | "No connections found" | No follow relationships created yet |

**Important**: Skipped tests are NOT failures - they indicate missing test data/context. To run them:
1. Log in as a provider account (not admin-only)
2. Create content from multiple providers
3. Create follow connections between providers

---

## Implementation Plan

### Step 1: Fix Column References in Test Queries

**File**: `src/services/pulseSocialTestRunner.ts`

#### Fix LB-002 (Line 568-569)
```typescript
// BEFORE
.select("id, provider_id, total_xp, snapshot_date")

// AFTER
.select("id, provider_id, total_xp_at_date, snapshot_date")
```

#### Fix PC-002 (Line 908)
```typescript
// BEFORE
.select("id, topic_id, seed_text, status")

// AFTER
.select("id, topic_id, compiled_narrative, status")
```

#### Fix PC-003 (Line 922)
```typescript
// BEFORE
.select("id, card_id, layer_number, content")

// AFTER
.select("id, card_id, layer_order, content_text")
```

#### Fix PC-004 (Line 936)
```typescript
// BEFORE
.select("id, layer_id, provider_id, vote_type")

// AFTER
.select("id, layer_id, voter_id, vote_type")
```

### Step 2: Improve Skip Messages (Optional Enhancement)

Update skip messages to be more informative about how to resolve:

```typescript
// Example: FD-004
if (!provider) throw new Error("SKIP: No current provider. Log in as a provider account to run this test.");

// Example: MP-002
if (uniqueProviders.size < 2) {
  throw new Error("SKIP: Content from only 1 provider found. Need published content from 2+ providers.");
}
```

---

## Expected Results After Fix

| Category | Before | After |
|----------|--------|-------|
| Failed | 4 | 0 |
| Skipped | 7 | 7 (expected - data prerequisites not met) |
| Passed | 34 | 38 |

**Note**: Skipped tests will pass once:
- You log in as a provider account (not admin)
- Multiple providers have published content
- Follow connections exist between providers

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/pulseSocialTestRunner.ts` | Fix 4 column name references |

