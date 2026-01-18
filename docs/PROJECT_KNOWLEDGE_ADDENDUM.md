# Project Knowledge Addendum: Retrofit Patterns & Standards

**Version:** 2.0 | **Date:** January 2026  
**Based on:** Service Layer Retrofit, Code Quality Improvements & Gap Analysis

---

## 1. CONSTANTS EXTRACTION PATTERN

### When to Extract
- Any hardcoded number used in business logic
- Configuration values (timeouts, limits, thresholds)
- Enum-like string values used across multiple files
- Default values for optional parameters

### Directory Structure
```
src/constants/
├── index.ts                        # Re-exports all constants
├── lifecycle.constants.ts          # Lifecycle/status related
├── assessment.constants.ts         # Assessment configuration
├── question-generation.constants.ts # Question bank settings
└── [domain].constants.ts           # Domain-specific constants
```

### Standard Pattern
```typescript
// src/constants/[domain].constants.ts

// Use 'as const' for type safety and inference
export const LOCK_THRESHOLDS = {
  CONFIG: 40,
  CONTENT: 60,
  EVERYTHING: 80,
} as const;

// For ranked enums, use numeric values
export const LIFECYCLE_RANKS: Record<string, number> = {
  invited: 10,
  registered: 20,
  enrolled: 30,
  // ...
};

// For display mappings
export const STATUS_DISPLAY_NAMES: Record<string, string> = {
  invited: "Invited",
  registered: "Registered",
  // ...
};
```

### Re-export Pattern
```typescript
// src/constants/index.ts
export * from './lifecycle.constants';
export * from './assessment.constants';
export * from './question-generation.constants';
```

### Import Usage
```typescript
// In service files
import { LIFECYCLE_RANKS, LOCK_THRESHOLDS } from '@/constants';
```

---

## 2. REACT QUERY CACHE CONFIGURATION

### gcTime vs staleTime

| Setting | Purpose | Default | When to Customize |
|---------|---------|---------|-------------------|
| `staleTime` | How long data is "fresh" before refetch on mount | 0 | User-facing data that updates semi-frequently |
| `gcTime` | How long inactive cache is kept before garbage collection | 5 min | Reference/master data |

### Cache Configuration Guidelines

| Data Type | staleTime | gcTime | Rationale |
|-----------|-----------|--------|-----------|
| Countries, Industries | 5 min | 30 min | Static reference data |
| Expertise Levels | 5 min | 30 min | Rarely modified |
| Organization Types | 5 min | 30 min | Admin-controlled |
| Participation Modes | 5 min | 30 min | Fixed set |
| Capability Tags | 5 min | 30 min | Infrequent changes |
| Academic/Proficiency Taxonomy | 5 min | 30 min | Hierarchical, stable |
| User-specific data | 30 sec | 5 min | More dynamic |
| Real-time data | 0 | default | Always fresh |

### Pattern for Reference Data Hooks
```typescript
import { useQuery } from "@tanstack/react-query";

export function useMasterDataEntity() {
  return useQuery({
    queryKey: ["entity_name"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table_name")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 5 * 60 * 1000,   // 5 minutes - consider fresh
    gcTime: 30 * 60 * 1000,     // 30 minutes - keep in cache
  });
}
```

---

## 3. SERVICE LAYER DECOMPOSITION

### When to Split a Service
- File exceeds ~200 lines
- Multiple distinct responsibilities
- Different parts change at different rates
- Testing becomes difficult

### Decomposition Strategy

**Before (monolithic):**
```
src/services/
└── bigService.ts (500+ lines)
```

**After (decomposed):**
```
src/services/
├── bigService.ts           # Main entry, re-exports sub-services
├── bigService/
│   ├── featureA.ts         # Feature A logic
│   ├── featureB.ts         # Feature B logic
│   └── types.ts            # Shared types
```

### Re-export Pattern
```typescript
// src/services/bigService.ts
export * from './bigService/featureA';
export * from './bigService/featureB';
export type * from './bigService/types';
```

### Principles
1. **Single Responsibility**: Each sub-module handles one concern
2. **Cohesion**: Related functions stay together
3. **Clear Interfaces**: Export only what's needed
4. **Backward Compatibility**: Re-export preserves existing imports

---

## 4. ERROR HANDLING STANDARDIZATION

### Required Imports
```typescript
import { 
  handleMutationError,
  handleQueryError,
  logWarning, 
  logInfo,
  logAuditEvent
} from "@/lib/errorHandler";
```

