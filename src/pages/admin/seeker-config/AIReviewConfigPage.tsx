/**
 * AIReviewConfigPage — Admin configurator for AI Review section rules.
 * Phase 6: Enhanced with structured editing tabs for quality criteria,
 * constraints, templates, research directives, and prompt preview.
 */

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Settings2, Bot, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { buildConfiguredSectionPrompt, type SectionConfig } from '@/lib/aiReviewPromptTemplate';
import { scoreAllConfigs, type ConfigScore, type AggregateConfigHealth } from '@/utils/promptConfigValidator';
import { QualityCriteriaTab } from '@/components/admin/prompt-studio/QualityCriteriaTab';
import { ConstraintsTemplatesTab } from '@/components/admin/prompt-studio/ConstraintsTemplatesTab';
import { ResearchTab } from '@/components/admin/prompt-studio/ResearchTab';
import { PreviewTestTab } from '@/components/admin/prompt-studio/PreviewTestTab';
import type {
  QualityCriterion,
  MasterDataConstraint,
  WebSearchDirective,
  ContentTemplates,
  ExtendedSectionConfig,
} from '@/lib/cogniblend/assemblePrompt';

interface SectionConfigRow {
  role_context: string;
  section_key: string;
  section_label: string;
  importance_level: string;
  section_description: string | null;
  review_instructions: string | null;
  dos: string | null;
  donts: string | null;
  tone: string;
  min_words: number;
  max_words: number;
  required_elements: string[];
  example_good: string | null;
  example_poor: string | null;
  is_active: boolean;
  updated_at: string;
  updated_by: string | null;
  // Phase 6 structured fields
  platform_preamble: string | null;
  quality_criteria: QualityCriterion[] | null;
  cross_references: string[] | null;
  master_data_constraints: MasterDataConstraint[] | null;
  computation_rules: string[] | null;
  content_templates: ContentTemplates | null;
  web_search_queries: WebSearchDirective[] | null;
  industry_frameworks: string[] | null;
  analyst_sources: string[] | null;
  wave_number: number | null;
  tab_group: string | null;
  version: number | null;
  discovery_directives: any | null;
}

interface GlobalConfig {
  id: number;
  default_model: string;
  batch_split_threshold: number;
  critical_model?: string | null;
  fallback_model?: string | null;
  use_context_intelligence?: boolean;
  updated_at: string;
  updated_by: string | null;
}

const ROLE_CONTEXT_ORDER = ['intake', 'spec', 'curation', 'legal', 'finance', 'evaluation'];
const ROLE_CONTEXT_LABELS: Record<string, string> = {
  intake: 'Create (Challenge Creator)',
  spec: 'Specification (Challenge Creator)',
  curation: 'Curation (Challenge Curator)',
  legal: 'Legal (Legal Coordinator)',
  finance: 'Finance (Finance Controller)',
  evaluation: 'Evaluation (Evaluation Reviewer)',
};

const IMPORTANCE_COLORS: Record<string, string> = {
  Critical: 'bg-destructive/10 text-destructive border-destructive/20',
  High: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  Medium: 'bg-primary/10 text-primary border-primary/20',
  Low: 'bg-muted text-muted-foreground border-border',
};

