import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target, Eye, ListChecks, Award, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const BENEFITS = [
  {
    icon: Target,
    title: 'Complex High-Revenue Challenges',
    description: 'Access premium opportunities that match your verified expertise level.',
  },
  {
    icon: Eye,
    title: 'Increased Visibility',
    description: 'Stand out to organizations seeking specialized solution providers.',
  },
  {
    icon: ListChecks,
    title: 'Priority Shortlisting',
    description: 'Get matched first for challenges within your verified domains.',
  },
  {
    icon: Award,
    title: 'Challenge Readiness Badges',
    description: 'Display your verified credentials and build trust instantly.',
  },
];

const VERIFIED_BENEFITS = [
  'Verified expertise credentials recognized by organizations',
  'Priority access to exclusive challenges',
  'Enhanced profile visibility in search results',
  'Professional network of verified solution providers',
];

export default function PulseGetStartedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Lead the way in <span className="text-primary">digital age innovation</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-6">
            You're not just joining a platform — <span className="font-medium text-foreground">You're entering a movement.</span>
          </p>
          
          <p className="text-muted-foreground max-w-xl mx-auto">
            Our platform connects verified solution providers with organizations seeking 
            innovative solutions to complex challenges. Build your profile, get verified, 
            and unlock access to premium opportunities.
          </p>
        </div>
      </div>

      {/* Why Your Profile Matters Section */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-xl font-semibold text-center mb-8">
          Why Your Profile Matters
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <Card key={benefit.title} className="border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex gap-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground mb-1">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Verified Providers Section */}
      <div className="bg-muted/30 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-xl font-semibold text-center mb-6">
            Verified Providers Receive
          </h2>
          
          <div className="space-y-3">
            {VERIFIED_BENEFITS.map((benefit) => (
              <div 
                key={benefit} 
                className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border/50"
              >
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Button
          onClick={() => navigate('/welcome')}
          size="lg"
          className="w-full sm:w-auto px-8 py-6 text-lg font-semibold gap-2"
        >
          Let's Build Your Profile
          <ArrowRight className="h-5 w-5" />
        </Button>
        
        <p className="text-sm text-muted-foreground mt-4">
          Takes about 10 minutes to complete
        </p>
      </div>
    </div>
  );
}
