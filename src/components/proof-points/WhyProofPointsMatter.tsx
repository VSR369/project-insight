import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, 
  Sparkles, 
  Eye,
  Award,
  Lightbulb,
  Target,
  FileCheck,
  TrendingUp
} from 'lucide-react';

interface WhyProofPointsMatterProps {
  className?: string;
}

const VALUE_CARDS = [
  {
    icon: Shield,
    title: 'Build Trust & Credibility',
    description: 'Real-world evidence strengthens your professional reputation',
  },
  {
    icon: Sparkles,
    title: 'Unlock Premium Opportunities',
    description: 'Access high-value projects and exclusive engagements',
  },
  {
    icon: Eye,
    title: 'Enhanced Profile Visibility',
    description: 'Stand out to seekers looking for proven expertise',
  },
];

const STRONG_PROOF_POINTS = [
  { icon: Target, text: 'Quantifiable Results' },
  { icon: FileCheck, text: 'Relevant Context' },
  { icon: Award, text: 'Supporting Evidence' },
  { icon: TrendingUp, text: 'Clear Impact' },
];

export function WhyProofPointsMatter({ className = '' }: WhyProofPointsMatterProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Why Proof Points Matter */}
      <Card 
        className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20 animate-fade-in"
        style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Why Proof Points Matter</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Showcase your achievements and build confidence with seekers
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {VALUE_CARDS.map((card, index) => (
              <div 
                key={card.title}
                className="bg-background/60 backdrop-blur-sm rounded-lg p-4 border border-border/50 animate-fade-in hover-scale"
                style={{ animationDelay: `${(index + 1) * 100}ms`, animationFillMode: 'backwards' }}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-1">{card.title}</h3>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* What Makes Strong Proof Points */}
      <Card 
        className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 animate-fade-in"
        style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="flex gap-3">
            <div className="shrink-0">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3">What Makes Strong Proof Points</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {STRONG_PROOF_POINTS.map((item) => (
                  <div key={item.text} className="flex items-center gap-2 text-sm">
                    <item.icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-muted-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
