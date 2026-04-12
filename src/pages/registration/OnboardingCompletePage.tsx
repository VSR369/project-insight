/**
 * OnboardingCompletePage — Post-registration welcome page (Step 6 / Completion).
 * Redesigned with checklist pattern, tips footer, hero section.
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle2, ArrowRight, Users, FileText, Search, Lightbulb, BookOpen, Circle,
} from 'lucide-react';

export default function OnboardingCompletePage() {
  const navigate = useNavigate();

  const checklistItems = [
    {
      icon: Users,
      title: 'Invite Seekers, Solution Managers, Solution Heads and Assessors',
      description: 'Build your team by inviting colleagues to collaborate on challenges.',
      action: 'Invite Users',
      route: '/org/team',
    },
    {
      icon: FileText,
      title: 'Post your first challenge',
      description: 'Describe your problem and connect with vetted solution providers.',
      action: 'Create Challenge',
      route: '/org/challenges/create',
    },
    {
      icon: Search,
       title: 'Explore the Solution Provider network',
       description: 'Browse qualified Solution Providers across industries and domains.',
       action: 'Browse Solution Providers',
      route: '/org/solvers',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          {/* Animated checkmark circle with decorative dots */}
          <div className="relative inline-flex items-center justify-center">
            {/* Decorative dots */}
            <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-emerald-300 animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="absolute -bottom-1 -left-3 w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0.3s' }} />
            <div className="absolute top-0 -left-4 w-2.5 h-2.5 rounded-full bg-amber-300 animate-bounce" style={{ animationDelay: '0.5s' }} />
            <div className="absolute -bottom-2 right-0 w-2 h-2 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '0.2s' }} />

            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-foreground">
            Welcome to Global Innovation Marketplace! 🎉
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Your organization is now registered. Here's what to do next.
          </p>
        </div>

        {/* Get Started Checklist */}
        <Card>
          <CardContent className="pt-6 pb-4">
            <h2 className="font-semibold text-foreground mb-4 text-base">Get Started</h2>
            <div className="divide-y divide-border">
              {checklistItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    {/* Unchecked circle */}
                    <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />

                    {/* Icon */}
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>

                    {/* Action button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => navigate(item.route)}
                    >
                      {item.action}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Skip link */}
        <div className="text-center">
          <button
            onClick={() => navigate('/org/dashboard')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            Skip for now and go to Dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Tips Footer */}
        <div className="space-y-3 pt-4">
          <div className="flex items-start gap-3 text-sm">
            <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30 shrink-0">
              <Lightbulb className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Tip:</span> Your selected engagement model determines how
              you'll interact with solution providers. You can change this later in your organization settings.
            </p>
          </div>

          <div className="flex items-start gap-3 text-sm">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Need help?</span> Check our{' '}
              <button className="text-primary underline hover:no-underline">Getting Started Guide</button> or{' '}
              <button className="text-primary underline hover:no-underline">contact support</button>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
