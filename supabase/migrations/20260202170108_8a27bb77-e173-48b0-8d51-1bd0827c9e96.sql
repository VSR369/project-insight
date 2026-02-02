-- Migration Part 1: Add new enum value 'not_certified'
-- This must be committed before using the value in updates
ALTER TYPE lifecycle_status ADD VALUE IF NOT EXISTS 'not_certified' AFTER 'certified';