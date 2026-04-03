import { type ReactNode } from 'react';

export type SidebarTab = 'research' | 'scaffold' | 'outline' | 'search';
export type SidebarSide = 'left' | 'right';

interface SidebarProps {
  open: boolean;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  children: ReactNode;
  side?: SidebarSide;
  flowIntensity?: number;
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
];

export function Sidebar({ open, activeTab, onTabChange, children, side = 'left', flowIntensity = 0 }: SidebarProps) {
  const isRight = side === 'right';
  const borderStyle = isRight
    ? { borderLeft: open ? '1px solid var(--border-default)' : 'none' }
    : { borderRight: open ? '1px solid var(--border-default)' : 'none' };

  const tabBarBorder = isRight
    ? { borderLeft: '1px solid var(--border-default)' }
    : { borderRight: '1px solid var(--border-default)' };

  return (
    <div
      data-flow-target="sidebar"
      className={`flex h-full overflow-hidden flow-dimmed ${isRight ? 'flex-row-reverse' : ''}`}
      style={{
        width: open ? 380 : 0,
        transition: 'width 200ms ease-out',
        ...borderStyle,
        flexShrink: 0,
        order: isRight ? 1 : 0,
        opacity: 1 - flowIntensity * 0.7,
        filter: `blur(${flowIntensity * 1.5}px)`,
      }}
    >
      {open && (
        <>
          {/* Tab bar */}
          <div
            className="flex flex-col items-center py-2"
            style={{
              width: 44,
              minWidth: 44,
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
          </div>
          {/* Content panel */}
          <div
            className="flex-1 overflow-y-auto"
            style={{
              background: 'var(--bg-secondary)',
              width: 336,
              minWidth: 0,
            }}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}
