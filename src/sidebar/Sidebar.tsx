import { type ReactNode, useRef, useCallback, useState } from 'react';

export type SidebarTab = 'research' | 'scaffold' | 'outline' | 'search' | 'notes';
export type SidebarSide = 'left' | 'right';

// Snap ratios: 1/5, 1/4, 1/3, 4/9, 1/2
export const SIDEBAR_SNAP_RATIOS = [1 / 5, 1 / 4, 1 / 3, 4 / 9, 1 / 2] as const;
export type SidebarWidthIndex = 0 | 1 | 2 | 3 | 4;

interface SidebarProps {
  open: boolean;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  children: ReactNode;
  side?: SidebarSide;
  flowIntensity?: number;
  widthIndex?: SidebarWidthIndex;
  onWidthIndexChange?: (index: SidebarWidthIndex) => void;
}

const tabs: { id: SidebarTab; icon: ReactNode; label: string }[] = [
  {
    id: 'research',
    label: 'Research',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M3 2h8l4 4v10H3V2z" />
        <path d="M11 2v4h4" />
        <line x1="6" y1="9" x2="12" y2="9" />
        <line x1="6" y1="12" x2="10" y2="12" />
      </svg>
    ),
  },
  {
    id: 'scaffold',
    label: 'Scaffold',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="2" width="14" height="3" rx="0.5" />
        <rect x="2" y="7.5" width="14" height="3" rx="0.5" />
        <rect x="2" y="13" width="14" height="3" rx="0.5" />
      </svg>
    ),
  },
  {
    id: 'outline',
    label: 'Outline',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3">
        <line x1="4" y1="4" x2="14" y2="4" />
        <line x1="6" y1="7.5" x2="14" y2="7.5" />
        <line x1="6" y1="11" x2="14" y2="11" />
        <line x1="4" y1="14.5" x2="14" y2="14.5" />
        <circle cx="2.5" cy="4" r="0.8" fill="currentColor" />
        <circle cx="4.5" cy="7.5" r="0.8" fill="currentColor" />
        <circle cx="4.5" cy="11" r="0.8" fill="currentColor" />
        <circle cx="2.5" cy="14.5" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Search',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="5" />
        <line x1="12" y1="12" x2="16" y2="16" />
      </svg>
    ),
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="3" y="2" width="12" height="14" rx="0.5" />
        <line x1="6" y1="6" x2="12" y2="6" />
        <line x1="6" y1="9" x2="12" y2="9" />
        <line x1="6" y1="12" x2="9" y2="12" />
      </svg>
    ),
  },
];

function ratioLabel(index: number): string {
  const labels = ['1/5', '1/4', '1/3', '4/9', '1/2'];
  return labels[index] || '';
}

export function Sidebar({
  open,
  activeTab,
  onTabChange,
  children,
  side = 'left',
  flowIntensity = 0,
  widthIndex = 1,
  onWidthIndexChange,
}: SidebarProps) {
  const isRight = side === 'right';
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const ratio = SIDEBAR_SNAP_RATIOS[widthIndex];
  const TAB_BAR_WIDTH = 44;

  const borderStyle = isRight
    ? { borderLeft: open ? '1px solid var(--border-default)' : 'none' }
    : { borderRight: open ? '1px solid var(--border-default)' : 'none' };

  const tabBarBorder = isRight
    ? { borderLeft: '1px solid var(--border-default)' }
    : { borderRight: '1px solid var(--border-default)' };

  // Drag-to-resize handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const startX = e.clientX;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const parentWidth = containerRef.current?.parentElement?.clientWidth || window.innerWidth;
        const deltaX = isRight ? startX - moveEvent.clientX : moveEvent.clientX - startX;
        const currentWidth = parentWidth * ratio + deltaX;
        const currentRatio = currentWidth / parentWidth;

        // Find nearest snap point
        let nearest = 0;
        let minDist = Infinity;
        for (let i = 0; i < SIDEBAR_SNAP_RATIOS.length; i++) {
          const dist = Math.abs(currentRatio - SIDEBAR_SNAP_RATIOS[i]);
          if (dist < minDist) {
            minDist = dist;
            nearest = i;
          }
        }
        if (nearest !== widthIndex) {
          onWidthIndexChange?.(nearest as SidebarWidthIndex);
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [isRight, ratio, widthIndex, onWidthIndexChange]
  );

  // Double-click cycles to next snap
  const handleDoubleClick = useCallback(() => {
    const next = ((widthIndex + 1) % SIDEBAR_SNAP_RATIOS.length) as SidebarWidthIndex;
    onWidthIndexChange?.(next);
  }, [widthIndex, onWidthIndexChange]);

  return (
    <div
      ref={containerRef}
      data-flow-target="sidebar"
      className={`flex h-full overflow-hidden flow-dimmed ${isRight ? 'flex-row-reverse' : ''}`}
      style={{
        width: open ? `calc(${(ratio * 100).toFixed(2)}% )` : '0px',
        minWidth: open ? 200 : 0,
        maxWidth: open ? '60%' : 0,
        transition: isDragging ? 'none' : 'width 200ms ease-out',
        ...borderStyle,
        flexShrink: 0,
        order: isRight ? 1 : 0,
        opacity: 1 - flowIntensity * 0.7,
        filter: `blur(${flowIntensity * 1.5}px)`,
        position: 'relative',
      }}
    >
      {open && (
        <>
          {/* Tab bar */}
          <div
            className="flex flex-col items-center py-2"
            style={{
              width: TAB_BAR_WIDTH,
              minWidth: TAB_BAR_WIDTH,
              background: 'var(--bg-primary)',
              ...tabBarBorder,
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                title={tab.label}
                className="flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  background: 'transparent',
                  borderTop: 'none',
                  borderBottom: 'none',
                  borderLeft: isRight ? 'none' : (activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent'),
                  borderRight: isRight ? (activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent') : 'none',
                  cursor: 'pointer',
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-tertiary)',
                }}
              >
                {tab.icon}
              </button>
            ))}

            {/* Width ratio indicator at bottom of tab bar */}
            <div className="flex-1" />
            <button
              onClick={handleDoubleClick}
              title={`Sidebar width: ${ratioLabel(widthIndex)} (click to cycle)`}
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 9,
                color: 'var(--text-tertiary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                opacity: 0.6,
              }}
            >
              {ratioLabel(widthIndex)}
            </button>
          </div>

          {/* Content panel */}
          <div
            className="flex-1 overflow-y-auto"
            style={{
              background: 'var(--bg-secondary)',
              minWidth: 0,
            }}
          >
            {children}
          </div>

          {/* Resize handle on the edge */}
          <div
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            style={{
              position: 'absolute',
              top: 0,
              [isRight ? 'left' : 'right']: -3,
              width: 6,
              height: '100%',
              cursor: 'col-resize',
              zIndex: 20,
              background: isDragging ? 'var(--accent-faint)' : 'transparent',
            }}
          />
        </>
      )}
    </div>
  );
}
