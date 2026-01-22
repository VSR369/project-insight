import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Search, SortAsc } from 'lucide-react';
import { ReviewerLayout } from '@/components/reviewer/ReviewerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CandidateCard, CandidateCardSkeleton, CandidateFiltersPanel } from '@/components/reviewer/candidates';
import { useReviewerCandidates, CandidateFilters } from '@/hooks/queries/useReviewerCandidates';
import { useReviewerByUserId } from '@/hooks/queries/usePanelReviewers';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/use-mobile';

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

export default function ReviewerCandidates() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: reviewer } = useReviewerByUserId(user?.id);
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filters, setFilters] = useState<CandidateFilters>({});
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, isLoading } = useReviewerCandidates(
    reviewer?.id,
    { ...filters, searchQuery: debouncedSearch },
    50
  );

  const sortedCandidates = useMemo(() => {
    if (!data?.candidates) return [];
    const candidates = [...data.candidates];
    
    switch (sortBy) {
      case 'newest':
        return candidates.sort((a, b) => b.lifecycleRank - a.lifecycleRank);
      case 'oldest':
        return candidates.sort((a, b) => a.lifecycleRank - b.lifecycleRank);
      case 'name-asc':
        return candidates.sort((a, b) => a.providerName.localeCompare(b.providerName));
      case 'name-desc':
        return candidates.sort((a, b) => b.providerName.localeCompare(a.providerName));
      default:
        return candidates;
    }
  }, [data?.candidates, sortBy]);

  const handleOpenProfile = (enrollmentId: string) => {
    navigate(`/reviewer/candidates/${enrollmentId}`);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('q', value);
    } else {
      params.delete('q');
    }
    setSearchParams(params, { replace: true });
  };

  return (
    <ReviewerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Candidate Queue</h1>
          <p className="text-muted-foreground">
            Review and manage enrolled solution providers
          </p>
        </div>

        {/* Search and Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or industry..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <SortAsc className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content with Filter Sidebar */}
        <div className="flex gap-6">
          {/* Left Filter Rail */}
          <div className="hidden lg:block w-72 shrink-0">
            <CandidateFiltersPanel filters={filters} onFiltersChange={setFilters} />
          </div>

          {/* Results Area */}
          <div className="flex-1 space-y-4">
            {/* Results Header */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {sortedCandidates.length} of {data?.total || 0} providers
              </span>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <CandidateCardSkeleton key={i} />
                ))}
              </div>
            ) : sortedCandidates.length === 0 ? (
              /* Empty State */
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || Object.keys(filters).length > 0
                      ? "No candidates match your search or filter criteria."
                      : "There are no candidates in your queue at the moment."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              /* Candidates List */
              <div className="space-y-4">
                {sortedCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.enrollmentId}
                    candidate={candidate}
                    onOpenProfile={handleOpenProfile}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ReviewerLayout>
  );
}
