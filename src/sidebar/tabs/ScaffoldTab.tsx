import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Editor } from '@tiptap/react';
import type { ScaffoldEntry, ResearchItem, ResearchSuggestion } from '../../db';
import { ScaffoldLine } from './ScaffoldLine';
import { SuggestionPopover } from '../SuggestionPopover';

interface ScaffoldTabProps {
  editor: Editor | null;
  entries: (ScaffoldEntry & { paragraphIndex: number })[];
  suggestions: ResearchSuggestion[];
  researchItems: ResearchItem[];
  apiKey: string;
  onRetry: (paragraphId: string) => void;
  onReorderParagraph: (fromPid: string, toPid: string) => void;
  onViewInResearch: (itemId: string) => void;
}

function SortableScaffoldLine({
  entry,
  isHeading,
  suggestionCount,
  onClickLine,
  onClickBadge,
  onRetry,
}: {
  entry: ScaffoldEntry & { paragraphIndex: number };
  isHeading: boolean;
  suggestionCount: number;
  onClickLine: (pid: string) => void;
  onClickBadge: (pid: string) => void;
  onRetry: (pid: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: entry.paragraphId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ScaffoldLine
        entry={entry}
        isHeading={isHeading}
        suggestionCount={suggestionCount}
        onClickLine={onClickLine}
        onClickBadge={onClickBadge}
        onRetry={onRetry}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function ScaffoldTab({
  editor,
  entries,
  suggestions,
  researchItems,
  apiKey,
  onRetry,
  onReorderParagraph,
  onViewInResearch,
}: ScaffoldTabProps) {
  const [popoverPid, setPopoverPid] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleClickLine = (paragraphId: string) => {
    if (!editor) return;
    const el = document.querySelector(`[data-pid="${paragraphId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-flash');
      setTimeout(() => {
        el.classList.remove('highlight-flash');
        el.classList.add('highlight-flash-off');
        setTimeout(() => el.classList.remove('highlight-flash-off'), 1000);
      }, 100);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderParagraph(active.id as string, over.id as string);
  };

  const getSuggestionCount = (pid: string) =>
    suggestions.filter((s) => s.paragraphId === pid).length;

  const isHeading = (entry: ScaffoldEntry) => entry.summary.startsWith('H');

  if (!apiKey) {
    return (
      <div className="p-3">
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
          AI Scaffold
        </div>
        <div
          className="py-8 text-center"
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            color: 'var(--text-tertiary)',
            lineHeight: 1.6,
          }}
        >
          The AI scaffold generates a real-time structural map of your document, summarizing what
          each paragraph does in your argument.
          <br />
          <br />
          To enable, add your Claude API key in Settings (Cmd+,).
        </div>
      </div>
    );
  }

  return (
    <div className="p-0">
      <div
        className="px-3 py-2"
        style={{
          fontFamily: 'var(--font-family)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}
      >
        AI Scaffold
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={entries.map((e) => e.paragraphId)}
          strategy={verticalListSortingStrategy}
        >
          {entries.map((entry) => (
            <SortableScaffoldLine
              key={entry.paragraphId}
              entry={entry}
              isHeading={isHeading(entry)}
              suggestionCount={getSuggestionCount(entry.paragraphId)}
              onClickLine={handleClickLine}
              onClickBadge={setPopoverPid}
              onRetry={onRetry}
            />
          ))}
        </SortableContext>
      </DndContext>

      {entries.length === 0 && (
        <div
          className="text-center py-8 px-3"
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            color: 'var(--text-tertiary)',
          }}
        >
          Start writing to see the structural scaffold appear here. Each paragraph will be
          summarized by AI.
        </div>
      )}

      {popoverPid && (
        <SuggestionPopover
          suggestions={suggestions.filter((s) => s.paragraphId === popoverPid)}
          researchItems={researchItems}
          onViewInResearch={onViewInResearch}
          onClose={() => setPopoverPid(null)}
        />
      )}
    </div>
  );
}
