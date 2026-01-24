-- PostgREST schema cache reload
-- Fixes 404 on /rest/v1/rpc/bulk_insert_questions when function exists but schema cache is stale
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END;
$$;