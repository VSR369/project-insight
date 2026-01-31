/**
 * Trending Topics Widget
 * Shows trending hashtags and content types
 */

import { useNavigate } from 'react-router-dom';
import { Hash, TrendingUp, Flame, Video, Mic, FileText, Image, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TrendingTopicsWidgetProps {
  className?: string;
}

// Static trending data for now - can be replaced with real data later
const TRENDING_TOPICS = [
  { tag: 'AIInnovation', count: 42, trend: 'up' },
  { tag: 'DigitalTransformation', count: 38, trend: 'up' },
  { tag: 'FutureOfWork', count: 31, trend: 'stable' },
  { tag: 'Leadership', count: 28, trend: 'up' },
  { tag: 'TechTrends2026', count: 24, trend: 'new' },
];

const CONTENT_TYPES = [
  { type: 'Reels', icon: Video, count: 156, color: 'text-pink-500' },
  { type: 'Podcasts', icon: Mic, count: 89, color: 'text-purple-500' },
  { type: 'Articles', icon: FileText, count: 234, color: 'text-blue-500' },
  { type: 'Sparks', icon: Lightbulb, count: 512, color: 'text-yellow-500' },
];

export function TrendingTopicsWidget({ className }: TrendingTopicsWidgetProps) {
  const navigate = useNavigate();

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Trending Now
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trending Hashtags */}
        <div className="space-y-2">
          {TRENDING_TOPICS.map((topic, index) => (
            <div
              key={topic.tag}
              className="flex items-center justify-between group cursor-pointer hover:bg-muted/50 rounded-lg p-1.5 -mx-1.5 transition-colors"
              onClick={() => navigate(`/pulse/sparks?tag=${topic.tag}`)}
            >
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm group-hover:text-primary transition-colors">
                  {topic.tag}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{topic.count}</span>
                {topic.trend === 'up' && (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                )}
                {topic.trend === 'new' && (
                  <Badge className="text-[10px] px-1 py-0 h-4 bg-primary/20 text-primary">
                    NEW
                  </Badge>
                )}
                {topic.trend === 'stable' && (
                  <Flame className="h-3 w-3 text-orange-500" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Content Type Breakdown */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">Content This Week</p>
          <div className="grid grid-cols-2 gap-2">
            {CONTENT_TYPES.map((content) => (
              <div
                key={content.type}
                className="flex items-center gap-1.5 text-xs p-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/pulse/feed?type=${content.type.toLowerCase()}`)}
              >
                <content.icon className={cn("h-3.5 w-3.5", content.color)} />
                <span>{content.type}</span>
                <span className="text-muted-foreground ml-auto">{content.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
