

# Fix: Interview Kit Question Generation Rules

## Problem Summary

The current implementation has **one code-level issue**:

| Issue | Current Logic | Required Logic |
|-------|---------------|----------------|
| Random 1-2 selection | `Math.random() > 0.5 ? 2 : 1` | Always select 2 questions (minimum) |

**Note**: The industry/expertise filtering is already correct - the enrollment has Manufacturing + Associate Consultant level, and the database has 20 questions per competency for this exact combination. The problem is solely the randomization causing inconsistent counts.

---

## Root Cause Analysis

### Code Location: `src/services/interviewKitGenerationService.ts`

**Line 207** (Competency Questions):
```typescript
const count = Math.min(shuffled.length, Math.random() > 0.5 ? 2 : 1);
```
This randomly selects 1 or 2 with 50% probability.

**Line 243** (Proof Point Questions):
```typescript
const questionCount = Math.random() > 0.5 ? 2 : 1;
```
Same random 1-2 selection for proof points.

---

## Solution: Enforce Minimum 2 Questions Per Section

### Changes to `src/services/interviewKitGenerationService.ts`

#### Change 1: Competency Questions (Line 207)
**Before:**
```typescript
const count = Math.min(shuffled.length, Math.random() > 0.5 ? 2 : 1);
```

**After:**
```typescript
// Minimum 2 questions per competency (if available)
const count = Math.min(shuffled.length, 2);
```

#### Change 2: Proof Point Questions (Line 243)
**Before:**
```typescript
const questionCount = Math.random() > 0.5 ? 2 : 1;
```

**After:**
```typescript
// Minimum 2 questions per proof point
const questionCount = 2;
```

---

## Data Verification (Already Correct)

The current candidate's enrollment:
- **Industry Segment**: Manufacturing (Auto Components)
- **Expertise Level**: Associate Consultant – Emerging Problem Solver

Database contains questions for this exact combination:
| Competency | Question Count |
|------------|----------------|
| Solution Design & Architecture Thinking | 20 |
| Execution & Governance | 20 |
| Data / Tech Readiness & Tooling Awareness | 20 |
| Soft Skills for Solution Provider Success | 20 |
| Innovation & Co-creation Ability | 20 |

**Conclusion**: No data gaps exist. The industry and expertise level filters are working correctly. Only the random selection logic needs fixing.

---

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/services/interviewKitGenerationService.ts` | 207 | Change random 1-2 to fixed 2 for competency questions |
| `src/services/interviewKitGenerationService.ts` | 243 | Change random 1-2 to fixed 2 for proof point questions |

---

## Expected Outcome After Fix

| Section | Before (Random) | After (Fixed) |
|---------|-----------------|---------------|
| Domain & Delivery Depth | 10 | 10 (unchanged) |
| Proof Points Deep-Dive | 1-2 per PP | **2 per PP** |
| Solution Design & Architecture Thinking | 1-2 | **2** |
| Execution & Governance | 1-2 | **2** |
| Data/Tech Readiness & Tooling Awareness | 1-2 | **2** |
| Soft Skills for Solution Provider Success | 1-2 | **2** |
| Innovation & Co-creation Ability | 1-2 | **2** |

**Total Questions**: Will now be consistent (10 domain + 10 competency + 2×N proof points) instead of varying randomly.

---

## Implementation Steps

1. Update line 207 in `interviewKitGenerationService.ts` to always select 2 competency questions
2. Update line 243 to always generate 2 proof point questions
3. Clear existing evaluation data and regenerate to verify

