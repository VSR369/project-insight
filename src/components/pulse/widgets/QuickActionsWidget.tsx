/**
 * Quick Actions Widget
 * Loot box CTA, create shortcuts, profile progress
 */

import { useNavigate } from 'react-router-dom';
import { Gift, Plus, PenSquare, Mic, Video, Lightbulb, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface QuickActionsWidgetProps {
  providerId?: string;
  profileProgress?: number;
  hasLootBox?: boolean;
  className?: string;
}

const CREATE_SHORTCUTS = [
  { label: 'Quick Post', icon: PenSquare, type: 'quick_post', color: 'text-blue-500' },
  { label: 'Spark', icon: Lightbulb, type: 'spark', color: 'text-yellow-500' },
  { label: 'Reel', icon: Video, type: 'reel', color: 'text-pink-500' },
  { label: 'Podcast', icon: Mic, type: 'podcast', color: 'text-purple-500' },
];

export function QuickActionsWidget({ 
  providerId, 
  profileProgress = 75, 
  hasLootBox = true,
  className 
}: QuickActionsWidgetProps) {
  const navigate = useNavigate();

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loot Box CTA */}
        {hasLootBox && (
          <div 
            className="relative overflow-hidden rounded-lg bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 p-3 cursor-pointer group"
            onClick={() => navigate('/pulse/profile?lootbox=open')}
          >
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-purple-500/10 animate-pulse" />
            
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Gift className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium">Loot Box Ready!</p>
                  <Sparkles className="h-3 w-3 text-yellow-500 animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground">Claim your rewards</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        )}

        {/* Create Shortcuts */}
        <div className="grid grid-cols-2 gap-2">
          {CREATE_SHORTCUTS.map((action) => (
            <Button
              key={action.type}
              variant="outline"
              size="sm"
              className="h-auto py-2 justify-start"
              onClick={() => navigate(`/pulse/create?type=${action.type}`)}
            >
              <action.icon className={cn("h-4 w-4 mr-2", action.color)} />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Profile Progress */}
        {profileProgress < 100 && (
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Profile Completion</p>
              <Badge variant="secondary" className="text-[10px]">
                {profileProgress}%
              </Badge>
            </div>
            <Progress value={profileProgress} className="h-1.5" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-7"
              onClick={() => navigate('/pulse/profile')}
            >
              Complete Profile
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
