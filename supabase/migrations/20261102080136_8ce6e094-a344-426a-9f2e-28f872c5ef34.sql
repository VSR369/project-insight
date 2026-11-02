-- ─── 1. New columns ─────────────────────────────────────────────
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS disclose_org_name boolean NOT NULL DEFAULT false;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS confidential_brief_keys text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.challenge_attachments ADD COLUMN IF NOT EXISTS is_confidential boolean NOT NULL DEFAULT false;

-- Backfill: preserve current behaviour (is_anonymous=false meant identity shown)
UPDATE public.challenges SET disclose_org_name = NOT COALESCE((extended_brief->>'is_anonymous')::boolean, false);

-- Keep disclose_org_name in sync with the creator's Anonymous toggle (extended_brief.is_anonymous)
CREATE OR REPLACE FUNCTION public.fn_sync_disclose_org_name() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.disclose_org_name := NOT COALESCE((NEW.extended_brief->>'is_anonymous')::boolean, false);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_challenges_disclose_org_name ON public.challenges;
CREATE TRIGGER trg_challenges_disclose_org_name BEFORE INSERT OR UPDATE OF extended_brief
  ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.fn_sync_disclose_org_name();

-- ─── 2. Confidential brief sections table ───────────────────────
CREATE TABLE IF NOT EXISTS public.challenge_confidential_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (challenge_id, section_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_confidential_sections TO authenticated;
GRANT ALL ON public.challenge_confidential_sections TO service_role;
ALTER TABLE public.challenge_confidential_sections ENABLE ROW LEVEL SECURITY;

-- ─── 3. Helper functions ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_has_accepted_cpa(p_challenge_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.legal_acceptance_ledger l
    WHERE l.challenge_id = p_challenge_id AND l.user_id = p_user_id AND l.document_type ILIKE 'CPA%'
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_is_challenge_winner(p_challenge_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.challenge_award_lines l
    JOIN public.challenge_award_decisions d ON d.id = l.decision_id AND d.decision_status = 'CONFIRMED'
    JOIN public.challenge_submissions s ON s.id = l.submission_id
    WHERE l.challenge_id = p_challenge_id
      AND (s.user_id = p_user_id
           OR s.provider_id IN (SELECT sp.id FROM public.solution_providers sp WHERE sp.user_id = p_user_id))
  );
$$;

-- Privileged = seeker tenant member, platform admin, or active challenge role
CREATE OR REPLACE FUNCTION public.fn_is_challenge_privileged(p_challenge_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = p_challenge_id
      AND (c.tenant_id = public.get_user_tenant_id()
           OR public.has_role(p_user_id, 'platform_admin'::app_role)
           OR public.has_active_challenge_role(c.id, p_user_id))
  );
$$;

-- ─── 4. RLS on confidential sections ────────────────────────────
CREATE POLICY ccs_privileged_all ON public.challenge_confidential_sections FOR ALL TO authenticated
  USING (public.fn_is_challenge_privileged(challenge_id, auth.uid()))
  WITH CHECK (public.fn_is_challenge_privileged(challenge_id, auth.uid()));

CREATE POLICY ccs_provider_select ON public.challenge_confidential_sections FOR SELECT TO authenticated
  USING (
    public.fn_has_accepted_cpa(challenge_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.is_deleted = false AND c.published_at IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.user_id = auth.uid())
        AND public.fn_provider_can_view_challenge(c.id, c.visibility, c.industry_segment_id, c.min_expertise_level)
    )
  );

-- ─── 5. Extraction trigger: move confidential keys out of extended_brief ──
CREATE OR REPLACE FUNCTION public.fn_extract_confidential_brief() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_key text; v_brief jsonb := NEW.extended_brief; v_changed boolean := false;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
  IF NEW.confidential_brief_keys IS NULL OR array_length(NEW.confidential_brief_keys, 1) IS NULL THEN RETURN NULL; END IF;
  IF v_brief IS NULL THEN RETURN NULL; END IF;
  FOREACH v_key IN ARRAY NEW.confidential_brief_keys LOOP
    IF v_brief ? v_key THEN
      INSERT INTO public.challenge_confidential_sections (challenge_id, section_key, content, created_by, updated_by)
      VALUES (NEW.id, v_key, jsonb_build_object('value', v_brief->v_key), COALESCE(NEW.updated_by, NEW.created_by), COALESCE(NEW.updated_by, NEW.created_by))
      ON CONFLICT (challenge_id, section_key)
      DO UPDATE SET content = EXCLUDED.content, updated_at = now(), updated_by = EXCLUDED.updated_by;
      v_brief := v_brief - v_key;
      v_changed := true;
    END IF;
  END LOOP;
  IF v_changed THEN
    UPDATE public.challenges SET extended_brief = v_brief WHERE id = NEW.id;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_challenges_extract_confidential ON public.challenges;
CREATE TRIGGER trg_challenges_extract_confidential AFTER INSERT OR UPDATE OF extended_brief, confidential_brief_keys
  ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.fn_extract_confidential_brief();

-- ─── 6. Replace wide-open attachment policy ─────────────────────
DROP POLICY "Users can manage challenge attachments" ON public.challenge_attachments;

CREATE POLICY attachments_privileged_all ON public.challenge_attachments FOR ALL TO authenticated
  USING (public.fn_is_challenge_privileged(challenge_id, auth.uid()))
  WITH CHECK (public.fn_is_challenge_privileged(challenge_id, auth.uid()));

CREATE POLICY attachments_provider_select ON public.challenge_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.is_deleted = false AND c.published_at IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.user_id = auth.uid())
        AND public.fn_provider_can_view_challenge(c.id, c.visibility, c.industry_segment_id, c.min_expertise_level)
    )
    AND (NOT is_confidential OR public.fn_has_accepted_cpa(challenge_id, auth.uid()))
  );

