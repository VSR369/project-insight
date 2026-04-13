/**
 * HomePage — Public landing page with hero, stats, and live challenges.
 */

import { HeroSection } from '@/components/public/HeroSection';
import { LiveChallengeSidebar } from '@/components/public/LiveChallengeSidebar';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />

      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
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
          </div>

          <aside>
            <LiveChallengeSidebar />
          </aside>
        </div>
      </div>
    </div>
  );
}
