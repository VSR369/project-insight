/**
 * AiFieldAssist — Reusable AI suggestion button for wizard fields.
 * Calls ai-field-assist edge function and populates form fields.
 */

import { useState } from 'react';
import { Wand2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AiFieldAssistProps {
  fieldName: string;
  context?: {
    title?: string;
    problem_statement?: string;
    maturity_level?: string;
    governance_mode?: string;
    industry?: string;
  };
  onResult: (content: string) => void;
  label?: string;
  /** Compact icon-only mode */
  compact?: boolean;
}

export function AiFieldAssist({
  fieldName,
  context,
  onResult,
  label = 'AI Suggest',
  compact = false,
}: AiFieldAssistProps) {
  const [loading, setLoading] = useState(false);
  const [used, setUsed] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-field-assist', {
        body: { field_name: fieldName, context },
      });

      if (error) {
        toast.error('AI suggestion failed. Try again.');
        return;
      }

      if (!data?.success) {
        const msg = data?.error?.message || 'AI generation failed';
        if (msg.includes('Rate limit') || msg.includes('busy')) {
          toast.error('AI is busy. Please wait and try again.');
        } else if (msg.includes('credits') || msg.includes('402')) {
          toast.error('AI credits exhausted. Contact support.');
        } else {
          toast.error(msg);
        }
        return;
      }

      onResult(data.data.content);
      setUsed(true);
      toast.success('AI suggestion applied — review and edit as needed.');
    } catch {
      toast.error('Failed to connect to AI. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleClick}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : used ? (
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Wand2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {loading ? 'Generating…' : used ? 'Regenerate with AI' : label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5 text-xs h-7 border-primary/20 text-primary hover:bg-primary/5"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : used ? (
        <Sparkles className="h-3 w-3" />
      ) : (
        <Wand2 className="h-3 w-3" />
      )}
      {loading ? 'Generating…' : used ? 'Regenerate' : label}
    </Button>
  );
}
