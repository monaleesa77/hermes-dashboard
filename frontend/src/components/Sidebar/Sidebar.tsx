import { FC, useState } from 'react';
import { Plus, Trash2, Clock, GripVertical, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { SessionInfo } from '../../types';

interface SidebarProps {
  sessions: SessionInfo[];
  currentSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onReorder?: (dragIndex: number, hoverIndex: number) => void;
  width: number;
}

const PLATFORM_ICONS: Record<string, { emoji: string; color: string }> = {
  discord: { emoji: '💬', color: '#5865f2' },
  telegram: { emoji: '✈️', color: '#0088cc' },
  qq: { emoji: '🐧', color: '#12b7f5' },
  weixin: { emoji: '💬', color: '#07c160' },
  api: { emoji: '🔌', color: 'var(--accent)' },
  cron: { emoji: '⏰', color: 'var(--warning)' },
  default: { emoji: '💬', color: 'var(--text-muted)' },
};

const getPlatformIcon = (platform: string) => {
  return PLATFORM_ICONS[platform.toLowerCase()] || PLATFORM_ICONS.default;
};

export const Sidebar: FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onReorder,
  width,
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    onReorder?.(dragIndex, index);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const getTokenUsage = (session: SessionInfo) => {
    const usage = Math.min(100, Math.max(10, (session.message_count || 0) * 5));
    return usage;
  };

  return (
    <aside
      className="flex flex-col border-r flex-shrink-0 h-full"
      style={{
        width: `${width}px`,
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* New Chat Button - Fixed at top */}
      <div className="p-3 flex-shrink-0">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 transition-all duration-150 font-medium"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'white',
            borderRadius: 'var(--radius-md)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
          }}
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Section Title - Sticky within scroll area */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-3 py-2 text-xs font-medium uppercase tracking-wider border-y"
        style={{
          color: 'var(--text-muted)',
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <span>Recent Conversations</span>
        <span style={{ color: 'var(--text-disabled)' }}>{sessions.length}</span>
      </div>

      {/* Session List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 py-1">
        {sessions.map((session, index) => {
          const platform = getPlatformIcon(session.platform);
          const isActive = currentSessionId === session.id;
          const tokenUsage = getTokenUsage(session);

          return (
            <div
              key={session.id}
              draggable={!!onReorder}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectSession(session.id)}
              className="group mx-2 mb-1 rounded-lg cursor-pointer transition-all duration-150"
              style={{
                backgroundColor: isActive ? 'var(--accent-alpha)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg-tertiary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              <div className="flex items-center gap-2 px-2 py-2">
                {onReorder && (
                  <div
                    className="opacity-0 group-hover:opacity-100 cursor-grab transition-opacity"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="w-3 h-3" />
                  </div>
                )}

                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0"
                  style={{
                    backgroundColor: `${platform.color}20`,
                    color: platform.color,
                  }}
                >
                  {platform.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-medium truncate"
                    style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                  >
                    {session.name || `Chat ${session.id.slice(0, 6)}`}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-3 h-3" />
                    <span>{formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--error)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="px-2 pb-2">
                <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span>Tokens</span>
                  <span>{tokenUsage}%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${tokenUsage}%`,
                      backgroundColor: tokenUsage > 80 ? 'var(--error)' : 'var(--accent)',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageCircle className="w-10 h-10 mb-3" style={{ color: 'var(--text-disabled)' }} />
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              No conversations yet
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Start a new chat to begin
            </div>
          </div>
        )}
      </div>

      {/* Footer - Fixed at bottom */}
      <div className="p-3 border-t flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>Hermes Dashboard</span>
          <span>v1.0</span>
        </div>
      </div>
    </aside>
  );
};