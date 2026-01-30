/**
 * Reel Creator Component
 * Upload or record short video content with captions, tags, and visibility
 * Per Phase 2 specification - Now with real AI enhancement
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles, Loader2, Film, ImageIcon, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { VideoUploader } from './VideoUploader';
import { TagInput } from './TagInput';
import { VisibilitySelector } from './VisibilitySelector';
import { useCreatePulseContent, useAddContentTags } from '@/hooks/queries/usePulseContent';
import { useUploadPulseMedia } from '@/hooks/mutations/usePulseUpload';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useAuth } from '@/hooks/useAuth';
import { useQuickEnhance } from '@/hooks/mutations/useAiEnhance';
import { reelSchema, type ReelFormData } from '@/lib/validations/media';
import { toast } from 'sonner';

interface ReelCreatorProps {
  onCancel: () => void;
}

export function ReelCreator({ onCancel }: ReelCreatorProps) {
  // =====================================================
  // HOOKS (all at top, before any conditional returns)
  // =====================================================
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'connections'>('public');
  const [originalCaption, setOriginalCaption] = useState<string | null>(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: provider } = useCurrentProvider();
  const createContent = useCreatePulseContent();
  const addContentTags = useAddContentTags();
  const uploadMedia = useUploadPulseMedia();
  const { enhance, isEnhancing } = useQuickEnhance('reel');

  const form = useForm<ReelFormData>({
    resolver: zodResolver(reelSchema),
    defaultValues: {
      caption: '',
      visibility: 'public',
      tags: [],
    },
  });

  const captionValue = form.watch('caption');
  const captionCount = captionValue?.length || 0;
  const isValid = !!videoFile;

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleVideoChange = useCallback((file: File | null) => {
    setVideoFile(file);
  }, []);

  const handleCoverExtracted = useCallback((blob: Blob) => {
    setCoverBlob(blob);
  }, []);

  const handleAiEnhance = async () => {
    const currentCaption = form.getValues('caption') || '';
    
    // If no caption, provide a starter
    const textToEnhance = currentCaption.trim() || 
      'Check out my latest video!';
    
    // Save original for revert
    if (originalCaption === null) {
      setOriginalCaption(currentCaption);
    }

    const result = await enhance(textToEnhance, { type: 'engaging' });
    if (result) {
      form.setValue('caption', result.enhanced_text);
    }
  };

  const handleRevertCaption = () => {
    if (originalCaption !== null) {
      form.setValue('caption', originalCaption);
      setOriginalCaption(null);
      toast.info("Reverted to original caption");
    }
  };

  const handleSubmit = async (data: ReelFormData) => {
    if (!provider?.id || !user?.id) {
      toast.error('Please complete your profile first');
      return;
    }

    if (!videoFile) {
      toast.error('Please upload or record a video');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload video file - use user.id (auth.uid) for RLS compliance
      const videoUpload = await uploadMedia.mutateAsync({
        file: videoFile,
        contentType: 'reel',
        userId: user.id,
      });

      // 2. Upload cover image if extracted - use user.id (auth.uid) for RLS compliance
      let coverImageUrl: string | null = null;
      if (coverBlob) {
        const coverFile = new File([coverBlob], 'cover.jpg', { type: 'image/jpeg' });
        const coverUpload = await uploadMedia.mutateAsync({
          file: coverFile,
          contentType: 'gallery', // Use gallery limits for images
          userId: user.id,
        });
        coverImageUrl = coverUpload.publicUrl;
      }

      // 3. Create content record
      const content = await createContent.mutateAsync({
        provider_id: provider.id,
        content_type: 'reel',
        caption: data.caption || null,
        media_urls: [videoUpload.publicUrl],
        cover_image_url: coverImageUrl,
        ai_enhanced: originalCaption !== null,
        content_status: 'published',
      });

      // 4. Add tags if any
      if (selectedTags.length > 0) {
        await addContentTags.mutateAsync({
          contentId: content.id,
          tagIds: selectedTags,
        });
      }

      toast.success('Reel published successfully!');
      navigate('/pulse/feed');
    } catch (error) {
      // Error already handled by mutation hooks
    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Pro Tip Banner */}
      <Card className="border-pink-500/30 bg-gradient-to-r from-pink-500/5 to-purple-500/5">
        <CardContent className="p-4">
          <p className="text-sm text-pink-700 dark:text-pink-300">
            <Film className="inline h-4 w-4 mr-1" />
            <strong>Pro Tip:</strong> Keep it under 60 seconds for maximum engagement. 
            Vertical videos (9:16) perform 2x better!
          </p>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Video Upload Section */}
          <VideoUploader
            videoFile={videoFile}
            onVideoChange={handleVideoChange}
            onCoverExtracted={handleCoverExtracted}
            disabled={isSubmitting}
          />

          {/* Cover Image Indicator */}
          {coverBlob && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4 text-green-500" />
              Cover image extracted from video
            </div>
          )}

          {/* AI Enhance Button */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <Label className="text-sm font-medium">
                AI Enhance Caption
              </Label>
            </div>
            <div className="flex items-center gap-2">
              {originalCaption !== null && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRevertCaption}
                  className="h-7 text-xs gap-1"
                >
                  <Undo2 className="h-3 w-3" />
                  Revert
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAiEnhance}
                disabled={isSubmitting || isEnhancing}
                className="h-7 text-xs gap-1"
              >
                {isEnhancing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Enhance
              </Button>
            </div>
          </div>

          {/* Caption */}
          <FormField
            control={form.control}
            name="caption"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Caption (optional)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Textarea
                      {...field}
                      placeholder="Write a caption for your reel..."
                      className="min-h-[100px] resize-none pr-16"
                      maxLength={200}
                      disabled={isSubmitting}
                    />
                    <span className={`absolute bottom-3 right-3 text-xs ${
                      captionCount > 180 
                        ? captionCount > 200 
                          ? 'text-destructive' 
                          : 'text-amber-500' 
                        : 'text-muted-foreground'
                    }`}>
                      {captionCount}/200
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tags */}
          <TagInput
            selectedTags={selectedTags}
            onChange={setSelectedTags}
            maxTags={10}
            disabled={isSubmitting}
          />

          {/* Visibility */}
          <VisibilitySelector
            value={visibility}
            onChange={setVisibility}
            disabled={isSubmitting}
          />

          {/* Status Footer */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
            <Film className="h-4 w-4" />
            {videoFile ? (
              <span className="text-foreground">{videoFile.name} selected</span>
            ) : (
              <span>No video selected</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Reel'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
