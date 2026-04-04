import { useState, useRef, useCallback, useMemo, useEffect } from 'react';

interface NotesTabProps {
  content: string;
  loaded: boolean;
  onUpdate: (content: string) => void;
  onRemoveLine: (index: number) => void;
  documentTitles: string[];
  onTransferNote: (docTitle: string, noteText: string) => void;
}

// Each line is stored as "  • text" where leading spaces = indent level
function parseLine(raw: string): { indent: number; text: string } {
  const match = raw.match(/^(\s*)[•\-\*]?\s*(.*)/);
  if (!match) return { indent: 0, text: raw };
  const spaces = match[1].length;
  return { indent: Math.floor(spaces / 2), text: match[2] };
}

function formatLine(indent: number, text: string): string {
  return '  '.repeat(indent) + '• ' + text;
}

export function NotesTab({
  content,
  loaded,
  onUpdate,
  onRemoveLine,
  documentTitles,
  onTransferNote,
}: NotesTabProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);

  const filteredDocs = useMemo(() => {
    if (!autocompleteQuery) return documentTitles.slice(0, 8);
    const q = autocompleteQuery.toLowerCase();
    return documentTitles.filter((t) => t.toLowerCase().includes(q)).slice(0, 8);
  }, [autocompleteQuery, documentTitles]);

  // Parse transferable lines (start with /DocTitle after the bullet)
  const transferableLines = useMemo(() => {
    const lines = content.split('\n');
    const results: { lineIndex: number; docTitle: string; noteText: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const { text } = parseLine(lines[i]);
      if (!text.startsWith('/') || text.length < 2) continue;
      const afterSlash = text.slice(1);
      const matchedDoc = documentTitles.find((t) =>
        afterSlash.toLowerCase().startsWith(t.toLowerCase())
      );
      if (matchedDoc) {
        const noteText = afterSlash.slice(matchedDoc.length).trim();
        if (noteText.length > 0) {
          results.push({ lineIndex: i, docTitle: matchedDoc, noteText });
        }
      }
    }
    return results;
  }, [content, documentTitles]);

  // Ensure content always uses bullet format
  const normalizeContent = useCallback((raw: string): string => {
    if (!raw.trim()) return '';
    const lines = raw.split('\n');
    return lines.map((line) => {
      if (!line.trim()) return '';
      const { indent, text } = parseLine(line);
      if (!text) return '';
      return formatLine(indent, text);
    }).filter((l) => l !== '').join('\n');
  }, []);

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(e.target.value);
    },
    [onUpdate]
  );

  const checkAutocomplete = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursorPos = ta.selectionStart;
    const textBefore = ta.value.slice(0, cursorPos);
    const lastNewline = textBefore.lastIndexOf('\n');
    const currentLine = textBefore.slice(lastNewline + 1);
    const { text } = parseLine(currentLine);

    if (text.startsWith('/') && text.length >= 1) {
      setAutocompleteQuery(text.slice(1));
      setShowAutocomplete(true);
      setAutocompleteIndex(0);
    } else {
      setShowAutocomplete(false);
    }
  }, []);

  const insertDocTitle = useCallback(
    (title: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const cursorPos = ta.selectionStart;
      const textBefore = ta.value.slice(0, cursorPos);
      const textAfter = ta.value.slice(cursorPos);
      const lastNewline = textBefore.lastIndexOf('\n');
      const currentLine = textBefore.slice(lastNewline + 1);
      const { indent } = parseLine(currentLine);

      const newLine = formatLine(indent, '/' + title + ' ');
      const newContent = ta.value.slice(0, lastNewline + 1) + newLine + textAfter;
      onUpdate(newContent);
      setShowAutocomplete(false);

      setTimeout(() => {
        const newPos = lastNewline + 1 + newLine.length;
        ta.selectionStart = newPos;
        ta.selectionEnd = newPos;
        ta.focus();
      }, 10);
    },
    [onUpdate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = textareaRef.current;
      if (!ta) return;

      // Autocomplete navigation
      if (showAutocomplete) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setAutocompleteIndex((i) => Math.min(i + 1, filteredDocs.length - 1));
          return;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setAutocompleteIndex((i) => Math.max(i - 1, 0));
          return;
        } else if (e.key === 'Enter' && filteredDocs.length > 0) {
          e.preventDefault();
          insertDocTitle(filteredDocs[autocompleteIndex]);
          return;
        } else if (e.key === 'Escape') {
          setShowAutocomplete(false);
          return;
        }
      }

      const cursorPos = ta.selectionStart;
      const lines = ta.value.split('\n');
      const textBefore = ta.value.slice(0, cursorPos);
      const lineIndex = textBefore.split('\n').length - 1;
      const currentLine = lines[lineIndex] || '';
      const { indent, text } = parseLine(currentLine);

      // Enter: create new bullet at same indent
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!text.trim()) {
          // Empty bullet — remove it and just add newline
          lines[lineIndex] = '';
          const newContent = lines.join('\n');
          onUpdate(newContent);
          return;
        }
        const newLine = formatLine(indent, '');
        lines.splice(lineIndex + 1, 0, newLine);
        const newContent = lines.join('\n');
        onUpdate(newContent);
        // Move cursor to end of new bullet
        setTimeout(() => {
          const newPos = ta.value.split('\n').slice(0, lineIndex + 2).join('\n').length;
          ta.selectionStart = newPos;
          ta.selectionEnd = newPos;
        }, 10);
        return;
      }

      // Tab: indent
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const newIndent = Math.min(indent + 1, 4);
        lines[lineIndex] = formatLine(newIndent, text);
        onUpdate(lines.join('\n'));
        return;
      }

      // Shift+Tab: outdent
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        const newIndent = Math.max(indent - 1, 0);
        lines[lineIndex] = formatLine(newIndent, text);
        onUpdate(lines.join('\n'));
        return;
      }

      // Backspace at start of bullet text: outdent or delete bullet
      if (e.key === 'Backspace') {
        const lineStart = textBefore.lastIndexOf('\n') + 1;
        const posInLine = cursorPos - lineStart;
        const bulletEnd = currentLine.indexOf('• ') + 2;
        if (posInLine <= bulletEnd && text === '') {
          e.preventDefault();
          if (indent > 0) {
            lines[lineIndex] = formatLine(indent - 1, text);
          } else {
            lines.splice(lineIndex, 1);
          }
          onUpdate(lines.join('\n'));
          return;
        }
      }
    },
    [showAutocomplete, filteredDocs, autocompleteIndex, insertDocTitle, onUpdate]
  );

  const handleTransfer = useCallback(
    (lineIndex: number, docTitle: string, noteText: string) => {
      onTransferNote(docTitle, noteText);
      onRemoveLine(lineIndex);
    },
    [onTransferNote, onRemoveLine]
  );

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const handleSelect = () => checkAutocomplete();
    ta.addEventListener('click', handleSelect);
    return () => ta.removeEventListener('click', handleSelect);
  }, [checkAutocomplete]);

  // On first load, normalize existing content to bullet format
  useEffect(() => {
    if (loaded && content && !content.includes('•')) {
      const normalized = normalizeContent(content);
      if (normalized !== content) {
        onUpdate(normalized);
      }
    }
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) {
    return (
      <div className="p-3" style={{ fontFamily: 'var(--font-family)', fontSize: 13, color: 'var(--text-tertiary)' }}>
        Loading notes...
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col h-full">
      <div
        className="mb-3 flex items-center gap-2"
        title="Each line is a bullet note. Press Enter for new bullet, Tab/Shift+Tab to indent/outdent. Type /DocName to tag a note for transfer to a document's research."
      >
        <span
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          Notes
        </span>
        <span
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 10,
            color: 'var(--text-tertiary)',
            cursor: 'help',
          }}
          title="Each line is a bullet note. Press Enter for new bullet, Tab/Shift+Tab to indent/outdent. Type /DocName to tag a note for transfer to a document's research."
        >
          ?
        </span>
      </div>

      <div className="relative flex-1 min-h-0">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaChange}
          onKeyUp={checkAutocomplete}
          onKeyDown={handleKeyDown}
          placeholder="• Start typing a note..."
          style={{
            width: '100%',
            height: '100%',
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--text-primary)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-default)',
            borderRadius: 2,
            padding: '8px 10px',
            outline: 'none',
            resize: 'none',
            tabSize: 2,
          }}
        />

        {/* Autocomplete dropdown */}
        {showAutocomplete && filteredDocs.length > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: -4,
              transform: 'translateY(100%)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-emphasis)',
              borderRadius: 2,
              zIndex: 20,
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            {filteredDocs.map((title, i) => (
              <div
                key={title}
                onClick={() => insertDocTitle(title)}
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 13,
                  padding: '6px 10px',
                  color: i === autocompleteIndex ? 'var(--accent)' : 'var(--text-primary)',
                  background: i === autocompleteIndex ? 'var(--bg-hover)' : 'transparent',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setAutocompleteIndex(i)}
              >
                {title}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transfer queue */}
      {transferableLines.length > 0 && (
        <div className="mt-3">
          <div
            className="mb-2"
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Ready to transfer
          </div>
          {transferableLines.map((item) => (
            <div
              key={item.lineIndex}
              className="flex items-center gap-2 p-2 mb-1"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--accent)',
                  background: 'var(--accent-faint)',
                  padding: '1px 6px',
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              >
                {item.docTitle}
              </span>
              <span
                className="flex-1 truncate"
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                }}
              >
                {item.noteText}
              </span>
              <button
                onClick={() => handleTransfer(item.lineIndex, item.docTitle, item.noteText)}
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 14,
                  color: 'var(--accent)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 4px',
                  flexShrink: 0,
                }}
                title="Transfer to document"
              >
                &#x2192;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
