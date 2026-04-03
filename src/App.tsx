import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { JSONContent, Editor } from '@tiptap/react';
import { WriterEditor } from './editor/Editor';
import { Sidebar, type SidebarTab, type SidebarSide } from './sidebar/Sidebar';
import { ResearchTab } from './sidebar/tabs/ResearchTab';
import { ScaffoldTab } from './sidebar/tabs/ScaffoldTab';
import { OutlineTab } from './sidebar/tabs/OutlineTab';
import { SearchTab } from './sidebar/tabs/SearchTab';
import { TitleBar } from './components/TitleBar';
import { StatusBar } from './components/StatusBar';
import { DocumentSwitcher } from './components/DocumentSwitcher';
import { SettingsModal } from './components/SettingsModal';
import { ExportModal } from './components/ExportModal';
import { FileLibrary } from './components/FileLibrary';
import { LinkPopover } from './components/LinkPopover';
import { ShortcutHelp } from './components/ShortcutHelp';
import { CompletenessDetail } from './components/CompletenessDetail';
import { useDocument } from './hooks/useDocument';
import { useAutoSave } from './hooks/useAutoSave';
import { useResearchItems } from './hooks/useResearchItems';
import { useOutline } from './hooks/useOutline';
import { useScaffold } from './hooks/useScaffold';
import { usePairing } from './hooks/usePairing';
import { useSettings } from './hooks/useSettings';
import { useDiskStorage } from './hooks/useDiskStorage';
import { useCompleteness } from './hooks/useCompleteness';
import { useFlowState } from './hooks/useFlowState';
import { extractParagraphs } from './editor/utils/paragraphTracker';
import type { SearchResult } from './search/searchClient';
import type { ShortcutHandlers } from './editor/extensions/keyboardShortcuts';

function countWords(content: JSONContent | undefined): number {
  if (!content) return 0;
  const text = extractText(content);
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function extractText(node: JSONContent): string {
  if (node.type === 'text') return node.text || '';
  return (node.content || []).map(extractText).join(' ');
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
    updateTitle,
    createDocument,
    switchDocument,
    deleteDocument,
    loadDocuments,
  } = useDocument();

  const { saveState, triggerSave, forceSave } = useAutoSave(saveDocument);
  const { getSetting, setSetting } = useSettings();
  const disk = useDiskStorage();

  const claudeApiKey = getSetting('claudeApiKey');
  const searchApiKey = getSetting('searchApiKey');
  const searchProvider = getSetting('searchProvider', 'brave');
  const fontFamily = getSetting('fontFamily', 'charter');

  // Apply font to CSS custom property
  useEffect(() => {
    const root = document.documentElement;
    if (fontFamily === 'commitmono') {
      root.style.setProperty('--font-family', 'var(--font-commitmono)');
    } else {
      root.style.setProperty('--font-family', 'var(--font-charter)');
    }
  }, [fontFamily]);

  const editorRef = useRef<Editor | null>(null);

  const research = useResearchItems(currentDoc?.id);
  const outline = useOutline(currentDoc?.id);
  const scaffold = useScaffold(editorRef.current, currentDoc?.id, claudeApiKey);
  const pairing = usePairing(editorRef.current, currentDoc?.id, claudeApiKey);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarSide, setSidebarSide] = useState<SidebarSide>('left');
  const [activeTab, setActiveTab] = useState<SidebarTab>('research');
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showFileLibrary, setShowFileLibrary] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showCompletenessDetail, setShowCompletenessDetail] = useState(false);
  const [highlightedResearchItem, setHighlightedResearchItem] = useState<string | null>(null);

  const [editorContent, setEditorContent] = useState<JSONContent | undefined>(currentDoc?.content);

  // Flow state
  const flowState = useFlowState(editorRef.current);

  // Completeness score
  const completeness = useCompleteness(
    editorContent || currentDoc?.content,
    outline.items,
    research.items,
    pairing.suggestions
  );

  // Milestone celebrations
  const milestonesHitRef = useRef<Set<number>>(new Set());
  const [milestoneFlash, setMilestoneFlash] = useState(false);
  const prevCompletenessRef = useRef(completeness.overall);

  // Endowment effect — warmth progression
  const wordCount = countWords(editorContent || currentDoc?.content);
  const paragraphCount = countParagraphs(editorContent || currentDoc?.content);

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

  // Disk autosave
  const diskAutoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEditorUpdate = useCallback(
    (content: JSONContent) => {
      setEditorContent(content);
      triggerSave(content);
      scaffold.triggerUpdate();
      if (claudeApiKey && research.items.length > 0) {
        pairing.triggerUpdate();
      }
      if (disk.enabled && currentDoc) {
        if (diskAutoSaveRef.current) clearTimeout(diskAutoSaveRef.current);
        diskAutoSaveRef.current = setTimeout(() => {
          disk.saveToFile(currentDoc.title, content);
          disk.saveJsonToFile(currentDoc.title, content);
        }, 5000);
      }
    },
    [triggerSave, scaffold, pairing, claudeApiKey, research.items.length, disk, currentDoc]
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
          if (disk.enabled && currentDoc) {
            disk.saveToFile(currentDoc.title, json);
            disk.saveJsonToFile(currentDoc.title, json);
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
    }),
    [createDocument, loadDocuments, forceSave, disk, currentDoc, moveParagraph]
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
      <TitleBar
        title={currentDoc?.title || 'Untitled'}
        onTitleChange={updateTitle}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        sidebarOpen={sidebarOpen}
        onOpenFileLibrary={() => setShowFileLibrary(true)}
        diskEnabled={disk.enabled}
        flowIntensity={flowState.flowIntensity}
        sidebarSide={sidebarSide}
        onToggleSidebarSide={() => setSidebarSide((s) => (s === 'left' ? 'right' : 'left'))}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          open={sidebarOpen}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          side={sidebarSide}
          flowIntensity={flowState.flowIntensity}
        >
          {activeTab === 'research' && (
            <ResearchTab
              items={research.items}
              onAdd={research.addItem}
              onUpdate={research.updateItem}
              onDelete={research.deleteItem}
              onReorder={research.reorderItems}
              highlightedItemId={highlightedResearchItem}
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
        </Sidebar>
        <WriterEditor
          content={currentDoc?.content}
          onUpdate={handleEditorUpdate}
          onEditorReady={handleEditorReady}
          shortcutHandlers={shortcutHandlers}
          onOpenLink={() => setShowLinkPopover(true)}
          flowIntensity={flowState.flowIntensity}
          isTyping={flowState.isTyping}
          completenessScore={completeness.overall}
        />
      </div>
      <StatusBar
        wordCount={wordCount}
        paragraphCount={paragraphCount}
        saveState={saveState}
        apiCallCount={scaffold.apiCallCount}
        diskEnabled={disk.enabled}
        diskLastSaved={disk.lastSavedAt}
        completenessScore={completeness.overall}
        onCompletenessClick={() => setShowCompletenessDetail((s) => !s)}
        milestoneFlash={milestoneFlash}
        flowIntensity={flowState.flowIntensity}
      />

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
          diskEnabled={disk.enabled}
          onSave={setSetting}
          onPickDirectory={disk.pickDirectory}
          onDisconnectDisk={disk.disconnect}
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
          diskEnabled={disk.enabled}
          onPickDirectory={disk.pickDirectory}
          onListFiles={disk.listFiles}
          onLoadFile={disk.loadFile}
          onImportToDocument={handleImportFromDisk}
          onDisconnect={disk.disconnect}
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
