/**
 * LegalDocEditorToolbar — Formatting toolbar for the LegalDocEditorPanel.
 * Renders icon buttons with tooltips and active-state highlighting.
 */
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo2,
  Redo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface LegalDocEditorToolbarProps {
  editor: Editor | null;
}

interface ToolbarAction {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive?: () => boolean;
  run: () => void;
}

function Separator() {
  return <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />;
}

export function LegalDocEditorToolbar({ editor }: LegalDocEditorToolbarProps) {
  if (!editor) return null;

  const groups: ToolbarAction[][] = [
    [
      {
        key: 'bold',
        label: 'Bold',
        icon: Bold,
        isActive: () => editor.isActive('bold'),
        run: () => editor.chain().focus().toggleBold().run(),
      },
      {
        key: 'italic',
        label: 'Italic',
        icon: Italic,
        isActive: () => editor.isActive('italic'),
        run: () => editor.chain().focus().toggleItalic().run(),
      },
      {
        key: 'underline',
        label: 'Underline',
        icon: UnderlineIcon,
        isActive: () => editor.isActive('underline'),
        run: () => editor.chain().focus().toggleUnderline().run(),
      },
    ],
    [
      {
        key: 'h2',
        label: 'Heading 2',
        icon: Heading2,
        isActive: () => editor.isActive('heading', { level: 2 }),
        run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        key: 'h3',
        label: 'Heading 3',
        icon: Heading3,
        isActive: () => editor.isActive('heading', { level: 3 }),
        run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      },
    ],
    [
      {
        key: 'bullet',
        label: 'Bullet List',
        icon: List,
        isActive: () => editor.isActive('bulletList'),
        run: () => editor.chain().focus().toggleBulletList().run(),
      },
      {
        key: 'ordered',
        label: 'Numbered List',
        icon: ListOrdered,
        isActive: () => editor.isActive('orderedList'),
        run: () => editor.chain().focus().toggleOrderedList().run(),
      },
    ],
    [
      {
        key: 'quote',
        label: 'Blockquote',
        icon: Quote,
        isActive: () => editor.isActive('blockquote'),
        run: () => editor.chain().focus().toggleBlockquote().run(),
      },
      {
        key: 'hr',
        label: 'Horizontal Rule',
        icon: Minus,
        run: () => editor.chain().focus().setHorizontalRule().run(),
      },
    ],
    [
      {
        key: 'undo',
        label: 'Undo',
        icon: Undo2,
        run: () => editor.chain().focus().undo().run(),
      },
      {
        key: 'redo',
        label: 'Redo',
        icon: Redo2,
        run: () => editor.chain().focus().redo().run(),
      },
    ],
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div
        role="toolbar"
        aria-label="Legal document formatting"
        className="flex flex-wrap items-center gap-0.5 rounded-md border bg-background p-1"
      >
        {groups.map((group, groupIdx) => (
          <div key={groupIdx} className="flex items-center gap-0.5">
            {groupIdx > 0 && <Separator />}
            {group.map((action) => {
              const Icon = action.icon;
              const active = action.isActive?.() ?? false;
              return (
                <Tooltip key={action.key}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={action.label}
                      aria-pressed={active}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={action.run}
                      className={cn('h-8 w-8 p-0', active && 'bg-accent text-accent-foreground')}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{action.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

export default LegalDocEditorToolbar;
