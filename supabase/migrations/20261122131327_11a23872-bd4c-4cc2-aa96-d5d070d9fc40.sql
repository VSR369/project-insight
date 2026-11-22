ALTER FUNCTION public.set_abstract_selection(uuid,text) SET SCHEMA private;
ALTER FUNCTION public.approve_abstract_shortlist(uuid) SET SCHEMA private;
ALTER FUNCTION public.submit_full_solution(uuid,jsonb) SET SCHEMA private;

CREATE FUNCTION public.set_abstract_selection(p_solution_id uuid, p_selection text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT private.set_abstract_selection(p_solution_id, p_selection);
$$;
CREATE FUNCTION public.approve_abstract_shortlist(p_challenge_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT private.approve_abstract_shortlist(p_challenge_id);
$$;
CREATE FUNCTION public.submit_full_solution(p_solution_id uuid, p_files jsonb)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT private.submit_full_solution(p_solution_id, p_files);
$$;

REVOKE ALL ON FUNCTION private.set_abstract_selection(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.approve_abstract_shortlist(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.submit_full_solution(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.set_abstract_selection(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.approve_abstract_shortlist(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.submit_full_solution(uuid,jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.set_abstract_selection(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_abstract_shortlist(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_full_solution(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_abstract_selection(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_abstract_shortlist(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_full_solution(uuid,jsonb) TO authenticated;