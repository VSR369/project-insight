/**
 * Provider Dashboard Page
 * 
 * Composes profile completion, certification, performance radar,
 * and quick-stats into a unified dashboard view.
 */

import { useAuth } from '@/hooks/useAuth';
import { useProviderProfileExtended } from '@/hooks/queries/useProviderProfile';
import { ProfileCompletionBar } from '@/components/enrollment/ProfileCompletionBar';
import { CertificationBadgeBar } from '@/components/enrollment/CertificationBadgeBar';
import { PerformanceRadar } from '@/components/enrollment/PerformanceRadar';
import { ProfileStrengthMeter } from '@/components/proof-points/ProfileStrengthMeter';
import { StarRating } from '@/components/ui/StarRating';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useResolvedCertification } from '@/hooks/queries/useProviderCertifications';
import { useProviderPerformanceScore } from '@/hooks/queries/useProviderPerformanceScore';
import { User, Shield, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProviderDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // We need the provider ID from solution_providers
  const { data: profile, isLoading: profileLoading } = useProviderProfileExtended(
    undefined // Will be populated once we wire provider lookup by user_id
  );

  // For now show a layout skeleton if no provider linked
  const providerId = profile?.id;

  return (
    <div className="container max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Provider Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your profile, certification, and performance
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/enroll/registration')}>
          Edit Profile <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Top row — Profile + Certification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Completion */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Profile Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {providerId ? (
              <ProfileCompletionBar providerId={providerId} />
            ) : (
              <ProfilePlaceholder loading={profileLoading} />
            )}
          </CardContent>
        </Card>

        {/* Certification Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Certification
            </CardTitle>
          </CardHeader>
          <CardContent>
            {providerId ? (
              <CertificationBadgeBar providerId={providerId} />
            ) : (
              <ProfilePlaceholder loading={profileLoading} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row — Performance Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {providerId ? (
          <PerformanceRadar providerId={providerId} className="lg:col-span-2" />
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProfilePlaceholder loading={profileLoading} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ProfilePlaceholder({ loading }: { loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    );
  }

  return (
    <div className="text-center py-6">
      <p className="text-sm text-muted-foreground">
        No provider profile found. Complete enrollment to view your dashboard.
      </p>
      <Button variant="outline" size="sm" className="mt-3">
        Start Enrollment
      </Button>
    </div>
  );
}
