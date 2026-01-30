

# 5-Why Root Cause Analysis: Pulse Content Upload Failures

## 📋 Issue Summary
All content types (reels, podcasts, knowledge sparks, articles, galleries, quick posts) fail to upload with error:
```
"new row violates row-level security policy"
```

---

## 🔍 5-Why Analysis

### Why #1: Why does the upload fail?
**Answer:** The Supabase Storage RLS policy rejects the upload request with "Unauthorized" error.

### Why #2: Why does RLS reject the request?
**Answer:** The RLS policy condition `(storage.foldername(name))[1] = (auth.uid())::text` evaluates to `false`.

### Why #3: Why does the condition evaluate to false?
**Answer:** The code is uploading to path:
- **Actual path:** `ce00180c-1ff5-4e48-8d79-d4eb7ada8070/post/...` (provider_id)
- **Expected by RLS:** `32aec070-360a-4d73-a6dd-28961c629ca6/...` (auth.uid/user_id)

The first folder segment is the **provider_id**, but RLS expects **user_id (auth.uid())**.

### Why #4: Why is provider_id being used instead of user_id?
**Answer:** The `generateStoragePath()` function receives `providerId` from components:
```typescript
const path = generateStoragePath(providerId, contentType, file.name);
// Generates: {providerId}/{contentType}/{timestamp}_{filename}
```

All creator components pass `provider.id`:
```typescript
providerId: provider.id  // This is solution_providers.id, NOT auth.uid()
```

### Why #5: Why wasn't this mismatch caught during design?
**Answer:** There's a conceptual mismatch between two valid approaches:
- **RLS Policy Design:** Based on `auth.uid()` (user's auth ID) for security
- **Path Generation Code:** Based on `provider.id` (business entity ID) for organization

The Memory note stated "folder-based storage model where authenticated users can only upload to and manage files within their own `/{user_id}/` subfolders" but the implementation used `provider_id`.

---

## ✅ Root Cause (Single Sentence)
**The upload path uses `provider_id` as the first folder segment, but the RLS policy expects `auth.uid()` (user_id), causing a permanent mismatch for all authenticated uploads.**

---

## 🔧 Solution Options

### Option A: Fix the Code (Recommended)
Change `generateStoragePath()` to use `user_id` instead of `provider_id`:

**File:** `src/lib/validations/media.ts`
```typescript
// Before (broken):
export function generateStoragePath(
  providerId: string, 
  contentType: string, 
  filename: string
): string {
  return `${providerId}/${contentType}/${timestamp}_${sanitized}`;
}

// After (fixed):
export function generateStoragePath(
  userId: string,  // Renamed parameter 
  contentType: string, 
  filename: string
): string {
  return `${userId}/${contentType}/${timestamp}_${sanitized}`;
}
```

**Update all callers** to pass `user.id` (from auth) instead of `provider.id`:
- `PostCreator.tsx`
- `ReelCreator.tsx`
- `PodcastStudio.tsx`
- `ArticleEditor.tsx`
- `GalleryCreator.tsx`
- `SparkBuilder.tsx` (if it has media)

This requires getting the authenticated user's ID via `supabase.auth.getUser()` or a context hook.

### Option B: Fix the RLS Policy (Alternative)
Modify the storage RLS policy to use provider_id mapping:

```sql
-- Change from:
(storage.foldername(name))[1] = (auth.uid())::text

-- Change to (lookup provider_id from solution_providers):
(storage.foldername(name))[1] IN (
  SELECT id::text FROM solution_providers WHERE user_id = auth.uid()
)
```

**Pros:** Less code changes
**Cons:** More complex RLS query, potential performance impact

---

## 📝 Implementation Plan (Option A - Code Fix)

### Step 1: Update Path Generation Signature
Update `generateStoragePath` to clearly expect `userId`:

```typescript
// src/lib/validations/media.ts
export function generateStoragePath(
  userId: string,  // auth.uid() - the user's auth ID
  contentType: string, 
  filename: string
): string {
  const timestamp = Date.now();
  const sanitized = filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_+/g, '_');
  
  return `${userId}/${contentType}/${timestamp}_${sanitized}`;
}
```

### Step 2: Update Upload Hook
Modify `usePulseUpload.ts` to accept `userId` instead of `providerId`:

```typescript
export interface UploadParams {
  file: File;
  contentType: MediaContentType;
  userId: string;  // Changed from providerId
}
```

### Step 3: Update All Creator Components
Each creator component needs to pass the authenticated user's ID:

```typescript
// PostCreator.tsx, ReelCreator.tsx, etc.
import { useAuth } from '@/hooks/useAuth';

// Inside component:
const { user } = useAuth();  // Get authenticated user

// When uploading:
const uploadResult = await uploadMedia.mutateAsync({
  file: selectedImage,
  contentType: 'post',
  userId: user?.id || '',  // Use auth user ID, not provider.id
});
```

### Step 4: Affected Files
1. `src/lib/validations/media.ts` - Update function signature
2. `src/hooks/mutations/usePulseUpload.ts` - Update interface
3. `src/components/pulse/creators/PostCreator.tsx` - Pass user.id
4. `src/components/pulse/creators/ReelCreator.tsx` - Pass user.id
5. `src/components/pulse/creators/PodcastStudio.tsx` - Pass user.id
6. `src/components/pulse/creators/GalleryCreator.tsx` - Pass user.id
7. `src/components/pulse/creators/ArticleEditor.tsx` - If media uploads
8. `src/components/pulse/creators/SparkBuilder.tsx` - If media uploads

---

## 🛡️ Prevention Measures

1. **Align terminology:** Use consistent naming (`userId` for auth IDs, `providerId` for business entity IDs)
2. **Add JSDoc comments:** Document what ID type each function expects
3. **Integration tests:** Add tests that verify storage uploads work end-to-end
4. **RLS testing:** Test storage policies with actual authenticated requests before deployment

---

## 📊 Technical Details

| Component | Current (Broken) | Fixed |
|-----------|-----------------|-------|
| Upload Path | `{provider_id}/post/...` | `{user_id}/post/...` |
| RLS Check | `folder[1] = auth.uid()` | `folder[1] = auth.uid()` ✓ |
| Example Path | `ce00180c.../post/file.png` | `32aec070.../post/file.png` |

