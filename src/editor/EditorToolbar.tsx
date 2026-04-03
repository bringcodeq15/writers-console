import type { Editor } from '@tiptap/react';

interface EditorToolbarProps {
  editor: Editor | null;
  onOpenLink?: () => void;
}

export function EditorToolbar({ editor, onOpenLink }: EditorToolbarProps) {
  if (!editor) return null;

  const buttons = [
    {
      label: 'B',
      tooltip: 'Bold (Cmd+B)',
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive('bold'),
      style: { fontWeight: 700 } as React.CSSProperties,
    },
    {
      label: 'I',
      tooltip: 'Italic (Cmd+I)',
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive('italic'),
      style: { fontStyle: 'italic' } as React.CSSProperties,
    },
    {
      label: 'S',
      tooltip: 'Strikethrough (Cmd+Shift+X)',
      action: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive('strike'),
      style: { textDecoration: 'line-through' } as React.CSSProperties,
    },
    {
      label: 'H1',
      tooltip: 'Heading 1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: editor.isActive('heading', { level: 1 }),
    },
    {
      label: 'H2',
      tooltip: 'Heading 2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive('heading', { level: 2 }),
    },
    {
      label: 'H3',
      tooltip: 'Heading 3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive('heading', { level: 3 }),
    },
    {
      label: '\u275D',
      tooltip: 'Block quote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive('blockquote'),
    },
    {
      label: '\u2022',
      tooltip: 'Bullet list',
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive('bulletList'),
    },
    {
      label: '1.',
      tooltip: 'Numbered list',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive('orderedList'),
      style: { fontSize: 12 } as React.CSSProperties,
    },
    {
      label: '\u2014\u2014',
      tooltip: 'Horizontal rule',
      action: () => editor.chain().focus().setHorizontalRule().run(),
      active: false,
    },
    {
      label: '\u{1F517}',
      tooltip: 'Insert link (Cmd+K)',
      action: () => onOpenLink?.(),
      active: editor.isActive('link'),
    },
  ];

  return (
    <div
      className="flex items-center gap-0 border-b px-6 max-w-[720px] mx-auto"
      style={{
        height: 36,
        borderColor: 'var(--border-default)',
        background: 'var(--bg-primary)',
      }}
    >
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onClick={btn.action}
          title={btn.tooltip}
          className="px-2 flex items-center justify-center"
          style={{
            height: 36,
            fontFamily: 'var(--font-family)',
            fontSize: 14,
            color: btn.active ? 'var(--accent)' : 'var(--text-secondary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 2,
            ...btn.style,
          }}
          onMouseEnter={(e) => {
            if (!btn.active) e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            if (!btn.active)
              e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
