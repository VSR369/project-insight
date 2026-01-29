/**
 * AI Enhancement Hooks for Pulse Content
 * Connects to edge functions for content enhancement and spark generation
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

// =====================================================
// TYPES
// =====================================================

export type ContentType = 'reel' | 'post' | 'gallery' | 'article' | 'podcast';
export type EnhancementType = 'professional' | 'engaging' | 'statistics';

export interface EnhanceContentRequest {
  content_type: ContentType;
  original_text: string;
  industry?: string;
  enhancement_type?: EnhancementType;
}

export interface EnhanceContentResponse {
  enhanced_text: string;
  extracted_statistics: string[];
  suggestions: string[];
}

export interface SparkSuggestion {
  headline: string;
  key_insight: string;
  suggested_source?: string;
  statistic?: string;
}

export interface GenerateSparkRequest {
  industry: string;
  topic?: string;
  context?: string;
}

export interface GenerateSparkResponse {
  suggestions: SparkSuggestion[];
}

// =====================================================
// ENHANCE CONTENT HOOK
// =====================================================

export function useEnhanceContent() {
  return useMutation({
    mutationFn: async (request: EnhanceContentRequest): Promise<EnhanceContentResponse> => {
      const { data, error } = await supabase.functions.invoke('enhance-pulse-content', {
        body: request,
      });

      if (error) {
        throw new Error(error.message || 'Failed to enhance content');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as EnhanceContentResponse;
    },
    onError: (error: Error) => {
      // Handle rate limit and payment errors with specific messages
      if (error.message.includes('Rate limit')) {
        toast.error('AI is busy. Please wait a moment and try again.');
      } else if (error.message.includes('credits')) {
        toast.error('AI credits exhausted. Contact support for more.');
      } else {
        handleMutationError(error, { operation: 'enhance_content' });
      }
    },
  });
}

// =====================================================
// GENERATE SPARK INSIGHTS HOOK
// =====================================================

export function useGenerateSparkInsights() {
  return useMutation({
    mutationFn: async (request: GenerateSparkRequest): Promise<GenerateSparkResponse> => {
      const { data, error } = await supabase.functions.invoke('generate-spark-insights', {
        body: request,
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate insights');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as GenerateSparkResponse;
    },
    onError: (error: Error) => {
      if (error.message.includes('Rate limit')) {
        toast.error('AI is busy. Please wait a moment and try again.');
      } else if (error.message.includes('credits')) {
        toast.error('AI credits exhausted. Contact support for more.');
      } else {
        handleMutationError(error, { operation: 'generate_spark_insights' });
      }
    },
  });
}

// =====================================================
// UTILITY HOOK FOR SIMPLE ENHANCEMENT
// =====================================================

export function useQuickEnhance(contentType: ContentType) {
  const enhanceMutation = useEnhanceContent();

  const enhance = async (
    text: string, 
    options?: { industry?: string; type?: EnhancementType }
  ) => {
    if (!text.trim()) {
      toast.error('Please enter some text to enhance');
      return null;
    }

    try {
      const result = await enhanceMutation.mutateAsync({
        content_type: contentType,
        original_text: text,
        industry: options?.industry,
        enhancement_type: options?.type || 'professional',
      });

      toast.success('Content enhanced!');
      return result;
    } catch {
      return null;
    }
  };

  return {
    enhance,
    isEnhancing: enhanceMutation.isPending,
    error: enhanceMutation.error,
  };
}
