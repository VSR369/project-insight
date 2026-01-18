# Project Knowledge Addendum: Retrofit Patterns & Standards

**Version:** 1.0 | **Date:** January 2026  
**Based on:** Service Layer Retrofit & Code Quality Improvements

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

## 2. REACT QUERY gcTime CONFIGURATION

### Reference Data Caching
For master data and lookup tables that rarely change, use extended cache times:

```typescript
// Standard gcTime for reference data hooks
export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    queryFn: async () => { /* ... */ },
    gcTime: 30 * 60 * 1000,  // 30 minutes - data rarely changes
  });
}
```

### gcTime Guidelines

| Data Type | gcTime | Rationale |
|-----------|--------|-----------|
| Countries, Industries | 30 min | Static reference data |
| Expertise Levels | 30 min | Rarely modified |
| Organization Types | 30 min | Admin-controlled |
| Participation Modes | 30 min | Fixed set |
| Capability Tags | 30 min | Infrequent changes |
| Academic Taxonomy | 30 min | Hierarchical, stable |
| Proficiency Taxonomy | 30 min | Hierarchical, stable |
| User-specific data | 5 min (default) | More dynamic |
| Real-time data | 0 or default | Always fresh |

### Pattern for All Master Data Hooks
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
    gcTime: 30 * 60 * 1000,  // 30 minutes for reference data
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
  logWarning, 
  logInfo 
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

## 7. CHECKLIST: Code Quality Retrofit

When retrofitting existing code, verify:

### Constants
- [ ] Magic numbers extracted to constants files
- [ ] Constants use `as const` for type safety
- [ ] Re-exported from `src/constants/index.ts`

### Error Handling
- [ ] All `console.error` replaced with `handleMutationError`
- [ ] All `console.warn` replaced with `logWarning`
- [ ] All mutation `onError` callbacks use structured logging
- [ ] Context object includes `operation` field

### React Query
- [ ] Reference data hooks have `gcTime: 30 * 60 * 1000`
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

---

*Add this content to Project Settings → Manage Knowledge in Lovable*
