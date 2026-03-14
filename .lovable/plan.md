

# Recommendations for Remaining Performance Audit Items

## Recommended to Implement Now (Low Risk, High Value)

### 1. Dynamic `html2pdf.js` Import (~200KB savings)
Same pattern as the XLSX fix already done. Convert static imports in `TakeAssessment.tsx` and `QuestionBankPage.tsx` to `await import("html2pdf.js")` at point-of-use. Zero risk, immediate bundle reduction.

### 2. Centralized Cache Tiers (PERF-M01)
Create `src/config/queryCache.ts` with named constants:
```
REAL_TIME: 5s, FREQUENT: 30s, STANDARD: 2min, STABLE: 5min, STATIC: 30min
```
Then progressively replace inline `staleTime` values across hooks. Can be done incrementally — no big-bang required.

### 3. Web Vitals Monitoring (PERF-M05)
Install `web-vitals`, create a reporter in `src/lib/reportWebVitals.ts`, call from `main.tsx`. Console logging in dev, optional analytics endpoint later. Pure addition, zero risk.

---

## Recommend Deferring (High Risk or Platform-Blocked)

| Item | Recommendation |
|------|---------------|
| **PERF-C04** (hardcoded Supabase creds) | **Cannot fix** — Lovable platform constraint |
| **PERF-C07** (types file extraction) | **Cannot fix** — auto-generated file |
| **PERF-H02** (46 memory leaks) | **Defer** — requires case-by-case review; batch fixing risks regressions |
| **PERF-H03** (Dashboard 27 hooks) | **Defer** — needs progressive loading architecture design as separate effort |
| **PERF-H07** (server-side pagination) | **Defer** — requires Supabase RPC + UI pagination changes |
| **PERF-M04** (split large files) | **Defer** — cosmetic; no runtime impact |
| **PERF-C03** (test code) | **No action needed** — already lazy-loaded |
| **AD-07/09/10** (CSP, rate limiting, logging) | **Defer** — infrastructure-level changes, not client-side fixes |

---

## Summary

I suggest implementing **items 1-3 above** as they are safe, quick, and provide measurable improvement. The rest should be planned as separate focused efforts to avoid breaking existing functionality.

Shall I proceed with implementing the three recommended items?

