-- Update test user provider to proof_points_min_met status for integration testing
UPDATE solution_providers 
SET 
  lifecycle_status = 'proof_points_min_met', 
  lifecycle_rank = 70,
  updated_at = now()
WHERE user_id = '32aec070-360a-4d73-a6dd-28961c629ca6';

-- Verify the update
SELECT id, user_id, first_name, last_name, lifecycle_status, lifecycle_rank 
FROM solution_providers 
WHERE user_id = '32aec070-360a-4d73-a6dd-28961c629ca6';