import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Film, Mic, Zap, FileText, Image, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PulseLayout } from '@/components/pulse/layout';

const contentTypes = [
  {
    id: 'reel',
    name: 'Reel',
    description: 'Share a short video (up to 3 min)',
    icon: Film,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  {
    id: 'podcast',
    name: 'Podcast',
    description: 'Record audio (up to 60 min)',
    icon: Mic,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'spark',
    name: 'Spark',
    description: 'Quick insight or tip',
    icon: Zap,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  {
    id: 'article',
    name: 'Article',
    description: 'Long-form content',
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'gallery',
    name: 'Gallery',
    description: 'Share multiple images',
    icon: Image,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'post',
    name: 'Quick Post',
    description: 'Text with optional image',
    icon: MessageSquare,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
];

export default function PulseCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedType = (location.state as { type?: string })?.type;
  const [selectedType, setSelectedType] = useState<string | null>(preselectedType || null);

  const handleContinue = () => {
    if (selectedType) {
      navigate(`/pulse/create/${selectedType}`);
    }
  };

  return (
    <PulseLayout title="Create" showBackButton>
      <div className="max-w-lg mx-auto p-4">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-1">What would you like to share?</h2>
          <p className="text-sm text-muted-foreground">
            Choose the type of content you want to create
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {contentTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            
            return (
              <Card
                key={type.id}
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? 'ring-2 ring-primary border-primary' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedType(type.id)}
              >
                <CardContent className="p-4">
                  <div className={`h-10 w-10 rounded-lg ${type.bgColor} flex items-center justify-center mb-3`}>
                    <Icon className={`h-5 w-5 ${type.color}`} />
                  </div>
                  <CardTitle className="text-sm mb-1">{type.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {type.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button 
          className="w-full" 
          size="lg"
          disabled={!selectedType}
          onClick={handleContinue}
        >
          Continue
        </Button>
      </div>
    </PulseLayout>
  );
}
