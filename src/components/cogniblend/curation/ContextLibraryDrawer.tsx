/**
 * ContextLibraryDrawer — Full-featured slide-over drawer for managing context sources.
 * Split-panel layout: source list (left) + detail/digest (right).
 */

import React, { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search, Upload, Link, Sparkles, ChevronDown, Trash2,
  Globe, FileText, CheckCircle, Clock, XCircle, RefreshCw, BookOpen, X
} from 'lucide-react';
import {
  useContextSources,
  useContextDigest,
  useDiscoverSources,
  useAcceptSuggestion,
  useRejectSuggestion,
  useAcceptMultipleSuggestions,
  useRejectAllSuggestions,
  useAddContextUrl,
  useDeleteContextSource,
  useUpdateSourceSharing,
  useUpdateSourceSections,
  useRegenerateDigest,
  type ContextSource,
} from '@/hooks/cogniblend/useContextLibrary';

interface ContextLibraryDrawerProps {
  challengeId: string;
  challengeTitle: string;
  open: boolean;
  onClose: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  problem_statement: 'Problem Statement',
  context_and_background: 'Context & Background',
  deliverables: 'Deliverables',
  data_resources_provided: 'Data & Resources',
  evaluation_criteria: 'Evaluation Criteria',
  scope: 'Scope',
  success_metrics_kpis: 'Success Metrics',
  affected_stakeholders: 'Stakeholders',
  expected_outcomes: 'Expected Outcomes',
  phase_schedule: 'Timeline',
  reward_structure: 'Reward Structure',
  solver_expertise: 'Solver Expertise',
  submission_guidelines: 'Submission Guidelines',
  ip_model: 'IP & Licensing',
  current_deficiencies: 'Deficiencies',
  root_causes: 'Root Causes',
  preferred_approach: 'Preferred Approach',
  approaches_not_of_interest: 'Excluded Approaches',
};

function ExtractionBadge({ status }: { status: string | null }) {
  switch (status) {
    case 'completed':
      return <Badge variant="outline" className="text-xs gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" />Extracted</Badge>;
    case 'processing':
      return <Badge variant="outline" className="text-xs gap-1 text-amber-600"><Clock className="h-3 w-3 animate-spin" />Extracting...</Badge>;
    case 'failed':
      return <Badge variant="outline" className="text-xs gap-1 text-destructive"><XCircle className="h-3 w-3" />Failed</Badge>;
    default:
      return <Badge variant="outline" className="text-xs text-muted-foreground">Pending</Badge>;
  }
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-muted-foreground';
  return <span className={`text-xs font-medium ${color}`}>{pct}%</span>;
}

