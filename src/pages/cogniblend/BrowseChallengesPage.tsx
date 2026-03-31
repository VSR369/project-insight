/**
 * BrowseChallengesPage — Marketplace view for discovering challenges.
 * Route: /cogni/browse
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Loader2, Target, Calendar, Building2,
  ArrowRight, Clock, Inbox,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useBrowseChallenges, type BrowseChallengeItem } from '@/hooks/cogniblend/useBrowseChallenges';
import { formatDistanceToNow } from 'date-fns';

/* ─── Status helpers ─────────────────────────────────────── */

function statusBadge(masterStatus: string | null): { label: string; className: string } {
  switch (masterStatus) {
    case 'ACTIVE':
      return { label: 'Active', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'IN_PREPARATION':
      return { label: 'In Preparation', className: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'COMPLETED':
      return { label: 'Completed', className: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'CANCELLED':
      return { label: 'Cancelled', className: 'bg-red-100 text-red-800 border-red-300' };
    default:
      return { label: masterStatus || 'Draft', className: 'bg-muted text-muted-foreground border-border' };
  }
}

function truncate(text: string | null, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

/* ─── Challenge Card ─────────────────────────────────────── */

function ChallengeCard({ challenge }: { challenge: BrowseChallengeItem }) {
  const navigate = useNavigate();
  const status = statusBadge(challenge.master_status);
  const displayName = challenge.trade_brand_name || challenge.organization_name || 'Unknown Org';
  const summary = challenge.hook || challenge.problem_statement;
  const timeAgo = formatDistanceToNow(new Date(challenge.created_at), { addSuffix: true });

  return (
    <Card
      className="group cursor-pointer hover:shadow-md transition-shadow border-border"
      onClick={() => navigate(`/cogni/challenges/${challenge.id}/view`)}
    >
      <CardContent className="p-5 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
            {challenge.title}
          </h3>
          <Badge variant="outline" className={`shrink-0 text-xs ${status.className}`}>
            {status.label}
          </Badge>
        </div>

        {/* Summary */}
        {summary && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {truncate(summary, 200)}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-1">
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" />
            {displayName}
          </span>
          {challenge.industry_name && (
            <span className="inline-flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              {challenge.industry_name}
            </span>
          )}
          {challenge.submission_deadline && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Due {new Date(challenge.submission_deadline).toLocaleDateString()}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {timeAgo}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-2">
            {challenge.complexity_level && (
              <Badge variant="secondary" className="text-xs">
                {challenge.complexity_level}
              </Badge>
            )}
            {challenge.maturity_level && (
              <Badge variant="secondary" className="text-xs capitalize">
                {challenge.maturity_level}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            View Details <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Empty State ────────────────────────────────────────── */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-1">No challenges found</h3>
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */

export default function BrowseChallengesPage() {
  const { data: challenges, isLoading, error } = useBrowseChallenges();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [complexityFilter, setComplexityFilter] = useState('all');

  // Extract unique filter options from data
  const { industries, complexities } = useMemo(() => {
    if (!challenges) return { industries: [], complexities: [] };
    const indSet = new Set<string>();
    const cmpSet = new Set<string>();
    for (const c of challenges) {
      if (c.industry_name) indSet.add(c.industry_name);
      if (c.complexity_level) cmpSet.add(c.complexity_level);
    }
    return {
      industries: Array.from(indSet).sort(),
      complexities: Array.from(cmpSet).sort(),
    };
  }, [challenges]);

  const filtered = useMemo(() => {
    if (!challenges) return [];
    let list = challenges;

    // Tab filter
    if (activeTab === 'active') {
      list = list.filter(c => c.master_status === 'ACTIVE');
    } else if (activeTab === 'preparation') {
      list = list.filter(c => c.master_status === 'IN_PREPARATION');
    } else if (activeTab === 'published') {
      list = list.filter(c => !!c.published_at);
    }

    // Industry filter
    if (industryFilter !== 'all') {
      list = list.filter(c => c.industry_name === industryFilter);
    }

    // Complexity filter
    if (complexityFilter !== 'all') {
      list = list.filter(c => c.complexity_level === complexityFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.problem_statement?.toLowerCase().includes(q) ||
        c.organization_name?.toLowerCase().includes(q) ||
        c.industry_name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [challenges, activeTab, searchQuery, industryFilter, complexityFilter]);

  const counts = useMemo(() => {
    if (!challenges) return { all: 0, active: 0, preparation: 0, published: 0 };
    return {
      all: challenges.length,
      active: challenges.filter(c => c.master_status === 'ACTIVE').length,
      preparation: challenges.filter(c => c.master_status === 'IN_PREPARATION').length,
      published: challenges.filter(c => !!c.published_at).length,
    };
  }, [challenges]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Browse Challenges</h1>
        <p className="text-muted-foreground mt-1">
          Discover and explore innovation challenges across the platform.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search challenges by title, org, or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-base"
          />
        </div>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-full lg:w-[200px]">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map((ind) => (
              <SelectItem key={ind} value={ind}>{ind}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={complexityFilter} onValueChange={setComplexityFilter}>
          <SelectTrigger className="w-full lg:w-[200px]">
            <SelectValue placeholder="Complexity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Complexity</SelectItem>
            {complexities.map((cmp) => (
              <SelectItem key={cmp} value={cmp}>{cmp}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
          <TabsTrigger value="preparation">In Preparation ({counts.preparation})</TabsTrigger>
          <TabsTrigger value="published">Published ({counts.published})</TabsTrigger>
        </TabsList>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading challenges…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load challenges: {error.message}
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && (
          <>
            <TabsContent value={activeTab} className="mt-4">
              {filtered.length === 0 ? (
                <EmptyState
                  message={
                    searchQuery
                      ? 'No challenges match your search. Try different keywords.'
                      : activeTab === 'published'
                      ? 'No challenges have been published yet. Challenges appear here once they pass curation and are approved.'
                      : 'No challenges in this category yet.'
                  }
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filtered.map((challenge) => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                  ))}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
