/**
 * PipelineActions — Buttons to trigger embedding and pattern extraction edge functions.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Cpu, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function PipelineActions() {
  const [embeddingRunning, setEmbeddingRunning] = useState(false);
  const [extractionRunning, setExtractionRunning] = useState(false);

  const runEmbedding = async () => {
    setEmbeddingRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('embed-curator-corrections');
      if (error) throw error;
      const processed = (data as Record<string, unknown>)?.processed ?? 0;
      toast.success(`Embedding complete: ${processed} corrections processed`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Embedding failed: ${message}`);
    } finally {
      setEmbeddingRunning(false);
    }
  };

  const runExtraction = async () => {
    setExtractionRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-correction-patterns');
      if (error) throw error;
      const processed = (data as Record<string, unknown>)?.processed ?? 0;
      toast.success(`Pattern extraction complete: ${processed} corrections analyzed`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Extraction failed: ${message}`);
    } finally {
      setExtractionRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Pipeline Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={runEmbedding}
          disabled={embeddingRunning}
        >
          {embeddingRunning ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Cpu className="h-3.5 w-3.5 mr-1" />
          )}
          Generate Embeddings
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={runExtraction}
          disabled={extractionRunning}
        >
          {extractionRunning ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 mr-1" />
          )}
          Extract Patterns
        </Button>
      </CardContent>
    </Card>
  );
}
