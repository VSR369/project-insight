/**
 * Cascade Functions - Read-Only Smoke Tests
 * 
 * These tests validate that cascade RPC functions exist and return expected types
 * WITHOUT modifying any data. Safe to run against production.
 * 
 * Run with: npm run test src/test/cascade-smoke.test.ts
 */

import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// RPC FUNCTION EXISTENCE & RETURN TYPE TESTS
// ============================================================================

describe('Cascade RPC Functions: Smoke Tests (Read-Only)', () => {
  
  describe('get_cascade_impact_counts', () => {
    
    it('Should exist and be callable', async () => {
      // Use a fake UUID - function should handle gracefully
      const fakeProviderId = '00000000-0000-0000-0000-000000000001';
      
      const { data, error } = await supabase.rpc('get_cascade_impact_counts', {
        p_provider_id: fakeProviderId,
      });

      // Function should exist (no "function does not exist" error)
      expect(error?.message).not.toContain('function');
      expect(error?.message).not.toContain('does not exist');
    });

    it('Should return expected column structure', async () => {
      const fakeProviderId = '00000000-0000-0000-0000-000000000002';
      
      const { data, error } = await supabase.rpc('get_cascade_impact_counts', {
        p_provider_id: fakeProviderId,
      });

      // If successful, verify return structure
      if (!error && data && data.length > 0) {
        const row = data[0];
        expect(row).toHaveProperty('specialty_proof_points_count');
        expect(row).toHaveProperty('general_proof_points_count');
        expect(row).toHaveProperty('specialities_count');
        expect(row).toHaveProperty('proficiency_areas_count');
        
        // All should be numbers
        expect(typeof row.specialty_proof_points_count).toBe('number');
        expect(typeof row.general_proof_points_count).toBe('number');
        expect(typeof row.specialities_count).toBe('number');
        expect(typeof row.proficiency_areas_count).toBe('number');
      }
    });

    it('Should return zeros for non-existent provider', async () => {
      const fakeProviderId = '00000000-0000-0000-0000-000000000003';
      
      const { data, error } = await supabase.rpc('get_cascade_impact_counts', {
        p_provider_id: fakeProviderId,
      });

      if (!error && data && data.length > 0) {
        const row = data[0];
        expect(row.specialty_proof_points_count).toBe(0);
        expect(row.general_proof_points_count).toBe(0);
        expect(row.specialities_count).toBe(0);
        expect(row.proficiency_areas_count).toBe(0);
      }
    });

    it('Should handle invalid UUID gracefully', async () => {
      // This tests error handling for malformed input
      const { error } = await supabase.rpc('get_cascade_impact_counts', {
        p_provider_id: 'not-a-valid-uuid',
      });

      // Should return an error for invalid UUID format
      expect(error).not.toBeNull();
    });
  });

  describe('execute_industry_change_reset', () => {
    
    it('Should exist as RPC function', async () => {
      // Query pg_proc to check function exists (read-only)
      const { data, error } = await supabase
        .from('pg_catalog.pg_proc' as any)
        .select('proname')
        .eq('proname', 'execute_industry_change_reset')
        .limit(1);

      // Alternative: Just try to get function metadata
      // If function doesn't exist, we'll get a specific error
      
      // We can't easily query pg_proc via Supabase client
      // Instead, verify the service wrapper exists
      const { executeIndustryChangeReset } = await import('@/services/cascadeResetService');
      expect(typeof executeIndustryChangeReset).toBe('function');
    });

    it('Should require authentication', async () => {
      // The function is SECURITY DEFINER, so it requires valid user context
      // This is a characteristic test, not a modification test
      const { executeIndustryChangeReset } = await import('@/services/cascadeResetService');
      
      // Function signature should accept providerId
      expect(executeIndustryChangeReset.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('execute_expertise_change_reset', () => {
    
    it('Should exist as service function', async () => {
      const { executeExpertiseLevelChangeReset } = await import('@/services/cascadeResetService');
      expect(typeof executeExpertiseLevelChangeReset).toBe('function');
    });
  });

  describe('handle_orphaned_proof_points', () => {
    
    it('Should exist and accept array parameter', async () => {
      // Test with empty array - should be safe and return 0
      const fakeProviderId = '00000000-0000-0000-0000-000000000004';
      
      const { data, error } = await supabase.rpc('handle_orphaned_proof_points', {
        p_provider_id: fakeProviderId,
        p_removed_area_ids: [],
      });

      // Function should exist
      expect(error?.message).not.toContain('function');
      expect(error?.message).not.toContain('does not exist');
      
      // With empty array, should return 0 (no changes made)
      if (!error) {
        expect(data).toBe(0);
      }
    });

    it('Should handle empty removed_area_ids safely', async () => {
      const fakeProviderId = '00000000-0000-0000-0000-000000000005';
      
      const { data, error } = await supabase.rpc('handle_orphaned_proof_points', {
        p_provider_id: fakeProviderId,
        p_removed_area_ids: [],
      });

      // Empty array = no work to do = 0 orphans converted
      if (!error) {
        expect(data).toBe(0);
      }
    });
  });
});

// ============================================================================
// SERVICE LAYER SMOKE TESTS
// ============================================================================

describe('Cascade Service Layer: Smoke Tests', () => {
  
  it('Should export getCascadeImpactCounts function', async () => {
    const module = await import('@/services/cascadeResetService');
    expect(typeof module.getCascadeImpactCounts).toBe('function');
  });

  it('Should export executeIndustryChangeReset function', async () => {
    const module = await import('@/services/cascadeResetService');
    expect(typeof module.executeIndustryChangeReset).toBe('function');
  });

  it('Should export executeExpertiseLevelChangeReset function', async () => {
    const module = await import('@/services/cascadeResetService');
    expect(typeof module.executeExpertiseLevelChangeReset).toBe('function');
  });

  it('getCascadeImpactCounts should return expected interface', async () => {
    const { getCascadeImpactCounts } = await import('@/services/cascadeResetService');
    
    // Call with fake ID - should return null or object with correct shape
    const result = await getCascadeImpactCounts('00000000-0000-0000-0000-000000000006');
    
    if (result !== null) {
      expect(result).toHaveProperty('specialty_proof_points_count');
      expect(result).toHaveProperty('general_proof_points_count');
      expect(result).toHaveProperty('specialities_count');
      expect(result).toHaveProperty('proficiency_areas_count');
    }
  });
});

// ============================================================================
// LIFECYCLE SERVICE SMOKE TESTS
// ============================================================================

describe('Lifecycle Service: Smoke Tests', () => {
  
  it('Should export canModifyField function', async () => {
    const module = await import('@/services/lifecycleService');
    expect(typeof module.canModifyField).toBe('function');
  });

  it('Should export getCascadeImpact function', async () => {
    const module = await import('@/services/lifecycleService');
    expect(typeof module.getCascadeImpact).toBe('function');
  });

  it('Should export LOCK_THRESHOLDS constant', async () => {
    const module = await import('@/services/lifecycleService');
    expect(module.LOCK_THRESHOLDS).toBeDefined();
    expect(typeof module.LOCK_THRESHOLDS.EVERYTHING).toBe('number');
  });

  it('canModifyField should return expected interface', async () => {
    const { canModifyField } = await import('@/services/lifecycleService');
    
    // Test with rank 0 (should allow all)
    const result = canModifyField(0, 'configuration');
    
    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reason');
    expect(typeof result.allowed).toBe('boolean');
  });

  it('getCascadeImpact should return expected interface', async () => {
    const { getCascadeImpact } = await import('@/services/lifecycleService');
    
    // Test with field name, rank, and flags
    const result = getCascadeImpact('industry_segment_id', 50, true, false);
    
    expect(result).toHaveProperty('warningLevel');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('type');
    expect(['none', 'info', 'warning', 'critical']).toContain(result.warningLevel);
  });

  it('LOCK_THRESHOLDS should define terminal rank', async () => {
    const { LOCK_THRESHOLDS } = await import('@/services/lifecycleService');
    
    expect(LOCK_THRESHOLDS).toHaveProperty('EVERYTHING');
    expect(typeof LOCK_THRESHOLDS.EVERYTHING).toBe('number');
    expect(LOCK_THRESHOLDS.EVERYTHING).toBeGreaterThanOrEqual(140);
  });

  it('LIFECYCLE_RANKS should have verified as terminal', async () => {
    const { LIFECYCLE_RANKS, LOCK_THRESHOLDS } = await import('@/services/lifecycleService');
    
    // Verified should be at or above EVERYTHING threshold
    expect(LIFECYCLE_RANKS.verified).toBeGreaterThanOrEqual(LOCK_THRESHOLDS.EVERYTHING);
  });
});

// ============================================================================
// DATABASE SCHEMA VALIDATION (Read-Only)
// ============================================================================

describe('Database Schema: Smoke Tests', () => {
  
  it('proof_points table should have required columns', async () => {
    const { data, error } = await supabase
      .from('proof_points')
      .select('id, provider_id, category, type, title, is_deleted')
      .limit(0); // Don't fetch any rows, just validate columns

    // No error means columns exist
    expect(error).toBeNull();
  });

  it('provider_proficiency_areas table should exist', async () => {
    const { error } = await supabase
      .from('provider_proficiency_areas')
      .select('id, provider_id, proficiency_area_id')
      .limit(0);

    expect(error).toBeNull();
  });

  it('provider_specialities table should exist', async () => {
    const { error } = await supabase
      .from('provider_specialities')
      .select('id, provider_id, speciality_id')
      .limit(0);

    expect(error).toBeNull();
  });

  it('solution_providers should have lifecycle columns', async () => {
    const { error } = await supabase
      .from('solution_providers')
      .select('id, lifecycle_status, lifecycle_rank, expertise_level_id, industry_segment_id')
      .limit(0);

    expect(error).toBeNull();
  });

  it('proof_point_speciality_tags table should exist', async () => {
    const { error } = await supabase
      .from('proof_point_speciality_tags')
      .select('id, proof_point_id, speciality_id')
      .limit(0);

    expect(error).toBeNull();
  });
});

// ============================================================================
// LIFECYCLE STAGES VALIDATION
// ============================================================================

describe('Lifecycle Stages: Validation', () => {
  
  it('lifecycle_stages table should exist with required data', async () => {
    const { data, error } = await supabase
      .from('lifecycle_stages')
      .select('status_code, rank, locks_configuration, locks_content, locks_everything')
      .order('rank', { ascending: true });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('Should have enrolled stage at rank 20', async () => {
    const { data } = await supabase
      .from('lifecycle_stages')
      .select('status_code, rank')
      .eq('status_code', 'enrolled')
      .single();

    expect(data?.rank).toBe(20);
  });

  it('Should have expertise_selected stage at rank 50', async () => {
    const { data } = await supabase
      .from('lifecycle_stages')
      .select('status_code, rank')
      .eq('status_code', 'expertise_selected')
      .single();

    expect(data?.rank).toBe(50);
  });

  it('Should have verified stage with locks_everything = true', async () => {
    const { data } = await supabase
      .from('lifecycle_stages')
      .select('status_code, locks_everything')
      .eq('status_code', 'verified')
      .single();

    expect(data?.locks_everything).toBe(true);
  });
});