-- ─── 7. Provider-safe challenge view RPC ────────────────────────
CREATE OR REPLACE FUNCTION public.get_provider_challenge_view(p_challenge_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  c RECORD;
  v_privileged boolean;
  v_cpa boolean;
  v_winner boolean;
  v_org_name text;
  v_org_display text;
  v_conf_fields jsonb;
  v_attachments jsonb;
  v_has_conf boolean;
BEGIN
  SELECT ch.id, ch.tenant_id, ch.organization_id, ch.disclose_org_name, ch.visibility,
         ch.industry_segment_id, ch.min_expertise_level, ch.is_deleted, ch.published_at, ch.status
  INTO c FROM public.challenges ch WHERE ch.id = p_challenge_id;
  IF c.id IS NULL THEN RETURN jsonb_build_object('allowed', false, 'reason', 'not_found'); END IF;

  v_privileged := public.fn_is_challenge_privileged(p_challenge_id, v_uid);

  IF NOT v_privileged THEN
    IF c.is_deleted OR c.published_at IS NULL THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'not_found');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.user_id = v_uid) THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'no_provider_record');
    END IF;
    IF NOT public.fn_provider_can_view_challenge(c.id, c.visibility, c.industry_segment_id, c.min_expertise_level) THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'not_eligible');
    END IF;
  END IF;

  v_cpa := public.fn_has_accepted_cpa(p_challenge_id, v_uid);
  v_winner := public.fn_is_challenge_winner(p_challenge_id, v_uid);

  SELECT COALESCE(so.trade_brand_name, so.organization_name) INTO v_org_name
  FROM public.seeker_organizations so WHERE so.id = c.organization_id;

  IF v_privileged OR c.disclose_org_name OR v_winner THEN
    v_org_display := v_org_name;
  ELSE
    v_org_display := 'Seeking organisation: Confidential';
  END IF;

  IF v_privileged OR v_cpa THEN
    SELECT COALESCE(jsonb_object_agg(s.section_key, s.content), '{}'::jsonb) INTO v_conf_fields
    FROM public.challenge_confidential_sections s WHERE s.challenge_id = p_challenge_id;
  ELSE
    v_conf_fields := NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', a.id, 'section_key', a.section_key, 'file_name', a.file_name,
      'display_name', a.display_name, 'description', a.description,
      'mime_type', a.mime_type, 'file_size', a.file_size,
      'source_type', a.source_type, 'source_url', a.source_url, 'url_title', a.url_title,
      'shared_with_solver', a.shared_with_solver, 'is_confidential', a.is_confidential,
      'storage_path', CASE WHEN v_privileged OR NOT a.is_confidential OR v_cpa THEN a.storage_path ELSE NULL END
    ) ORDER BY a.display_order), '[]'::jsonb)
  INTO v_attachments
  FROM public.challenge_attachments a
  WHERE a.challenge_id = p_challenge_id
    AND (v_privileged OR NOT a.is_confidential OR v_cpa);

  -- BR-CHL-P09 / 9.3: record every provider view of Confidential content
  SELECT EXISTS (
    SELECT 1 FROM public.challenge_attachments a
    WHERE a.challenge_id = p_challenge_id AND a.is_confidential
  ) OR EXISTS (
    SELECT 1 FROM public.challenge_confidential_sections s WHERE s.challenge_id = p_challenge_id
  ) INTO v_has_conf;

  IF NOT v_privileged AND v_cpa AND v_has_conf THEN
    INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
    VALUES (p_challenge_id, v_uid, 'CONFIDENTIAL_CONTENT_VIEW', 'SYSTEM',
            jsonb_build_object('source', 'get_provider_challenge_view'), v_uid);
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'privileged', v_privileged,
    'cpa_accepted', v_cpa,
    'is_winner', v_winner,
    'identity_revealed', (v_privileged OR c.disclose_org_name OR v_winner),
    'org_display', v_org_display,
    'industry_name', (SELECT i.name FROM public.industry_segments i WHERE i.id = c.industry_segment_id),
    'confidential_fields', v_conf_fields,
    'attachments', v_attachments
  );
