import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { JSONContent, Editor } from '@tiptap/react';
import { WriterEditor } from './editor/Editor';
import { Sidebar, type SidebarTab, type SidebarSide, type SidebarWidthIndex } from './sidebar/Sidebar';
import { ResearchTab } from './sidebar/tabs/ResearchTab';
import { ScaffoldTab } from './sidebar/tabs/ScaffoldTab';
import { OutlineTab } from './sidebar/tabs/OutlineTab';
import { SearchTab } from './sidebar/tabs/SearchTab';
import { NotesTab } from './sidebar/tabs/NotesTab';
import { PdfViewer } from './sidebar/tabs/PdfViewer';
import { TitleBar } from './components/TitleBar';
import { StatusBar } from './components/StatusBar';
import { DocumentSwitcher } from './components/DocumentSwitcher';
import { SettingsModal } from './components/SettingsModal';
import { ExportModal } from './components/ExportModal';
import { FileLibrary } from './components/FileLibrary';
import { LinkPopover } from './components/LinkPopover';
import { ShortcutHelp } from './components/ShortcutHelp';
import { CompletenessDetail } from './components/CompletenessDetail';
import { FindReplace } from './components/FindReplace';
import { useDocument } from './hooks/useDocument';
import { useAutoSave } from './hooks/useAutoSave';
import { useResearchItems } from './hooks/useResearchItems';
import { useOutline } from './hooks/useOutline';
import { useScaffold } from './hooks/useScaffold';
import { usePairing } from './hooks/usePairing';
import { useSettings } from './hooks/useSettings';
import { useCompleteness } from './hooks/useCompleteness';
import { isElectron, addResearchItemToDocument } from './storage/fileStorage';
import { useFlowState } from './hooks/useFlowState';
import { useGlobalNotes } from './hooks/useGlobalNotes';
import { extractParagraphs } from './editor/utils/paragraphTracker';
import type { SearchResult } from './search/searchClient';
import type { ShortcutHandlers } from './editor/extensions/keyboardShortcuts';

function extractText(node: JSONContent): string {
  if (node.type === 'text') return node.text || '';
  return (node.content || []).map(extractText).join(' ');
}

function countWords(content: JSONContent | undefined): number {
  if (!content) return 0;
  return extractText(content).split(/\s+/).filter((w) => w.length > 0).length;
}

function countChars(content: JSONContent | undefined): number {
  if (!content) return 0;
  return extractText(content).replace(/\s+/g, ' ').trim().length;
}

function countParagraphs(content: JSONContent | undefined): number {
  if (!content || !content.content) return 0;
  return content.content.filter(
    (n) =>
      (n.type === 'paragraph' || n.type === 'heading' || n.type === 'blockquote') &&
      n.content &&
      n.content.length > 0
  ).length;
}

const MILESTONES = [500, 1000, 2500, 5000, 10000];

