import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ProfileBuildBannerProps {
  className?: string;
}

export function ProfileBuildBanner({ className }: ProfileBuildBannerProps) {
  const navigate = useNavigate();

  return (
    <div 
      className={`relative overflow-hidden rounded-xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-4 ${className}`}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10 flex items-center gap-4">
        <div className="flex-shrink-0 h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base">
            Ready to stand out?
          </h3>
          <p className="text-white/80 text-sm mt-0.5">
            Let's build your verified profile
          </p>
        </div>

        <Button
          onClick={() => navigate('/pulse/get-started')}
          variant="secondary"
          className="flex-shrink-0 bg-white text-primary hover:bg-white/90 font-medium shadow-lg"
        >
          Get Started
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
