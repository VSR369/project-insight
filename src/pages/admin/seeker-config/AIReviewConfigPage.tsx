/**
 * AIReviewConfigPage — Admin configurator for AI Review section rules.
 * Accessible via /admin/seeker-config/ai-review-config (supervisor only).
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Eye, Settings2, Bot } from 'lucide-react';
import { buildConfiguredSectionPrompt, type SectionConfig } from '@/lib/aiReviewPromptTemplate';

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
}

interface GlobalConfig {
  id: number;
  default_model: string;
  batch_split_threshold: number;
  updated_at: string;
  updated_by: string | null;
}

const ROLE_CONTEXT_ORDER = ['intake', 'spec', 'curation', 'legal', 'finance', 'evaluation'];
const ROLE_CONTEXT_LABELS: Record<string, string> = {
  intake: 'Intake (AM / Challenge Requestor)',
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
      return data as SectionConfigRow[];
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
  const [previewOpen, setPreviewOpen] = useState(false);
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
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
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

  const previewPrompt = buildConfiguredSectionPrompt(form as SectionConfig);

  const handleElementsChange = (value: string) => {
    setForm(f => ({
      ...f,
      required_elements: value.split(',').map(s => s.trim()).filter(Boolean),
    }));
  };

  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Section Label</Label>
          <Input
            value={form.section_label}
            onChange={e => setForm(f => ({ ...f, section_label: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
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
        </div>
      </div>

      <div className="space-y-2">
        <Label>Section Description</Label>
        <Textarea
          value={form.section_description ?? ''}
          onChange={e => setForm(f => ({ ...f, section_description: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Review Instructions</Label>
        <Textarea
          value={form.review_instructions ?? ''}
          onChange={e => setForm(f => ({ ...f, review_instructions: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Do's</Label>
          <Textarea
            value={form.dos ?? ''}
            onChange={e => setForm(f => ({ ...f, dos: e.target.value }))}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Don'ts</Label>
          <Textarea
            value={form.donts ?? ''}
            onChange={e => setForm(f => ({ ...f, donts: e.target.value }))}
            rows={2}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <CharCounter value={form.example_good ?? ''} max={500} />
          </div>
          <Textarea
            value={form.example_good ?? ''}
            onChange={e => setForm(f => ({ ...f, example_good: e.target.value.slice(0, 500) }))}
            rows={3}
            maxLength={500}
            placeholder="A high-quality example of this section..."
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Poor Example</Label>
            <CharCounter value={form.example_poor ?? ''} max={500} />
          </div>
          <Textarea
            value={form.example_poor ?? ''}
            onChange={e => setForm(f => ({ ...f, example_poor: e.target.value.slice(0, 500) }))}
            rows={3}
            maxLength={500}
            placeholder="A low-quality example to avoid..."
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_active}
            onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
          />
          <Label className="text-sm">{form.is_active ? 'Active' : 'Inactive'}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-1" />
            Preview Prompt
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {config.updated_at && (
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(config.updated_at).toLocaleString()}
        </p>
      )}

      {/* Preview Prompt Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Prompt Preview — {form.section_label}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto py-4">
            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-md border">
              {previewPrompt}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AIReviewConfigPage() {
  const { data: sections, isLoading: sectionsLoading, refetch: refetchSections } = useSectionConfigs();
  const { data: globalConfig, isLoading: globalLoading } = useGlobalConfig();
  const queryClient = useQueryClient();

  const [globalModel, setGlobalModel] = useState('');
  const [batchThreshold, setBatchThreshold] = useState(15);
  const [globalSaving, setGlobalSaving] = useState(false);

  useEffect(() => {
    if (globalConfig) {
      setGlobalModel(globalConfig.default_model);
      setBatchThreshold(globalConfig.batch_split_threshold);
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
          batch_split_threshold: batchThreshold,
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
          description="Configure per-section AI review rules, instructions, and tone for each role context. Changes take effect on the next review run."
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
                    <Input
                      value={globalModel}
                      onChange={e => setGlobalModel(e.target.value)}
                      placeholder="google/gemini-3-flash-preview"
                    />
                    <p className="text-xs text-muted-foreground">
                      Model identifier used by the AI gateway
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Batch Split Threshold</Label>
                    <Input
                      type="number"
                      value={batchThreshold}
                      onChange={e => setBatchThreshold(parseInt(e.target.value) || 15)}
                      min={5}
                      max={30}
                    />
                    <p className="text-xs text-muted-foreground">
                      If active sections exceed this, review splits into 2 batches
                    </p>
                  </div>
                  <Button onClick={handleSaveGlobal} disabled={globalSaving} className="w-fit">
                    <Save className="h-4 w-4 mr-1" />
                    {globalSaving ? 'Saving...' : 'Save Global Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Section Config Accordion */}
            <Accordion type="multiple" className="space-y-2">
              {ROLE_CONTEXT_ORDER.map(ctx => {
                const items = grouped[ctx] ?? [];
                if (items.length === 0) return null;
                const activeCount = items.filter(i => i.is_active).length;

                return (
                  <AccordionItem key={ctx} value={ctx} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{ROLE_CONTEXT_LABELS[ctx] ?? ctx}</span>
                        <Badge variant="outline" className="text-xs">
                          {activeCount}/{items.length} active
                        </Badge>
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
