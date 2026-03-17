

## Fix T01-09: Rename `sla_timers.id` to `timer_id`

**Problem**: The `sla_timers` table uses `id` as its primary key, but the test checklist expects `timer_id`.

**Impact check**: No code in the project references `sla_timers.id` directly — all queries use other columns (`challenge_id`, `phase`, `status`, `deadline_at`). The Supabase types file will auto-regenerate after the migration.

**Fix**: One migration:

```sql
ALTER TABLE public.sla_timers RENAME COLUMN id TO timer_id;
```

That's it. Single statement, no code changes needed.

