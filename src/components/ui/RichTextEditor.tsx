/**
 * RichTextEditor — Tiptap-based rich-text editor component.
 *
 * Supports: Bold, Italic, H2/H3, Bullet/Ordered lists, Image upload (Supabase Storage),
 * Video embed (YouTube/Vimeo URL paste). Outputs HTML string.
 */

import { useCallback, useRef } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ─── Props ──────────────────────────────────────────── */

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minLength?: number;
  error?: string;
  /** Supabase Storage folder path prefix for image uploads */
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

/* ─── Component ──────────────────────────────────────── */

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing…',
  minLength,
  error,
  storagePath = 'editor-images',
  className,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  /* ─── Image upload ─────────────────────────────────── */

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

      if (!ALLOWED.includes(file.type)) {
        toast.error('Invalid file type. Use JPEG, PNG, WebP, or GIF.');
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error('Image must be under 5 MB.');
        return;
      }

      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${storagePath}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('challenge-assets')
        .upload(path, file, { contentType: file.type });

      if (uploadErr) {
        toast.error(`Upload failed: ${uploadErr.message}`);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('challenge-assets')
        .getPublicUrl(path);

      if (urlData?.publicUrl) {
        editor.chain().focus().setImage({ src: urlData.publicUrl }).run();
      }

      // Reset input so the same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
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
            title="Insert Image"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Embed Video" onClick={handleVideoEmbed}>
            <Video className="h-4 w-4" />
          </ToolbarBtn>
        </div>

        {/* ── Editor content ──────────────────────────── */}
        <EditorContent editor={editor} />

        {/* Hidden file input for image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleImageUpload}
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
