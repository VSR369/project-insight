/**
 * Certification Page
 * 
 * Placeholder page for Step 9 of enrollment - Final Certification stage
 * Shown when lifecycle_status = 'panel_completed', 'verified', or 'certified'
 */

import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, ArrowLeft, CheckCircle2, Download, Star, Trophy } from 'lucide-react';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';

export default function Certification() {
  const navigate = useNavigate();
  const { activeEnrollment } = useEnrollmentContext();
  
  const lifecycleStatus = activeEnrollment?.lifecycle_status;
  
  const getStatusConfig = () => {
    switch (lifecycleStatus) {
      case 'certified':
        return {
          badge: 'Certified',
          badgeVariant: 'default' as const,
          icon: Trophy,
          iconColor: 'text-yellow-500',
          title: 'Congratulations! You are Certified',
          description: 'You have successfully completed all verification steps.',
        };
      case 'verified':
        return {
          badge: 'Verified',
          badgeVariant: 'secondary' as const,
          icon: CheckCircle2,
          iconColor: 'text-green-500',
          title: 'You are Verified',
          description: 'Your expertise has been verified by our panel.',
        };
      case 'panel_completed':
        return {
          badge: 'Under Review',
          badgeVariant: 'outline' as const,
          icon: Star,
          iconColor: 'text-blue-500',
          title: 'Panel Review Complete',
          description: 'Your interview is complete. Results are being processed.',
        };
      default:
        return {
          badge: 'Pending',
          badgeVariant: 'outline' as const,
          icon: Award,
          iconColor: 'text-muted-foreground',
          title: 'Certification Pending',
          description: 'Complete all enrollment steps to get certified.',
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">Certification</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Step 9 of 9
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Your certification status and credentials
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4`}>
                <StatusIcon className={`h-10 w-10 ${config.iconColor}`} />
              </div>
              
              <Badge variant={config.badgeVariant} className="mb-4">
                {config.badge}
              </Badge>
              
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {config.title}
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {config.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Certificate Download (for verified/certified) */}
        {(lifecycleStatus === 'verified' || lifecycleStatus === 'certified') && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Your Certificate
              </CardTitle>
              <CardDescription>
                Download your official certification document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Download Certificate (Coming Soon)
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Certificate download will be available soon.
              </p>
            </CardContent>
          </Card>
        )}

        {/* What's Next */}
        <Card>
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span>Your profile will be visible to seekers looking for expertise</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span>You can enroll in additional industry segments from the dashboard</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span>Keep your proof points updated to maintain your certification</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
