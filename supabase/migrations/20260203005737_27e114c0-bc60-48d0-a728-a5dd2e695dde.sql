-- =====================================================
-- Post-Interview Failure: Phase 1A - Add Enum Value
-- This must be committed before it can be used
-- =====================================================

-- Add new enum value 'interview_unsuccessful' to lifecycle_status
ALTER TYPE lifecycle_status ADD VALUE IF NOT EXISTS 'interview_unsuccessful';