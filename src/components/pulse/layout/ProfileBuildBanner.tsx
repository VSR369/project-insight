import { Sparkles, ArrowRight, ChevronRight, Trophy, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ProfileBuildBannerProps {
  className?: string;
  profileProgress?: number;
  isProfileComplete?: boolean;
}

export function ProfileBuildBanner({ 
  className, 
  profileProgress = 0, 
  isProfileComplete = false 
}: ProfileBuildBannerProps) {
  const navigate = useNavigate();

  return (
    <div 
      className={`relative overflow-hidden rounded-xl bg-gradient-to-r from-primary via-primary/95 to-emerald-600 p-4 sm:p-5 shadow-lg ${className}`}
    >
      {/* Decorative elements - scale with container */}
      <div className="absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-sm" />
      <div className="absolute bottom-0 left-0 w-20 sm:w-32 h-20 sm:h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
      <div className="absolute top-1/2 right-1/4 w-12 sm:w-20 h-12 sm:h-20 bg-amber-400/20 rounded-full blur-md" />
      
      <div className="relative z-10 space-y-3 sm:space-y-4">
        {/* Header Section - changes based on completion */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex-shrink-0 h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
            {isProfileComplete ? (
              <Trophy className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            ) : (
              <Sparkles className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg sm:text-xl tracking-tight">
              {isProfileComplete 
                ? "Monetizing Collaborative Innovation" 
                : "Ready to Stand Out?"}
            </h3>
            <p className="text-white/90 text-xs sm:text-sm mt-0.5 sm:mt-1 font-medium italic">
              {isProfileComplete 
                ? "Your profile is complete - start earning from your expertise"
                : "Solve Industry Problems and be a Game Changer"}
            </p>
          </div>
        </div>

        {/* CTA Section - different content based on completion */}
        {isProfileComplete ? (
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center">
            <Button
              onClick={() => navigate('/pulse/challenges')}
              variant="secondary"
              size="default"
              className="flex-shrink-0 w-full sm:w-auto bg-white text-primary hover:bg-white/90 font-semibold shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02]"
            >
              Explore Challenges
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            {/* Success indicator instead of progress */}
            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-300" />
                <span className="text-white/90 text-sm font-medium">
                  Profile Complete - Ready to Collaborate
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center">
            <Button
              onClick={() => navigate('/welcome')}
              variant="secondary"
              size="default"
              className="flex-shrink-0 w-full sm:w-auto bg-white text-primary hover:bg-white/90 font-semibold shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02]"
            >
              Let's Build Your Profile
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            {/* Profile Completion Progress */}
            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/90 text-sm font-medium">Profile Completion</span>
                <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs font-semibold">
                  {profileProgress}%
                </Badge>
              </div>
              <Progress value={profileProgress} className="h-2 bg-white/20" />
              <button
                onClick={() => navigate('/welcome')}
                className="flex items-center gap-1 text-white/80 hover:text-white text-xs mt-2 font-medium transition-colors group"
              >
                Complete Profile
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
