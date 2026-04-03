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
import type { OutlineItem } from '../../db';
import { OutlineItemRow } from './OutlineItemRow';

interface OutlineTabProps {
  items: OutlineItem[];
  onAdd: (text: string, level?: 1 | 2 | 3) => void;
  onUpdate: (id: string, changes: Partial<OutlineItem>) => void;
  onDelete: (id: string) => void;
  onReorder: (items: OutlineItem[]) => void;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
}

function SortableOutlineItem({
  item,
  onUpdate,
  onDelete,
  onIndent,
  onOutdent,
}: {
  item: OutlineItem;
  onUpdate: (id: string, changes: Partial<OutlineItem>) => void;
  onDelete: (id: string) => void;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
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
      <OutlineItemRow
        item={item}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onIndent={onIndent}
        onOutdent={onOutdent}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function OutlineTab({
  items,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  onIndent,
  onOutdent,
}: OutlineTabProps) {
  const [newText, setNewText] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    onReorder(arrayMove(items, oldIndex, newIndex));
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
        Outline
      </div>

      <div className="flex gap-2 mb-3">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add outline item..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newText.trim()) {
              onAdd(newText.trim());
              setNewText('');
            }
          }}
          style={{
            flex: 1,
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            color: 'var(--text-primary)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-default)',
            borderRadius: 2,
            padding: '4px 8px',
            outline: 'none',
          }}
        />
        <button
          onClick={() => {
            if (newText.trim()) {
              onAdd(newText.trim());
              setNewText('');
            }
          }}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 12,
            color: 'var(--accent)',
            background: 'var(--accent-faint)',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: 2,
          }}
        >
          Add
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableOutlineItem
              key={item.id}
              item={item}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onIndent={onIndent}
              onOutdent={onOutdent}
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
          Your outline is empty. Add items to plan your document structure. Use Tab/Shift+Tab to
          indent and outdent.
        </div>
      )}
    </div>
  );
}
