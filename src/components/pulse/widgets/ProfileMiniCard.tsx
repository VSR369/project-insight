/**
 * ProfileMiniCard
 * User profile card with photo upload, editable headline, and profile link
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Pencil, Eye, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useProviderStats } from '@/hooks/queries/usePulseStats';
import { useUpdatePulseHeadline, useUpdateProfileAvatar } from '@/hooks/mutations/usePulseProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { validateFile } from '@/lib/validations/media';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logWarning } from '@/lib/errorHandler';
import { CertTierBadge } from '@/components/enrollment/CertTierBadge';

interface ProfileMiniCardProps {
  providerId?: string;
  userId?: string;
  className?: string;
}

export function ProfileMiniCard({ providerId, userId, className }: ProfileMiniCardProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [isEditingHeadline, setIsEditingHeadline] = useState(false);
  const [headlineValue, setHeadlineValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Fetch profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch provider stats (includes pulse_headline)
  const { data: stats, isLoading: statsLoading } = useProviderStats(providerId || '');

  // Mutations
  const updateHeadline = useUpdatePulseHeadline();
  const updateAvatar = useUpdateProfileAvatar();

  // Initialize headline value when data loads
  useEffect(() => {
    if (stats?.pulse_headline) {
      setHeadlineValue(stats.pulse_headline);
    }
  }, [stats?.pulse_headline]);

  // Get initials for avatar fallback
  const getInitials = () => {
    const first = profile?.first_name?.charAt(0) || '';
    const last = profile?.last_name?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validate file
    const validation = validateFile(file, 'gallery');
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }

    setIsUploading(true);
    try {
      // Upload to pulse-media bucket
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const storagePath = `${userId}/avatar/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('pulse-media')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('pulse-media')
        .getPublicUrl(storagePath);

      // Update profile
      await updateAvatar.mutateAsync({ userId, avatarUrl: urlData.publicUrl });
    } catch (error) {
      logWarning('Profile photo upload failed', { operation: 'upload_avatar', additionalData: { error: String(error) } });
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle headline save
  const handleSaveHeadline = async () => {
    if (!providerId) return;
    
    const trimmedHeadline = headlineValue.trim().slice(0, 120);
    
    try {
      await updateHeadline.mutateAsync({ 
        providerId, 
        headline: trimmedHeadline 
      });
      setIsEditingHeadline(false);
    } catch (error) {
      logWarning('Failed to save headline', { operation: 'update_pulse_headline', additionalData: { error: String(error) } });
    }
  };

  // Handle cancel editing
  const handleCancelEdit = () => {
    setHeadlineValue(stats?.pulse_headline || '');
    setIsEditingHeadline(false);
  };

  const isLoading = profileLoading || statsLoading;

  if (!providerId || !userId) return null;

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-3 lg:p-4 xl:p-5 flex flex-col items-center gap-3 lg:gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-14 lg:h-16 lg:w-16 xl:h-20 xl:w-20 rounded-full" />
            <Skeleton className="h-4 w-24 lg:w-32" />
            <Skeleton className="h-8 w-20 lg:w-24" />
          </>
        ) : (
          <>
            {/* Avatar with upload overlay */}
            <div className="relative group">
              <Avatar className="h-14 w-14 lg:h-16 lg:w-16 xl:h-20 xl:w-20 border-2 border-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                <AvatarFallback className="text-sm lg:text-base xl:text-lg font-medium bg-primary/10">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              
              {/* Upload overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={cn(
                  "absolute inset-0 flex items-center justify-center rounded-full",
                  "bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity",
                  "cursor-pointer disabled:cursor-wait"
                )}
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* Editable Headline */}
            <div className="w-full text-center">
              {isEditingHeadline ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={headlineValue}
                    onChange={(e) => setHeadlineValue(e.target.value)}
                    placeholder="Your professional title"
                    maxLength={120}
                    autoFocus
                    className="text-center text-sm h-8"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveHeadline();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={handleSaveHeadline}
                    disabled={updateHeadline.isPending}
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingHeadline(true)}
                  className={cn(
                    "group/headline flex items-center justify-center gap-1 w-full",
                    "text-sm text-muted-foreground hover:text-foreground transition-colors"
                  )}
                >
                  <span className={stats?.pulse_headline ? 'text-foreground' : 'italic'}>
                    {stats?.pulse_headline || 'Add your title'}
                  </span>
                  <Pencil className="h-3 w-3 opacity-0 group-hover/headline:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            {/* View Profile Link */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate('/pulse/profile')}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              View Profile
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