END $$;

-- ─── 8. Confidential content download/view audit RPC ────────────
CREATE OR REPLACE FUNCTION public.log_confidential_content_access(p_challenge_id uuid, p_attachment_id uuid DEFAULT NULL, p_action text DEFAULT 'VIEW')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_att RECORD;
  v_privileged boolean;
  v_allowed boolean := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF upper(p_action) NOT IN ('VIEW', 'DOWNLOAD') THEN RAISE EXCEPTION 'Invalid action'; END IF;

  v_privileged := public.fn_is_challenge_privileged(p_challenge_id, v_uid);

  IF p_attachment_id IS NOT NULL THEN
    SELECT a.id, a.challenge_id, a.file_name, a.is_confidential INTO v_att
    FROM public.challenge_attachments a WHERE a.id = p_attachment_id AND a.challenge_id = p_challenge_id;
    IF v_att.id IS NULL THEN RAISE EXCEPTION 'Attachment not found'; END IF;
    v_allowed := v_privileged OR (NOT v_att.is_confidential) OR public.fn_has_accepted_cpa(p_challenge_id, v_uid);
  ELSE
    v_allowed := v_privileged OR public.fn_has_accepted_cpa(p_challenge_id, v_uid);
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'You must accept the challenge agreement before accessing confidential content.';
  END IF;

  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
  VALUES (p_challenge_id, v_uid, 'CONFIDENTIAL_CONTENT_' || upper(p_action), 'HUMAN',
          jsonb_build_object('attachment_id', p_attachment_id, 'file_name', v_att.file_name), v_uid);

  RETURN jsonb_build_object('success', true);
END $$;

-- ─── 9. Grants ──────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.fn_sync_disclose_org_name() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_extract_confidential_brief() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_has_accepted_cpa(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_is_challenge_winner(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_is_challenge_privileged(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_provider_challenge_view(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_confidential_content_access(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_has_accepted_cpa(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_is_challenge_winner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_is_challenge_privileged(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_provider_challenge_view(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_confidential_content_access(uuid, uuid, text) TO authenticated, service_role;