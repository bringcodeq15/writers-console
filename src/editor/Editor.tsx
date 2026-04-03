import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useEffect, useCallback, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/react';
import { ParagraphId } from './extensions/paragraphId';
import { KeyboardShortcuts, type ShortcutHandlers } from './extensions/keyboardShortcuts';
import { EditorToolbar } from './EditorToolbar';
import '../styles/editor.css';

interface EditorProps {
  content: JSONContent | undefined;
  onUpdate: (content: JSONContent) => void;
  onEditorReady: (editor: ReturnType<typeof useEditor>) => void;
  shortcutHandlers: ShortcutHandlers;
  onOpenLink?: () => void;
  onAttachResearch?: (paragraphId: string, researchItemId: string) => void;
  flowIntensity?: number;
  isTyping?: boolean;
  completenessScore?: number;
}

export function WriterEditor({
  content,
  onUpdate,
  onEditorReady,
  shortcutHandlers,
  onOpenLink,
  onAttachResearch,
  flowIntensity = 0,
  isTyping = false,
  completenessScore = 0,
}: EditorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [viewportPercent, setViewportPercent] = useState(100);
  const attachResearchRef = useRef(onAttachResearch);
  attachResearchRef.current = onAttachResearch;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      ParagraphId,
      KeyboardShortcuts.configure({ handlers: shortcutHandlers }),
    ],
    content: content || { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'tiptap',
        spellcheck: 'true',
      },
      handleDOMEvents: {
        dragover: (_view, event) => {
          // Check if this is a research item drag
          if (event.dataTransfer?.types.includes('application/wc-research')) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';

            // Highlight the paragraph under the cursor
            const target = (event.target as HTMLElement).closest?.('[data-pid]');
            // Remove previous highlights
            document.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
            if (target) {
              target.classList.add('drag-over');
            }
          }
          return false;
        },
        dragleave: (_view, event) => {
          const related = event.relatedTarget as HTMLElement | null;
          if (!related?.closest?.('.tiptap')) {
            document.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
          }
          return false;
        },
        drop: (view, event) => {
          // Clean up highlight
          document.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));

          const raw = event.dataTransfer?.getData('application/wc-research');
          if (!raw) return false;

          event.preventDefault();
          event.stopPropagation();

          try {
            const item = JSON.parse(raw);
            const dropTarget = (event.target as HTMLElement).closest?.('[data-pid]');
            const pid = dropTarget?.getAttribute('data-pid');

            if (pid && dropTarget) {
              // Dropped ON a paragraph → attach research item
              if (attachResearchRef.current) {
                attachResearchRef.current(pid, item.id);
              }
              // Flash the paragraph to confirm
              dropTarget.classList.add('highlight-flash');
              setTimeout(() => {
                dropTarget.classList.remove('highlight-flash');
                dropTarget.classList.add('highlight-flash-off');
                setTimeout(() => dropTarget.classList.remove('highlight-flash-off'), 1000);
              }, 100);
            }

            // Also insert the content as a blockquote at the drop position
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (pos) {
              const editorInstance = view.state;
              const insertPos = editorInstance.doc.resolve(pos.pos).after(1);
              view.dispatch(
                view.state.tr.insert(insertPos, view.state.schema.nodes.blockquote.create(
                  null,
                  view.state.schema.nodes.paragraph.create(
                    null,
                    item.content ? view.state.schema.text(item.content) : null
                  )
                ))
              );
            }
          } catch {
            // Ignore parse failures
          }
          return true;
        },
      },
    },
  });

  useEffect(() => {
    if (editor) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  const setContent = useCallback(
    (newContent: JSONContent) => {
      if (editor && newContent) {
        editor.commands.setContent(newContent);
      }
    },
    [editor]
  );

  useEffect(() => {
    if (content && editor && !editor.isFocused) {
      const currentJSON = JSON.stringify(editor.getJSON());
      const newJSON = JSON.stringify(content);
      if (currentJSON !== newJSON) {
        setContent(content);
      }
    }
  }, [content, editor, setContent]);

  // Scroll tracking for Zeigarnik progress
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;
    setScrollPercent(maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0);
    setViewportPercent(scrollHeight > 0 ? (clientHeight / scrollHeight) * 100 : 100);
  }, []);

  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-y-auto relative ${isTyping ? 'typing-active' : ''}`}
      style={{
        background: 'var(--bg-primary)',
        animation: flowIntensity > 0.3 ? 'flow-ambient 30s ease-in-out infinite' : 'none',
      }}
      onScroll={handleScroll}
    >
      <div
        className="flow-dimmed"
        style={{
          opacity: 1 - flowIntensity * 0.5,
          filter: `blur(${flowIntensity * 1}px)`,
        }}
      >
        <EditorToolbar editor={editor} onOpenLink={onOpenLink} />
      </div>
      <EditorContent editor={editor} />

      {/* Zeigarnik progress track */}
      <div className="zeigarnik-track">
        <div
          className="zeigarnik-completeness"
          style={{ height: `${completenessScore}%` }}
        />
        <div
          className="zeigarnik-viewport"
          style={{
            top: `${scrollPercent}%`,
            height: `${Math.max(4, viewportPercent)}%`,
          }}
        />
      </div>
    </div>
  );
}
