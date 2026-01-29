/**
 * Knowledge Spark Builder Component
 * Create visually-rich spark cards with statistics and live preview
 * Per Phase 1 specification
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles, Loader2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { useCreatePulseContent } from '@/hooks/queries/usePulseContent';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { sparkSchema, type SparkFormData } from '@/lib/validations/media';
import { toast } from 'sonner';

interface SparkBuilderProps {
  onCancel: () => void;
}

export function SparkBuilder({ onCancel }: SparkBuilderProps) {
  // =====================================================
  // HOOKS (all at top, before any conditional returns)
  // =====================================================
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAssistEnabled, setAiAssistEnabled] = useState(false);

  const navigate = useNavigate();
  const { data: provider } = useCurrentProvider();
  const { data: industries = [], isLoading: industriesLoading } = useIndustrySegments();
  const createContent = useCreatePulseContent();

  const form = useForm<SparkFormData>({
    resolver: zodResolver(sparkSchema),
    defaultValues: {
      industry_segment_id: '',
      headline: '',
      key_insight: '',
      main_statistic: '',
      trend_indicator: '',
      source: '',
      ai_assist: false,
    },
  });

  const headlineValue = form.watch('headline');
  const keyInsightValue = form.watch('key_insight');
  const selectedIndustryId = form.watch('industry_segment_id');
  const selectedIndustry = industries.find(i => i.id === selectedIndustryId);

  const headlineCount = headlineValue?.length || 0;
  const keyInsightCount = keyInsightValue?.length || 0;
  const isValid = headlineCount > 0 && headlineCount <= 50 && keyInsightCount > 0 && keyInsightCount <= 200 && selectedIndustryId;

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleIndustrySelect = (industryId: string) => {
    form.setValue('industry_segment_id', industryId, { shouldValidate: true });
  };

  const handleAiAssistToggle = (enabled: boolean) => {
    setAiAssistEnabled(enabled);
    form.setValue('ai_assist', enabled);
    if (enabled) {
      toast.info('AI enhancement will analyze your content for statistics');
    }
  };

  const handleSubmit = async (data: SparkFormData) => {
    if (!provider?.id) {
      toast.error('Please complete your profile first');
      return;
    }

    setIsSubmitting(true);

    try {
      await createContent.mutateAsync({
        provider_id: provider.id,
        content_type: 'spark',
        industry_segment_id: data.industry_segment_id,
        headline: data.headline,
        key_insight: data.key_insight,
        caption: data.source || null,
        ai_enhanced: data.ai_assist,
        content_status: 'published',
      });

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
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form Section */}
      <div className="space-y-4">
        {/* Pro Tip Banner */}
        <Card className="border-pink-500/30 bg-gradient-to-r from-pink-500/5 to-purple-500/5">
          <CardContent className="p-4">
            <p className="text-sm text-pink-700 dark:text-pink-300">
              <Lightbulb className="inline h-4 w-4 mr-1" />
              <strong>Pro Tip:</strong> Use specific numbers and concrete data. 
              Sparks with statistics get 3x more engagement!
            </p>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* AI Assist Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <Label htmlFor="ai-assist" className="text-sm font-medium">
                  AI Assist
                </Label>
              </div>
              <Switch
                id="ai-assist"
                checked={aiAssistEnabled}
                onCheckedChange={handleAiAssistToggle}
                disabled={isSubmitting}
              />
            </div>

            {/* Industry Category Selector */}
            <FormField
              control={form.control}
              name="industry_segment_id"
              render={() => (
                <FormItem>
                  <FormLabel>Industry Category</FormLabel>
                  <FormDescription>Select the industry this spark relates to</FormDescription>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {industriesLoading ? (
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    ) : (
                      industries.slice(0, 8).map((industry) => (
                        <Badge
                          key={industry.id}
                          variant={selectedIndustryId === industry.id ? 'default' : 'outline'}
                          className={`cursor-pointer transition-all ${
                            selectedIndustryId === industry.id
                              ? 'bg-pink-500 hover:bg-pink-600'
                              : 'hover:bg-pink-500/10'
                          }`}
                          onClick={() => handleIndustrySelect(industry.id)}
                        >
                          {industry.name}
                        </Badge>
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Headline */}
            <FormField
              control={form.control}
              name="headline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headline</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        placeholder="Your spark headline..."
                        maxLength={50}
                        disabled={isSubmitting}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                        headlineCount > 45 
                          ? headlineCount > 50 
                            ? 'text-destructive' 
                            : 'text-amber-500' 
                          : 'text-muted-foreground'
                      }`}>
                        {headlineCount}/50
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Key Insight */}
            <FormField
              control={form.control}
              name="key_insight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Insight</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Textarea
                        {...field}
                        placeholder="Share your insight (max 200 chars)..."
                        className="min-h-[100px] resize-none pr-16"
                        maxLength={200}
                        disabled={isSubmitting}
                      />
                      <span className={`absolute bottom-3 right-3 text-xs ${
                        keyInsightCount > 180 
                          ? keyInsightCount > 200 
                            ? 'text-destructive' 
                            : 'text-amber-500' 
                          : 'text-muted-foreground'
                      }`}>
                        {keyInsightCount}/200
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional Source */}
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="E.g., McKinsey Report 2024"
                      maxLength={100}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                disabled={!isValid || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish Spark'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Live Preview Section */}
      <div className="hidden lg:block">
        <div className="sticky top-4">
          <Label className="text-sm text-muted-foreground mb-3 block">Live Preview</Label>
          <SparkLivePreview
            headline={headlineValue}
            keyInsight={keyInsightValue}
            industry={selectedIndustry?.name}
          />
        </div>
      </div>
    </div>
  );
}

// =====================================================
// LIVE PREVIEW SUBCOMPONENT
// =====================================================

interface SparkLivePreviewProps {
  headline?: string;
  keyInsight?: string;
  industry?: string;
}

function SparkLivePreview({ headline, keyInsight, industry }: SparkLivePreviewProps) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 p-6 text-white min-h-[200px]">
        {industry && (
          <Badge variant="secondary" className="mb-3 bg-white/20 text-white border-0">
            {industry}
          </Badge>
        )}
        
        <h3 className="text-xl font-bold mb-3 leading-tight">
          {headline || 'Your headline here...'}
        </h3>
        
        <p className="text-white/90 text-sm leading-relaxed">
          {keyInsight || 'Your key insight will appear here as you type...'}
        </p>
      </div>
      
      <CardContent className="p-4 bg-muted/30">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>🔥 0</span>
          <span>💎 0</span>
          <span>💬 0</span>
        </div>
      </CardContent>
    </Card>
  );
}
