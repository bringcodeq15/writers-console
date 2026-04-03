import { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileContent: string; // base64 encoded PDF
  fileName: string;
  onSendToResearch: (text: string) => void;
  onClose: () => void;
}

export function PdfViewer({ fileContent, fileName, onSendToResearch, onClose }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedText, setSelectedText] = useState('');
  const [showToolbar, setShowToolbar] = useState(false);
  const [invertColors, setInvertColors] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert base64 to Uint8Array for react-pdf
  const pdfData = useCallback(() => {
    const binary = atob(fileContent);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { data: bytes };
  }, [fileContent]);

  const onDocumentLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
  }, []);

  // Text selection handler
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 0) {
      setSelectedText(text);
      setShowToolbar(true);
    } else {
      setShowToolbar(false);
      setSelectedText('');
    }
  }, []);

  const handleSendToResearch = useCallback(() => {
    if (selectedText) {
      onSendToResearch(selectedText);
      setShowToolbar(false);
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
    }
  }, [selectedText, onSendToResearch]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          borderBottom: '1px solid var(--border-default)',
          background: 'var(--bg-tertiary)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          &larr; Back
        </button>
        <span
          className="truncate mx-2"
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-primary)',
            flex: 1,
            textAlign: 'center',
          }}
        >
          {fileName}
        </span>
        <button
          onClick={() => setInvertColors((v) => !v)}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 10,
            color: invertColors ? 'var(--accent)' : 'var(--text-tertiary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          title="Toggle dark mode"
        >
          {invertColors ? 'Dark' : 'Light'}
        </button>
      </div>

      {/* Page navigation */}
      <div
        className="flex items-center justify-center gap-3 py-1"
        style={{
          borderBottom: '1px solid var(--border-default)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 12,
            color: currentPage <= 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
            background: 'transparent',
            border: 'none',
            cursor: currentPage <= 1 ? 'default' : 'pointer',
          }}
        >
          &lsaquo; Prev
        </button>
        <span style={{ fontFamily: 'var(--font-family)', fontSize: 11, color: 'var(--text-secondary)' }}>
          {currentPage} / {numPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
          disabled={currentPage >= numPages}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 12,
            color: currentPage >= numPages ? 'var(--text-tertiary)' : 'var(--text-primary)',
            background: 'transparent',
            border: 'none',
            cursor: currentPage >= numPages ? 'default' : 'pointer',
          }}
        >
          Next &rsaquo;
        </button>
      </div>

      {/* PDF page */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative"
        onMouseUp={handleMouseUp}
        style={{
          background: invertColors ? 'var(--bg-primary)' : '#f0f0f0',
        }}
      >
        <div
          style={{
            filter: invertColors ? 'invert(0.88) hue-rotate(180deg)' : 'none',
          }}
        >
          <Document
            file={pdfData()}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div
                className="p-8 text-center"
                style={{ fontFamily: 'var(--font-family)', fontSize: 13, color: 'var(--text-tertiary)' }}
              >
                Loading PDF...
              </div>
            }
            error={
              <div
                className="p-8 text-center"
                style={{ fontFamily: 'var(--font-family)', fontSize: 13, color: 'var(--color-error)' }}
              >
                Failed to load PDF
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              width={320}
              renderTextLayer={true}
              renderAnnotationLayer={false}
            />
          </Document>
        </div>

        {/* Selection toolbar */}
        {showToolbar && (
          <div
            className="absolute flex gap-1"
            style={{
              top: 8,
              right: 8,
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-emphasis)',
              borderRadius: 2,
              padding: '4px 6px',
              zIndex: 20,
              filter: 'none', // Override the invert filter
            }}
          >
            <button
              onClick={handleSendToResearch}
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 11,
                color: 'var(--accent)',
                background: 'var(--accent-faint)',
                border: 'none',
                cursor: 'pointer',
                padding: '3px 8px',
                borderRadius: 2,
              }}
            >
              + Research
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(selectedText);
                setShowToolbar(false);
              }}
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 11,
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '3px 8px',
              }}
            >
              Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
