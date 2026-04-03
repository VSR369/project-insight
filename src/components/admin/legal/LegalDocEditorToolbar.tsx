/**
 * LegalDocEditorToolbar — TipTap toolbar with legal-specific formatting.
 */
import type { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bold, Italic, Underline, Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, Quote, Minus, Undo2, Redo2, AlignLeft,
  AlignCenter, AlignJustify, Link2, RemoveFormatting, Table,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LegalDocEditorToolbarProps {
  editor: Editor;
}

function ToolbarBtn({
  active, onClick, children, title,
}: { active?: boolean; onClick: () => void; children: React.ReactNode; title: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8', active && 'bg-accent')}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </Button>
  );
}

export function LegalDocEditorToolbar({ editor }: LegalDocEditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2">
      {/* Structure */}
      <ToolbarBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Document Title (H1)">
        <Heading1 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Article Heading (H2)">
        <Heading2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Section Heading (H3)">
        <Heading3 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('heading', { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} title="Subsection (H4)">
        <Heading4 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Section Divider">
        <Minus className="h-4 w-4" />
      </ToolbarBtn>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text */}
      <ToolbarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <Bold className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <Italic className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
        <Underline className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List">
        <ListOrdered className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
        <List className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
        <Quote className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert Table">
        <Table className="h-4 w-4" />
      </ToolbarBtn>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Utility */}
      <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
        <Undo2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">
        <Redo2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left">
        <AlignLeft className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center">
        <AlignCenter className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justify">
        <AlignJustify className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => {
          const url = window.prompt('URL');
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        title="Insert Link"
      >
        <Link2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting">
        <RemoveFormatting className="h-4 w-4" />
      </ToolbarBtn>
    </div>
  );
}
