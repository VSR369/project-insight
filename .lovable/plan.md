

# Fix: Filter Out Marketplace Roles from SOA AssignRoleSheet

## Problem
Line 142 in `AssignRoleSheet.tsx` uses the full role catalog without filtering out Marketplace-only roles (`model_applicability === "mp"`). This means SOA admins can see and assign R3, R5_MP, R6_MP, R7_MP — roles they have no authority over per `check_model_authority()`.

## Fix — `src/components/rbac/roles/AssignRoleSheet.tsx`

**Line 142** — Filter `fullRoleCatalog` to exclude Marketplace-only roles:

```typescript
const fullRoleCatalog = (allRoleCodes ?? availableRoles).filter(
  (r) => r.model_applicability !== "mp"
);
```

**Line ~188 (`onSubmitExisting`)** — Use the selected role's actual `model_applicability` instead of hardcoded `"both"`:

```typescript
const selectedRoleMeta = fullRoleCatalog.find((r) => r.code === existingMemberRoleCode);
// In the create call:
model_applicability: selectedRoleMeta?.model_applicability ?? "both",
```

These two changes ensure:
- SOA admins only see Core (`both`) and Aggregator (`agg`) roles
- Assignments are created with the correct `model_applicability` so they appear in the right dashboard tab

