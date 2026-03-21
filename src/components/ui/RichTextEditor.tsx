/**
 * RichTextEditor — Tiptap-based rich-text editor component.
 *
 * Supports: Bold, Italic, H2/H3, Bullet/Ordered lists, Image/Video/Audio upload
 * (Supabase Storage → challenge-media bucket), Video embed (YouTube/Vimeo URL paste).
 * Outputs HTML string.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ImageIcon,
  Video,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ─── Constants ──────────────────────────────────────── */

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ACCEPTED_TYPES = 'image/*,video/mp4,audio/mp3,audio/mpeg';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/bmp', 'image/tiff'];
const VIDEO_TYPES = ['video/mp4'];
const AUDIO_TYPES = ['audio/mp3', 'audio/mpeg'];

function getMediaCategory(mimeType: string): 'image' | 'video' | 'audio' | null {
  if (IMAGE_TYPES.includes(mimeType) || mimeType.startsWith('image/')) return 'image';
  if (VIDEO_TYPES.includes(mimeType)) return 'video';
  if (AUDIO_TYPES.includes(mimeType)) return 'audio';
  return null;
}

/* ─── Props ──────────────────────────────────────────── */

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minLength?: number;
  error?: string;
  /** Supabase Storage folder path prefix for uploads */
  storagePath?: string;
  className?: string;
}

/* ─── Toolbar Button ──────────────────────────────────── */

interface ToolbarBtnProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function ToolbarBtn({ onClick, isActive, title, children, disabled }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'p-1.5 rounded transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
}

/* ─── Upload Progress Bar ─────────────────────────────── */

function UploadProgressBar({ progress }: { progress: number }) {
  return (
    <div className="px-3 py-1.5 border-b bg-muted/20">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Upload className="h-3 w-3 animate-pulse" />
        <span>Uploading… {Math.round(progress)}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Component ──────────────────────────────────────── */

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing…',
  minLength,
  error,
  storagePath = 'editor-media',
  className,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Youtube.configure({ width: 640, height: 360 }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: value || '',
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      // Tiptap returns <p></p> for empty — normalize to ''
      const isEmpty = html === '<p></p>' || html === '';
      onChange(isEmpty ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const nextContent = value || '';
    const currentContent = editor.getHTML();
    if (currentContent === nextContent || (nextContent === '' && currentContent === '<p></p>')) return;

    editor.commands.setContent(nextContent, { emitUpdate: false });
  }, [editor, value]);

  /* ─── Media upload (image/video/audio) ──────────────── */

  const handleMediaUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error('File must be under 25MB.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Detect media category
      const category = getMediaCategory(file.type);
      if (!category) {
        toast.error('Unsupported file type. Use images, MP4 video, or MP3 audio.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${storagePath}/${crypto.randomUUID()}.${ext}`;

      // Simulate progress (Supabase JS SDK doesn't expose upload progress natively)
      setUploadProgress(0);
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev === null || prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);

      try {
        const { error: uploadErr } = await supabase.storage
          .from('challenge-media')
          .upload(path, file, { contentType: file.type });

        clearInterval(progressInterval);

        if (uploadErr) {
          setUploadProgress(null);
          toast.error(`Upload failed: ${uploadErr.message}`);
          return;
        }

        setUploadProgress(100);

        const { data: urlData } = supabase.storage
          .from('challenge-media')
          .getPublicUrl(path);

        const publicUrl = urlData?.publicUrl;
        if (!publicUrl) {
          setUploadProgress(null);
          toast.error('Failed to get public URL.');
          return;
        }

        // Insert appropriate HTML based on media type
        if (category === 'image') {
          editor.chain().focus().setImage({ src: publicUrl }).run();
        } else if (category === 'video') {
          editor
            .chain()
            .focus()
            .insertContent(
              `<video controls src="${publicUrl}" style="max-width:100%;border-radius:8px;margin:8px 0"></video>`,
            )
            .run();
        } else if (category === 'audio') {
          editor
            .chain()
            .focus()
            .insertContent(
              `<audio controls src="${publicUrl}" style="width:100%;margin:8px 0"></audio>`,
            )
            .run();
        }

        toast.success(`${category.charAt(0).toUpperCase() + category.slice(1)} uploaded successfully`);
      } catch (err) {
        clearInterval(progressInterval);
        toast.error('Upload failed. Please try again.');
      } finally {
        setTimeout(() => setUploadProgress(null), 600);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [editor, storagePath],
  );

  /* ─── Video embed ──────────────────────────────────── */

  const handleVideoEmbed = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Paste a YouTube or Vimeo URL:');
    if (!url) return;

    // Basic validation
    if (
      !url.includes('youtube.com') &&
      !url.includes('youtu.be') &&
      !url.includes('vimeo.com')
    ) {
      toast.error('Only YouTube and Vimeo URLs are supported.');
      return;
    }

    editor.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  /* ─── Character count ──────────────────────────────── */

  const charCount = editor?.storage.characterCount?.characters() ?? 0;
  const meetsMin = !minLength || charCount >= minLength;

  if (!editor) return null;

  const isUploading = uploadProgress !== null;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        className={cn(
          'border rounded-md overflow-hidden bg-background',
          error ? 'border-destructive' : 'border-input',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1',
        )}
      >
        {/* ── Toolbar ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b bg-muted/30">
          <ToolbarBtn
            title="Bold (Ctrl+B)"
            isActive={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Italic (Ctrl+I)"
            isActive={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </ToolbarBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarBtn
            title="Heading 2"
            isActive={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Heading 3"
            isActive={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarBtn
            title="Bullet List"
            isActive={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Ordered List"
            isActive={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarBtn
            title="Upload Media (Image / Video / Audio)"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <ImageIcon className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Embed YouTube/Vimeo" onClick={handleVideoEmbed} disabled={isUploading}>
            <Video className="h-4 w-4" />
          </ToolbarBtn>
        </div>

        {/* ── Upload progress ─────────────────────────── */}
        {isUploading && <UploadProgressBar progress={uploadProgress} />}

        {/* ── Editor content ──────────────────────────── */}
        <EditorContent editor={editor} />

        {/* Hidden file input for media upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleMediaUpload}
        />
      </div>

      {/* ── Footer: error + char count ────────────────── */}
      <div className="flex items-center justify-between">
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <span />
        )}
        {minLength != null && (
          <span
            className={cn(
              'text-xs tabular-nums',
              meetsMin ? 'text-[#1D9E75] font-medium' : 'text-muted-foreground',
            )}
          >
            {charCount} / {minLength} min
          </span>
        )}
      </div>
    </div>
  );
}
