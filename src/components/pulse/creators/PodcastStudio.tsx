/**
 * Podcast Studio Component
 * Record or upload audio podcasts with waveform visualization
 * Per Phase 3 specification
 */

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Sparkles, 
  Loader2, 
  Upload, 
  Play, 
  Pause, 
  X,
  Music,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { podcastSchema, type PodcastFormData, MEDIA_LIMITS, formatBytes } from "@/lib/validations/media";
import { useUploadPulseMedia } from "@/hooks/mutations/usePulseUpload";
import { useCreatePulseContent } from "@/hooks/queries/usePulseContent";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentProvider } from "@/hooks/queries/useProvider";
import { AudioRecorder } from "./AudioRecorder";
import { WaveformDisplay } from "./WaveformDisplay";

interface PodcastStudioProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PodcastStudio({ onSuccess, onCancel }: PodcastStudioProps) {
  // ═══════════════════════════════════════════
  // SECTION 1: useState hooks
  // ═══════════════════════════════════════════
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [playbackComplete, setPlaybackComplete] = useState(false);

  // ═══════════════════════════════════════════
  // SECTION 2: Refs
  // ═══════════════════════════════════════════
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // ═══════════════════════════════════════════
  // SECTION 3: Context and custom hooks
  // ═══════════════════════════════════════════
  const { user } = useAuth();
  const { data: provider } = useCurrentProvider();
  const uploadMutation = useUploadPulseMedia();
  const createContent = useCreatePulseContent();

