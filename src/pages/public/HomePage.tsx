/**
 * HomePage — Public landing page with hero, challenge feed, and live sidebar.
 */

import { HeroSection } from '@/components/public/HeroSection';
import { ChallengeFeed } from '@/components/public/ChallengeFeed';
import { LiveChallengeSidebar } from '@/components/public/LiveChallengeSidebar';
import { PlatformStatsBar } from '@/components/public/PlatformStatsBar';
import { DevEnvironmentModal } from '@/components/cogniblend/shell/DevEnvironmentModal';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />

      {/* Platform Stats */}
      <div className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4">
          <PlatformStatsBar />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* How It Works */}
            <section>
              <h2 className="text-2xl font-bold mb-4">How It Works</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { step: '1', title: 'Register', desc: 'Create your provider profile and declare your expertise.' },
                  { step: '2', title: 'Compete', desc: 'Submit solutions to industry challenges and earn ratings.' },
                  { step: '3', title: 'Get Certified', desc: 'Achieve star-tier certification through performance or experience.' },
                ].map((s) => (
                  <div key={s.step} className="rounded-xl border p-5 space-y-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {s.step}
                    </div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Public Challenge Feed */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Active Challenges</h2>
              <ChallengeFeed limit={6} />
            </section>
          </div>

          <aside>
            <LiveChallengeSidebar />
          </aside>
        </div>
      </div>

      <DevEnvironmentModal />
    </div>
  );
}
