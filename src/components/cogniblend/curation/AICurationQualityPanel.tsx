/**
 * AICurationQualityPanel — Collapsible AI quality assessment panel for curators.
 * Assessment display extracted to QualityPanelCards.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type QualityAssessment,
  QualityAssessmentContent,
} from './QualityPanelCards';

interface AICurationQualityPanelProps {
  challengeId: string;
}

export function AICurationQualityPanel({ challengeId }: AICurationQualityPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [assessment, setAssessment] = useState<QualityAssessment | null>(null);

  const analysisMutation = useMutation({
    mutationFn: async (): Promise<QualityAssessment> => {
      const { data, error } = await supabase.functions.invoke('check-challenge-quality', {
        body: { challenge_id: challengeId },
      });
      if (error) throw new Error(error.message || 'Failed to run AI analysis');
      if (data?.error) throw new Error(data.error.message || data.error);
      if (!data?.success || !data?.data) throw new Error('Invalid response from AI');
      return data.data as QualityAssessment;
    },
    onSuccess: (data) => {
      setAssessment(data);
      setIsOpen(true);
    },
    onError: (error: Error) => {
      if (error.message.includes('Rate limit') || error.message.includes('429')) {
        toast.error('AI is busy. Please wait a moment and try again.');
      } else if (error.message.includes('credits') || error.message.includes('402')) {
        toast.error('AI credits exhausted. Contact support.');
      } else {
        toast.error('AI analysis failed. Please try again.');
      }
    },
  });

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Quality Analysis
          </CardTitle>
          <Button
            size="sm"
            variant={assessment ? 'ghost' : 'default'}
            onClick={() => analysisMutation.mutate()}
            disabled={analysisMutation.isPending}
            className="text-xs"
          >
            {analysisMutation.isPending ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Analyzing…</>
            ) : assessment ? (
              <><RefreshCw className="h-3.5 w-3.5 mr-1" />Re-analyze</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5 mr-1" />Run Analysis</>
            )}
          </Button>
        </div>
      </CardHeader>

      {assessment && (
        <CardContent className="pt-0">
          <QualityAssessmentContent
            assessment={assessment}
            strengthsOpen={isOpen}
            onStrengthsOpenChange={setIsOpen}
            legalOpen={legalOpen}
            onLegalOpenChange={setLegalOpen}
          />
        </CardContent>
      )}

      {!assessment && !analysisMutation.isPending && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Run AI analysis to get automated quality scores, gap identification, legal compliance review, and solver readiness assessment.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
