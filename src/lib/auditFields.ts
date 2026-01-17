/**
 * Utility for populating audit fields (created_by, updated_by)
 * in master data mutations per Project Knowledge standards.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Get the current authenticated user's ID for audit fields.
 * Returns null if no user is authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Add created_by field to insert data
 */
export async function withCreatedBy<T extends object>(
  data: T
): Promise<T & { created_by: string | null }> {
  const userId = await getCurrentUserId();
  return { ...data, created_by: userId };
}

/**
 * Add updated_by field to update data
 */
export async function withUpdatedBy<T extends object>(
  data: T
): Promise<T & { updated_by: string | null }> {
  const userId = await getCurrentUserId();
  return { ...data, updated_by: userId };
}
