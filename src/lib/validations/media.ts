/**
 * Media Validation Utilities for Industry Pulse
 * Client-side file validation before upload to Supabase Storage
 * Per Project Knowledge standards
 */

import { z } from 'zod';

// =====================================================
// MEDIA LIMITS (per pulse.constants.ts + plan specs)
// =====================================================

export const MEDIA_LIMITS = {
  reel: { 
    maxSize: 100 * 1024 * 1024, // 100MB
    types: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
    extensions: ['.mp4', '.mov', '.avi', '.webm'],
    label: '100MB'
  },
  podcast: { 
    maxSize: 500 * 1024 * 1024, // 500MB
    types: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg'],
    extensions: ['.mp3', '.wav', '.webm', '.ogg'],
    label: '500MB'
  },
  gallery: { 
    maxSize: 50 * 1024 * 1024, // 50MB per image
    types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    label: '50MB'
  },
  post: { 
    maxSize: 10 * 1024 * 1024, // 10MB
    types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    label: '10MB'
  },
  document: {
    maxSize: 10 * 1024 * 1024, // 10MB
    types: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    extensions: ['.pdf', '.doc', '.docx'],
    label: '10MB'
  },
} as const;

export type MediaContentType = keyof typeof MEDIA_LIMITS;

// =====================================================
// FORMAT HELPERS
// =====================================================

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return ext;
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a single file against content type limits
 */
export function validateFile(file: File, contentType: MediaContentType): FileValidationResult {
  const limits = MEDIA_LIMITS[contentType];
  
  if (!limits) {
    return { valid: false, error: 'Unknown content type' };
  }

  // Check file size
  if (file.size > limits.maxSize) {
    return { 
      valid: false, 
      error: `File exceeds ${limits.label} limit (${formatBytes(file.size)})` 
    };
  }

  // Check MIME type - normalize to base type (strip codec parameters)
  // MediaRecorder produces types like "video/webm;codecs=vp9,opus"
  // We need to match against base types like "video/webm"
  const baseMimeType = file.type.split(';')[0].trim().toLowerCase();
  
  if (!(limits.types as readonly string[]).includes(baseMimeType)) {
    const allowedExts = limits.extensions.join(', ');
    return { 
      valid: false, 
      error: `Unsupported format. Allowed: ${allowedExts}` 
    };
  }

  return { valid: true };
}

/**
 * Validate multiple files (for gallery)
 */
export function validateFiles(files: File[], contentType: MediaContentType, maxCount?: number): FileValidationResult {
  if (maxCount && files.length > maxCount) {
    return { valid: false, error: `Maximum ${maxCount} files allowed` };
  }

  for (let i = 0; i < files.length; i++) {
    const result = validateFile(files[i], contentType);
    if (!result.valid) {
      return { valid: false, error: `File ${i + 1}: ${result.error}` };
    }
  }

  return { valid: true };
}

// =====================================================
// STORAGE PATH GENERATION
// =====================================================

/**
 * Generate Supabase Storage path for pulse media
 * Format: {userId}/{contentType}/{timestamp}_{sanitizedFilename}
 * 
 * IMPORTANT: userId must be auth.uid() (the authenticated user's ID),
 * NOT provider.id (the solution_providers business entity ID).
 * This is required to match the RLS policy on the pulse-media bucket.
 */
export function generateStoragePath(
  userId: string, 
  contentType: string, 
  filename: string
): string {
  const timestamp = Date.now();
  // Sanitize filename: remove special chars, keep extension
  const sanitized = filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_+/g, '_');
  
  return `${userId}/${contentType}/${timestamp}_${sanitized}`;
}

// =====================================================
// ZOD SCHEMAS FOR EACH CONTENT TYPE
// =====================================================

// Spark validation schema
export const sparkSchema = z.object({
  industry_segment_id: z.string().uuid("Select an industry category"),
  headline: z.string()
    .min(1, "Headline is required")
    .max(50, "Headline must be 50 characters or less"),
  key_insight: z.string()
    .min(1, "Key insight is required")
    .max(200, "Key insight must be 200 characters or less"),
  main_statistic: z.string().max(20).optional(),
  trend_indicator: z.string().max(30).optional(),
  source: z.string().max(100).optional(),
  ai_assist: z.boolean().default(false),
});

export type SparkFormData = z.infer<typeof sparkSchema>;

// Post validation schema
export const postSchema = z.object({
  content: z.string()
    .min(1, "Content is required")
    .max(3000, "Content must be 3000 characters or less"),
  image: z.instanceof(File).optional().nullable(),
});

export type PostFormData = z.infer<typeof postSchema>;

// Article validation schema
export const articleSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  body_text: z.string()
    .min(100, "Article must be at least 100 characters")
    .max(50000, "Article must be 50,000 characters or less"),
});

export type ArticleFormData = z.infer<typeof articleSchema>;

// Reel validation schema (file validated separately)
export const reelSchema = z.object({
  caption: z.string()
    .max(200, "Caption must be 200 characters or less")
    .optional(),
  visibility: z.enum(['public', 'connections']).default('public'),
  tags: z.array(z.string().uuid()).max(10, "Maximum 10 tags allowed").optional(),
});

export type ReelFormData = z.infer<typeof reelSchema>;

// Podcast validation schema (file validated separately)
export const podcastSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  description: z.string()
    .max(300, "Description must be 300 characters or less")
    .optional(),
});

export type PodcastFormData = z.infer<typeof podcastSchema>;

// Gallery validation schema (files validated separately)
export const gallerySchema = z.object({
  caption: z.string()
    .max(500, "Caption must be 500 characters or less")
    .optional(),
});

export type GalleryFormData = z.infer<typeof gallerySchema>;
