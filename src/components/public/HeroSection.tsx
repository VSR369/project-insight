/**
 * HeroSection — Public landing hero with headline + stats.
 */

import { Button } from '@/components/ui/button';
import { PlatformStatsBar } from '@/components/public/PlatformStatsBar';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="relative mx-auto max-w-5xl px-4 text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Open Innovation Platform
        </div>

        <h1 className="text-4xl lg:text-6xl font-bold tracking-tight leading-tight">
          Solve Real Challenges.
          <br />
          <span className="text-primary">Get Recognized.</span>
        </h1>

        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          CogniBlend connects solution providers with industry challenges.
          Build your reputation, earn certifications, and win rewards.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={() => navigate('/register')}>
            Join as Provider
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/browse-challenges')}>
            Browse Challenges
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate('/login')}>
            Sign In
          </Button>
        </div>

        <PlatformStatsBar className="pt-8 border-t mt-8" />
      </div>
    </section>
  );
}