### Mutation Error Handling (MANDATORY)
```typescript
// In React Query mutation hooks
export function useCreateEntity() {
  return useMutation({
    mutationFn: async (data) => { /* ... */ },
    onError: (error: Error) => {
      handleMutationError(error, {
        operation: 'create_entity',    // Required: snake_case action
        component: 'EntityForm',       // Optional: component name
      });
    },
  });
}
```

### Query Error Handling
```typescript
// For read operations - less intrusive than mutation errors
handleQueryError(error, {
  operation: 'fetch_entities',
  component: 'EntityList',
}, false);  // showToast = false for silent handling
```

### Non-Fatal Warning Logging
```typescript
// Instead of console.warn
logWarning("Enrollment not found in context", {
  operation: 'fetch_enrollment',
  component: 'EnrollmentGuard',
});
```

### Info Logging for Significant Operations
```typescript
// Instead of console.log for important events
logInfo("Assessment submitted successfully", {
  operation: 'submit_assessment',
  component: 'AssessmentPage',
});
```

### Audit Event Logging (CRITICAL OPERATIONS)
```typescript
// For security-sensitive or compliance-critical operations
logAuditEvent('user_role_changed', {
  targetUserId: userId,
  previousRole: 'viewer',
  newRole: 'admin',
}, currentUserId);
```

### Anti-Patterns (DO NOT USE)
```typescript
// ❌ WRONG - Raw console methods
console.error("Failed:", error);
console.warn("Missing data");
console.log("Operation completed");

// ✅ CORRECT - Structured logging
handleMutationError(error, { operation: 'action_name' });
logWarning("Missing data", { operation: 'action_name' });
logInfo("Operation completed", { operation: 'action_name' });
```

---

## 5. CONSOLE CLEANUP RULES

### Allowed Console Usage
- **Development debugging only**: `console.log` for temporary debugging
- **Must be removed**: Before committing/pushing code

### Replacement Mapping

| Original | Replacement | When to Use |
|----------|-------------|-------------|
| `console.error(msg, error)` | `handleMutationError(error, context)` | Mutation failures |
| `console.error(msg)` | `logWarning(msg, context)` | Non-exception errors |
| `console.warn(msg)` | `logWarning(msg, context)` | Warnings |
| `console.log(msg)` | `logInfo(msg, context)` | Significant events |
| `console.log(data)` | Remove or `logDebug()` | Debug output |

### Context Object Requirements
```typescript
// Minimum required context
{ operation: 'action_name' }

// Full context
{
  operation: 'action_name',
  component: 'ComponentName',
  userId: 'optional-user-id',
  additionalData: { ... }
}
```

---

## 6. HOOK ORGANIZATION PATTERN

### File Naming
```
src/hooks/queries/
├── use[Entity].ts              # Single entity CRUD
├── use[Entity]Admin.ts         # Admin-specific operations
├── use[Feature][Action].ts     # Feature-specific actions
```

### Standard Query Hook Template
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError } from "@/lib/errorHandler";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// Types
export type Entity = Tables<"table_name">;
export type EntityInsert = TablesInsert<"table_name">;
export type EntityUpdate = TablesUpdate<"table_name">;

// Query hook
export function useEntities() {
  return useQuery({
    queryKey: ["entities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table_name")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      
      if (error) throw new Error(error.message);
      return data as Entity[];
    },
    gcTime: 30 * 60 * 1000,  // For reference data
  });
}

// Mutation hook
export function useCreateEntity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entity: EntityInsert) => {
      const entityWithAudit = await withCreatedBy(entity);
      const { data, error } = await supabase
        .from("table_name")
        .insert(entityWithAudit)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data as Entity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      toast.success("Entity created successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_entity' });
    },
  });
}
```

---

## 7. AUDIT FIELDS UTILITY PATTERN

### Location
`src/lib/auditFields.ts`

### Available Functions

```typescript
// Get current authenticated user ID
export async function getCurrentUserId(): Promise<string | null>

// Add created_by field for INSERT operations
export async function withCreatedBy<T extends object>(data: T): Promise<T & { created_by: string | null }>

