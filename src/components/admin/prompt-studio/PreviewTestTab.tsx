/**
 * PreviewTestTab — Shows assembled 5-layer prompt + token estimate + live test.
 */
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Play, Loader2, Copy, Check } from 'lucide-react';
import { assemblePrompt, estimateTokenCount, type ExtendedSectionConfig, type PromptContext } from '@/lib/cogniblend/assemblePrompt';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PreviewTestTabProps {
  config: ExtendedSectionConfig;
}

const MOCK_CONTEXT: PromptContext = {
  todaysDate: new Date().toISOString().split('T')[0],
  solutionType: 'technology_architecture',
  seekerSegment: 'Enterprise',
  maturityLevel: 'poc',
  complexityLevel: 'L3',
  rateCard: {
    effortRateFloor: 75,
    rewardFloorAmount: 5000,
    rewardCeiling: null,
    big4BenchmarkMultiplier: 2.5,
  },
  masterData: {},
  sections: {},
  subDomain: 'Digital Transformation',
  category: 'Technology',
};

export function PreviewTestTab({ config }: PreviewTestTabProps) {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const assembledPrompt = useMemo(
    () => assemblePrompt(config, MOCK_CONTEXT),
    [config],
  );

  const tokenCount = useMemo(
    () => estimateTokenCount(assembledPrompt),
    [assembledPrompt],
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(assembledPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('review-challenge-sections', {
        body: {
          challenge_id: 'test-preview',
          section_key: config.section_key,
          role_context: 'curation',
          current_content: 'This is a test prompt preview. No real challenge data.',
          context: MOCK_CONTEXT,
        },
      });
      if (error) throw new Error(error.message);
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      toast.error(`Test failed: ${err.message}`);
      setTestResult(`Error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <div>
            <h4 className="text-sm font-medium">Assembled Prompt Preview</h4>
            <p className="text-xs text-muted-foreground">
              All 5 layers composed with mock context
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            ~{tokenCount.toLocaleString()} tokens
          </Badge>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button size="sm" onClick={handleTest} disabled={testing}>
            {testing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            {testing ? 'Testing...' : 'Test Live'}
          </Button>
        </div>
      </div>

      {/* Prompt Preview */}
      <div className="border rounded-lg overflow-hidden">
        <pre className="whitespace-pre-wrap text-xs font-mono bg-muted p-4 max-h-[400px] overflow-y-auto">
          {assembledPrompt}
        </pre>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Test Result</h4>
          <pre className="whitespace-pre-wrap text-xs font-mono bg-muted p-4 rounded-lg border max-h-[300px] overflow-y-auto">
            {testResult}
          </pre>
        </div>
      )}
    </div>
  );
}
