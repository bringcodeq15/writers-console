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
  flowIntensity = 0,
  isTyping = false,
  completenessScore = 0,
}: EditorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [viewportPercent, setViewportPercent] = useState(100);

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
