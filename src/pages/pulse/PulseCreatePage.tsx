import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Film, Mic, Zap, FileText, Image, MessageSquare, ArrowLeft, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { PulseLayout } from '@/components/pulse/layout';
import { PostCreator, SparkBuilder, ArticleEditor, ReelCreator, PodcastStudio, GalleryCreator } from '@/components/pulse/creators';
import { toast } from 'sonner';

const contentTypes = [
  {
    id: 'reel',
    name: 'Reel',
    description: 'Share a short video (up to 3 min)',
    icon: Film,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    available: true,
  },
  {
    id: 'podcast',
    name: 'Podcast',
    description: 'Record audio (up to 60 min)',
    icon: Mic,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    available: true,
  },
  {
    id: 'spark',
    name: 'Spark',
    description: 'Quick insight or tip',
    icon: Zap,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    available: true,
  },
  {
    id: 'article',
    name: 'Article',
    description: 'Long-form content',
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    available: true,
  },
  {
    id: 'gallery',
    name: 'Gallery',
    description: 'Share multiple images',
    icon: Image,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    available: true,
  },
  {
    id: 'post',
    name: 'Quick Post',
    description: 'Text with optional image',
    icon: MessageSquare,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    available: true,
  },
  {
    id: 'pulse-cards',
    name: 'Pulse Cards',
    description: 'Collaborative knowledge cards',
    icon: Layers,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    available: true,
    navigateTo: '/pulse/cards',
  },
];

export default function PulseCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedType = (location.state as { type?: string })?.type;
  const [selectedType, setSelectedType] = useState<string | null>(preselectedType || null);
  const [showForm, setShowForm] = useState(!!preselectedType);

  const handleContinue = () => {
    if (selectedType) {
      const typeConfig = contentTypes.find(t => t.id === selectedType);
      if (!typeConfig?.available) {
        toast.info(`${typeConfig?.name || 'This content type'} creator coming soon!`);
        return;
      }
      // Navigate to external page if specified
      if (typeConfig.navigateTo) {
        navigate(typeConfig.navigateTo);
        return;
      }
      setShowForm(true);
    }
  };

  const handleBack = () => {
    setShowForm(false);
    setSelectedType(null);
  };

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
  };

  const selectedTypeInfo = contentTypes.find(t => t.id === selectedType);

  // Render the appropriate creator component based on selected type
  if (showForm && selectedType) {
    return (
      <PulseLayout title={`New ${selectedTypeInfo?.name || 'Content'}`} showBackButton>
        <div className="max-w-4xl mx-auto p-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to content types
          </Button>

          {selectedType === 'post' && <PostCreator onCancel={handleBack} />}
          {selectedType === 'spark' && <SparkBuilder onCancel={handleBack} />}
          {selectedType === 'article' && <ArticleEditor onCancel={handleBack} />}
          {selectedType === 'reel' && <ReelCreator onCancel={handleBack} />}
          {selectedType === 'podcast' && <PodcastStudio onCancel={handleBack} />}
          {selectedType === 'gallery' && <GalleryCreator onCancel={handleBack} />}
        </div>
      </PulseLayout>
    );
  }

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
                } ${!type.available ? 'opacity-60' : ''}`}
                onClick={() => handleTypeSelect(type.id)}
              >
                <CardContent className="p-4">
                  <div className={`h-10 w-10 rounded-lg ${type.bgColor} flex items-center justify-center mb-3`}>
                    <Icon className={`h-5 w-5 ${type.color}`} />
                  </div>
                  <CardTitle className="text-sm mb-1 flex items-center gap-2">
                    {type.name}
                    {!type.available && (
                      <span className="text-xs text-muted-foreground font-normal">(Soon)</span>
                    )}
                  </CardTitle>
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