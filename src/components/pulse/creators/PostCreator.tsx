/**
 * Quick Post Creator Component
 * Simple text post with optional image or document attachment
 * Per Phase D specification
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image, FileText, X, Loader2, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormMessage 
} from '@/components/ui/form';
import { useCreatePulseContent } from '@/hooks/queries/usePulseContent';
import { useUploadPulseMedia } from '@/hooks/mutations/usePulseUpload';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useAuth } from '@/hooks/useAuth';
import { postSchema, type PostFormData, validateFile, formatBytes } from '@/lib/validations/media';
import { EmojiPicker } from './EmojiPicker';
import { toast } from 'sonner';

interface PostCreatorProps {
  onCancel: () => void;
}

export function PostCreator({ onCancel }: PostCreatorProps) {
  // =====================================================
  // HOOKS (all at top, before any conditional returns)
  // =====================================================
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: provider } = useCurrentProvider();
  const createContent = useCreatePulseContent();
  const uploadMedia = useUploadPulseMedia();

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      content: '',
      image: null,
    },
  });

  const contentValue = form.watch('content');
  const charCount = contentValue?.length || 0;
  const maxChars = 3000;
  const isValid = charCount > 0 && charCount <= maxChars;

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file, 'post');
    if (!validation.valid) {
      toast.error(validation.error);
      e.target.value = '';
      return;
    }

    // Clear document if selecting image
    if (selectedDocument) {
      setSelectedDocument(null);
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    form.setValue('image', file);
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file as document
    const validation = validateFile(file, 'document');
    if (!validation.valid) {
      toast.error(validation.error);
      e.target.value = '';
      return;
    }

    // Clear image if selecting document
    if (selectedImage) {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setSelectedImage(null);
      setImagePreview(null);
      form.setValue('image', null);
    }

    setSelectedDocument(file);
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
    form.setValue('image', null);
  };

  const handleRemoveDocument = () => {
    setSelectedDocument(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // Fallback: append to end
      form.setValue('content', (contentValue || '') + emoji);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = contentValue.slice(0, start) + emoji + contentValue.slice(end);
    form.setValue('content', newValue);

    // Restore cursor position after emoji
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleSubmit = async (data: PostFormData) => {
    if (!provider?.id || !user?.id) {
      toast.error('Please complete your profile first');
      return;
    }

    setIsSubmitting(true);

    try {
      let mediaUrls: string[] = [];

      // Upload image if selected - use user.id (auth.uid) for RLS compliance
      if (selectedImage) {
        const uploadResult = await uploadMedia.mutateAsync({
          file: selectedImage,
          contentType: 'post',
          userId: user.id,
        });
        mediaUrls = [uploadResult.publicUrl];
      }

      // Upload document if selected - use user.id (auth.uid) for RLS compliance
      if (selectedDocument) {
        const uploadResult = await uploadMedia.mutateAsync({
          file: selectedDocument,
          contentType: 'document',
          userId: user.id,
        });
        mediaUrls = [uploadResult.publicUrl];
      }

      // Create the content
      await createContent.mutateAsync({
        provider_id: provider.id,
        content_type: 'post',
        caption: data.content,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        content_status: 'published',
      });

      // Clean up and navigate
      handleRemoveImage();
      handleRemoveDocument();
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
    <div className="space-y-4">
      {/* Pro Tip Banner */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-4">
          <p className="text-sm text-green-700 dark:text-green-300">
            💡 <strong>Pro Tip:</strong> Posts with questions get 2x more engagement. 
            Share insights, ask for opinions, or start a conversation!
          </p>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Content Textarea */}
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Textarea
                      {...field}
                      ref={(e) => {
                        field.ref(e);
                        (textareaRef as any).current = e;
                      }}
                      placeholder="What do you want to talk about?"
                      className="min-h-[200px] resize-none pr-16"
                      maxLength={maxChars}
                      disabled={isSubmitting}
                    />
                    <span className={`absolute bottom-3 right-3 text-xs ${
                      charCount > maxChars * 0.9 
                        ? charCount > maxChars 
                          ? 'text-destructive' 
                          : 'text-amber-500' 
                        : 'text-muted-foreground'
                    }`}>
                      {charCount}/{maxChars}
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-48 rounded-lg object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={handleRemoveImage}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Document Preview */}
          {selectedDocument && (
            <div className="relative inline-flex items-center gap-3 p-3 bg-muted rounded-lg">
              <FileIcon className="h-8 w-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedDocument.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(selectedDocument.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleRemoveDocument}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Attachment Bar */}
          <div className="flex items-center gap-2 border-t pt-4">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
                disabled={isSubmitting || !!selectedImage || !!selectedDocument}
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                disabled={isSubmitting || !!selectedImage || !!selectedDocument}
                asChild
              >
                <span>
                  <Image className="h-5 w-5 mr-2" />
                  Image
                </span>
              </Button>
            </label>

            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={handleDocumentSelect}
                disabled={isSubmitting || !!selectedImage || !!selectedDocument}
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                disabled={isSubmitting || !!selectedImage || !!selectedDocument}
                asChild
              >
                <span>
                  <FileText className="h-5 w-5 mr-2" />
                  Document
                </span>
              </Button>
            </label>

            <EmojiPicker 
              onSelect={handleEmojiSelect} 
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
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
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
