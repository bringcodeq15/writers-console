import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { nanoid } from 'nanoid';

export const ParagraphId = Extension.create({
  name: 'paragraphId',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'blockquote'],
        attributes: {
          pid: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-pid'),
            renderHTML: (attributes) => {
              if (!attributes.pid) return {};
              return { 'data-pid': attributes.pid };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    let hasRunInitialDedup = false;

    return [
      new Plugin({
        key: new PluginKey('paragraphId'),
        appendTransaction: (transactions, _oldState, newState) => {
          const docChanged = transactions.some((tr) => tr.docChanged);
          const needsInitialDedup = !hasRunInitialDedup;

          if (!docChanged && !needsInitialDedup) return null;

          const tr = newState.tr;
          let modified = false;
          const seenPids = new Set<string>();

          newState.doc.descendants((node, pos) => {
            if (
              node.type.name === 'paragraph' ||
              node.type.name === 'heading' ||
              node.type.name === 'blockquote'
            ) {
              const pid = node.attrs.pid;
              if (!pid || seenPids.has(pid)) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  pid: nanoid(12),
                });
                modified = true;
              } else {
                seenPids.add(pid);
              }
            }
          });

          if (needsInitialDedup) {
            hasRunInitialDedup = true;
          }

          return modified ? tr : null;
        },
      }),
    ];
  },
});
