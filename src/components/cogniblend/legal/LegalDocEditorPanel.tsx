/**
 * LegalDocEditorPanel — Controlled TipTap editor for legal document editing.
 * Reuses src/styles/legal-document.css for consistent legal-doc typography.
 *
 * Sprint 6B: optional `protectedSectionHeadings` blocks deletion of any H2
 * heading whose text matches an entry (case-insensitive). Used to enforce
 * the AGG-mandatory Anti-Disintermediation section. Content WITHIN such a
 * section remains fully editable — only removing the heading itself is
 * blocked (and the user is shown a toast).
 */
import { useEffect, useMemo } from 'react';
import { useEditor, EditorContent, type Editor, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import '@/styles/legal-document.css';

export interface LegalDocEditorPanelProps {
  content: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  /**
   * Sprint 6B — optional list of H2 heading text values that cannot be
   * deleted from the document (matched case-insensitively against trimmed
   * heading text). Used by AGG mode to lock the Anti-Disintermediation
   * section.
   */
  protectedSectionHeadings?: string[];
}

export interface LegalDocEditorPanelHandle {
  editor: Editor | null;
}

function buildHeadingGuardExtension(protectedHeadings: string[]): Extension {
  const normalized = protectedHeadings.map((h) => h.trim().toLowerCase());
  return Extension.create({
    name: 'protectedHeadingGuard',
    addOptions() {
      return { protectedHeadings: normalized };
    },
    addProseMirrorPlugins() {
      return [];
    },
    onTransaction({ transaction }) {
      // No-op — guard runs in `filterTransaction` via editor option below.
      void transaction;
    },
  });
}

export function LegalDocEditorPanel({
  content,
  onChange,
  readOnly = false,
  placeholder = 'Start drafting the legal document...',
  className,
  protectedSectionHeadings,
}: LegalDocEditorPanelProps) {
  const protectedNormalized = useMemo(
    () => (protectedSectionHeadings ?? []).map((h) => h.trim().toLowerCase()).filter(Boolean),
    [protectedSectionHeadings],
  );

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Placeholder.configure({ placeholder }),
        buildHeadingGuardExtension(protectedNormalized),
      ],
      content,
      editable: !readOnly,
      editorProps: {
        // ProseMirror filterTransaction runs BEFORE the transaction applies.
        // We inspect docChanged transactions and check whether any protected
        // H2 heading text disappears between old and new doc.
        handleTextInput: () => false,
      },
      onUpdate: ({ editor: e }) => {
        onChange(e.getHTML());
      },
    },
    [protectedNormalized.join('|')],
  );

  // Install the heading-protection guard via filterTransaction once the editor
  // is ready. We re-install whenever the protected list changes.
  useEffect(() => {
    if (!editor) return;
    if (protectedNormalized.length === 0) return;

    const view = editor.view;
    const originalDispatch = view.props.dispatchTransaction ?? view.dispatch.bind(view);

    const guarded = (tr: typeof view.state.tr) => {
      if (tr.docChanged) {
        const before = collectProtectedHeadings(view.state.doc, protectedNormalized);
        const next = tr.doc;
        const after = collectProtectedHeadings(next, protectedNormalized);
        for (const heading of before) {
          if (!after.has(heading)) {
            toast.info(
              'This section is mandatory for the Aggregator model and cannot be removed. You can edit the terms within it.',
            );
            return; // Drop the transaction.
          }
        }
      }
      originalDispatch(tr);
    };

    view.setProps({ dispatchTransaction: guarded });
    return () => {
      view.setProps({ dispatchTransaction: originalDispatch });
    };
  }, [editor, protectedNormalized]);

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

/**
 * Walk the document and return the set of protected heading texts (lowercased)
 * currently present at H2 level.
 */
function collectProtectedHeadings(
  doc: { descendants: (cb: (node: any) => void | boolean) => void },
  protectedNormalized: string[],
): Set<string> {
  const found = new Set<string>();
  doc.descendants((node: any) => {
    if (node?.type?.name === 'heading' && node?.attrs?.level === 2) {
      const text = String(node.textContent ?? '').trim().toLowerCase();
      if (protectedNormalized.includes(text)) {
        found.add(text);
      }
    }
    return true;
  });
  return found;
}

export default LegalDocEditorPanel;
