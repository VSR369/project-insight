-- =====================================================
-- Enterprise Question Bank Import - Bulk Operations RPCs
-- Phase 1-4: Optimized for 11K+ questions
-- =====================================================

-- =====================================================
-- PHASE 1: Fix getExistingQuestionCount URL Limit
-- Returns count of active questions for given speciality IDs
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_question_count_by_specialities(
  p_speciality_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has platform_admin role
  IF NOT has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: platform_admin role required';
  END IF;

  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM question_bank
    WHERE speciality_id = ANY(p_speciality_ids)
    AND is_active = true
  );
END;
$$;

-- =====================================================
-- PHASE 2: Auto-Provision Capability Tags from Excel
-- Upserts tags and returns all matched tags with creation status
-- =====================================================
CREATE OR REPLACE FUNCTION public.bulk_upsert_capability_tags(
  p_tag_names TEXT[]
)
RETURNS TABLE(name TEXT, id UUID, was_created BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_cutoff TIMESTAMPTZ;
BEGIN
  -- Verify caller has platform_admin role
  IF NOT has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: platform_admin role required';
  END IF;

  v_user_id := auth.uid();
  v_cutoff := NOW() - INTERVAL '10 seconds';

  -- Insert missing tags (case-insensitive match)
  INSERT INTO capability_tags (name, is_active, display_order, created_by)
  SELECT DISTINCT 
    TRIM(tag_name), 
    true, 
    0, 
    v_user_id
  FROM unnest(p_tag_names) AS tag_name
  WHERE NOT EXISTS (
    SELECT 1 FROM capability_tags ct 
    WHERE LOWER(ct.name) = LOWER(TRIM(tag_name))
  )
  ON CONFLICT DO NOTHING;

  -- Return all matched tags with creation status
  RETURN QUERY
  SELECT 
    ct.name::TEXT,
    ct.id,
    ct.created_at > v_cutoff AS was_created
  FROM capability_tags ct
  WHERE LOWER(ct.name) IN (
    SELECT LOWER(TRIM(x)) FROM unnest(p_tag_names) x
  );
END;
$$;

-- =====================================================
-- PHASE 3: Bulk Insert Questions
-- Accepts JSONB array of questions, returns inserted IDs with row index
-- =====================================================
CREATE OR REPLACE FUNCTION public.bulk_insert_questions(
  p_questions JSONB
)
RETURNS TABLE(inserted_id UUID, row_index INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verify caller has platform_admin role
  IF NOT has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: platform_admin role required';
  END IF;

  v_user_id := auth.uid();

  RETURN QUERY
  INSERT INTO question_bank (
    question_text, 
    options, 
    correct_option, 
    difficulty, 
    question_type, 
    usage_mode, 
    expected_answer_guidance, 
    speciality_id, 
    is_active, 
    created_by
  )
  SELECT 
    (q->>'question_text')::text,
    (q->'options')::jsonb,
    (q->>'correct_option')::integer,
    (q->>'difficulty')::text,
    (q->>'question_type')::text,
    (q->>'usage_mode')::text,
    (q->>'expected_answer_guidance')::text,
    (q->>'speciality_id')::uuid,
    true,
    v_user_id
  FROM jsonb_array_elements(p_questions) WITH ORDINALITY AS arr(q, idx)
  RETURNING id AS inserted_id, arr.idx::integer AS row_index;
END;
$$;

-- =====================================================
-- PHASE 4: Bulk Insert Question Capability Tags
-- Links questions to capability tags in single batch
-- =====================================================
CREATE OR REPLACE FUNCTION public.bulk_insert_question_capability_tags(
  p_mappings JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verify caller has platform_admin role
  IF NOT has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: platform_admin role required';
  END IF;

  INSERT INTO question_capability_tags (question_id, capability_tag_id)
  SELECT 
    (m->>'question_id')::uuid,
    (m->>'capability_tag_id')::uuid
  FROM jsonb_array_elements(p_mappings) AS m
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;