/**
 * CreateCardDialog - Card creation modal
 * Follows mockup design with topic, content, and media
 */

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Image, Video, AlertCircle, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TopicSelector } from './TopicSelector';
import { ReputationBadge } from './ReputationBadge';
import { createCardSchema, type CreateCardInput } from '@/lib/validations/pulseCard';
import { useCreatePulseCard } from '@/hooks/queries/usePulseCards';
import { usePulseCardsReputation } from '@/hooks/queries/usePulseCardsReputation';
import { useProviderEnrollments } from '@/hooks/queries/useProviderEnrollments';
import { CARD_LIMITS, REPUTATION_GATES } from '@/constants/pulseCards.constants';

interface CreateCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
}

export function CreateCardDialog({
  open,
  onOpenChange,
  providerId,
}: CreateCardDialogProps) {
  const [mediaType, setMediaType] = useState<'image' | 'video' | undefined>();
  
  const { data: reputation, isLoading: repLoading } = usePulseCardsReputation(providerId);
  const { data: enrollments = [] } = useProviderEnrollments(providerId);
  const createCard = useCreatePulseCard();

  // Extract industry segment IDs from provider's enrollments
  const industrySegmentIds = useMemo(() => {
    return enrollments.map(e => e.industry_segment_id).filter(Boolean) as string[];
  }, [enrollments]);

  const canCreateCard = reputation?.canStartCard ?? false;

  const form = useForm<CreateCardInput>({
    resolver: zodResolver(createCardSchema),
    defaultValues: {
      topic_id: '',
      content_text: '',
      media_url: '',
      media_type: undefined,
    },
  });

  const contentLength = form.watch('content_text')?.length || 0;
  const remainingChars = CARD_LIMITS.MAX_CONTENT_LENGTH - contentLength;

  const onSubmit = async (data: CreateCardInput) => {
    try {
      await createCard.mutateAsync({
        ...data,
        seed_creator_id: providerId,
        media_type: mediaType,
      });
      form.reset();
      setMediaType(undefined);
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create Knowledge Card
            {reputation && <ReputationBadge reputation={reputation.total} size="sm" />}
          </DialogTitle>
          <DialogDescription>
            Share a bite-sized piece of knowledge with the community.
          </DialogDescription>
        </DialogHeader>

        {/* Reputation Gate Warning */}
        {!canCreateCard && !repLoading && (
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You need at least {REPUTATION_GATES.START_CARD} reputation points to create a card.
              You currently have {reputation?.total || 0} points.
              Build on existing cards to earn reputation!
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Topic Selector */}
            <FormField
              control={form.control}
              name="topic_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic *</FormLabel>
                  <FormControl>
                    <TopicSelector
                      value={field.value}
                      onChange={field.onChange}
                      industrySegmentIds={industrySegmentIds}
                      disabled={!canCreateCard}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content */}
            <FormField
              control={form.control}
              name="content_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Share one atomic concept, fact, or tip..."
                      className="min-h-[120px] resize-none"
                      maxLength={CARD_LIMITS.MAX_CONTENT_LENGTH}
                      disabled={!canCreateCard}
                    />
                  </FormControl>
                  <FormDescription className="flex justify-between">
                    <span>Be specific, cite sources when possible</span>
                    <span className={remainingChars < 50 ? 'text-destructive' : ''}>
                      {remainingChars} characters remaining
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Media Type Toggle */}
            <div className="space-y-2">
              <FormLabel>Media (optional)</FormLabel>
              <ToggleGroup
                type="single"
                value={mediaType}
                onValueChange={(value) => setMediaType(value as 'image' | 'video' | undefined)}
                className="justify-start"
              >
                <ToggleGroupItem
                  value="image"
                  aria-label="Add image"
                  disabled={!canCreateCard}
                  className="min-h-[44px] min-w-[80px]"
                >
                  <Image className="h-4 w-4 mr-2" />
                  Image
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="video"
                  aria-label="Add video"
                  disabled={!canCreateCard}
                  className="min-h-[44px] min-w-[80px]"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Media URL (conditional) */}
            {mediaType && (
              <FormField
                control={form.control}
                name="media_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{mediaType === 'image' ? 'Image' : 'Video'} URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={`https://example.com/${mediaType}.${mediaType === 'image' ? 'jpg' : 'mp4'}`}
                        type="url"
                        disabled={!canCreateCard}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Tip */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Remember:</strong> Your card becomes permanent. Others will build on it, 
                but your contribution as the seed creator will always be credited.
              </AlertDescription>
            </Alert>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canCreateCard || createCard.isPending}
              >
                {createCard.isPending ? 'Creating...' : 'Create Card'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
