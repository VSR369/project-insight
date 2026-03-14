

# Remove Core Roles from Resource Pool Form

## Confirmed Safe
- R2 (Account Manager), R8 (Finance Coordinator), R9 (Legal Coordinator) are `is_core = true` in `md_slm_role_codes`
- They are managed exclusively via "Create On Behalf" flow — never assigned through the resource pool
- No existing pool members reference these role codes
- Zero impact on any other feature

## Change: 1 file, 1 line

**`src/components/admin/marketplace/PoolMemberForm.tsx`** line 53:

```typescript
// Before:
const roleCodes = allRoleCodes?.filter((r) => r.model_applicability !== "agg");

// After:
const roleCodes = allRoleCodes?.filter((r) => r.model_applicability !== "agg" && !r.is_core);
```

This filters out core org-level roles from the checkbox list, keeping only challenge-level roles (Challenge Architect, Challenge Curator/MP, Innovation Director/MP, Expert Reviewer/MP).

