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
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ResearchItem } from '../../db';
import { ResearchItemCard } from './ResearchItemCard';
import { ResearchAddForm } from './ResearchAddForm';

interface ResearchTabProps {
  items: ResearchItem[];
  onAdd: (data: {
    type: ResearchItem['type'];
    title: string;
    content: string;
    sourceUrl?: string;
  }) => void;
  onUpdate: (id: string, changes: Partial<ResearchItem>) => void;
  onDelete: (id: string) => void;
  onReorder: (items: ResearchItem[]) => void;
  highlightedItemId?: string | null;
  onOpenPdf?: (item: ResearchItem) => void;
}

function SortableResearchItem({
  item,
  onUpdate,
  onDelete,
  highlighted,
  onOpenPdf,
}: {
  item: ResearchItem;
  onUpdate: (id: string, changes: Partial<ResearchItem>) => void;
  onDelete: (id: string) => void;
  highlighted: boolean;
  onOpenPdf?: (item: ResearchItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ResearchItemCard
        item={item}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
        highlighted={highlighted}
        onOpenPdf={onOpenPdf}
      />
    </div>
  );
}

export function ResearchTab({
  items,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  highlightedItemId,
  onOpenPdf,
}: ResearchTabProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorder(reordered);
  };

  const [quickNote, setQuickNote] = useState('');

  const handleQuickAdd = () => {
    const text = quickNote.trim();
    if (!text) return;

    // Auto-detect type from content
    if (/^https?:\/\//i.test(text)) {
      onAdd({ type: 'link', title: text, content: text, sourceUrl: text });
    } else {
      onAdd({ type: 'text', title: text.slice(0, 60) + (text.length > 60 ? '...' : ''), content: text });
    }
    setQuickNote('');
  };

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
        Research
      </div>

      {/* Quick-add: always visible, just type and hit Enter */}
      <input
        value={quickNote}
        onChange={(e) => setQuickNote(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd(); }}
        placeholder="Quick note or paste a URL..."
        style={{
          width: '100%',
          fontFamily: 'var(--font-family)',
          fontSize: 13,
          color: 'var(--text-primary)',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-default)',
          borderRadius: 2,
          padding: '6px 10px',
          outline: 'none',
          marginBottom: 8,
        }}
      />

      <ResearchAddForm onAdd={onAdd} />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableResearchItem
              key={item.id}
              item={item}
              onUpdate={onUpdate}
              onDelete={onDelete}
              highlighted={item.id === highlightedItemId}
              onOpenPdf={onOpenPdf}
            />
          ))}
        </SortableContext>
      </DndContext>

      {items.length === 0 && (
        <div
          className="text-center py-8"
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            color: 'var(--text-tertiary)',
          }}
        >
          No research items yet. Add notes, links, or excerpts to build your source shelf.
        </div>
      )}
    </div>
  );
}
