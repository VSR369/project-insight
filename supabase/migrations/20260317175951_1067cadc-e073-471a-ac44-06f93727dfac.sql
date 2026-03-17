
-- ═══════════════════════════════════════════════════════════
-- Fix T13-07: Add DELETE policy for legal-docs storage bucket
-- Fix T16-08: Add trigger to lock operating_model after publish
-- ═══════════════════════════════════════════════════════════

-- 1. Storage DELETE policy (needed for Remove & Revert functionality)
CREATE POLICY "Authenticated users can delete legal docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'legal-docs');

-- 2. Storage UPDATE policy (needed for file replacement)
CREATE POLICY "Authenticated users can update legal docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'legal-docs');

-- 3. Trigger: prevent operating_model changes after master_status = 'ACTIVE'
CREATE OR REPLACE FUNCTION public.trg_challenges_lock_operating_model()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If operating_model is being changed and the challenge was already ACTIVE
  IF OLD.operating_model IS DISTINCT FROM NEW.operating_model
     AND OLD.master_status = 'ACTIVE' THEN
    RAISE EXCEPTION 'Cannot change operating_model after challenge is published (master_status=ACTIVE)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_challenges_update_lock_op_model
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_challenges_lock_operating_model();
