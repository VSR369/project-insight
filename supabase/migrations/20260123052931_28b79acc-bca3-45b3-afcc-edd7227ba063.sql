-- =====================================================
-- Phase 1: Reviewer Slot Accept/Decline Feature
-- Add provider timezone, booking_reviewers acceptance fields,
-- and provider_notifications table for system messages
-- =====================================================

-- 1.1 Add timezone column to solution_providers
ALTER TABLE public.solution_providers
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);

-- 1.2 Add reviewer acceptance tracking fields to booking_reviewers
ALTER TABLE public.booking_reviewers
  ADD COLUMN IF NOT EXISTS acceptance_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS declined_reason VARCHAR(50),
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- 1.3 Create provider_notifications table for system messages
CREATE TABLE IF NOT EXISTS public.provider_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES provider_industry_enrollments(id) ON DELETE SET NULL,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_system_generated BOOLEAN DEFAULT true,
  is_immutable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 1.4 Enable RLS on provider_notifications
ALTER TABLE public.provider_notifications ENABLE ROW LEVEL SECURITY;

-- 1.5 RLS Policy: Providers view only their own notifications
CREATE POLICY "Providers view own notifications" ON provider_notifications
  FOR SELECT USING (
    provider_id IN (
      SELECT id FROM solution_providers WHERE user_id = auth.uid()
    )
  );

-- 1.6 RLS Policy: Admin full access
CREATE POLICY "Admin full access to notifications" ON provider_notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
  );

-- 1.7 RLS Policy: Reviewers can insert notifications for assigned providers
CREATE POLICY "Reviewers can create notifications for assigned providers" ON provider_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM panel_reviewers pr
      JOIN booking_reviewers br ON br.reviewer_id = pr.id
      JOIN interview_bookings ib ON ib.id = br.booking_id
      WHERE pr.user_id = auth.uid() 
        AND pr.is_active = true
        AND ib.provider_id = provider_notifications.provider_id
    )
  );

-- 1.8 Index for efficient unread notification queries
CREATE INDEX IF NOT EXISTS idx_provider_notifications_provider_unread 
  ON provider_notifications(provider_id, is_read) 
  WHERE is_read = false;

-- 1.9 Index for booking_reviewers acceptance status
CREATE INDEX IF NOT EXISTS idx_booking_reviewers_acceptance 
  ON booking_reviewers(booking_id, acceptance_status);