// Add updated_by field for UPDATE operations  
export async function withUpdatedBy<T extends object>(data: T): Promise<T & { updated_by: string | null }>
```

### Usage in Mutation Hooks

**CREATE operations:**
```typescript
mutationFn: async (data: EntityInsert) => {
  const dataWithAudit = await withCreatedBy(data);
  const { data: result, error } = await supabase
    .from("table_name")
    .insert(dataWithAudit)
    .select()
    .single();
  // ...
}
```

**UPDATE operations:**
```typescript
mutationFn: async ({ id, ...updates }: EntityUpdate & { id: string }) => {
  const updatesWithAudit = await withUpdatedBy(updates);
  const { data: result, error } = await supabase
    .from("table_name")
    .update(updatesWithAudit)
    .eq("id", id)
    .select()
    .single();
  // ...
}
```

**SOFT DELETE operations (with audit):**
```typescript
mutationFn: async (id: string) => {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("table_name")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
    })
    .eq("id", id);
  // ...
}
```

### Anti-Pattern (DO NOT USE)
```typescript
// ❌ WRONG - Inline user fetching
mutationFn: async (data) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("table_name")
    .insert({ ...data, created_by: user?.id });
}
```

---

## 8. ERROR BOUNDARY PATTERNS

### Location
`src/components/ErrorBoundary.tsx`

### Available Variants

| Variant | Use Case | Features |
|---------|----------|----------|
| `ErrorBoundary` | Full-page errors | Correlation ID, retry, copy error, home link |
| `ErrorBoundaryWithRetry` | Functional wrapper | Render props pattern, retry callback |
| `FeatureErrorBoundary` | Non-critical features | Compact inline error, minimal UI |

### Full-Page Error Boundary
```tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary componentName="App">
      <Router>
        {/* ... */}
      </Router>
    </ErrorBoundary>
  );
}
```

### Feature Error Boundary (Compact)
```tsx
import { FeatureErrorBoundary } from "@/components/ErrorBoundary";

function Dashboard() {
  return (
    <div>
      <FeatureErrorBoundary featureName="Analytics Chart">
        <AnalyticsChart />
      </FeatureErrorBoundary>
      
      <FeatureErrorBoundary featureName="Recent Activity">
        <RecentActivity />
      </FeatureErrorBoundary>
    </div>
  );
}
```

### Error Boundary with Retry
```tsx
import { ErrorBoundaryWithRetry } from "@/components/ErrorBoundary";

function DataLoader() {
  return (
    <ErrorBoundaryWithRetry maxRetries={3}>
      {({ retry, retryCount }) => (
        <DataComponent onRetry={retry} attempts={retryCount} />
      )}
    </ErrorBoundaryWithRetry>
  );
}
```

### Key Features
- **Correlation ID**: Unique ID per error for debugging
- **Copy to Clipboard**: Full error report for support
- **Structured Logging**: All errors logged via `handleMutationError`

---

## 9. LIFECYCLE LOCK CHECKING PATTERN

### When to Check Locks
**ALWAYS check before mutations that modify:**
- Registration data (name, email)
- Configuration data (industry, expertise, mode)
- Content data (proof points, specialities)

### Lock Checking Functions

```typescript
import { 
  canModifyField,
  getCascadeImpact,
  isWizardStepLocked,
  getStatusDisplayName 
} from "@/services/lifecycleService";
```

### Field Modification Check
```typescript
// Before any content mutation
const check = canModifyField(enrollment.lifecycle_rank, 'content');
if (!check.allowed) {
  toast.error(check.reason);
  return;
}
```

### Field Categories

| Category | Threshold Rank | Example Fields |
|----------|----------------|----------------|
| `registration` | 80+ | first_name, last_name, email |
| `configuration` | 40+ | industry_segment, expertise_level, participation_mode |
| `content` | 60+ | proof_points, specialities, proficiency_areas |

### Cascade Impact Check
```typescript
// Before industry/expertise changes
const impact = await getCascadeImpact(enrollmentId);
if (impact.total > 0) {
  // Show CascadeWarningDialog with impact counts
  setShowCascadeWarning(true);
  setCascadeImpact(impact);
}
```

### Wizard Step Lock Check
```typescript
// For navigation guards
const isLocked = isWizardStepLocked(
  lifecycle_rank, 
  'expertise_selection'
);
if (isLocked) {
  navigate('/dashboard');
}
```

---

## 10. ENROLLMENT-SCOPED DATA PATTERN

### Context
Multi-industry/multi-enrollment architecture requires scoping queries and mutations to specific enrollments.

### Query Scoping
```typescript
// Include enrollmentId and/or industrySegmentId in query key
export function useProofPoints(providerId: string, industrySegmentId?: string) {
  return useQuery({
    queryKey: ['proof-points', providerId, industrySegmentId],
    queryFn: async () => {
      let query = supabase
        .from('proof_points')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_deleted', false);
      
      if (industrySegmentId) {
        query = query.eq('industry_segment_id', industrySegmentId);
      }
      
      return query;
    },
  });
}
```

### Auto-Lifecycle Updates After Mutations
```typescript
// After creating a proof point that affects lifecycle
onSuccess: async () => {
  // Invalidate proof points
  queryClient.invalidateQueries({ 
    queryKey: ['proof-points', providerId] 
  });
  
  // Invalidate enrollment (lifecycle may have changed)
  queryClient.invalidateQueries({ 
    queryKey: ['provider-enrollments', providerId] 
  });
  
  // Invalidate assessment eligibility
  queryClient.invalidateQueries({ 
    queryKey: ['can-start-enrollment-assessment'] 
  });
}
```

### EnrollmentContext Usage
```typescript
import { useEnrollment } from "@/contexts/EnrollmentContext";

