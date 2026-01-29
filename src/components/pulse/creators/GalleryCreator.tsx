/**
 * Gallery Creator Component
 * Upload multiple images to create a carousel gallery
 * Per Phase 4 specification
 */

import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Sparkles, 
  Loader2, 
  Images,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { gallerySchema, type GalleryFormData, MEDIA_LIMITS, formatBytes } from "@/lib/validations/media";
import { useUploadMultiplePulseMedia } from "@/hooks/mutations/usePulseUpload";
import { useCreatePulseContent } from "@/hooks/queries/usePulseContent";
import { useAuth } from "@/hooks/useAuth";
import { ImageGrid } from "./ImageGrid";

interface GalleryCreatorProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ImageItem {
  id: string;
  file: File;
  preview: string;
}

const MAX_IMAGES = 10;

export function GalleryCreator({ onSuccess, onCancel }: GalleryCreatorProps) {
  // ═══════════════════════════════════════════
  // SECTION 1: useState hooks
  // ═══════════════════════════════════════════
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ═══════════════════════════════════════════
  // SECTION 2: Refs
  // ═══════════════════════════════════════════
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ═══════════════════════════════════════════
  // SECTION 3: Context and custom hooks
  // ═══════════════════════════════════════════
  const { user } = useAuth();
  const uploadMutation = useUploadMultiplePulseMedia();
  const createContent = useCreatePulseContent();

  // ═══════════════════════════════════════════
  // SECTION 4: Form hooks
  // ═══════════════════════════════════════════
  const form = useForm<GalleryFormData>({
    resolver: zodResolver(gallerySchema),
    defaultValues: {
      caption: "",
    },
  });

  const { watch, setValue, formState: { errors } } = form;
  const caption = watch("caption") || "";

  // ═══════════════════════════════════════════
  // SECTION 5: Computed values
  // ═══════════════════════════════════════════
  const isSubmitting = uploadMutation.isPending || createContent.isPending;
  const canPublish = images.length > 0 && !isSubmitting;

  // ═══════════════════════════════════════════
  // SECTION 6: Event handlers
  // ═══════════════════════════════════════════
  const validateAndAddFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const limits = MEDIA_LIMITS.gallery;
    const remainingSlots = MAX_IMAGES - images.length;

    if (fileArray.length > remainingSlots) {
      toast.error(`Can only add ${remainingSlots} more image(s)`);
      return;
    }

    const validFiles: ImageItem[] = [];
    const allowedTypes = limits.types as readonly string[];

    for (const file of fileArray) {
      if (file.size > limits.maxSize) {
        toast.error(`${file.name} exceeds ${limits.label} limit`);
        continue;
      }
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported format`);
        continue;
      }

      validFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }

    if (validFiles.length > 0) {
      setImages(prev => [...prev, ...validFiles]);
    }
  }, [images.length]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      validateAndAddFiles(files);
    }
    // Reset input to allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndAddFiles(files);
    }
  }, [validateAndAddFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRemoveImage = useCallback((id: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  }, []);

  const handleReorderImages = useCallback((fromIndex: number, toIndex: number) => {
    setImages(prev => {
      const newImages = [...prev];
      const [movedItem] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedItem);
      return newImages;
    });
  }, []);

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const handleAIEnhance = async () => {
    if (images.length === 0) {
      toast.error("Add images first to generate caption");
      return;
    }

    setIsEnhancing(true);
    try {
      // Simulate AI enhancement (would call edge function)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const suggestions = [
        `A visual journey through ${images.length} moments that capture the essence of innovation and creativity.`,
        `Sharing ${images.length} snapshots from my latest project. Each image tells a story of progress and learning.`,
        `Here's a glimpse into the work that drives me. ${images.length} perspectives, one vision.`,
      ];
      
      const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
      setValue("caption", randomSuggestion);
      toast.success("Caption generated!");
    } catch (error) {
      toast.error("Failed to generate caption");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async (data: GalleryFormData) => {
    if (!user || images.length === 0) {
      toast.error("Please add at least one image");
      return;
    }

    try {
      // Upload all images
      const files = images.map(img => img.file);
      const uploadResults = await uploadMutation.mutateAsync({
        files,
        contentType: "gallery",
        providerId: user.id,
        maxCount: MAX_IMAGES,
      });

      // Create content record
      await createContent.mutateAsync({
        content_type: "gallery",
        caption: data.caption || null,
        media_urls: uploadResults.map(r => r.publicUrl),
        cover_image_url: uploadResults[0]?.publicUrl || null,
        content_status: "published",
        provider_id: user.id,
      });

      // Clean up preview URLs
      images.forEach(img => URL.revokeObjectURL(img.preview));

      toast.success("Gallery published successfully!");
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to publish gallery");
    }
  };

  // ═══════════════════════════════════════════
  // SECTION 7: Render
  // ═══════════════════════════════════════════
  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Create Gallery</h2>
        </div>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      {/* Caption */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="caption">Caption</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAIEnhance}
            disabled={isEnhancing || images.length === 0}
            className="gap-1 h-7 text-xs"
          >
            {isEnhancing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            AI Enhance Caption
          </Button>
        </div>
        <Textarea
          id="caption"
          placeholder="Add a caption for your gallery..."
          rows={3}
          {...form.register("caption")}
          className={cn(errors.caption && "border-destructive")}
        />
        <div className="flex justify-between">
          {errors.caption ? (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.caption.message}
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">
            {caption.length}/500
          </span>
        </div>
      </div>

      {/* Image Upload Zone */}
      <div
        className={cn(
          "transition-colors rounded-xl",
          isDragging && "ring-2 ring-primary ring-offset-2"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <ImageGrid
          images={images}
          onRemove={handleRemoveImage}
          onReorder={handleReorderImages}
          onAddClick={handleAddClick}
          maxImages={MAX_IMAGES}
        />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={MEDIA_LIMITS.gallery.extensions.join(",")}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File size info */}
      <p className="text-xs text-muted-foreground text-center">
        Supported formats: {MEDIA_LIMITS.gallery.extensions.join(", ")} • Max {MEDIA_LIMITS.gallery.label} per image
      </p>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={!canPublish}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {uploadMutation.isPending ? "Uploading..." : "Publishing..."}
          </>
        ) : (
          `Publish Gallery${images.length > 0 ? ` (${images.length} image${images.length > 1 ? 's' : ''})` : ''}`
        )}
      </Button>
    </form>
  );
}
