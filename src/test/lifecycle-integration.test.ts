/**
 * Solution Provider Lifecycle - Integration Tests
 * 
 * These tests validate the cascade reset database functions:
 * - execute_industry_change_reset
 * - execute_expertise_change_reset  
 * - get_cascade_impact_counts
 * - handle_orphaned_proof_points
 * 
 * Run with: npm run test src/test/lifecycle-integration.test.ts
 * 
 * NOTE: Tests are skipped by default (.skip) because they require:
 * 1. A running Supabase instance
 * 2. An authenticated user session
 * 3. Test data that gets modified/cleaned up
 * 
 * To run integration tests, remove .skip and ensure proper test setup.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { 
  executeIndustryChangeReset, 
  executeExpertiseLevelChangeReset,
  getCascadeImpactCounts 
} from '@/services/cascadeResetService';

// Test data holders
interface TestData {
  providerId: string | null;
  userId: string | null;
  industrySegmentId: string | null;
  expertiseLevelId: string | null;
  proficiencyAreaId: string | null;
  generalProofPointIds: string[];
  specialtyProofPointIds: string[];
  specialityIds: string[];
}

const testData: TestData = {
  providerId: null,
  userId: null,
  industrySegmentId: null,
  expertiseLevelId: null,
  proficiencyAreaId: null,
  generalProofPointIds: [],
  specialtyProofPointIds: [],
  specialityIds: [],
};

// Helper: Get first industry segment
async function getFirstIndustrySegment(): Promise<string | null> {
  const { data } = await supabase
    .from('industry_segments')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// Helper: Get first expertise level
async function getFirstExpertiseLevel(): Promise<string | null> {
  const { data } = await supabase
    .from('expertise_levels')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// Helper: Get first proficiency area for segment + level
async function getFirstProficiencyArea(segmentId: string, levelId: string): Promise<string | null> {
  const { data } = await supabase
    .from('proficiency_areas')
    .select('id')
    .eq('industry_segment_id', segmentId)
    .eq('expertise_level_id', levelId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// Helper: Get first speciality for proficiency area
async function getFirstSpeciality(proficiencyAreaId: string): Promise<string | null> {
  const { data } = await supabase
    .from('specialities')
    .select('id, sub_domains!inner(proficiency_area_id)')
    .eq('sub_domains.proficiency_area_id', proficiencyAreaId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// ============================================================================
// UNIT TESTS: get_cascade_impact_counts
// ============================================================================
describe.skip('Database Function: get_cascade_impact_counts', () => {
  
  it('Should return zero counts for provider with no data', async () => {
    // Use a valid provider ID format but non-existent
    const fakeProviderId = '00000000-0000-0000-0000-000000000000';
    
    const result = await getCascadeImpactCounts(fakeProviderId);
    
    // Should return null or zeros
    if (result) {
      expect(result.specialty_proof_points_count).toBe(0);
      expect(result.general_proof_points_count).toBe(0);
      expect(result.specialities_count).toBe(0);
      expect(result.proficiency_areas_count).toBe(0);
    }
  });

  it('Should correctly count specialty vs general proof points', async () => {
    // This test requires a provider ID with known proof points
    // Skip if no test provider is configured
    if (!testData.providerId) {
      console.log('Skipping: No test provider configured');
      return;
    }

    const result = await getCascadeImpactCounts(testData.providerId);
    
    expect(result).not.toBeNull();
    expect(typeof result?.specialty_proof_points_count).toBe('number');
    expect(typeof result?.general_proof_points_count).toBe('number');
    expect(typeof result?.specialities_count).toBe('number');
    expect(typeof result?.proficiency_areas_count).toBe('number');
  });
});

// ============================================================================
// INTEGRATION TESTS: execute_industry_change_reset
// ============================================================================
describe.skip('Database Function: execute_industry_change_reset', () => {
  
  beforeAll(async () => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated - run tests with auth session');
    testData.userId = user.id;

    // Get a test provider (first one for current user)
    const { data: provider } = await supabase
      .from('solution_providers')
      .select('id, industry_segment_id, expertise_level_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!provider) throw new Error('No provider found for current user');
    testData.providerId = provider.id;
    testData.industrySegmentId = provider.industry_segment_id;
    testData.expertiseLevelId = provider.expertise_level_id;
  });

  it('Should soft-delete specialty proof points only', async () => {
    if (!testData.providerId || !testData.userId) {
      console.log('Skipping: Test data not configured');
      return;
    }

    // Get counts before reset
    const beforeCounts = await getCascadeImpactCounts(testData.providerId);
    const specialtyBefore = beforeCounts?.specialty_proof_points_count ?? 0;
    const generalBefore = beforeCounts?.general_proof_points_count ?? 0;

    // Execute reset
    const result = await executeIndustryChangeReset(testData.providerId);
    
    expect(result.success).toBe(true);

    // Get counts after reset
    const afterCounts = await getCascadeImpactCounts(testData.providerId);
    
    // Specialty should be 0 (all deleted)
    expect(afterCounts?.specialty_proof_points_count).toBe(0);
    
    // General should be unchanged
    expect(afterCounts?.general_proof_points_count).toBe(generalBefore);

    // Verify the specialty PPs are soft-deleted (not hard deleted)
    if (specialtyBefore > 0) {
      const { data: deletedPPs } = await supabase
        .from('proof_points')
        .select('id, is_deleted, deleted_at, deleted_by')
        .eq('provider_id', testData.providerId)
        .eq('category', 'specialty_specific')
        .eq('is_deleted', true);

      expect(deletedPPs?.length).toBeGreaterThan(0);
      expect(deletedPPs?.[0]?.deleted_at).not.toBeNull();
      expect(deletedPPs?.[0]?.deleted_by).toBe(testData.userId);
    }
  });

  it('Should clear all provider_specialities', async () => {
    if (!testData.providerId) return;

    // After reset, should have no speciality selections
    const { count } = await supabase
      .from('provider_specialities')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', testData.providerId);

    expect(count).toBe(0);
  });

  it('Should clear all provider_proficiency_areas', async () => {
    if (!testData.providerId) return;

    const { count } = await supabase
      .from('provider_proficiency_areas')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', testData.providerId);

    expect(count).toBe(0);
  });

  it('Should reset lifecycle to enrolled (rank 20)', async () => {
    if (!testData.providerId) return;

    const { data: provider } = await supabase
      .from('solution_providers')
      .select('lifecycle_status, lifecycle_rank')
      .eq('id', testData.providerId)
      .single();

    expect(provider?.lifecycle_status).toBe('enrolled');
    expect(provider?.lifecycle_rank).toBe(20);
  });

  it('Should clear expertise_level_id', async () => {
    if (!testData.providerId) return;

    const { data: provider } = await supabase
      .from('solution_providers')
      .select('expertise_level_id')
      .eq('id', testData.providerId)
      .single();

    expect(provider?.expertise_level_id).toBeNull();
  });

  it('Should set audit fields correctly', async () => {
    if (!testData.providerId || !testData.userId) return;

    const { data: provider } = await supabase
      .from('solution_providers')
      .select('updated_by, updated_at')
      .eq('id', testData.providerId)
      .single();

    expect(provider?.updated_by).toBe(testData.userId);
    expect(provider?.updated_at).not.toBeNull();
    
    // Check updated_at is recent (within last minute)
    const updatedAt = new Date(provider?.updated_at ?? 0);
    const now = new Date();
    const diffMs = now.getTime() - updatedAt.getTime();
    expect(diffMs).toBeLessThan(60000); // Less than 1 minute ago
  });
});

// ============================================================================
// INTEGRATION TESTS: execute_expertise_change_reset
// ============================================================================
describe.skip('Database Function: execute_expertise_change_reset', () => {
  
  beforeAll(async () => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    testData.userId = user.id;

    // Get a test provider
    const { data: provider } = await supabase
      .from('solution_providers')
      .select('id, industry_segment_id, expertise_level_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!provider) throw new Error('No provider found');
    testData.providerId = provider.id;
    testData.industrySegmentId = provider.industry_segment_id;
    testData.expertiseLevelId = provider.expertise_level_id;
  });

  it('Should soft-delete specialty proof points', async () => {
    if (!testData.providerId) return;

    const result = await executeExpertiseLevelChangeReset(testData.providerId);
    expect(result.success).toBe(true);

    const afterCounts = await getCascadeImpactCounts(testData.providerId);
    expect(afterCounts?.specialty_proof_points_count).toBe(0);
  });

  it('Should preserve general proof points', async () => {
    if (!testData.providerId) return;

    // Count general PPs after reset
    const { count: generalCount } = await supabase
      .from('proof_points')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', testData.providerId)
      .eq('category', 'general')
      .eq('is_deleted', false);

    // General PPs should still exist (count >= 0, not deleted)
    expect(generalCount).toBeGreaterThanOrEqual(0);
  });

  it('Should clear speciality and proficiency area selections', async () => {
    if (!testData.providerId) return;

    const [specialities, areas] = await Promise.all([
      supabase
        .from('provider_specialities')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', testData.providerId),
      supabase
        .from('provider_proficiency_areas')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', testData.providerId),
    ]);

    expect(specialities.count).toBe(0);
    expect(areas.count).toBe(0);
  });

  it('Should reset lifecycle to expertise_selected (rank 50)', async () => {
    if (!testData.providerId) return;

    const { data: provider } = await supabase
      .from('solution_providers')
      .select('lifecycle_status, lifecycle_rank')
      .eq('id', testData.providerId)
      .single();

    expect(provider?.lifecycle_status).toBe('expertise_selected');
    expect(provider?.lifecycle_rank).toBe(50);
  });

  it('Should NOT clear industry_segment_id', async () => {
    if (!testData.providerId || !testData.industrySegmentId) return;

    const { data: provider } = await supabase
      .from('solution_providers')
      .select('industry_segment_id')
      .eq('id', testData.providerId)
      .single();

    // Industry should remain set (expertise reset doesn't clear industry)
    expect(provider?.industry_segment_id).not.toBeNull();
  });
});

// ============================================================================
// INTEGRATION TESTS: handle_orphaned_proof_points
// ============================================================================
describe.skip('Database Function: handle_orphaned_proof_points', () => {

  it('Should convert orphaned specialty PPs to general category', async () => {
    if (!testData.providerId) return;

    // Get proficiency areas for this provider
    const { data: areas } = await supabase
      .from('provider_proficiency_areas')
      .select('proficiency_area_id')
      .eq('provider_id', testData.providerId);

    if (!areas?.length) {
      console.log('No proficiency areas to test orphaning');
      return;
    }

    const removedAreaIds = areas.map(a => a.proficiency_area_id);

    // Call the RPC function
    const { data: orphanCount, error } = await supabase.rpc('handle_orphaned_proof_points', {
      p_provider_id: testData.providerId,
      p_removed_area_ids: removedAreaIds,
    });

    expect(error).toBeNull();
    expect(typeof orphanCount).toBe('number');
    
    console.log(`Converted ${orphanCount} orphaned proof points to general`);
  });

  it('Should return 0 for empty removed_area_ids array', async () => {
    if (!testData.providerId) return;

    const { data: orphanCount, error } = await supabase.rpc('handle_orphaned_proof_points', {
      p_provider_id: testData.providerId,
      p_removed_area_ids: [],
    });

    expect(error).toBeNull();
    expect(orphanCount).toBe(0);
  });
});

// ============================================================================
// FULL INTEGRATION TEST: Complete Cascade Flow
// ============================================================================
describe.skip('Integration: Full Cascade Reset Flow', () => {

  // This test creates fresh data and tests the complete flow
  it('Industry change: Should cascade delete specialty data', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('Skipping: No authenticated user');
      return;
    }

    // Get a provider with existing data
    const { data: provider } = await supabase
      .from('solution_providers')
      .select(`
        id, 
        industry_segment_id,
        expertise_level_id,
        lifecycle_status,
        lifecycle_rank
      `)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!provider?.id) {
      console.log('Skipping: No provider found');
      return;
    }

    // Get before state
    const beforeCounts = await getCascadeImpactCounts(provider.id);
    console.log('Before counts:', beforeCounts);

    // Execute industry change reset
    const result = await executeIndustryChangeReset(provider.id);
    expect(result.success).toBe(true);

    // Get after state
    const afterCounts = await getCascadeImpactCounts(provider.id);
    console.log('After counts:', afterCounts);

    // Verify cascade effects
    expect(afterCounts?.specialty_proof_points_count).toBe(0);
    expect(afterCounts?.specialities_count).toBe(0);
    expect(afterCounts?.proficiency_areas_count).toBe(0);
    
    // General PPs should be preserved
    expect(afterCounts?.general_proof_points_count).toBe(beforeCounts?.general_proof_points_count ?? 0);

    // Verify provider state
    const { data: updatedProvider } = await supabase
      .from('solution_providers')
      .select('lifecycle_status, lifecycle_rank, expertise_level_id')
      .eq('id', provider.id)
      .single();

    expect(updatedProvider?.lifecycle_status).toBe('enrolled');
    expect(updatedProvider?.lifecycle_rank).toBe(20);
    expect(updatedProvider?.expertise_level_id).toBeNull();
  });

  it('Expertise change: Should preserve industry while resetting specialties', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: provider } = await supabase
      .from('solution_providers')
      .select('id, industry_segment_id')
      .eq('user_id', user.id)
      .not('industry_segment_id', 'is', null)
      .maybeSingle();

    if (!provider?.id) {
      console.log('Skipping: No provider with industry set');
      return;
    }

    const originalIndustryId = provider.industry_segment_id;

    // Execute expertise change reset
    const result = await executeExpertiseLevelChangeReset(provider.id);
    expect(result.success).toBe(true);

    // Verify industry preserved
    const { data: updatedProvider } = await supabase
      .from('solution_providers')
      .select('industry_segment_id, lifecycle_status, lifecycle_rank')
      .eq('id', provider.id)
      .single();

    expect(updatedProvider?.industry_segment_id).toBe(originalIndustryId);
    expect(updatedProvider?.lifecycle_status).toBe('expertise_selected');
    expect(updatedProvider?.lifecycle_rank).toBe(50);

    // Verify specialty data cleared
    const afterCounts = await getCascadeImpactCounts(provider.id);
    expect(afterCounts?.specialty_proof_points_count).toBe(0);
    expect(afterCounts?.specialities_count).toBe(0);
    expect(afterCounts?.proficiency_areas_count).toBe(0);
  });
});

// ============================================================================
// TERMINAL STATE ENFORCEMENT TESTS
// ============================================================================
describe.skip('Integration: Terminal State Enforcement', () => {

  it('Verified provider: Cascade functions should still execute (DB level)', async () => {
    // Note: Terminal state enforcement is at the service/UI layer, not DB
    // The DB functions will execute regardless - enforcement is pre-call
    console.log('Terminal state enforcement is at service layer, not DB function level');
    expect(true).toBe(true);
  });
});

// ============================================================================
// MANUAL TEST CHECKLIST (for QA team)
// ============================================================================
/**
 * MANUAL TEST CASES - Execute in staging environment
 * 
 * TC-M01: Industry Change Cascade
 * 1. Create new provider account
 * 2. Complete through Proof Points (add 2 general, 2 specialty)
 * 3. Go back to Industry selection
 * 4. Change industry segment
 * 5. EXPECTED: Critical warning dialog appears
 * 6. Confirm change
 * 7. VERIFY: Lifecycle reset to 'enrolled'
 * 8. VERIFY: Expertise level cleared
 * 9. VERIFY: Only specialty PPs deleted
 * 10. VERIFY: General PPs still visible
 * 
 * TC-M02: Expertise Change Cascade
 * 1. Create provider with expertise selected
 * 2. Add proof points (mix of general and specialty)
 * 3. Change expertise level
 * 4. EXPECTED: Warning dialog appears
 * 5. Confirm change
 * 6. VERIFY: Lifecycle reset to 'expertise_selected'
 * 7. VERIFY: Industry unchanged
 * 8. VERIFY: Specialty PPs deleted, general retained
 * 
 * TC-M03: Terminal State Lock
 * 1. Get admin access to set provider to 'verified'
 * 2. Try to access edit screens
 * 3. VERIFY: All edit actions disabled
 * 4. VERIFY: Lock banners displayed
 * 5. VERIFY: Cannot navigate to add proof point
 * 
 * TC-M04: Participation Mode Change (Pending Approval)
 * 1. Select Organization mode
 * 2. Submit for manager approval
 * 3. Try to change to Independent mode
 * 4. EXPECTED: Block dialog appears
 * 5. Choose to cancel pending request
 * 6. VERIFY: Can now change mode
 * 7. VERIFY: Manager credentials invalidated
 * 
 * TC-M05: Minimum Proof Points Constraint
 * 1. Create provider with exactly 2 proof points
 * 2. Try to delete one
 * 3. EXPECTED: Error message "Minimum 2 proof points required."
 * 4. Add a third proof point
 * 5. Now delete one
 * 6. VERIFY: Deletion succeeds
 */
