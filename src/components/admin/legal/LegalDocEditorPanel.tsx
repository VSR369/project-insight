/**
 * LegalDocEditorPanel — TipTap editor with legal-document.css styling.
 */
import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import '@/styles/legal-document.css';
import { LegalDocEditorToolbar } from './LegalDocEditorToolbar';
import { LegalDocQuickInserts } from './LegalDocQuickInserts';

interface LegalDocEditorPanelProps {
  content: string;
  onContentChange: (html: string, json: Record<string, unknown> | null) => void;
}

export function LegalDocEditorPanel({ content, onContentChange }: LegalDocEditorPanelProps) {
  const [isInitialized, setIsInitialized] = React.useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CharacterCount,
      Highlight,
    ],
    editorProps: {
      attributes: {
        class: 'legal-doc focus:outline-none min-h-[600px]',
      },
    },
    onUpdate: ({ editor: e }) => {
      onContentChange(e.getHTML(), e.getJSON() as Record<string, unknown>);
    },
  });

  React.useEffect(() => {
    if (editor && content && !isInitialized) {
      editor.commands.setContent(content);
      setIsInitialized(true);
    }
  }, [editor, content, isInitialized]);

  if (!editor) return null;

  return (
    <div className="legal-doc-page">
      <div className="sticky top-0 z-10 bg-background border-b">
        <LegalDocEditorToolbar editor={editor} />
        <LegalDocQuickInserts editor={editor} />
      </div>
      <EditorContent editor={editor} />
      <div className="px-4 py-2 text-xs text-muted-foreground text-right border-t">
        {editor.storage.characterCount.characters()} characters
      </div>
    </div>
  );
}
