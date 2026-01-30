/**
 * CreateLayerDialog - Build on existing card modal
 */

import { useState } from 'react';
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
import { ReputationBadge } from './ReputationBadge';
import { createLayerSchema, type CreateLayerInput } from '@/lib/validations/pulseCard';
import { useCreatePulseCardLayer } from '@/hooks/queries/usePulseCardLayers';
import { usePulseCardsReputation } from '@/hooks/queries/usePulseCardsReputation';
import { CARD_LIMITS, REPUTATION_GATES } from '@/constants/pulseCards.constants';

interface CreateLayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  providerId: string;
  parentLayerId?: string;
}

export function CreateLayerDialog({
  open,
  onOpenChange,
  cardId,
  providerId,
  parentLayerId,
}: CreateLayerDialogProps) {
  const [mediaType, setMediaType] = useState<'image' | 'video' | undefined>();
  
  const { data: reputation, isLoading: repLoading } = usePulseCardsReputation(providerId);
  const createLayer = useCreatePulseCardLayer();

  const canBuild = reputation?.canBuild ?? false;

  const form = useForm<CreateLayerInput>({
    resolver: zodResolver(createLayerSchema),
    defaultValues: {
      card_id: cardId,
      content_text: '',
      media_url: '',
      media_type: undefined,
      parent_layer_id: parentLayerId,
    },
  });

  const contentLength = form.watch('content_text')?.length || 0;
  const remainingChars = CARD_LIMITS.MAX_CONTENT_LENGTH - contentLength;

  const onSubmit = async (data: CreateLayerInput) => {
    try {
      await createLayer.mutateAsync({
        ...data,
        creator_id: providerId,
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
            Build on This Card
            {reputation && <ReputationBadge reputation={reputation.total} size="sm" />}
          </DialogTitle>
          <DialogDescription>
            Add your perspective, correction, or alternative tip.
            Your contribution stacks on top — you never replace the original.
          </DialogDescription>
        </DialogHeader>

        {/* Reputation Gate Warning */}
        {!canBuild && !repLoading && (
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You need at least {REPUTATION_GATES.BUILD_ON_CARD} reputation points to build on cards.
              You currently have {reputation?.total || 0} points.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Content */}
            <FormField
              control={form.control}
              name="content_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Contribution *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add your tip, correction, or alternative perspective..."
                      className="min-h-[120px] resize-none"
                      maxLength={CARD_LIMITS.MAX_CONTENT_LENGTH}
                      disabled={!canBuild}
                    />
                  </FormControl>
                  <FormDescription className="flex justify-between">
                    <span>Be constructive and cite sources</span>
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
                  disabled={!canBuild}
                  className="min-h-[44px] min-w-[80px]"
                >
                  <Image className="h-4 w-4 mr-2" />
                  Image
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="video"
                  aria-label="Add video"
                  disabled={!canBuild}
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
                        disabled={!canBuild}
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
                <strong>Build, Don't Battle:</strong> Your layer stacks on the original. 
                The community will vote to feature the best contribution.
                A 24-hour voting window begins when you submit.
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
                disabled={!canBuild || createLayer.isPending}
              >
                {createLayer.isPending ? 'Adding...' : 'Add Build'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