  // ═══════════════════════════════════════════
  // SECTION 4: Form hooks
  // ═══════════════════════════════════════════
  const form = useForm<PodcastFormData>({
    resolver: zodResolver(podcastSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const { watch, setValue, formState: { errors } } = form;
  const title = watch("title");
  const description = watch("description") || "";

  // ═══════════════════════════════════════════
  // SECTION 5: Computed values
  // ═══════════════════════════════════════════
  const isSubmitting = uploadMutation.isPending || createContent.isPending;
  const canPublish = audioFile && title.trim().length > 0 && !isSubmitting;

  // ═══════════════════════════════════════════
  // SECTION 6: Event handlers
  // ═══════════════════════════════════════════
  const handleRecordingComplete = (blob: Blob, duration: number) => {
    // Determine correct file extension from MIME type
    const mimeToExt: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
    };
    const baseMime = blob.type.split(';')[0];
    const ext = mimeToExt[baseMime] || 'webm';
    
    const file = new File([blob], `recording_${Date.now()}.${ext}`, {
      type: blob.type,
    });
    setAudioFile(file);
    setAudioDuration(duration);
    
    // Create URL for playback
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(URL.createObjectURL(blob));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const limits = MEDIA_LIMITS.podcast;
    if (file.size > limits.maxSize) {
      toast.error(`File exceeds ${limits.label} limit`);
      return;
    }
    const allowedTypes = limits.types as readonly string[];
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Unsupported format. Allowed: ${limits.extensions.join(", ")}`);
      return;
    }

    setAudioFile(file);
    setShowUploader(false);

    // Create URL and get duration
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    // Get audio duration
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      setAudioDuration(Math.floor(audio.duration));
    };
  };

  const handleRemoveAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioFile(null);
    setAudioUrl(null);
    setAudioDuration(0);
    setIsPlaying(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Reset to start if playback was complete
      if (playbackComplete) {
        audioRef.current.currentTime = 0;
        setPlaybackComplete(false);
      }
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAIEnhance = async () => {
    if (!title.trim()) {
      toast.error("Enter a title first to generate description");
      return;
    }

    setIsEnhancing(true);
    try {
      // Simulate AI enhancement (would call edge function)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const suggestions = [
        `Join us as we explore ${title}. In this episode, we dive deep into the key insights and trends shaping the industry.`,
        `A thought-provoking discussion on ${title}. Discover expert perspectives and actionable takeaways.`,
        `This episode covers ${title} - essential knowledge for professionals looking to stay ahead.`,
      ];
      
      const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
      setValue("description", randomSuggestion);
      toast.success("Description generated!");
    } catch (error) {
      toast.error("Failed to generate description");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async (data: PodcastFormData) => {
    if (!audioFile || !user?.id) {
      toast.error("Please record or upload audio first");
      return;
    }

    // IMPORTANT: pulse_content.provider_id references solution_providers.id (NOT auth.users.id).
    // RLS on pulse_content enforces provider ownership via solution_providers.user_id = auth.uid().
    if (!provider?.id) {
      toast.error("Your provider profile isn't ready yet. Please refresh and try again.");
      return;
    }

    try {
      // Upload audio file - use user.id (auth.uid) for RLS compliance
      const uploadResult = await uploadMutation.mutateAsync({
        file: audioFile,
        contentType: "podcast",
        userId: user.id,
      });

      // Create content record
      await createContent.mutateAsync({
        content_type: "podcast",
        title: data.title,
        caption: data.description || null,
        media_urls: [uploadResult.publicUrl],
        content_status: "published",
        provider_id: provider.id,
        industry_segment_id: provider.industry_segment_id ?? null,
        duration_seconds: audioDuration || null,
      });

      toast.success("Podcast published successfully!");
      
      // Reset form and audio state after success to prevent duplicate submissions
      form.reset();
      handleRemoveAudio();
      
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to publish podcast");
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ═══════════════════════════════════════════
  // SECTION 7: Render
  // ═══════════════════════════════════════════
  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Create Podcast</h2>
        </div>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      {/* Title Input */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Podcast Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Episode title..."
          {...form.register("title")}
          className={cn(errors.title && "border-destructive")}
        />
        <div className="flex justify-between">
          {errors.title ? (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.title.message}
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">
            {title.length}/200
          </span>
        </div>
      </div>

      {/* Audio Section */}
      <Card>
        <CardContent className="p-6">
          {!audioFile ? (
            showUploader ? (
              /* Upload Mode */
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    MP3, WAV, WebM, OGG up to {MEDIA_LIMITS.podcast.label}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={MEDIA_LIMITS.podcast.extensions.join(",")}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowUploader(false)}
                >
                  Back to Recording
                </Button>
              </div>
            ) : (
              /* Recording Mode */
              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                onUploadClick={() => setShowUploader(true)}
                maxDuration={3600}
              />
            )
          ) : (
            /* Audio Preview */
            <div className="space-y-4">
              <WaveformDisplay 
                audioUrl={audioUrl || undefined} 
                isPlaying={isPlaying}
                barCount={50}
              />
              
              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={togglePlayback}
                  className="gap-2"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-5 w-5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Play
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  onClick={handleRemoveAudio}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                  Remove
                </Button>
              </div>

              {/* Audio Info */}
              <div className="text-center text-sm text-muted-foreground">
                <p>{audioFile.name}</p>
                <p>
                  {formatBytes(audioFile.size)} • {formatDuration(audioDuration)}
                </p>
              </div>

              {/* Playback complete indicator */}
              {playbackComplete && (
                <p className="text-xs text-muted-foreground text-center">
                  ✓ Playback complete - click Play to replay
                </p>
              )}

              {/* Hidden audio element */}
              {audioUrl && (
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => {
                    setIsPlaying(false);
                    setPlaybackComplete(true);
                  }}
                  className="hidden"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Description</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAIEnhance}
            disabled={isEnhancing || !title.trim()}
            className="gap-1 h-7 text-xs"
          >
            {isEnhancing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Generate with AI
          </Button>
        </div>
        <Textarea
          id="description"
          placeholder="What's this episode about?"
          rows={3}
          {...form.register("description")}
          className={cn(errors.description && "border-destructive")}
        />
        <div className="flex justify-between">
          {errors.description ? (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.description.message}
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">
            {description.length}/300
          </span>
        </div>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={!canPublish}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Publishing...
          </>
        ) : (
          "Publish Podcast"
        )}
      </Button>

      {/* Status Footer */}
      {!audioFile && (
        <p className="text-sm text-muted-foreground text-center">
          Record or upload audio to continue
        </p>
      )}
    </form>
  );
}
