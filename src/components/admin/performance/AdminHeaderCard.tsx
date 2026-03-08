import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminStatusBadge } from '@/components/admin/platform-admins/AdminStatusBadge';
import { WorkloadBar } from '@/components/admin/platform-admins/WorkloadBar';
import { ExpertiseTags } from '@/components/admin/platform-admins/ExpertiseTags';
import { Pencil, RefreshCw, UserCog } from 'lucide-react';

interface AdminHeaderCardProps {
  profile: {
    id: string;
    full_name: string;
    admin_tier: string;
    availability_status: string;
    current_active_verifications: number;
    max_concurrent_verifications: number;
    assignment_priority: number;
    industry_expertise: string[] | null;
    country_region_expertise: string[] | null;
    org_type_expertise: string[] | null;
  };
}

const TIER_LABELS: Record<string, string> = {
  supervisor: 'Supervisor',
  senior_admin: 'Senior Admin',
  admin: 'Admin',
};

export function AdminHeaderCard({ profile }: AdminHeaderCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="flex-1">
      <CardContent className="p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{profile.full_name}</h2>
              <Badge variant="secondary" className="text-xs capitalize">
                {TIER_LABELS[profile.admin_tier] || profile.admin_tier}
              </Badge>
              <AdminStatusBadge status={profile.availability_status} />
            </div>

            <div className="flex flex-col lg:flex-row gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Priority:</span>{' '}
                <span className="font-medium">{profile.assignment_priority}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Workload:</span>
                <WorkloadBar
                  current={profile.current_active_verifications}
                  max={profile.max_concurrent_verifications}
                />
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Industries</span>
                <ExpertiseTags ids={profile.industry_expertise || []} type="industry" max={5} />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Countries</span>
                <ExpertiseTags ids={profile.country_region_expertise || []} type="country" max={5} />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Org Types</span>
                <ExpertiseTags ids={profile.org_type_expertise || []} type="org_type" max={5} />
              </div>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/platform-admins/${profile.id}`)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              <span className="hidden lg:inline">Edit Profile</span>
            </Button>
            <Button variant="outline" size="sm" disabled title="Reassign all pending verifications">
              <RefreshCw className="h-4 w-4 mr-1" />
              <span className="hidden lg:inline">Reassign All</span>
            </Button>
            <Button variant="outline" size="sm" disabled title="Adjust availability status">
              <UserCog className="h-4 w-4 mr-1" />
              <span className="hidden lg:inline">Adjust Availability</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
