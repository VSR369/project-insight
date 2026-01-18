-- =====================================================
-- Clean Up Duplicate User Roles
-- Each test user should have ONE role only
-- =====================================================

-- 1. ADMIN: Keep only platform_admin role
DELETE FROM user_roles 
WHERE user_id = 'db44fec9-0c5e-4bf8-b0bd-155b24e60f60'
  AND role IN ('solution_provider', 'panel_reviewer');

-- 2. PROVIDER: Keep only solution_provider role  
DELETE FROM user_roles 
WHERE user_id = '32aec070-360a-4d73-a6dd-28961c629ca6'
  AND role = 'panel_reviewer';

-- 3. REVIEWER: Keep only panel_reviewer role
DELETE FROM user_roles 
WHERE user_id = '8314328b-840f-4943-8681-7e34d8a2b25e'
  AND role = 'solution_provider';

-- 4. Delete reviewer@test.local's orphaned provider record
DELETE FROM solution_providers 
WHERE user_id = '8314328b-840f-4943-8681-7e34d8a2b25e';

-- 5. MEDIA@CO.IN: Keep only solution_provider
DELETE FROM user_roles 
WHERE user_id = 'b6a920db-aaa9-4639-af29-330e4d9602c9'
  AND role = 'panel_reviewer';

-- 6. VSR@BTBT.CO.IN: Keep only platform_admin role
DELETE FROM user_roles 
WHERE user_id = '58fa3afe-e64a-4bc2-9c33-2ce267fe6f13'
  AND role = 'solution_provider';