function ProofPointsList() {
  const { currentEnrollment } = useEnrollment();
  
  const { data: proofPoints } = useProofPoints(
    currentEnrollment.provider_id,
    currentEnrollment.industry_segment_id
  );
  // ...
}
```

---

## 11. QUERY INVALIDATION STRATEGY

### When to Invalidate
After mutations that affect:
1. **The entity itself**: Always invalidate
2. **Parent/child relationships**: Invalidate related entities
3. **Lifecycle status**: Invalidate enrollment queries
4. **Aggregations/counts**: Invalidate computed queries

### Standard Invalidation Patterns

**Proof Point Changes:**
```typescript
queryClient.invalidateQueries({ queryKey: ['proof-points', providerId] });
queryClient.invalidateQueries({ queryKey: ['provider-enrollments', providerId] });
queryClient.invalidateQueries({ queryKey: ['enrollment', enrollmentId] });
queryClient.invalidateQueries({ queryKey: ['can-start-enrollment-assessment'] });
```

**Expertise/Speciality Changes:**
```typescript
queryClient.invalidateQueries({ queryKey: ['provider-specialities', providerId] });
queryClient.invalidateQueries({ queryKey: ['provider-proficiency-areas', providerId] });
queryClient.invalidateQueries({ queryKey: ['provider-enrollments', providerId] });
```

**Assessment Completion:**
```typescript
queryClient.invalidateQueries({ queryKey: ['assessment-attempts', providerId] });
queryClient.invalidateQueries({ queryKey: ['enrollment', enrollmentId] });
queryClient.invalidateQueries({ queryKey: ['provider', providerId] });
```

### Invalidation vs Refetch

| Method | When to Use |
|--------|-------------|
| `invalidateQueries` | Mark stale, refetch on next access |
| `refetchQueries` | Immediately refetch (use sparingly) |
| `setQueryData` | Optimistic updates (advanced) |

---

## 12. CHECKLIST: Code Quality Retrofit

When retrofitting existing code, verify:

### Constants
- [ ] Magic numbers extracted to constants files
- [ ] Constants use `as const` for type safety
- [ ] Re-exported from `src/constants/index.ts`

### Error Handling
- [ ] All `console.error` replaced with `handleMutationError`
- [ ] All `console.warn` replaced with `logWarning`
- [ ] All mutation `onError` callbacks use structured logging
- [ ] Query errors use `handleQueryError()` where appropriate
- [ ] Critical operations use `logAuditEvent()`
- [ ] Context object includes `operation` field

### React Query
- [ ] Reference data hooks have `gcTime: 30 * 60 * 1000`
- [ ] Semi-static data has appropriate `staleTime`
- [ ] Query keys follow `["entity", filters]` pattern
- [ ] Mutations invalidate related queries

### Service Layer
- [ ] Files under 200 lines
- [ ] Single responsibility per module
- [ ] Clear exports via barrel files

### Hooks
- [ ] Proper file naming (`use[Entity].ts`)
- [ ] Type exports for entity types
- [ ] Audit fields via `withCreatedBy`/`withUpdatedBy`

### Lifecycle Governance
- [ ] `canModifyField()` called before content/config mutations
- [ ] Cascade impact checked before industry/expertise changes
- [ ] Wizard step locks respected in navigation

### Error Boundaries
- [ ] Top-level `ErrorBoundary` wraps app
- [ ] Non-critical features wrapped in `FeatureErrorBoundary`
- [ ] Error reports include correlation IDs

### Enrollment Scoping
- [ ] Queries include `enrollmentId`/`industrySegmentId` where applicable
- [ ] Mutations invalidate enrollment-related queries
- [ ] Lifecycle auto-updates after proof point changes

### Soft Delete with Audit
- [ ] Soft delete includes `is_deleted`, `deleted_at`, `deleted_by`
- [ ] Queries filter `is_deleted = false` by default
- [ ] Restore functionality uses `withUpdatedBy()`

---

*Add this content to Project Settings → Manage Knowledge in Lovable*
