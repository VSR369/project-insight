-- =====================================================
-- Fix Feed Author Display & Add Follow Functionality
-- Phase 1: RLS policy for social profile visibility
-- Phase 4: Trigger for follower count sync
-- =====================================================

-- Phase 1: Allow authenticated users to view provider profiles for social features
-- This enables the feed to show real names instead of "Anonymous"
CREATE POLICY "Authenticated users view provider profiles for social"
ON public.solution_providers
FOR SELECT
TO authenticated
USING (true);

-- Phase 4: Create trigger function to sync follower/following counts
CREATE OR REPLACE FUNCTION public.pulse_sync_follower_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for followed user
    UPDATE pulse_provider_stats
    SET follower_count = COALESCE(follower_count, 0) + 1,
        updated_at = NOW()
    WHERE provider_id = NEW.following_id;
    
    -- Increment following count for follower
    UPDATE pulse_provider_stats
    SET following_count = COALESCE(following_count, 0) + 1,
        updated_at = NOW()
    WHERE provider_id = NEW.follower_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for unfollowed user
    UPDATE pulse_provider_stats
    SET follower_count = GREATEST(0, COALESCE(follower_count, 0) - 1),
        updated_at = NOW()
    WHERE provider_id = OLD.following_id;
    
    -- Decrement following count for unfollower
    UPDATE pulse_provider_stats
    SET following_count = GREATEST(0, COALESCE(following_count, 0) - 1),
        updated_at = NOW()
    WHERE provider_id = OLD.follower_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on pulse_connections table
DROP TRIGGER IF EXISTS trg_pulse_sync_follower_counts ON public.pulse_connections;
CREATE TRIGGER trg_pulse_sync_follower_counts
AFTER INSERT OR DELETE ON public.pulse_connections
FOR EACH ROW EXECUTE FUNCTION public.pulse_sync_follower_counts();