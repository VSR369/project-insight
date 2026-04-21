/**
 * Pass3EditorExtensions — Custom TipTap extensions that preserve the
 * legal-doc diff markup (`legal-diff-added` / `legal-diff-removed` /
 * `legal-diff-removed-section`) across `setContent` round-trips.
 *
 * StarterKit's default Paragraph and Heading nodes drop unknown class
 * attributes, and unknown <span> wrappers are stripped entirely. Without
 * these overrides the diff highlighting renders as plain text.
 *
 * IMPORTANT: All three exports MUST be imported synchronously into the
 * `useEditor` extensions array — TipTap requires the full schema at mount.
 */
import { Mark, mergeAttributes } from '@tiptap/core';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';

const CLASS_ATTR = {
  class: {
    default: null as string | null,
    parseHTML: (el: HTMLElement) => el.getAttribute('class'),
    renderHTML: (attrs: { class?: string | null }) =>
      attrs.class ? { class: attrs.class } : {},
  },
};

/** Paragraph that preserves the `class` attribute (`legal-diff-removed`, etc.). */
export const ParagraphWithClass = Paragraph.extend({
  addAttributes() {
    return { ...this.parent?.(), ...CLASS_ATTR };
  },
});

/** Heading that preserves the `class` attribute (`legal-diff-added` on H1-H6). */
export const HeadingWithClass = Heading.extend({
  addAttributes() {
    return { ...this.parent?.(), ...CLASS_ATTR };
  },
});

/** Inline mark for `<span class="legal-diff-added">…</span>` wrappers. */
export const DiffAddedMark = Mark.create({
  name: 'diffAdded',
  inclusive: false,
  parseHTML() {
    return [
      {
        tag: 'span.legal-diff-added',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'legal-diff-added' }),
      0,
    ];
  },
});
