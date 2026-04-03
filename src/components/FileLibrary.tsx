import { useState, useEffect, useCallback } from 'react';
import type { JSONContent } from '@tiptap/react';

interface DiskFile {
  name: string;
  handle: FileSystemFileHandle;
}

interface FileLibraryProps {
  diskEnabled: boolean;
  onPickDirectory: () => Promise<unknown>;
  onListFiles: () => Promise<DiskFile[]>;
  onLoadFile: (handle: FileSystemFileHandle) => Promise<{ title: string; content: JSONContent } | null>;
  onImportToDocument: (title: string, content: JSONContent) => void;
  onDisconnect: () => void;
  onClose: () => void;
}

export function FileLibrary({
  diskEnabled,
  onPickDirectory,
  onListFiles,
  onLoadFile,
  onImportToDocument,
  onDisconnect,
  onClose,
}: FileLibraryProps) {
  const [files, setFiles] = useState<DiskFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');

  const refreshFiles = useCallback(async () => {
    if (!diskEnabled) return;
    setLoading(true);
    const result = await onListFiles();
    setFiles(result);
    setLoading(false);
  }, [diskEnabled, onListFiles]);

  useEffect(() => {
    if (diskEnabled) refreshFiles();
  }, [diskEnabled, refreshFiles]);

  const handleConnect = async () => {
    await onPickDirectory();
  };

  const handlePreview = async (file: DiskFile) => {
    if (previewing === file.name) {
      setPreviewing(null);
      return;
    }
    try {
      const f = await file.handle.getFile();
      const text = await f.text();
      setPreviewContent(text.slice(0, 500));
      setPreviewing(file.name);
    } catch {
      setPreviewContent('Could not read file');
      setPreviewing(file.name);
    }
  };

  const handleImport = async (file: DiskFile) => {
    const result = await onLoadFile(file.handle);
    if (result) {
      onImportToDocument(result.title, result.content);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 100, background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-emphasis)',
          borderRadius: 2,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border-default)' }}
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
            File Library
          </span>
          <div className="flex gap-2">
            {diskEnabled && (
              <>
                <button
                  onClick={refreshFiles}
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Refresh
                </button>
                <button
                  onClick={onDisconnect}
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 12,
                    color: 'var(--color-error)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!diskEnabled ? (
            <div className="text-center py-8">
              <p
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  marginBottom: 16,
                  lineHeight: 1.6,
                }}
              >
                Connect a folder on your computer to save documents as files and browse existing
                documents.
              </p>
              <button
                onClick={handleConnect}
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 14,
                  color: 'var(--accent)',
                  background: 'var(--accent-faint)',
                  border: '1px solid var(--accent-dim)',
                  borderRadius: 2,
                  padding: '8px 20px',
                  cursor: 'pointer',
                }}
              >
                Choose Folder
              </button>
            </div>
          ) : loading ? (
            <div
              className="text-center py-8"
              style={{ fontFamily: 'var(--font-family)', fontSize: 13, color: 'var(--text-tertiary)' }}
            >
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div
              className="text-center py-8"
              style={{ fontFamily: 'var(--font-family)', fontSize: 13, color: 'var(--text-tertiary)' }}
            >
              No documents found. Saved documents (.wc.json, .md, .txt) will appear here.
            </div>
          ) : (
            files.map((file) => (
              <div key={file.name} className="mb-2">
                <div
                  className="flex items-center justify-between p-3"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontFamily: 'var(--font-family)',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: 'var(--text-tertiary)',
                          background: 'var(--bg-tertiary)',
                          padding: '1px 6px',
                          borderRadius: 2,
                        }}
                      >
                        {file.name.endsWith('.wc.json') ? 'WC' : file.name.split('.').pop()?.toUpperCase()}
                      </span>
                      <span
                        className="truncate"
                        style={{
                          fontFamily: 'var(--font-family)',
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {file.name.replace(/\.(wc\.json|md|txt)$/, '')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => handlePreview(file)}
                      style={{
                        fontFamily: 'var(--font-family)',
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {previewing === file.name ? 'Hide' : 'Preview'}
                    </button>
                    <button
                      onClick={() => handleImport(file)}
                      style={{
                        fontFamily: 'var(--font-family)',
                        fontSize: 11,
                        color: 'var(--accent)',
                        background: 'var(--accent-faint)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 8px',
                        borderRadius: 2,
                      }}
                    >
                      Open
                    </button>
                  </div>
                </div>
                {previewing === file.name && (
                  <div
                    className="p-3"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-default)',
                      borderTop: 'none',
                      fontFamily: 'var(--font-family)',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      maxHeight: 150,
                      overflow: 'auto',
                    }}
                  >
                    {previewContent}
                    {previewContent.length >= 500 && '...'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div
          className="flex justify-end px-4 py-3"
          style={{ borderTop: '1px solid var(--border-default)' }}
        >
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 14,
              color: 'var(--text-primary)',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-emphasis)',
              borderRadius: 2,
              padding: '6px 16px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
