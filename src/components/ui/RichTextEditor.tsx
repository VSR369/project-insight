/**
 * RichTextEditor — Production-grade Tiptap-based rich-text editor.
 *
 * Two-row toolbar, callouts, tables, media uploads, professional Word-style formatting.
 * Outputs HTML string via `onChange`. Backward-compatible prop interface.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExt from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import PlaceholderExt from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, IndentIncrease, IndentDecrease,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link as LinkIcon, Unlink, Undo2, Redo2,
  ImageIcon, Video, Music, Table as TableIcon,
  Minus, Info, AlertTriangle, CheckCircle2, XCircle,
  Upload, ChevronDown, RemoveFormatting, Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon, Highlighter, Palette, Type, Code2, Quote,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Callout } from '@/lib/tiptap-callout';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

/* ─── Constants ──────────────────────────────────────── */

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const VIDEO_TYPES = ['video/mp4'];
const AUDIO_TYPES = ['audio/mp3', 'audio/mpeg'];

function getMediaCategory(mime: string): 'image' | 'video' | 'audio' | null {
  if (IMAGE_TYPES.includes(mime) || mime.startsWith('image/')) return 'image';
  if (VIDEO_TYPES.includes(mime)) return 'video';
  if (AUDIO_TYPES.includes(mime)) return 'audio';
  return null;
}

const COLOR_SWATCHES = [
  '#000000', '#374151', '#6b7280', '#1e3a5f', '#1d4ed8',
  '#3b82f6', '#0891b2', '#059669', '#16a34a', '#ca8a04',
  '#ea580c', '#dc2626', '#be185d', '#7c3aed', '#6d28d9',
];

const FONT_SIZES = ['10', '11', '12', '13', '14', '16', '18', '20', '24', '28', '32', '36', '48'];

/* ─── Props ──────────────────────────────────────────── */

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minLength?: number;
  error?: string;
  storagePath?: string;
  className?: string;
}

/* ─── Toolbar Button ──────────────────────────────────── */

function TBtn({
  onClick, isActive, title, children, disabled, className: cls,
}: {
  onClick: () => void; isActive?: boolean; title: string;
  children: React.ReactNode; disabled?: boolean; className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'min-w-[28px] h-[26px] px-[5px] border-none rounded transition-colors',
        'flex items-center justify-center text-xs font-semibold cursor-pointer',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
        disabled && 'opacity-40 cursor-not-allowed',
        cls,
      )}
    >
      {children}
    </button>
  );
}

function ToolbarSep() {
  return <div className="w-px h-[22px] bg-border mx-[3px] shrink-0" />;
}

