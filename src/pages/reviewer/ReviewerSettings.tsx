import { User, Bell, Calendar, Shield } from 'lucide-react';
import { ReviewerLayout } from '@/components/reviewer/ReviewerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReviewerByUserId } from '@/hooks/queries/usePanelReviewers';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { useExpertiseLevels } from '@/hooks/queries/useExpertiseLevels';
import { useAuth } from '@/hooks/useAuth';

export default function ReviewerSettings() {
  const { user } = useAuth();
  const { data: reviewer, isLoading: loadingReviewer } = useReviewerByUserId(user?.id);
  const { data: industries } = useIndustrySegments();
  const { data: levels } = useExpertiseLevels();

  const getIndustryNames = (ids: string[]) => {
    if (!industries) return [];
    return ids.map(id => industries.find(i => i.id === id)?.name).filter(Boolean) as string[];
  };

  const getLevelNames = (ids: string[]) => {
    if (!levels) return [];
    return ids.map(id => levels.find(l => l.id === id)?.name).filter(Boolean) as string[];
  };

  if (loadingReviewer) {
    return (
      <ReviewerLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
      </ReviewerLayout>
    );
  }

  return (
    <ReviewerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your reviewer profile and preferences
          </p>
        </div>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Profile Information</CardTitle>
            </div>
            <CardDescription>
              Your basic profile information as a panel reviewer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={reviewer?.name || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" value={reviewer?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={reviewer?.phone || 'Not provided'} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" value={reviewer?.timezone || 'UTC'} disabled />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Contact your administrator to update profile information.
            </p>
          </CardContent>
        </Card>

        {/* Specializations */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Specializations</CardTitle>
            </div>
            <CardDescription>
              Industries and expertise levels you're qualified to review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Industry Segments</Label>
              <div className="flex flex-wrap gap-2">
                {reviewer?.industry_segment_ids && getIndustryNames(reviewer.industry_segment_ids).length > 0 ? (
                  getIndustryNames(reviewer.industry_segment_ids).map((name) => (
                    <Badge key={name} variant="secondary">{name}</Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No industries assigned</p>
                )}
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Expertise Levels</Label>
              <div className="flex flex-wrap gap-2">
                {reviewer?.expertise_level_ids && getLevelNames(reviewer.expertise_level_ids).length > 0 ? (
                  getLevelNames(reviewer.expertise_level_ids).map((name) => (
                    <Badge key={name} variant="outline">{name}</Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No expertise levels assigned</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Availability Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Availability Preferences</CardTitle>
            </div>
            <CardDescription>
              Configure your interview capacity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Maximum Interviews Per Day</Label>
                <p className="text-sm text-muted-foreground">
                  Limit the number of interviews you can be assigned per day
                </p>
              </div>
              <Input 
                type="number" 
                className="w-20" 
                value={reviewer?.max_interviews_per_day || 3} 
                disabled 
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notification Preferences</CardTitle>
            </div>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications for new interviews and updates
                </p>
              </div>
              <Switch checked disabled />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Interview Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Receive reminder emails before scheduled interviews
                </p>
              </div>
              <Switch checked disabled />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>New Candidate Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new candidates are assigned to you
                </p>
              </div>
              <Switch checked disabled />
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Notification preferences are managed by the platform administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    </ReviewerLayout>
  );
}
