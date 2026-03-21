/**
 * Tiptap Callout Extension — Custom node for styled callout blocks.
 * Supports: info, warning, success, danger variants.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export type CalloutType = 'info' | 'warning' | 'success' | 'danger';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs: { type: CalloutType }) => ReturnType;
      toggleCallout: (attrs: { type: CalloutType }) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: 'callout',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => {
          if (element.classList.contains('callout-warning')) return 'warning';
          if (element.classList.contains('callout-success')) return 'success';
          if (element.classList.contains('callout-danger')) return 'danger';
          return 'info';
        },
        renderHTML: (attributes) => ({
          class: `callout callout-${attributes.type}`,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.callout' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attrs),
      toggleCallout:
        (attrs) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, attrs),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