/* ─── Upload Progress ─────────────────────────────────── */

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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [, forceUpdate] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
      }),
      ImageExt.configure({ inline: false, allowBase64: false }),
      Youtube.configure({ width: 640, height: 360 }),
      PlaceholderExt.configure({ placeholder }),
      CharacterCount,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, autolink: true }),
      Superscript,
      Subscript,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CodeBlockLowlight,
      Callout,
    ],
    content: value || '',
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const isEmpty = html === '<p></p>' || html === '';
      onChange(isEmpty ? '' : html);
    },
    onSelectionUpdate: () => forceUpdate((n) => n + 1),
    onTransaction: () => forceUpdate((n) => n + 1),
    editorProps: {
      attributes: {
        class: 'editor-content focus:outline-none',
      },
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (!editor) return;
    const next = value || '';
    const cur = editor.getHTML();
    if (cur === next || (next === '' && cur === '<p></p>')) return;
    editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  /* ─── Media upload ──────────────────────────────────── */

  const handleMediaUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, forceCategory?: 'image' | 'video' | 'audio') => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      if (file.size > MAX_FILE_SIZE) {
        toast.error('File must be under 25MB.');
        e.target.value = '';
        return;
      }

      const category = forceCategory || getMediaCategory(file.type);
      if (!category) {
        toast.error('Unsupported file type.');
        e.target.value = '';
        return;
      }

      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${storagePath}/${crypto.randomUUID()}.${ext}`;

      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress((p) => (p === null || p >= 90 ? p : p + Math.random() * 15));
      }, 200);

      try {
        const { error: uploadErr } = await supabase.storage
          .from('challenge-media')
          .upload(path, file, { contentType: file.type });

        clearInterval(interval);

        if (uploadErr) {
          setUploadProgress(null);
          toast.error(`Upload failed: ${uploadErr.message}`);
          return;
        }

        setUploadProgress(100);

        const { data: urlData } = supabase.storage.from('challenge-media').getPublicUrl(path);
        const publicUrl = urlData?.publicUrl;
        if (!publicUrl) { setUploadProgress(null); toast.error('Failed to get URL.'); return; }

        if (category === 'image') {
          editor.chain().focus().setImage({ src: publicUrl }).run();
        } else if (category === 'video') {
          editor.chain().focus().insertContent(
            `<video controls src="${publicUrl}" style="max-width:100%;border-radius:8px;margin:8px 0"></video>`
          ).run();
        } else if (category === 'audio') {
          editor.chain().focus().insertContent(
            `<audio controls src="${publicUrl}" style="width:100%;margin:8px 0"></audio>`
          ).run();
        }

        toast.success(`${category.charAt(0).toUpperCase() + category.slice(1)} uploaded`);
      } catch {
        clearInterval(interval);
        toast.error('Upload failed.');
      } finally {
        setTimeout(() => setUploadProgress(null), 600);
        e.target.value = '';
      }
    },
    [editor, storagePath],
  );

  /* ─── Video embed ──────────────────────────────────── */

  const handleVideoEmbed = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Paste a YouTube or Vimeo URL:');
    if (!url) return;
    if (!url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('vimeo.com')) {
      toast.error('Only YouTube and Vimeo URLs are supported.');
      return;
    }
    editor.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  /* ─── Link insert ──────────────────────────────────── */

  const handleInsertLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL:', prev);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  /* ─── Counts ──────────────────────────────────────── */

  const charCount = editor?.storage.characterCount?.characters() ?? 0;
  const wordCount = editor?.storage.characterCount?.words() ?? 0;
  const meetsMin = !minLength || charCount >= minLength;

  if (!editor) return null;

  const isUploading = uploadProgress !== null;

  /* ─── Block style label ────────────────────────────── */

  const getBlockLabel = () => {
    if (editor.isActive('heading', { level: 1 })) return 'Heading 1';
    if (editor.isActive('heading', { level: 2 })) return 'Heading 2';
    if (editor.isActive('heading', { level: 3 })) return 'Heading 3';
    if (editor.isActive('heading', { level: 4 })) return 'Heading 4';
    if (editor.isActive('blockquote')) return 'Blockquote';
    if (editor.isActive('codeBlock')) return 'Code Block';
    return 'Paragraph';
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        className={cn(
          'border rounded-md overflow-hidden bg-background',
          error ? 'border-destructive' : 'border-input',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1',
        )}
      >
        {/* ══ ROW 1 ═══════════════════════════════════════ */}
        <div className="flex flex-wrap items-center gap-[3px] px-2.5 py-1 border-b bg-muted/20">
          {/* Block style dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-[26px] px-2 border border-border rounded text-[11px] bg-background flex items-center gap-1 cursor-pointer hover:bg-muted"
              >
                <Type className="h-3 w-3" />
                <span className="max-w-[72px] truncate">{getBlockLabel()}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
                Paragraph
              </DropdownMenuItem>
              {[1, 2, 3, 4].map((lvl) => (
                <DropdownMenuItem
                  key={lvl}
                  onClick={() => editor.chain().focus().toggleHeading({ level: lvl as 1|2|3|4 }).run()}
                >
                  Heading {lvl}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                Blockquote
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
                Code Block
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Font size */}
          <select
            className="h-[26px] px-1 border border-border rounded text-[11px] bg-background cursor-pointer outline-none"
            value=""
            onChange={(e) => {
              if (e.target.value) {
                editor.chain().focus().setMark('textStyle', { fontSize: `${e.target.value}px` }).run();
              }
            }}
          >
            <option value="">Size</option>
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>

          <ToolbarSep />

          <TBtn title="Bold (Ctrl+B)" isActive={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Italic (Ctrl+I)" isActive={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Underline (Ctrl+U)" isActive={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Strikethrough" isActive={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="h-3.5 w-3.5" />
          </TBtn>

          <ToolbarSep />

          {/* Text color */}
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" title="Text Color"
                className="min-w-[28px] h-[26px] px-[5px] rounded flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer">
                <Palette className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-5 gap-1">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                    onClick={() => editor.chain().focus().setColor(c).run()}
                  />
                ))}
              </div>
              <button
                type="button"
                className="mt-1.5 text-[10px] text-muted-foreground hover:text-foreground w-full text-center"
                onClick={() => editor.chain().focus().unsetColor().run()}
              >
                Reset color
              </button>
            </PopoverContent>
          </Popover>

          <TBtn title="Highlight" isActive={editor.isActive('highlight')}
            onClick={() => editor.chain().focus().toggleHighlight().run()}>
            <Highlighter className="h-3.5 w-3.5" />
          </TBtn>

          <ToolbarSep />

          <TBtn title="Superscript" isActive={editor.isActive('superscript')}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}>
            <SuperscriptIcon className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Subscript" isActive={editor.isActive('subscript')}
            onClick={() => editor.chain().focus().toggleSubscript().run()}>
            <SubscriptIcon className="h-3.5 w-3.5" />
          </TBtn>

          <TBtn title="Clear Formatting"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
            <RemoveFormatting className="h-3.5 w-3.5" />
          </TBtn>
        </div>

        {/* ══ ROW 2 ═══════════════════════════════════════ */}
        <div className="flex flex-wrap items-center gap-[3px] px-2.5 py-1 border-b bg-muted/20">
          <TBtn title="Bullet List" isActive={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Numbered List" isActive={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Indent"
            onClick={() => editor.chain().focus().sinkListItem('listItem').run()}>
            <IndentIncrease className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Outdent"
            onClick={() => editor.chain().focus().liftListItem('listItem').run()}>
            <IndentDecrease className="h-3.5 w-3.5" />
          </TBtn>

          <ToolbarSep />

          <TBtn title="Align Left" isActive={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}>
            <AlignLeft className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Align Center" isActive={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}>
            <AlignCenter className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Align Right" isActive={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}>
            <AlignRight className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Justify" isActive={editor.isActive({ textAlign: 'justify' })}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
            <AlignJustify className="h-3.5 w-3.5" />
          </TBtn>

          <ToolbarSep />

          <TBtn title="Insert Link" isActive={editor.isActive('link')} onClick={handleInsertLink}>
            <LinkIcon className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Remove Link"
            onClick={() => editor.chain().focus().unsetLink().run()}
            disabled={!editor.isActive('link')}>
            <Unlink className="h-3.5 w-3.5" />
          </TBtn>

          <ToolbarSep />

          <TBtn title="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Redo (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 className="h-3.5 w-3.5" />
          </TBtn>

          <ToolbarSep />

          {/* Insert dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-[26px] px-2 border border-border rounded text-[11px] bg-background flex items-center gap-1 cursor-pointer hover:bg-muted"
              >
                <Plus className="h-3 w-3" />
                Insert
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px]">
              <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                <ImageIcon className="h-4 w-4 mr-2" /> Upload Image
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => audioInputRef.current?.click()}>
                <Music className="h-4 w-4 mr-2" /> Upload Audio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
                <Video className="h-4 w-4 mr-2" /> Upload Video
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleVideoEmbed}>
                <Video className="h-4 w-4 mr-2" /> Embed YouTube/Vimeo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 3, withHeaderRow: true }).run()}>
                <TableIcon className="h-4 w-4 mr-2" /> Insert Table (3×2)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                <Minus className="h-4 w-4 mr-2" /> Horizontal Rule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => editor.chain().focus().setCallout({ type: 'info' }).run()}>
                <Info className="h-4 w-4 mr-2 text-blue-500" /> Info Callout
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setCallout({ type: 'warning' }).run()}>
                <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" /> Warning Callout
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setCallout({ type: 'success' }).run()}>
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> Success Callout
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setCallout({ type: 'danger' }).run()}>
                <XCircle className="h-4 w-4 mr-2 text-red-500" /> Danger Callout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Upload progress ─────────────────────────── */}
        {isUploading && <UploadProgressBar progress={uploadProgress} />}

        {/* ── Editor content ──────────────────────────── */}
        <EditorContent editor={editor} />

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*,video/mp4,audio/mp3,audio/mpeg" className="hidden"
          onChange={(e) => handleMediaUpload(e)} />
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => handleMediaUpload(e, 'image')} />
        <input ref={videoInputRef} type="file" accept="video/mp4" className="hidden"
          onChange={(e) => handleMediaUpload(e, 'video')} />
        <input ref={audioInputRef} type="file" accept="audio/mp3,audio/mpeg" className="hidden"
          onChange={(e) => handleMediaUpload(e, 'audio')} />
      </div>

      {/* ── Footer: error + word/char count ─────────── */}
      <div className="flex items-center justify-between">
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <span className="text-xs text-muted-foreground">
            {wordCount} words · {charCount} characters
          </span>
        )}
        {minLength != null && (
          <span className={cn(
            'text-xs tabular-nums',
            meetsMin ? 'text-green-600 font-medium' : 'text-muted-foreground',
          )}>
            {charCount} / {minLength} min
          </span>
        )}
      </div>
    </div>
  );
}
