CREATE TABLE IF NOT EXISTS public.submission_purge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL CHECK (source_table IN ('solutions','challenge_submissions')),
  record_id uuid NOT NULL,
  challenge_id uuid,
  file_paths text[] NOT NULL DEFAULT '{}',
  files_removed_at timestamptz,
  purged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_table, record_id)
);
GRANT SELECT ON public.submission_purge_log TO authenticated;
GRANT ALL ON public.submission_purge_log TO service_role;
ALTER TABLE public.submission_purge_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins read purge log" ON public.submission_purge_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'platform_admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_submission_purge_log_pending ON public.submission_purge_log(files_removed_at) WHERE files_removed_at IS NULL;

CREATE OR REPLACE FUNCTION private.fn_storage_paths(p_value text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT COALESCE(array_agg(DISTINCT m[1]), '{}')
  FROM regexp_matches(COALESCE(p_value,''), 'solution-files/([^"?\s,\]]+)', 'g') AS m;
$$;

CREATE OR REPLACE FUNCTION private.purge_nonselected_submissions(p_now timestamptz DEFAULT now())
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; v_sol int := 0; v_sub int := 0;
BEGIN
  FOR r IN SELECT s.id, s.challenge_id, s.full_solution_url FROM public.solutions s
    WHERE s.purge_at IS NOT NULL AND s.purge_at <= p_now
      AND upper(COALESCE(s.selection_status,'')) IN ('REJECTED','NOT_SELECTED','NOT_SHORTLISTED','DISQUALIFIED')
      AND NOT EXISTS (SELECT 1 FROM public.submission_purge_log l WHERE l.source_table='solutions' AND l.record_id=s.id)
      AND NOT EXISTS (SELECT 1 FROM public.dispute_records d WHERE (d.solution_id=s.id OR d.challenge_id=s.challenge_id)
                      AND upper(COALESCE(d.status,'')) NOT IN ('RESOLVED','CLOSED','DISMISSED','WITHDRAWN'))
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.submission_purge_log(source_table,record_id,challenge_id,file_paths)
      VALUES ('solutions',r.id,r.challenge_id,private.fn_storage_paths(r.full_solution_url));
    UPDATE public.solutions SET abstract_text=NULL, methodology=NULL, experience=NULL, timeline=NULL,
      full_solution_url=NULL WHERE id=r.id;
    v_sol := v_sol + 1;
  END LOOP;

  FOR r IN SELECT c.id, c.challenge_id, c.submission_files FROM public.challenge_submissions c
    WHERE c.purge_at IS NOT NULL AND c.purge_at <= p_now
      AND upper(COALESCE(c.status,'')) IN ('REJECTED','NOT_SELECTED','NOT_SHORTLISTED','DISQUALIFIED')
      AND NOT EXISTS (SELECT 1 FROM public.submission_purge_log l WHERE l.source_table='challenge_submissions' AND l.record_id=c.id)
      AND NOT EXISTS (SELECT 1 FROM public.dispute_records d WHERE d.challenge_id=c.challenge_id
                      AND upper(COALESCE(d.status,'')) NOT IN ('RESOLVED','CLOSED','DISMISSED','WITHDRAWN'))
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.submission_purge_log(source_table,record_id,challenge_id,file_paths)
      VALUES ('challenge_submissions',r.id,r.challenge_id,private.fn_storage_paths(r.submission_files::text));
    UPDATE public.challenge_submissions SET submission_text=NULL, submission_files=NULL, updated_at=now() WHERE id=r.id;
    v_sub := v_sub + 1;
  END LOOP;

  RETURN jsonb_build_object('solutions',v_sol,'submissions',v_sub);
END; $$;

CREATE OR REPLACE FUNCTION public.purge_nonselected_submissions()
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$
  SELECT private.purge_nonselected_submissions(now());
$$;
REVOKE ALL ON FUNCTION private.purge_nonselected_submissions(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_nonselected_submissions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.fn_storage_paths(text) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.purge_nonselected_submissions(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION private.fn_storage_paths(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_nonselected_submissions() TO service_role;