export default function App() {
  const {
    currentDoc,
    documents,
    loading,
    saveDocument,
    saveFullState,
    updateTitle,
    createDocument,
    switchDocument,
    deleteDocument,
    loadDocuments,
  } = useDocument();

  const { saveState, triggerSave, forceSave } = useAutoSave(saveDocument);
  const { getSetting, setSetting } = useSettings();

  const claudeApiKey = getSetting('claudeApiKey');
  const searchApiKey = getSetting('searchApiKey');
  const searchProvider = getSetting('searchProvider', 'brave');
  const fontFamily = getSetting('fontFamily', 'charter');
  const theme = getSetting('theme', 'dark');

  // Apply font to CSS custom property
  useEffect(() => {
    const root = document.documentElement;
    if (fontFamily === 'commitmono') {
      root.style.setProperty('--font-family', 'var(--font-commitmono)');
    } else {
      root.style.setProperty('--font-family', 'var(--font-charter)');
    }
  }, [fontFamily]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else if (theme === 'sepia') {
      root.setAttribute('data-theme', 'sepia');
    } else {
      root.removeAttribute('data-theme');
    }
  }, [theme]);

  const editorRef = useRef<Editor | null>(null);

  const research = useResearchItems(currentDoc?.id);
  const outline = useOutline(currentDoc?.id);
  const scaffold = useScaffold(editorRef.current, currentDoc?.id, claudeApiKey);
  const pairing = usePairing(editorRef.current, currentDoc?.id, claudeApiKey);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarSide, setSidebarSide] = useState<SidebarSide>('left');
  const [sidebarWidthIndex, setSidebarWidthIndex] = useState<0 | 1 | 2 | 3 | 4>(1);
  const [activeTab, setActiveTab] = useState<SidebarTab>('research');
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showFileLibrary, setShowFileLibrary] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCompletenessDetail, setShowCompletenessDetail] = useState(false);
  const [highlightedResearchItem, setHighlightedResearchItem] = useState<string | null>(null);
  const [activePdf, setActivePdf] = useState<{ content: string; name: string } | null>(null);

  // Escape key exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  const [editorContent, setEditorContent] = useState<JSONContent | undefined>(currentDoc?.content);

  // Flow state
  const flowState = useFlowState(editorRef.current);
  const globalNotes = useGlobalNotes();

  // Completeness score
  const completeness = useCompleteness(
    editorContent || currentDoc?.content,
    outline.items,
    research.items,
    pairing.suggestions,
    currentDoc?.wordCountTarget || 3000
  );

  // Milestone celebrations
  const milestonesHitRef = useRef<Set<number>>(new Set());
  const [milestoneFlash, setMilestoneFlash] = useState(false);
  const prevCompletenessRef = useRef(completeness.overall);

  // Endowment effect — warmth progression
  const editorContentOrDoc = editorContent || currentDoc?.content;
  const wordCount = countWords(editorContentOrDoc);
  const charCount = countChars(editorContentOrDoc);
  const paragraphCount = countParagraphs(editorContentOrDoc);

  useEffect(() => {
    const warmth = Math.min(1.0, wordCount / 5000);
    const root = document.documentElement;
    const accentG = 160 + Math.round(warmth * 10);
    const accentB = 81 - Math.round(warmth * 15);
    root.style.setProperty('--accent', `rgb(212, ${accentG}, ${accentB})`);
    const borderAlpha = 0.06 + warmth * 0.04;
    root.style.setProperty('--border-default', `rgba(255, ${245 - warmth * 20}, ${240 - warmth * 40}, ${borderAlpha})`);
  }, [wordCount]);

  // Check milestones
  useEffect(() => {
    for (const m of MILESTONES) {
      if (wordCount >= m && !milestonesHitRef.current.has(m)) {
        milestonesHitRef.current.add(m);
        setMilestoneFlash(true);
        setTimeout(() => setMilestoneFlash(false), 2000);
        break;
      }
    }
  }, [wordCount]);

  // Completeness glow (handled in-line via class)
  useEffect(() => {
    prevCompletenessRef.current = completeness.overall;
  }, [completeness.overall]);

  // CRITICAL FIX #2: Use refs for full-state save data to avoid stale closures
  const fullStateSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestEditorContentRef = useRef<JSONContent | null>(null);
  const researchRef = useRef(research.items);
  const outlineRef = useRef(outline.items);
  const scaffoldRef = useRef(scaffold.entries);
  const pairingRef = useRef(pairing.suggestions);
  researchRef.current = research.items;
  outlineRef.current = outline.items;
  scaffoldRef.current = scaffold.entries;
  pairingRef.current = pairing.suggestions;

  // Clear full-state timer when currentDoc changes (FIX #2: prevents cross-document overwrite)
  useEffect(() => {
    if (fullStateSaveRef.current) {
      clearTimeout(fullStateSaveRef.current);
      fullStateSaveRef.current = null;
    }
  }, [currentDoc?.id]);

  const handleEditorUpdate = useCallback(
    (content: JSONContent) => {
      setEditorContent(content);
      latestEditorContentRef.current = content;
      triggerSave(content);
      scaffold.triggerUpdate();
      if (claudeApiKey && research.items.length > 0) {
        pairing.triggerUpdate();
      }

      // Save full state to disk every 10s (debounced), using refs for latest data
      if (isElectron) {
        if (fullStateSaveRef.current) clearTimeout(fullStateSaveRef.current);
        fullStateSaveRef.current = setTimeout(() => {
          fullStateSaveRef.current = null;
          saveFullState({
            content: latestEditorContentRef.current || content,
            research: researchRef.current,
            outline: outlineRef.current,
            scaffold: scaffoldRef.current,
            suggestions: pairingRef.current,
          });
        }, 10000);
      }
    },
    [triggerSave, scaffold, pairing, claudeApiKey, research.items.length, saveFullState]
  );

  const handleEditorReady = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
  }, []);

  const handleReorderParagraph = useCallback(
    (fromPid: string, toPid: string) => {
      const editor = editorRef.current;
      if (!editor) return;
      const { doc, tr } = editor.state;
      let fromPos = -1;
      let fromEnd = -1;
      let toPos = -1;
      doc.descendants((node, pos) => {
        if (node.attrs.pid === fromPid) { fromPos = pos; fromEnd = pos + node.nodeSize; }
        if (node.attrs.pid === toPid) { toPos = pos; }
      });
      if (fromPos === -1 || toPos === -1) return;
      const slice = doc.slice(fromPos, fromEnd);
      const deleteTr = tr.delete(fromPos, fromEnd);
      const mappedPos = deleteTr.mapping.map(toPos);
      deleteTr.insert(mappedPos, slice.content);
      editor.view.dispatch(deleteTr);
    },
    []
  );

  // Move paragraph up/down using cursor position
  const moveParagraph = useCallback(
    (direction: 'up' | 'down') => {
      const editor = editorRef.current;
      if (!editor) return;
      const { $anchor } = editor.state.selection;
      const currentNode = $anchor.parent;
      const currentPid = currentNode.attrs.pid;
      if (!currentPid) return;

      const paragraphs = extractParagraphs(editor);
      const idx = paragraphs.findIndex((p) => p.pid === currentPid);
      if (idx === -1) return;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= paragraphs.length) return;

      handleReorderParagraph(currentPid, paragraphs[targetIdx].pid);
    },
    [handleReorderParagraph]
  );

  const handleAddSearchToResearch = useCallback(
    (result: SearchResult) => {
      research.addItem({
        type: 'search-result',
        title: result.title,
        content: result.snippet,
        sourceUrl: result.url,
      });
    },
    [research]
  );

  const handleViewInResearch = useCallback(
    (itemId: string) => {
      setActiveTab('research');
      setSidebarOpen(true);
      setHighlightedResearchItem(itemId);
      setTimeout(() => setHighlightedResearchItem(null), 3000);
    },
    []
  );

  const handleImportFromDisk = useCallback(
    async (title: string, content: JSONContent) => {
      const doc = await createDocument();
      if (doc) {
        await updateTitle(title);
        await saveDocument(content);
        if (editorRef.current) {
          editorRef.current.commands.setContent(content);
        }
      }
    },
    [createDocument, updateTitle, saveDocument]
  );

  // Transfer a note from global notes to a specific document's research
  const handleTransferNote = useCallback(
    async (docTitle: string, noteText: string) => {
      // If it's the current document, add directly
      if (currentDoc?.title === docTitle) {
        research.addItem({
          type: 'text',
          title: noteText.slice(0, 60) + (noteText.length > 60 ? '...' : ''),
          content: noteText,
        });
        return;
      }

      // Otherwise find the document and add to its file
      if (isElectron) {
        const targetDoc = documents.find((d) => d.title === docTitle);
        if (targetDoc && (targetDoc as { filePath?: string }).filePath) {
          await addResearchItemToDocument(
            (targetDoc as { filePath?: string }).filePath!,
            { type: 'text', title: noteText.slice(0, 60), content: noteText }
          );
        }
      }
    },
    [currentDoc, documents, research]
  );

  // Open a PDF file in the viewer
  const handleOpenPdf = useCallback(
    async (item: { content: string; title: string }) => {
      if (isElectron && window.electronAPI?.fs.readFileBinary) {
        const result = await window.electronAPI.fs.readFileBinary(item.content);
        if (result.ok && result.data) {
          setActivePdf({ content: result.data, name: item.title });
        }
      }
    },
    []
  );

  const orderedEntries = useMemo(() => {
    if (!editorRef.current) return [];
    const paragraphs = extractParagraphs(editorRef.current);
    return scaffold.getOrderedEntries(paragraphs);
  }, [scaffold.entries, scaffold.getOrderedEntries]);

  const shortcutHandlers: ShortcutHandlers = useMemo(
    () => ({
      toggleSidebar: () => setSidebarOpen((o) => !o),
      switchTab: (tab: string) => {
        setSidebarOpen(true);
        setActiveTab(tab as SidebarTab);
      },
      newDocument: () => {
        createDocument().then(() => loadDocuments());
      },
      openSwitcher: () => setShowSwitcher((s) => !s),
      openExport: () => setShowExport(true),
      forceSave: () => {
        if (editorRef.current) {
          const json = editorRef.current.getJSON();
          forceSave(json);
          if (isElectron) {
            if (fullStateSaveRef.current) clearTimeout(fullStateSaveRef.current);
            saveFullState({
              content: json,
              research: researchRef.current,
              outline: outlineRef.current,
              scaffold: scaffoldRef.current,
              suggestions: pairingRef.current,
            });
          }
        }
      },
      openSettings: () => setShowSettings(true),
      openLink: () => setShowLinkPopover(true),
      toggleStrikethrough: () => {
        editorRef.current?.chain().focus().toggleStrike().run();
      },
      duplicateParagraph: () => {
        const editor = editorRef.current;
        if (!editor) return;
        const { $anchor } = editor.state.selection;
        const pos = $anchor.before($anchor.depth);
        const node = $anchor.node($anchor.depth);
        const endPos = pos + node.nodeSize;
        editor.chain().focus().insertContentAt(endPos, node.toJSON()).run();
      },
      moveParagraphUp: () => moveParagraph('up'),
      moveParagraphDown: () => moveParagraph('down'),
      showShortcutHelp: () => setShowShortcutHelp((s) => !s),
      openFindReplace: () => setShowFindReplace((s) => !s),
      toggleFullscreen: () => setIsFullscreen((f) => !f),
    }),
    [createDocument, loadDocuments, forceSave, saveFullState, moveParagraph]
  );

  if (loading) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: 'var(--font-family)' }}>
      {/* Fullscreen exit hint */}
      {isFullscreen && (
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 z-50 opacity-0 hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-emphasis)',
            borderRadius: '0 0 4px 4px',
            padding: '4px 16px',
            fontFamily: 'var(--font-family)',
            fontSize: 11,
            color: 'var(--text-tertiary)',
          }}
        >
          Press <span style={{ color: 'var(--text-primary)' }}>Esc</span> or <span style={{ color: 'var(--text-primary)' }}>Cmd+Shift+Enter</span> to exit fullscreen
        </div>
      )}
      {!isFullscreen && <TitleBar
        title={currentDoc?.title || 'Untitled'}
        onTitleChange={updateTitle}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        sidebarOpen={sidebarOpen}
        onOpenFileLibrary={() => setShowFileLibrary(true)}
        diskEnabled={isElectron}
        flowIntensity={flowState.flowIntensity}
        sidebarSide={sidebarSide}
        onToggleSidebarSide={() => setSidebarSide((s) => (s === 'left' ? 'right' : 'left'))}
        onNewDocument={() => createDocument().then(() => loadDocuments())}
        onImportFile={async () => {
          // Open a file picker for .docx, .md, .txt
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.docx,.md,.txt,.html';
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
              let result: { title: string; content: import('@tiptap/react').JSONContent };
              if (file.name.endsWith('.docx')) {
                const { importDocx } = await import('./editor/utils/importDocument');
                const buf = await file.arrayBuffer();
                result = await importDocx(buf);
              } else {
                const { importMarkdown } = await import('./editor/utils/importDocument');
                const text = await file.text();
                result = importMarkdown(text);
              }
              const doc = await createDocument();
              if (doc) {
                await updateTitle(result.title);
                await saveDocument(result.content);
                if (editorRef.current) {
                  editorRef.current.commands.setContent(result.content);
                }
              }
            } catch (err) {
              console.error('Import failed:', err);
            }
          };
          input.click();
        }}
        onOpenSwitcher={() => setShowSwitcher((s) => !s)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenExport={() => setShowExport(true)}
        theme={theme}
        onCycleTheme={() => {
          const next = theme === 'dark' ? 'light' : theme === 'light' ? 'sepia' : 'dark';
          setSetting('theme', next);
        }}
      />}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          open={sidebarOpen && !isFullscreen}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          side={sidebarSide}
          flowIntensity={flowState.flowIntensity}
          widthIndex={sidebarWidthIndex}
          onWidthIndexChange={setSidebarWidthIndex}
        >
          {activeTab === 'research' && !activePdf && (
            <ResearchTab
              items={research.items}
              onAdd={research.addItem}
              onUpdate={research.updateItem}
              onDelete={research.deleteItem}
              onReorder={research.reorderItems}
              highlightedItemId={highlightedResearchItem}
              onOpenPdf={handleOpenPdf}
            />
          )}
          {activeTab === 'research' && activePdf && (
            <PdfViewer
              fileContent={activePdf.content}
              fileName={activePdf.name}
              onSendToResearch={(text) => {
                research.addItem({
                  type: 'excerpt',
                  title: text.slice(0, 60) + (text.length > 60 ? '...' : ''),
                  content: text,
                });
              }}
              onClose={() => setActivePdf(null)}
            />
          )}
          {activeTab === 'scaffold' && (
            <ScaffoldTab
              editor={editorRef.current}
              entries={orderedEntries}
              suggestions={pairing.suggestions}
              researchItems={research.items}
              apiKey={claudeApiKey}
              onRetry={scaffold.retryEntry}
              onReorderParagraph={handleReorderParagraph}
              onViewInResearch={handleViewInResearch}
            />
          )}
          {activeTab === 'outline' && (
            <OutlineTab
              items={outline.items}
              onAdd={outline.addItem}
              onUpdate={outline.updateItem}
              onDelete={outline.deleteItem}
              onReorder={outline.reorderItems}
              onIndent={outline.indentItem}
              onOutdent={outline.outdentItem}
            />
          )}
          {activeTab === 'search' && (
            <SearchTab
              searchApiKey={searchApiKey}
              searchProvider={searchProvider}
              onAddToResearch={handleAddSearchToResearch}
            />
          )}
          {activeTab === 'notes' && (
            <NotesTab
              content={globalNotes.content}
              loaded={globalNotes.loaded}
              onUpdate={globalNotes.updateContent}
              onRemoveLine={globalNotes.removeLine}
              documentTitles={documents.map((d) => d.title)}
              onTransferNote={handleTransferNote}
            />
          )}
        </Sidebar>
        <WriterEditor
          content={currentDoc?.content}
          onUpdate={handleEditorUpdate}
          onEditorReady={handleEditorReady}
          shortcutHandlers={shortcutHandlers}
          onOpenLink={() => setShowLinkPopover(true)}
          onAttachResearch={(paragraphId, researchItemId) => {
            // Create a manual research suggestion linking this item to this paragraph
            if (currentDoc) {
              const existing = pairing.suggestions.find(
                (s) => s.paragraphId === paragraphId && s.researchItemId === researchItemId
              );
              if (!existing) {
                import('./db').then(({ db }) => {
                  import('nanoid').then(({ nanoid }) => {
                    db.researchSuggestions.add({
                      id: nanoid(),
                      documentId: currentDoc.id,
                      paragraphId,
                      researchItemId,
                      reasoning: 'Manually linked by drag-and-drop',
                      updatedAt: new Date(),
                    }).then(() => pairing.loadSuggestions());
                  });
                });
              }
            }
          }}
          flowIntensity={flowState.flowIntensity}
          isTyping={flowState.isTyping}
          completenessScore={completeness.overall}
        />
        {showFindReplace && editorRef.current && (
          <FindReplace
            editor={editorRef.current}
            onClose={() => setShowFindReplace(false)}
          />
        )}
      </div>
      {!isFullscreen && <StatusBar
        wordCount={wordCount}
        charCount={charCount}
        paragraphCount={paragraphCount}
        saveState={saveState}
        apiCallCount={scaffold.apiCallCount}
        diskEnabled={isElectron}
        completenessScore={completeness.overall}
        onCompletenessClick={() => setShowCompletenessDetail((s) => !s)}
        milestoneFlash={milestoneFlash}
        flowIntensity={flowState.flowIntensity}
        wordCountTarget={currentDoc?.wordCountTarget || 3000}
        onWordCountTargetChange={(target) => {
          saveFullState({ wordCountTarget: target });
        }}
      />}

      {showSwitcher && (
        <DocumentSwitcher
          documents={documents}
          currentDocId={currentDoc?.id || ''}
          onSwitch={switchDocument}
          onCreate={async () => {
            await createDocument();
            await loadDocuments();
            setShowSwitcher(false);
          }}
          onDelete={deleteDocument}
          onClose={() => setShowSwitcher(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          claudeApiKey={claudeApiKey}
          searchApiKey={searchApiKey}
          searchProvider={searchProvider}
          fontFamily={fontFamily}
          theme={theme}
          diskEnabled={isElectron}
          onSave={setSetting}
          onPickDirectory={() => {}}
          onDisconnectDisk={() => {}}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showExport && (
        <ExportModal
          content={editorContent || currentDoc?.content}
          title={currentDoc?.title || 'untitled'}
          onClose={() => setShowExport(false)}
        />
      )}

      {showFileLibrary && (
        <FileLibrary
          diskEnabled={isElectron}
          onPickDirectory={() => Promise.resolve(null)}
          onListFiles={async () => {
            // Use the new document list
            return documents.map((d) => ({
              name: `${d.title}.wc.json`,
              handle: { getFile: async () => new File([JSON.stringify(d)], d.title) } as unknown as FileSystemFileHandle,
            }));
          }}
          onLoadFile={async () => null}
          onImportToDocument={handleImportFromDisk}
          onDisconnect={() => {}}
          onClose={() => setShowFileLibrary(false)}
        />
      )}

      {showLinkPopover && editorRef.current && (
        <LinkPopover
          editor={editorRef.current}
          onClose={() => setShowLinkPopover(false)}
        />
      )}

      {showShortcutHelp && (
        <ShortcutHelp onClose={() => setShowShortcutHelp(false)} />
      )}

      {showCompletenessDetail && (
        <CompletenessDetail
          breakdown={completeness}
          onClose={() => setShowCompletenessDetail(false)}
        />
      )}
    </div>
  );
}
