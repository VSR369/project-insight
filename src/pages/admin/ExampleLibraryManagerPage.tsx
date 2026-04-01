/**
 * ExampleLibraryManagerPage — Admin UI for managing harvested section examples.
 *
 * Table view, filter by section/tier, toggle active, view content.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { BookOpen, Filter, ArrowUpCircle } from 'lucide-react';

const TIER_COLORS: Record<string, string> = {
  excellent: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  good: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  poor: 'bg-destructive/10 text-destructive border-destructive/30',
};

export default function ExampleLibraryManagerPage() {
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterSection, setFilterSection] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: examples, isLoading } = useQuery({
    queryKey: ['section-examples', filterTier, filterSection],
    queryFn: async () => {
      let query = supabase
        .from('section_example_library' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (filterTier !== 'all') query = query.eq('quality_tier', filterTier);
      if (filterSection !== 'all') query = query.eq('section_key', filterSection);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('section_example_library' as any)
        .update({ is_active: isActive } as any)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-examples'] });
      toast.success('Example updated');
    },
  });

  const promoteToConfig = useMutation({
    mutationFn: async ({ sectionKey, content }: { sectionKey: string; content: string }) => {
      const { error } = await supabase
        .from('ai_review_section_config')
        .update({ example_good: content })
        .eq('section_key', sectionKey);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Example promoted to AI config (example_good)');
    },
    onError: (err: Error) => {
      toast.error(`Promote failed: ${err.message}`);
    },
  });

  const uniqueSections = [...new Set((examples ?? []).map((e: any) => e.section_key))].sort();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Example Library
        </h1>
        <p className="text-sm text-muted-foreground">
          Harvested section examples used as few-shot prompts for AI generation.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Quality Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="excellent">Excellent</SelectItem>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="poor">Poor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSection} onValueChange={setFilterSection}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {uniqueSections.map((s: string) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{examples?.length ?? 0} examples</Badge>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative w-full overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Section</th>
                  <th className="pb-2 font-medium text-muted-foreground">Tier</th>
                  <th className="pb-2 font-medium text-muted-foreground">Source</th>
                  <th className="pb-2 font-medium text-muted-foreground">Maturity</th>
                  <th className="pb-2 font-medium text-muted-foreground">Annotation</th>
                  <th className="pb-2 font-medium text-muted-foreground">Active</th>
                  <th className="pb-2 font-medium text-muted-foreground">Uses</th>
                  <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(examples ?? []).map((ex: any) => (
                  <tr key={ex.id} className="border-b last:border-0">
                    <td className="py-2">{ex.section_key.replace(/_/g, ' ')}</td>
                    <td className="py-2">
                      <Badge variant="outline" className={TIER_COLORS[ex.quality_tier]}>
                        {ex.quality_tier}
                      </Badge>
                    </td>
                    <td className="py-2 font-mono text-xs">
                      {ex.source_challenge_id?.slice(0, 8) ?? '—'}
                    </td>
                    <td className="py-2 text-xs">{ex.maturity_level ?? '—'}</td>
                    <td className="py-2 text-xs max-w-[200px] truncate">{ex.annotation ?? '—'}</td>
                    <td className="py-2">
                      <Switch
                        checked={ex.is_active}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: ex.id, isActive: checked })}
                      />
                    </td>
                    <td className="py-2 text-muted-foreground">{ex.usage_count}</td>
                    <td className="py-2">
                      {ex.quality_tier === 'excellent' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => promoteToConfig.mutate({ sectionKey: ex.section_key, content: ex.content })}
                          disabled={promoteToConfig.isPending}
                          title="Promote to AI Config example_good"
                        >
                          <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
                          Promote
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!examples || examples.length === 0) && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No examples yet. Examples are harvested when high-quality challenges are published.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
