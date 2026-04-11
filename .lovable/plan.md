

## Fix: IP Model & Maturity — DB-Driven Master Data

### Problem
- `IP_MODEL_OPTIONS` is hardcoded — platform admins cannot manage IP models
- Maturity options already fetch from DB but lack a fallback if the table is empty
- No `md_ip_models` table exists in the database

### Changes

**1. Create `md_ip_models` table** (database migration)

```sql
CREATE TABLE IF NOT EXISTS public.md_ip_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

ALTER TABLE public.md_ip_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active IP models"
  ON public.md_ip_models FOR SELECT TO authenticated
  USING (is_active = true);

INSERT INTO public.md_ip_models (code, label, description, display_order) VALUES
  ('IP-EA', 'Exclusive Assignment', 'All intellectual property transfers to the challenge seeker', 1),
  ('IP-NEL', 'Non-Exclusive License', 'Solver retains ownership, grants license to seeker', 2),
  ('IP-EL', 'Exclusive License', 'Solver grants exclusive license to seeker', 3),
  ('IP-JO', 'Joint Ownership', 'Joint ownership between solver and seeker', 4),
  ('IP-NONE', 'No IP Transfer', 'Solver retains full IP ownership', 5);
```

**2. Update `src/hooks/cogniblend/useCurationMasterData.ts`**

- Add `useQuery` for `md_ip_models` with `CACHE_STABLE` — returns `null` on error/empty to signal fallback
- Keep `FALLBACK_IP_OPTIONS` constant for graceful degradation
- Add maturity fallback using `MATURITY_LABELS` / `MATURITY_DESCRIPTIONS` from `maturityLabels.ts` if DB returns empty
- Wire `ipModelLoading` into the aggregate `isLoading`
- Use `r.code` directly for maturity value (not `.toUpperCase()`) to match DB normalization

### Files changed

| File | Action |
|------|--------|
| Migration SQL | Create `md_ip_models` table with seed data + RLS |
| `src/hooks/cogniblend/useCurationMasterData.ts` | Add IP model query with fallback; add maturity fallback |

### What stays unchanged
- All downstream renderers — they consume `MasterDataOption[]` arrays, shape is identical
- `maturityLabels.ts` — kept as fallback source
- Complexity and solver eligibility queries — already working from DB