function useSectionConfigs() {
  return useQuery({
    queryKey: ['ai-review-section-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_review_section_config')
        .select('*')
        .order('role_context')
        .order('section_key');
      if (error) throw new Error(error.message);
      return data as unknown as SectionConfigRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useGlobalConfig() {
  return useQuery({
    queryKey: ['ai-review-global-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_review_global_config')
        .select('*')
        .eq('id', 1)
        .single();
      if (error) throw new Error(error.message);
      return data as GlobalConfig;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function CharCounter({ value, max }: { value: string; max: number }) {
  const len = value?.length ?? 0;
  const isOver = len > max;
  return (
    <span className={`text-xs ${isOver ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
      {len}/{max}
    </span>
  );
}

function SectionEditor({
  config,
  onSaved,
}: {
  config: SectionConfigRow;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(config);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('ai_review_section_config')
        .update({
          section_label: form.section_label,
          importance_level: form.importance_level,
          section_description: form.section_description,
          review_instructions: form.review_instructions,
          dos: form.dos,
          donts: form.donts,
          tone: form.tone,
          min_words: form.min_words,
          max_words: form.max_words,
          required_elements: form.required_elements,
          example_good: form.example_good,
          example_poor: form.example_poor,
          is_active: form.is_active,
          // Phase 6 structured fields
          platform_preamble: form.platform_preamble,
          quality_criteria: form.quality_criteria as any,
          cross_references: form.cross_references as any,
          master_data_constraints: form.master_data_constraints as any,
          computation_rules: form.computation_rules as any,
          content_templates: form.content_templates as any,
          web_search_queries: form.web_search_queries as any,
          industry_frameworks: form.industry_frameworks as any,
          analyst_sources: form.analyst_sources as any,
          discovery_directives: form.discovery_directives as any,
          wave_number: form.wave_number,
          tab_group: form.tab_group,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
          version: (form.version ?? 0) + 1,
        })
        .eq('role_context', config.role_context)
        .eq('section_key', config.section_key);

      if (error) throw new Error(error.message);
      toast.success(`${form.section_label} saved successfully`);
      onSaved();
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleElementsChange = (value: string) => {
    setForm(f => ({
      ...f,
      required_elements: value.split(',').map(s => s.trim()).filter(Boolean),
    }));
  };

  // Build ExtendedSectionConfig for preview tab
  const extConfig: ExtendedSectionConfig = {
    role_context: form.role_context,
    section_key: form.section_key,
    section_label: form.section_label,
    importance_level: form.importance_level,
    section_description: form.section_description,
    review_instructions: form.review_instructions,
    dos: form.dos,
    donts: form.donts,
    tone: form.tone,
    min_words: form.min_words,
    max_words: form.max_words,
    required_elements: form.required_elements ?? [],
    example_good: form.example_good,
    example_poor: form.example_poor,
    platform_preamble: form.platform_preamble,
    quality_criteria: form.quality_criteria ?? [],
    master_data_constraints: form.master_data_constraints ?? [],
    computation_rules: form.computation_rules ?? [],
    content_templates: form.content_templates ?? {},
    web_search_queries: form.web_search_queries ?? [],
    industry_frameworks: form.industry_frameworks ?? [],
    analyst_sources: form.analyst_sources ?? [],
    supervisor_examples: null,
    cross_references: form.cross_references ?? [],
    wave_number: form.wave_number,
    tab_group: form.tab_group,
  };

  return (
    <div className="space-y-4 py-2">
      {/* Meta header */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Section Label</Label>
          <Input
            value={form.section_label}
            onChange={e => setForm(f => ({ ...f, section_label: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Importance</Label>
            <Select
              value={form.importance_level}
              onValueChange={v => setForm(f => ({ ...f, importance_level: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Critical', 'High', 'Medium', 'Low'].map(l => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Wave</Label>
            <Input
              type="number"
              value={form.wave_number ?? ''}
              onChange={e => setForm(f => ({ ...f, wave_number: e.target.value ? parseInt(e.target.value) : null }))}
              min={1}
              max={6}
            />
          </div>
          <div className="space-y-2">
            <Label>Tab Group</Label>
            <Input
              value={form.tab_group ?? ''}
              onChange={e => setForm(f => ({ ...f, tab_group: e.target.value || null }))}
              placeholder="e.g., Problem Definition"
            />
          </div>
        </div>
      </div>

      {/* Tabbed editing */}
      <Tabs defaultValue="instructions" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="instructions" className="text-xs">Instructions</TabsTrigger>
          <TabsTrigger value="quality" className="text-xs">
            Quality Criteria
            {(form.quality_criteria?.length ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                {form.quality_criteria!.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="constraints" className="text-xs">Constraints & Templates</TabsTrigger>
          <TabsTrigger value="research" className="text-xs">Research</TabsTrigger>
          <TabsTrigger value="preview" className="text-xs">Preview & Test</TabsTrigger>
        </TabsList>

        {/* Tab 1: Instructions (existing fields) */}
        <TabsContent value="instructions" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Section Description</Label>
              <CharCounter value={form.section_description ?? ''} max={500} />
            </div>
            <Textarea
              value={form.section_description ?? ''}
              onChange={e => setForm(f => ({ ...f, section_description: e.target.value.slice(0, 500) }))}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Review Instructions</Label>
              <CharCounter value={form.review_instructions ?? ''} max={2000} />
            </div>
            <Textarea
              value={form.review_instructions ?? ''}
              onChange={e => setForm(f => ({ ...f, review_instructions: e.target.value.slice(0, 2000) }))}
              rows={6}
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Do's</Label>
                <CharCounter value={form.dos ?? ''} max={1000} />
              </div>
              <Textarea
                value={form.dos ?? ''}
                onChange={e => setForm(f => ({ ...f, dos: e.target.value.slice(0, 1000) }))}
                rows={4}
                maxLength={1000}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Don'ts</Label>
                <CharCounter value={form.donts ?? ''} max={1000} />
              </div>
              <Textarea
                value={form.donts ?? ''}
                onChange={e => setForm(f => ({ ...f, donts: e.target.value.slice(0, 1000) }))}
                rows={4}
                maxLength={1000}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select
                value={form.tone}
                onValueChange={v => setForm(f => ({ ...f, tone: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Formal', 'Balanced', 'Encouraging'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Min Words</Label>
              <Input
                type="number"
                value={form.min_words}
                onChange={e => setForm(f => ({ ...f, min_words: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Words</Label>
              <Input
                type="number"
                value={form.max_words}
                onChange={e => setForm(f => ({ ...f, max_words: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Required Elements (comma-separated)</Label>
            <Input
              value={(form.required_elements ?? []).join(', ')}
              onChange={e => handleElementsChange(e.target.value)}
              placeholder="e.g., specific pain point, measurable impact"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Good Example</Label>
                <CharCounter value={form.example_good ?? ''} max={800} />
              </div>
              <Textarea
                value={form.example_good ?? ''}
                onChange={e => setForm(f => ({ ...f, example_good: e.target.value.slice(0, 800) }))}
                rows={5}
                maxLength={800}
                placeholder="A high-quality example..."
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Poor Example</Label>
                <CharCounter value={form.example_poor ?? ''} max={800} />
              </div>
              <Textarea
                value={form.example_poor ?? ''}
                onChange={e => setForm(f => ({ ...f, example_poor: e.target.value.slice(0, 800) }))}
                rows={5}
                maxLength={800}
                placeholder="A low-quality example..."
              />
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Quality Criteria */}
        <TabsContent value="quality" className="mt-4">
          <QualityCriteriaTab
            criteria={form.quality_criteria ?? []}
            onChange={qc => setForm(f => ({ ...f, quality_criteria: qc }))}
            currentSectionKey={form.section_key}
          />
        </TabsContent>

        {/* Tab 3: Constraints & Templates */}
        <TabsContent value="constraints" className="mt-4">
          <ConstraintsTemplatesTab
            constraints={form.master_data_constraints ?? []}
            computationRules={form.computation_rules ?? []}
            contentTemplates={form.content_templates ?? {}}
            onConstraintsChange={c => setForm(f => ({ ...f, master_data_constraints: c }))}
            onRulesChange={r => setForm(f => ({ ...f, computation_rules: r }))}
            onTemplatesChange={t => setForm(f => ({ ...f, content_templates: t }))}
          />
        </TabsContent>

        {/* Tab 4: Research */}
        <TabsContent value="research" className="mt-4">
          <ResearchTab
            webSearchQueries={form.web_search_queries ?? []}
            industryFrameworks={form.industry_frameworks ?? []}
            analystSources={form.analyst_sources ?? []}
            discoveryDirectives={form.discovery_directives ?? null}
            onQueriesChange={q => setForm(f => ({ ...f, web_search_queries: q }))}
            onFrameworksChange={fw => setForm(f => ({ ...f, industry_frameworks: fw }))}
            onSourcesChange={s => setForm(f => ({ ...f, analyst_sources: s }))}
            onDiscoveryDirectivesChange={d => setForm(f => ({ ...f, discovery_directives: d }))}
          />
        </TabsContent>

        {/* Tab 5: Preview & Test */}
        <TabsContent value="preview" className="mt-4">
          <PreviewTestTab config={extConfig} />
        </TabsContent>
      </Tabs>

      {/* Footer: Active toggle + Save */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_active}
            onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
          />
          <Label className="text-sm">{form.is_active ? 'Active' : 'Inactive'}</Label>
          {form.version && (
            <Badge variant="outline" className="text-xs">v{form.version}</Badge>
          )}
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {config.updated_at && (
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(config.updated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export default function AIReviewConfigPage() {
  const { data: sections, isLoading: sectionsLoading, refetch: refetchSections } = useSectionConfigs();
  const { data: globalConfig, isLoading: globalLoading } = useGlobalConfig();
  const queryClient = useQueryClient();

  const [globalModel, setGlobalModel] = useState('');
  const [criticalModel, setCriticalModel] = useState('');
  const [fallbackModel, setFallbackModel] = useState('');
  const [batchThreshold, setBatchThreshold] = useState(15);
  const [useContextIntelligence, setUseContextIntelligence] = useState(false);
  const [globalSaving, setGlobalSaving] = useState(false);

  useEffect(() => {
    if (globalConfig) {
      setGlobalModel(globalConfig.default_model);
      setCriticalModel(globalConfig.critical_model ?? '');
      setFallbackModel(globalConfig.fallback_model ?? '');
      setBatchThreshold(globalConfig.batch_split_threshold);
      setUseContextIntelligence(globalConfig.use_context_intelligence ?? false);
    }
  }, [globalConfig]);

  const handleSaveGlobal = async () => {
    setGlobalSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('ai_review_global_config')
        .update({
          default_model: globalModel,
          critical_model: criticalModel.trim() || null,
          fallback_model: fallbackModel.trim() || null,
          batch_split_threshold: batchThreshold,
          use_context_intelligence: useContextIntelligence,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq('id', 1);
      if (error) throw new Error(error.message);
      toast.success('Global AI review settings saved');
      queryClient.invalidateQueries({ queryKey: ['ai-review-global-config'] });
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setGlobalSaving(false);
    }
  };

  // Group sections by role_context
  const grouped = (sections ?? []).reduce<Record<string, SectionConfigRow[]>>((acc, s) => {
    (acc[s.role_context] ??= []).push(s);
    return acc;
  }, {});

  const isLoading = sectionsLoading || globalLoading;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="AI Review Configuration"
          description="Configure per-section AI review rules, quality criteria, constraints, and prompt structure. Changes take effect on the next review run."
        />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            {/* Global Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings2 className="h-4 w-4" />
                  Global Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Default AI Model</Label>
                    <Select value={globalModel} onValueChange={setGlobalModel}>
                      <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash (Fast)</SelectItem>
                        <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                        <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                        <SelectItem value="google/gemini-3.1-pro-preview">Gemini 3.1 Pro</SelectItem>
                        <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                        <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                        <SelectItem value="openai/gpt-5-nano">GPT-5 Nano</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Primary model for all AI functions</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Critical Section Model</Label>
                    <Select value={criticalModel || '__default__'} onValueChange={v => setCriticalModel(v === '__default__' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Same as default" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Same as Default</SelectItem>
                        <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash</SelectItem>
                        <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                        <SelectItem value="google/gemini-3.1-pro-preview">Gemini 3.1 Pro</SelectItem>
                        <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                        <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Model for critical sections (problem, deliverables, etc.)</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Fallback Model</Label>
                    <Select value={fallbackModel || 'openai/gpt-5-mini'} onValueChange={setFallbackModel}>
                      <SelectTrigger><SelectValue placeholder="Select fallback" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash</SelectItem>
                        <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                        <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                        <SelectItem value="google/gemini-3.1-pro-preview">Gemini 3.1 Pro</SelectItem>
                        <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                        <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                        <SelectItem value="openai/gpt-5-nano">GPT-5 Nano</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Used when primary model returns 502/503 errors</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end mt-4">
                  <div className="space-y-2">
                    <Label>Batch Split Threshold</Label>
                    <Input
                      type="number"
                      value={batchThreshold}
                      onChange={e => setBatchThreshold(parseInt(e.target.value) || 15)}
                      min={5}
                      max={30}
                    />
                    <p className="text-xs text-muted-foreground">Max sections per batch</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Context Intelligence</Label>
                    <div className="flex items-center gap-2 pt-1">
                      <Switch
                        checked={useContextIntelligence}
                        onCheckedChange={setUseContextIntelligence}
                      />
                      <span className="text-xs text-muted-foreground">
                        {useContextIntelligence ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Enable digest, grounding rules, and tiered attachments</p>
                  </div>
                  <Button onClick={handleSaveGlobal} disabled={globalSaving} className="w-fit">
                    <Save className="h-4 w-4 mr-1" />
                    {globalSaving ? 'Saving...' : 'Save Global Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Config Health Dashboard (Change 5a) */}
            {(() => {
              const curationConfigs = (sections ?? []).filter(s => s.role_context === 'curation' && s.is_active);
              if (curationConfigs.length === 0) return null;
              const health = scoreAllConfigs(curationConfigs);
              const getColor = (score: number) =>
                score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-destructive';
              const getBarColor = (score: number) =>
                score >= 80 ? '[&>div]:bg-green-500' : score >= 60 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-destructive';

              return (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="h-4 w-4" />
                      Config Health — Curation ({health.totalSections} sections)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Review Readiness</Label>
                          <span className={`text-sm font-semibold ${getColor(health.avgReviewReadiness)}`}>
                            {health.avgReviewReadiness}%
                          </span>
                        </div>
                        <Progress value={health.avgReviewReadiness} className={`h-2 ${getBarColor(health.avgReviewReadiness)}`} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Generation Readiness</Label>
                          <span className={`text-sm font-semibold ${getColor(health.avgGenerationReadiness)}`}>
                            {health.avgGenerationReadiness}%
                          </span>
                        </div>
                        <Progress value={health.avgGenerationReadiness} className={`h-2 ${getBarColor(health.avgGenerationReadiness)}`} />
                      </div>
                    </div>
                    {health.belowThreshold.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {health.belowThreshold.length} section(s) below 70% threshold
                        </p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {health.belowThreshold.map(s => (
                            <div key={s.sectionKey} className="flex items-start gap-2 text-xs p-2 rounded bg-muted/50">
                              <Badge
                                variant="outline"
                                className={`text-[10px] shrink-0 ${
                                  Math.min(s.reviewReadiness, s.generationReadiness) >= 60
                                    ? 'border-yellow-500/30 text-yellow-700'
                                    : 'border-destructive/30 text-destructive'
                                }`}
                              >
                                R:{s.reviewReadiness} G:{s.generationReadiness}
                              </Badge>
                              <div>
                                <span className="font-medium">{s.sectionKey}</span>
                                {s.missing.length > 0 && (
                                  <span className="text-destructive ml-1">— {s.missing.join('; ')}</span>
                                )}
                                {s.issues.length > 0 && (
                                  <span className="text-yellow-700 ml-1">— {s.issues.join('; ')}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {health.belowThreshold.length === 0 && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        All sections meet the 70% readiness threshold
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Section Config Accordion */}
            <Accordion type="multiple" className="space-y-2">
              {ROLE_CONTEXT_ORDER.map(ctx => {
                const items = grouped[ctx] ?? [];
                if (items.length === 0) return null;
                const activeCount = items.filter(i => i.is_active).length;
                const structuredCount = items.filter(i => (i.quality_criteria as any[])?.length > 0).length;

                return (
                  <AccordionItem key={ctx} value={ctx} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{ROLE_CONTEXT_LABELS[ctx] ?? ctx}</span>
                        <Badge variant="outline" className="text-xs">
                          {activeCount}/{items.length} active
                        </Badge>
                        {structuredCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {structuredCount} structured
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Accordion type="single" collapsible className="space-y-1">
                        {items.map(item => (
                          <AccordionItem
                            key={`${item.role_context}-${item.section_key}`}
                            value={`${item.role_context}-${item.section_key}`}
                            className="border rounded px-3"
                          >
                            <AccordionTrigger className="hover:no-underline py-3">
                              <div className="flex items-center gap-2 text-sm">
                                <span className={item.is_active ? '' : 'text-muted-foreground line-through'}>
                                  {item.section_label}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${IMPORTANCE_COLORS[item.importance_level] ?? ''}`}
                                >
                                  {item.importance_level}
                                </Badge>
                                {item.wave_number && (
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                    W{item.wave_number}
                                  </Badge>
                                )}
                                {!item.is_active && (
                                  <Badge variant="secondary" className="text-xs">Inactive</Badge>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <SectionEditor
                                config={item}
                                onSaved={() => refetchSections()}
                              />
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
