import { useState, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';

interface LinkPopoverProps {
  editor: Editor;
  onClose: () => void;
}

export function LinkPopover({ editor, onClose }: LinkPopoverProps) {
  const existingHref = editor.getAttributes('link').href || '';
  const [url, setUrl] = useState(existingHref);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = () => {
    if (url.trim()) {
      let href = url.trim();
      if (!/^https?:\/\//i.test(href)) href = 'https://' + href;
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    onClose();
  };

  const handleRemove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-40"
      style={{ zIndex: 100, background: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
      data-testid="link-popover"
    >
      <div
        className="w-full max-w-md p-4"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-emphasis)',
          borderRadius: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mb-3"
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          Insert Link
        </div>
        <input
          ref={inputRef}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onClose();
          }}
          style={{
            width: '100%',
            fontFamily: 'var(--font-family)',
            fontSize: 14,
            color: 'var(--text-primary)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-emphasis)',
            borderRadius: 2,
            padding: '8px 12px',
            outline: 'none',
            marginBottom: 12,
          }}
        />
        <div className="flex justify-between">
          <div>
            {existingHref && (
              <button
                onClick={handleRemove}
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 12,
                  color: 'var(--color-error)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Remove link
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 12,
                color: 'var(--text-tertiary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 12,
                color: 'var(--accent)',
                background: 'var(--accent-faint)',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 14px',
                borderRadius: 2,
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
