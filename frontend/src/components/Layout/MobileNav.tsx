import { FC } from 'react';
import { Plus, Menu } from 'lucide-react';
import type { SessionInfo } from '../../types';

interface MobileNavProps {
  sessions: SessionInfo[];
  currentSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onOpenSidebar: () => void;
}

export const MobileNav: FC<MobileNavProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onOpenSidebar,
}) => {
  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t md:hidden"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-2">
        {/* Menu Button */}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <Menu className="w-6 h-6" />
          <span className="text-xs">会话</span>
        </button>

        {/* Current Session Info */}
        <div className="flex-1 mx-4 text-center">
          <div
            className="text-sm font-medium truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {currentSession?.name || 'Hermes Dashboard'}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {sessions.length} 个会话
          </div>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onNewSession}
          className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors"
          style={{ color: 'var(--accent)' }}
        >
          <Plus className="w-6 h-6" />
          <span className="text-xs">新建</span>
        </button>
      </div>

      {/* Quick Session Switcher */}
      {sessions.length > 0 && (
        <div
          className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {sessions.slice(0, 5).map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors"
              style={{
                backgroundColor: currentSessionId === session.id ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: currentSessionId === session.id ? 'white' : 'var(--text-secondary)',
              }}
            >
              {session.name?.slice(0, 8) || 'Chat'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
