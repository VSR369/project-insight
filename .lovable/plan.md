

# Fix: Availability Save Fails — "data constraint prevented this action"

## Root Cause

The console log reveals the actual error:
```
null value in column "url" of relation "http_request_queue" violates not-null constraint
```

This originates from the **`fn_trigger_bulk_reassign`** trigger on `platform_admin_profiles`. When the user changes their status to `On_Leave`, this trigger fires and calls `net.http_post()` to invoke the `bulk-reassign` edge function. It reads the Supabase URL from `vault.decrypted_secrets`:

```sql
url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
```

**Both vault secrets (`supabase_url` and `service_role_key`) are missing**, so the URL is `null`, which violates pg_net's NOT NULL constraint on the `url` column.

The error message contains the word "constraint", which the `errorHandler.ts` maps to the generic "A data constraint prevented this action" toast — hiding the real cause from the user.

## Fix (2 parts)

### 1. Database Migration — Make the trigger resilient to missing vault secrets

Update `fn_trigger_bulk_reassign` to check if secrets exist before calling `net.http_post()`. If secrets are missing, skip the HTTP call silently (the bulk reassign can be handled manually or retried). This prevents a missing operational dependency from blocking core availability changes.

```sql
CREATE OR REPLACE FUNCTION public.fn_trigger_bulk_reassign()
RETURNS trigger ...
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  IF (OLD.availability_status IS DISTINCT FROM NEW.availability_status)
     AND NEW.availability_status IN ('On_Leave', 'Inactive')
     AND OLD.availability_status NOT IN ('On_Leave', 'Inactive')
  THEN
    IF EXISTS (SELECT 1 FROM platform_admin_verifications
               WHERE assigned_admin_id = NEW.id AND status = 'Under_Verification')
    THEN
      -- Safely read secrets; skip if missing
      SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'supabase_url';
      SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

      IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
        PERFORM net.http_post(...);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

### 2. Improve error message in `errorHandler.ts`

Add a more specific match for `http_request_queue` errors before the generic "constraint" catch-all, so if this ever happens again the user sees a meaningful message instead of a misleading "data constraint" toast.

## What this does NOT change
- No UI changes
- No RLS policy changes
- No business logic changes
- The `bulk-reassign` edge function itself is unaffected

## Risk: Low
The trigger currently hard-fails the entire UPDATE transaction when vault secrets are missing. Making the HTTP call conditional is strictly safer — the core availability change succeeds, and reassignment can be handled separately.

