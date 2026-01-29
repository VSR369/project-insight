/**
 * Article Editor Component
 * Long-form content editor with writing tips
 * Per Phase 5 specification
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useCreatePulseContent } from '@/hooks/queries/usePulseContent';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { articleSchema, type ArticleFormData } from '@/lib/validations/media';
import { toast } from 'sonner';

interface ArticleEditorProps {
  onCancel: () => void;
}

const WRITING_TIPS = [
  {
    icon: '🎯',
    tip: 'Start with a compelling hook that grabs attention',
  },
  {
    icon: '📊',
    tip: 'Use data and specific examples to support your insights',
  },
  {
    icon: '📑',
    tip: 'Break content into scannable sections with subheadings',
  },
  {
    icon: '✅',
    tip: 'End with actionable takeaways for your readers',
  },
];

export function ArticleEditor({ onCancel }: ArticleEditorProps) {
  // =====================================================
  // HOOKS (all at top, before any conditional returns)
  // =====================================================
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(true);

  const navigate = useNavigate();
  const { data: provider } = useCurrentProvider();
  const createContent = useCreatePulseContent();

  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: '',
      body_text: '',
    },
  });

  const titleValue = form.watch('title');
  const bodyValue = form.watch('body_text');

  const titleCount = titleValue?.length || 0;
  const bodyCount = bodyValue?.length || 0;
  const wordCount = bodyValue?.split(/\s+/).filter(Boolean).length || 0;
  
  const minBodyChars = 100;
  const maxBodyChars = 50000;
  const isValid = titleCount > 0 && titleCount <= 200 && bodyCount >= minBodyChars && bodyCount <= maxBodyChars;

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleSubmit = async (data: ArticleFormData) => {
    if (!provider?.id) {
      toast.error('Please complete your profile first');
      return;
    }

    setIsSubmitting(true);

    try {
      await createContent.mutateAsync({
        provider_id: provider.id,
        content_type: 'article',
        title: data.title,
        body_text: data.body_text,
        content_status: 'published',
      });

      navigate('/pulse/feed');
    } catch (error) {
      // Error already handled by mutation hooks
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!provider?.id) {
      toast.error('Please complete your profile first');
      return;
    }

    const data = form.getValues();
    if (!data.title) {
      toast.error('Please add a title before saving');
      return;
    }

    setIsSubmitting(true);

    try {
      await createContent.mutateAsync({
        provider_id: provider.id,
        content_type: 'article',
        title: data.title,
        body_text: data.body_text || '',
        content_status: 'draft',
      });

      toast.success('Draft saved');
      navigate('/pulse/profile');
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Your article title..."
                    className="text-xl font-semibold h-14 border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-primary px-0"
                    maxLength={200}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <FormMessage />
                  <span>{titleCount}/200 characters</span>
                </div>
              </FormItem>
            )}
          />

          {/* Body */}
          <FormField
            control={form.control}
            name="body_text"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Body</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Write your article here... (Markdown supported)"
                    className="min-h-[400px] resize-y text-base leading-relaxed"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <FormMessage />
                  <div className="flex gap-4">
                    <span>{wordCount} words</span>
                    <span className={bodyCount < minBodyChars ? 'text-amber-500' : ''}>
                      {bodyCount.toLocaleString()}/{maxBodyChars.toLocaleString()} chars
                      {bodyCount < minBodyChars && ` (min ${minBodyChars})`}
                    </span>
                  </div>
                </div>
              </FormItem>
            )}
          />

          {/* Writing Tips Panel */}
          <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-500/10 transition-colors rounded-t-lg"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-blue-700 dark:text-blue-300">
                      Writing Tips
                    </span>
                  </div>
                  {tipsOpen ? (
                    <ChevronUp className="h-4 w-4 text-blue-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-blue-500" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 px-4">
                  <ul className="space-y-2">
                    {WRITING_TIPS.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span>{tip.icon}</span>
                        <span>{tip.tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={isSubmitting || !titleValue}
            >
              Save Draft
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Article'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
