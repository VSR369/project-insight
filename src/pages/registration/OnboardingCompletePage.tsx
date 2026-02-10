/**
 * OnboardingCompletePage — Post-registration welcome page (Step 6 / Completion).
 * Shown after billing submission.
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, Building2, Briefcase, Users, Settings } from 'lucide-react';

export default function OnboardingCompletePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to CogniBlend!</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Your organization has been registered successfully. Here's what you can do next.
          </p>
        </div>

        {/* Next Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/org/challenges/create')}>
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Create a Challenge</p>
                <p className="text-sm text-muted-foreground">Post your first challenge and find solutions.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/org/team')}>
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Invite Team Members</p>
                <p className="text-sm text-muted-foreground">Add colleagues to collaborate.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/org/settings')}>
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Complete Your Profile</p>
                <p className="text-sm text-muted-foreground">Customize your organization profile.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/org/billing')}>
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">View Billing</p>
                <p className="text-sm text-muted-foreground">Monitor usage and manage subscription.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button size="lg" onClick={() => navigate('/org/dashboard')}>
            Go to Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
