import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, AlertCircle, CheckCircle, Clock, Eye } from 'lucide-react';
import { ReviewerLayout } from '@/components/reviewer/ReviewerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useActionRequiredEnrollments, useNewEnrollmentSubmissions, ActionRequiredEnrollment, NewEnrollmentSubmission } from '@/hooks/queries/useReviewerDashboard';
import { useReviewerByUserId } from '@/hooks/queries/usePanelReviewers';
import { useAuth } from '@/hooks/useAuth';

type ViewFilter = 'all' | 'action-required' | 'new-submissions';

export default function ReviewerCandidates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: reviewer } = useReviewerByUserId(user?.id);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: actionRequired, isLoading: loadingAction } = useActionRequiredEnrollments(reviewer?.id, 50);
  const { data: newSubmissions, isLoading: loadingNew } = useNewEnrollmentSubmissions(reviewer?.id, 50);

  const isLoading = loadingAction || loadingNew;

  type EnrollmentWithType = (ActionRequiredEnrollment & { type: 'action-required'; flagReason?: string }) | 
                           (NewEnrollmentSubmission & { type: 'new-submission' });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assessment_passed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Assessment Passed</Badge>;
      case 'interview_scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Interview Scheduled</Badge>;
      case 'panel_discussion':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Panel Discussion</Badge>;
      default:
        return <Badge variant="outline">{status?.replace(/_/g, ' ')}</Badge>;
    }
  };

  // Combine and dedupe enrollments based on filter
  const allEnrollments: EnrollmentWithType[] = [
    ...(actionRequired || []).map(e => ({ 
      ...e, 
      type: 'action-required' as const,
      flagReason: e.flagForClarification ? 'Flagged for clarification' : e.reviewerNotes || undefined
    })),
    ...(newSubmissions || []).map(e => ({ ...e, type: 'new-submission' as const })),
  ];

  // Deduplicate by enrollmentId
  const uniqueEnrollments = allEnrollments.reduce<EnrollmentWithType[]>((acc, current) => {
    const exists = acc.find(e => e.enrollmentId === current.enrollmentId);
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);

  // Apply filters
  const filteredEnrollments = uniqueEnrollments.filter(enrollment => {
    // View filter
    if (viewFilter === 'action-required' && enrollment.type !== 'action-required') return false;
    if (viewFilter === 'new-submissions' && enrollment.type !== 'new-submission') return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        enrollment.providerName.toLowerCase().includes(query) ||
        enrollment.industryName.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  return (
    <ReviewerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Candidate Queue</h1>
          <p className="text-muted-foreground">
            Review and manage enrolled candidates
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or industry..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={viewFilter} onValueChange={(v) => setViewFilter(v as ViewFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Candidates</SelectItem>
                <SelectItem value="action-required">Action Required</SelectItem>
                <SelectItem value="new-submissions">New Submissions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{actionRequired?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Action Required</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{newSubmissions?.length || 0}</p>
                <p className="text-sm text-muted-foreground">New Submissions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueEnrollments.length}</p>
                <p className="text-sm text-muted-foreground">Total in Queue</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Candidates List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                    <Skeleton className="h-8 w-[80px]" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredEnrollments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "No candidates match your search criteria."
                  : "There are no candidates in your queue at the moment."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredEnrollments.map((enrollment) => (
              <Card key={enrollment.enrollmentId} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{enrollment.providerName}</span>
                        {getStatusBadge(enrollment.lifecycleStatus)}
                        {enrollment.type === 'action-required' && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Action Required
                          </Badge>
                        )}
                        {enrollment.type === 'new-submission' && (
                          <Badge className="bg-blue-600 gap-1">
                            <Clock className="h-3 w-3" />
                            New
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{enrollment.industryName}</span>
                        <span>•</span>
                        <span>{enrollment.expertiseLevelName}</span>
                      </div>
                      {enrollment.type === 'action-required' && 'flagReason' in enrollment && enrollment.flagReason && (
                        <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                          {enrollment.flagReason}
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                      onClick={() => navigate(`/reviewer/candidates/${enrollment.enrollmentId}`)}
                    >
                      <Eye className="h-4 w-4" />
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ReviewerLayout>
  );
}