export function ContextLibraryDrawer({ challengeId, challengeTitle, open, onClose }: ContextLibraryDrawerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlSection, setUrlSection] = useState('problem_statement');
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());
  const [digestExpanded, setDigestExpanded] = useState(true);

  const { data: sources = [], isLoading } = useContextSources(challengeId);
  const { data: digest } = useContextDigest(challengeId);
  const discover = useDiscoverSources(challengeId);
  const acceptOne = useAcceptSuggestion(challengeId);
  const rejectOne = useRejectSuggestion(challengeId);
  const acceptMultiple = useAcceptMultipleSuggestions(challengeId);
  const rejectAll = useRejectAllSuggestions(challengeId);
  const addUrl = useAddContextUrl(challengeId);
  const deleteSource = useDeleteContextSource(challengeId);
  const updateSharing = useUpdateSourceSharing(challengeId);
  const updateSection = useUpdateSourceSections(challengeId);
  const regenDigest = useRegenerateDigest(challengeId);

  const accepted = useMemo(() => sources.filter(s => s.discovery_status === 'accepted'), [sources]);
  const suggested = useMemo(() => sources.filter(s => s.discovery_status === 'suggested'), [sources]);
  const selectedSource = useMemo(() => sources.find(s => s.id === selectedId) || null, [sources, selectedId]);

  const filtered = useMemo(() => {
    if (!searchTerm) return { accepted, suggested };
    const term = searchTerm.toLowerCase();
    return {
      accepted: accepted.filter(s => matchSource(s, term)),
      suggested: suggested.filter(s => matchSource(s, term)),
    };
  }, [accepted, suggested, searchTerm]);

  function matchSource(s: ContextSource, term: string): boolean {
    return (
      (s.display_name || s.file_name || s.url_title || s.source_url || '').toLowerCase().includes(term) ||
      (s.section_key || '').toLowerCase().includes(term) ||
      (s.resource_type || '').toLowerCase().includes(term)
    );
  }

  // Group accepted by section
  const groupedAccepted = useMemo(() => {
    const groups: Record<string, ContextSource[]> = {};
    for (const s of filtered.accepted) {
      if (!groups[s.section_key]) groups[s.section_key] = [];
      groups[s.section_key].push(s);
    }
    return groups;
  }, [filtered.accepted]);

  const toggleSuggestion = (id: string) => {
    setSelectedSuggestionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAcceptSelected = () => {
    const ids = Array.from(selectedSuggestionIds);
    if (ids.length > 0) {
      acceptMultiple.mutate(ids);
      setSelectedSuggestionIds(new Set());
    }
  };

  const handleAddUrl = () => {
    if (!urlValue.trim()) return;
    addUrl.mutate({ url: urlValue.trim(), sectionKey: urlSection });
    setUrlValue('');
    setShowUrlInput(false);
  };

  const displayName = (s: ContextSource) =>
    s.display_name || s.url_title || s.file_name || s.source_url?.substring(0, 60) || 'Untitled';

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-[900px] sm:max-w-[900px] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <SheetHeader className="shrink-0 p-4 pb-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />
              Context Library
            </SheetTitle>
          </div>
          <p className="text-sm text-muted-foreground truncate">{challengeTitle}</p>

          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => discover.mutate()}
              disabled={discover.isPending}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              {discover.isPending ? 'Discovering...' : 'Discover Sources'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowUrlInput(!showUrlInput)}>
              <Link className="h-4 w-4 mr-1" />Add URL
            </Button>
            <div className="flex-1" />
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sources..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 h-8 w-48 text-sm"
              />
            </div>
          </div>

          {/* URL input */}
          {showUrlInput && (
            <div className="flex items-center gap-2 mt-2">
              <Input
                placeholder="https://..."
                value={urlValue}
                onChange={e => setUrlValue(e.target.value)}
                className="h-8 text-sm flex-1"
                onKeyDown={e => { if (e.key === 'Enter') handleAddUrl(); }}
              />
              <Select value={urlSection} onValueChange={setUrlSection}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SECTION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAddUrl} disabled={!urlValue.trim() || addUrl.isPending}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowUrlInput(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </SheetHeader>

        {/* Body: two-column layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left: source list */}
          <ScrollArea className="w-[40%] border-r">
            <div className="p-3 space-y-4">
              {/* Suggested sources */}
              {filtered.suggested.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-primary">AI Suggested ({filtered.suggested.length})</h4>
                  </div>
                  <div className="space-y-1">
                    {filtered.suggested.map(s => (
                      <div
                        key={s.id}
                        className={`p-2 rounded-md cursor-pointer hover:bg-muted/50 border text-sm ${selectedId === s.id ? 'bg-muted border-primary/30' : 'border-transparent'}`}
                        onClick={() => setSelectedId(s.id)}
                      >
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={selectedSuggestionIds.has(s.id)}
                            onCheckedChange={() => toggleSuggestion(s.id)}
                            onClick={e => e.stopPropagation()}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-primary shrink-0" />
                              <span className="truncate font-medium text-xs">{displayName(s)}</span>
                              <ConfidenceBadge score={s.confidence_score} />
                            </div>
                            {s.relevance_explanation && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{s.relevance_explanation}</p>
                            )}
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              <Badge variant="secondary" className="text-[10px] h-4">{SECTION_LABELS[s.section_key] || s.section_key}</Badge>
                              {s.resource_type && <Badge variant="outline" className="text-[10px] h-4">{s.resource_type}</Badge>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="text-xs h-7"
                      onClick={handleAcceptSelected}
                      disabled={selectedSuggestionIds.size === 0 || acceptMultiple.isPending}
                    >
                      Accept Selected ({selectedSuggestionIds.size})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => rejectAll.mutate()}
                      disabled={rejectAll.isPending}
                    >
                      Reject All
                    </Button>
                  </div>
                  <Separator className="mt-3" />
                </div>
              )}

              {/* Accepted sources grouped by section */}
              {Object.entries(groupedAccepted).map(([sectionKey, items]) => (
                <div key={sectionKey}>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">
                    {SECTION_LABELS[sectionKey] || sectionKey} ({items.length})
                  </h4>
                  <div className="space-y-1">
                    {items.map(s => (
                      <div
                        key={s.id}
                        className={`p-2 rounded-md cursor-pointer hover:bg-muted/50 text-sm flex items-start gap-2 ${selectedId === s.id ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedId(s.id)}
                      >
                        {s.source_type === 'url' ? (
                          <Globe className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{displayName(s)}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <ExtractionBadge status={s.extraction_status} />
                            {s.resource_type && <Badge variant="outline" className="text-[10px] h-4">{s.resource_type}</Badge>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {filtered.accepted.length === 0 && filtered.suggested.length === 0 && !isLoading && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No sources yet. Click "Discover Sources" to find relevant context.
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Right: detail panel */}
          <div className="flex-1 flex flex-col min-h-0">
            {selectedSource ? (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Source header */}
                  <div>
                    <h3 className="text-sm font-semibold">{displayName(selectedSource)}</h3>
                    {selectedSource.source_url && (
                      <a href={selectedSource.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                        {selectedSource.source_url}
                      </a>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <ExtractionBadge status={selectedSource.extraction_status} />
                      {selectedSource.resource_type && <Badge variant="outline" className="text-xs">{selectedSource.resource_type}</Badge>}
                      <Badge variant="secondary" className="text-xs">
                        {selectedSource.discovery_source === 'ai_suggested' ? '🤖 AI Discovered' : '📎 Manual'}
                      </Badge>
                    </div>
                  </div>

                  {/* Suggestion actions */}
                  {selectedSource.discovery_status === 'suggested' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => acceptOne.mutate(selectedSource.id)} disabled={acceptOne.isPending}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => rejectOne.mutate(selectedSource.id)} disabled={rejectOne.isPending}>Reject</Button>
                    </div>
                  )}

                  <Separator />

                  {/* Content tabs */}
                  <Tabs defaultValue="summary">
                    <TabsList className="h-8">
                      <TabsTrigger value="summary" className="text-xs h-7">Summary</TabsTrigger>
                      <TabsTrigger value="full_text" className="text-xs h-7">Full Text</TabsTrigger>
                      <TabsTrigger value="key_data" className="text-xs h-7">Key Data</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary" className="mt-2">
                      {selectedSource.extracted_summary ? (
                        <p className="text-sm whitespace-pre-wrap">{selectedSource.extracted_summary}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No summary available yet.</p>
                      )}
                    </TabsContent>
                    <TabsContent value="full_text" className="mt-2">
                      <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-3 rounded-md max-h-[400px] overflow-y-auto">
                        {selectedSource.extracted_text || 'No text extracted yet.'}
                      </pre>
                    </TabsContent>
                    <TabsContent value="key_data" className="mt-2">
                      {selectedSource.extracted_key_data ? (
                        <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                          {JSON.stringify(selectedSource.extracted_key_data, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-sm text-muted-foreground">No structured data extracted yet.</p>
                      )}
                    </TabsContent>
                  </Tabs>

                  <Separator />

                  {/* Section linkage */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground shrink-0">Section:</span>
                    <Select
                      value={selectedSource.section_key}
                      onValueChange={(v) => updateSection.mutate({ id: selectedSource.id, sectionKey: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SECTION_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sharing toggle */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground">Share with solvers:</span>
                    <Switch
                      checked={selectedSource.shared_with_solver}
                      onCheckedChange={(v) => updateSharing.mutate({ id: selectedSource.id, shared: v })}
                    />
                  </div>

                  {/* Delete */}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs"
                    onClick={() => {
                      deleteSource.mutate(selectedSource);
                      setSelectedId(null);
                    }}
                    disabled={deleteSource.isPending}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />Delete Source
                  </Button>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Select a source to view details
              </div>
            )}

            {/* Digest section at bottom */}
            <div className="shrink-0 border-t">
              <Collapsible open={digestExpanded} onOpenChange={setDigestExpanded}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Context Digest
                    {digest?.source_count != null && (
                      <Badge variant="secondary" className="text-xs">{digest.source_count} sources</Badge>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        regenDigest.mutate();
                      }}
                      disabled={regenDigest.isPending}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${regenDigest.isPending ? 'animate-spin' : ''}`} />
                      {regenDigest.isPending ? 'Generating...' : 'Regenerate'}
                    </Button>
                    <ChevronDown className={`h-4 w-4 transition-transform ${digestExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ScrollArea className="max-h-[200px]">
                    <div className="px-3 pb-3">
                      {digest?.digest_text ? (
                        <p className="text-xs whitespace-pre-wrap text-muted-foreground">{digest.digest_text}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">No digest generated yet. Add sources and click "Regenerate".</p>
                      )}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
