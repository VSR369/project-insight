/**
 * Sanitize a filename for use in Supabase Storage keys.
 * Replaces characters that are invalid in storage paths (e.g. [ ] ( ) spaces)
 * with underscores, preserving alphanumerics, dots, hyphens, and underscores.
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
