/**
 * LegalDocEditorPanel — Controlled TipTap editor for legal document editing.
 * Reuses src/styles/legal-document.css for consistent legal-doc typography.
 */
import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';
import '@/styles/legal-document.css';

export interface LegalDocEditorPanelProps {
  content: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export interface LegalDocEditorPanelHandle {
  editor: Editor | null;
}

export function LegalDocEditorPanel({
  content,
  onChange,
  readOnly = false,
  placeholder = 'Start drafting the legal document...',
  className,
}: LegalDocEditorPanelProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  // Sync external content changes without resetting cursor when unchanged.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [content, editor]);

  // Re-apply editable state when readOnly prop changes.
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [readOnly, editor]);

  return (
    <div className={cn('legal-doc-page', className)}>
      <div className="legal-doc">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default LegalDocEditorPanel;
