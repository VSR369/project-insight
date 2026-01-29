/**
 * Industry Pulse Media Upload Hook
 * Handles file uploads to Supabase Storage with validation
 * Per Project Knowledge standards
 */

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError } from "@/lib/errorHandler";
import { 
  validateFile, 
  validateFiles, 
  generateStoragePath, 
  formatBytes,
  type MediaContentType 
} from "@/lib/validations/media";

// =====================================================
// TYPES
// =====================================================

export interface UploadParams {
  file: File;
  contentType: MediaContentType;
  providerId: string;
}

export interface UploadResult {
  path: string;
  publicUrl: string;
  fileName: string;
  fileSize: number;
}

export interface MultiUploadParams {
  files: File[];
  contentType: MediaContentType;
  providerId: string;
  maxCount?: number;
}

export interface UploadProgress {
  current: number;
  total: number;
  fileName: string;
}

// =====================================================
// SINGLE FILE UPLOAD HOOK
// =====================================================

export function useUploadPulseMedia() {
  return useMutation({
    mutationFn: async ({ file, contentType, providerId }: UploadParams): Promise<UploadResult> => {
      // 1. Client-side validation
      const validation = validateFile(file, contentType);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // 2. Generate storage path
      const path = generateStoragePath(providerId, contentType, file.name);

      // 3. Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('pulse-media')
        .upload(path, file, { 
          upsert: false,
          cacheControl: '3600',
        });

      if (error) {
        // Check for specific error types
        if (error.message.includes('duplicate')) {
          throw new Error('File already exists. Please rename and try again.');
        }
        if (error.message.includes('size')) {
          throw new Error(`File too large. Maximum: ${formatBytes(file.size)}`);
        }
        throw new Error(`Upload failed: ${error.message}`);
      }

      // 4. Get public URL
      const { data: urlData } = supabase.storage
        .from('pulse-media')
        .getPublicUrl(data.path);

      return { 
        path: data.path, 
        publicUrl: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
      };
    },
    onError: (error: Error) => {
      handleMutationError(error, { 
        operation: 'upload_pulse_media',
        component: 'usePulseUpload',
      });
    },
  });
}

// =====================================================
// MULTI-FILE UPLOAD HOOK (for galleries)
// =====================================================

export function useUploadMultiplePulseMedia() {
  return useMutation({
    mutationFn: async ({ 
      files, 
      contentType, 
      providerId,
      maxCount = 10,
    }: MultiUploadParams): Promise<UploadResult[]> => {
      // 1. Validate all files first
      const validation = validateFiles(files, contentType, maxCount);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // 2. Upload files sequentially (to avoid overwhelming the server)
      const results: UploadResult[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = generateStoragePath(providerId, contentType, file.name);

        const { data, error } = await supabase.storage
          .from('pulse-media')
          .upload(path, file, { 
            upsert: false,
            cacheControl: '3600',
          });

        if (error) {
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('pulse-media')
          .getPublicUrl(data.path);

        results.push({
          path: data.path,
          publicUrl: urlData.publicUrl,
          fileName: file.name,
          fileSize: file.size,
        });
      }

      return results;
    },
    onError: (error: Error) => {
      handleMutationError(error, { 
        operation: 'upload_multiple_pulse_media',
        component: 'usePulseUpload',
      });
    },
  });
}

// =====================================================
// DELETE FILE HOOK
// =====================================================

export function useDeletePulseMedia() {
  return useMutation({
    mutationFn: async (path: string): Promise<void> => {
      const { error } = await supabase.storage
        .from('pulse-media')
        .remove([path]);

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
      }
    },
    onError: (error: Error) => {
      handleMutationError(error, { 
        operation: 'delete_pulse_media',
        component: 'usePulseUpload',
      });
    },
  });
}

// =====================================================
// UTILITY: Extract video thumbnail
// =====================================================

export async function extractVideoThumbnail(videoFile: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      // Seek to 1 second or 10% of video
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src);
          resolve(blob);
        }, 'image/jpeg', 0.8);
      } else {
        resolve(null);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    };

    video.src = URL.createObjectURL(videoFile);
    video.load();
  });
}
