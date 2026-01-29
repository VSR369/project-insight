/**
 * Rich Text Toolbar Component
 * Markdown-based formatting toolbar for article editor
 * Per Phase E specification - ART-001 to ART-004
 */

import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RichTextToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

interface ToolbarAction {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  action: (text: string, selectionStart: number, selectionEnd: number) => {
    newText: string;
    newCursorPos: number;
  };
}

export function RichTextToolbar({ textareaRef, value, onChange, className }: RichTextToolbarProps) {
  
  const wrapSelection = (prefix: string, suffix: string = prefix) => 
    (text: string, start: number, end: number) => {
      const before = text.slice(0, start);
      const selected = text.slice(start, end);
      const after = text.slice(end);
      
      // Check if already wrapped - unwrap if so
      const isWrapped = before.endsWith(prefix) && after.startsWith(suffix);
      if (isWrapped && selected.length > 0) {
        return {
          newText: before.slice(0, -prefix.length) + selected + after.slice(suffix.length),
          newCursorPos: start - prefix.length + selected.length,
        };
      }
      
      return {
        newText: before + prefix + (selected || 'text') + suffix + after,
        newCursorPos: start + prefix.length + (selected || 'text').length,
      };
    };

  const prefixLine = (prefix: string) =>
    (text: string, start: number, end: number) => {
      // Find the start of the current line
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const before = text.slice(0, lineStart);
      const lineContent = text.slice(lineStart, end);
      const after = text.slice(end);
      
      // Check if line already has prefix - toggle off
      if (lineContent.startsWith(prefix)) {
        const newContent = lineContent.slice(prefix.length);
        return {
          newText: before + newContent + after,
          newCursorPos: start - prefix.length,
        };
      }
      
      // Remove other heading prefixes if adding a heading
      let cleanContent = lineContent;
      if (prefix.startsWith('#')) {
        cleanContent = lineContent.replace(/^#{1,3}\s/, '');
      }
      
      return {
        newText: before + prefix + cleanContent + after,
        newCursorPos: start + prefix.length,
      };
    };

  const insertLine = (text: string) =>
    (_: string, start: number, end: number) => {
      const before = _.slice(0, start);
      const after = _.slice(end);
      
      // Add newlines if needed
      const needsNewlineBefore = before.length > 0 && !before.endsWith('\n');
      const needsNewlineAfter = after.length > 0 && !after.startsWith('\n');
      
      const insert = (needsNewlineBefore ? '\n' : '') + text + (needsNewlineAfter ? '\n' : '');
      
      return {
        newText: before + insert + after,
        newCursorPos: start + insert.length,
      };
    };

  const actions: ToolbarAction[] = [
    { icon: Bold, label: 'Bold', shortcut: 'Ctrl+B', action: wrapSelection('**') },
    { icon: Italic, label: 'Italic', shortcut: 'Ctrl+I', action: wrapSelection('*') },
    { icon: Heading1, label: 'Heading 1', action: prefixLine('# ') },
    { icon: Heading2, label: 'Heading 2', action: prefixLine('## ') },
    { icon: Heading3, label: 'Heading 3', action: prefixLine('### ') },
    { icon: List, label: 'Bullet List', action: prefixLine('- ') },
    { icon: ListOrdered, label: 'Numbered List', action: prefixLine('1. ') },
    { icon: Quote, label: 'Quote', action: prefixLine('> ') },
    { icon: Minus, label: 'Divider', action: insertLine('\n---\n') },
  ];

  const handleAction = (action: ToolbarAction['action']) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const { newText, newCursorPos } = action(value, selectionStart, selectionEnd);
    
    onChange(newText);
    
    // Restore focus and cursor position after React updates
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;

    if (e.key === 'b') {
      e.preventDefault();
      handleAction(wrapSelection('**'));
    } else if (e.key === 'i') {
      e.preventDefault();
      handleAction(wrapSelection('*'));
    }
  };

  return (
    <div className={cn("flex items-center gap-0.5 p-1 border rounded-lg bg-muted/30", className)}>
      {actions.map((action, index) => (
        <div key={action.label} className="contents">
          {(index === 2 || index === 5 || index === 8) && (
            <Separator orientation="vertical" className="h-6 mx-1" />
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleAction(action.action)}
                aria-label={action.label}
              >
                <action.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {action.label}
              {action.shortcut && (
                <span className="ml-2 text-muted-foreground">({action.shortcut})</span>
              )}
            </TooltipContent>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}

// Export keyboard handler for use in textarea
export function useRichTextKeyboard(
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  value: string,
  onChange: (value: string) => void
) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    
    const wrapSelection = (prefix: string, suffix: string = prefix) => {
      const before = value.slice(0, selectionStart);
      const selected = value.slice(selectionStart, selectionEnd);
      const after = value.slice(selectionEnd);
      
      const newText = before + prefix + (selected || 'text') + suffix + after;
      const newCursorPos = selectionStart + prefix.length + (selected || 'text').length;
      
      onChange(newText);
      
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      });
    };

    if (e.key === 'b') {
      e.preventDefault();
      wrapSelection('**');
    } else if (e.key === 'i') {
      e.preventDefault();
      wrapSelection('*');
    }
  };

  return handleKeyDown;
}
