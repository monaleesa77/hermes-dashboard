import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Chat } from './components/Chat/Chat';
import { Header } from './components/Layout/Header';
import { MobileNav } from './components/Layout/MobileNav';
import { wsService } from './services/websocket';
import { api } from './services/api';
import type { SessionInfo, SessionDetail, ChatMessage } from './types';
import { Loader2 } from 'lucide-react';

export type Theme = 'dark' | 'light' | 'oled';
export type AccentColor = 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' | 'blue';

const ACCENT_HUES: Record<AccentColor, number> = {
  cyan: 180,
  violet: 260,
  emerald: 150,
  amber: 38,
  rose: 340,
  blue: 217,
};

function App() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [hermesConnected, setHermesConnected] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  // Settings
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('hermes-font-size');
    return saved ? parseInt(saved, 10) : 14;
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('hermes-theme') as Theme;
    return saved || 'dark';
  });

  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    const saved = localStorage.getItem('hermes-accent') as AccentColor;
    return saved || 'cyan';
  });

  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('hermes-zoom');
    return saved ? parseFloat(saved) : 1;
  });

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('hermes-sidebar-width');
    return saved ? parseInt(saved, 10) : 260;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  useEffect(() => {
    localStorage.setItem('hermes-font-size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hermes-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-hue', ACCENT_HUES[accentColor].toString());
    localStorage.setItem('hermes-accent', accentColor);
  }, [accentColor]);

  useEffect(() => {
    localStorage.setItem('hermes-zoom', zoom.toString());
  }, [zoom]);

  useEffect(() => {
    localStorage.setItem('hermes-sidebar-width', sidebarWidth.toString());
  }, [sidebarWidth]);

  // Resizer drag handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newWidth = Math.max(200, Math.min(400, e.clientX));
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        const health = await api.health();
        setHermesConnected(health.hermes_connected);

        const sessionList = await api.getSessions();
        setSessions(sessionList);

        // Auto-restore last active session
        const lastSessionId = localStorage.getItem('hermes-last-session');
        if (lastSessionId && sessionList.length > 0) {
          const sessionExists = sessionList.find(s => s.id === lastSessionId);
          if (sessionExists) {
            try {
              const session = await api.getSession(lastSessionId);
              setCurrentSession(session);
            } catch (err) {
              console.error('Failed to restore last session:', err);
            }
          }
        }

        wsService.onMessage = handleWebSocketMessage;
        wsService.onClose = () => setIsConnected(false);
        wsService.connect();
        setIsConnected(true);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    return () => {
      wsService.disconnect();
    };
  }, []);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((event: { type: string; content?: string; tool_calls?: unknown[]; error?: string }) => {
    switch (event.type) {
      case 'content_delta':
        setIsWaiting(false);
        setStreamingMessage((prev) => {
          if (!prev) {
            return {
              id: `streaming-${Date.now()}`,
              role: 'assistant',
              content: event.content || '',
              timestamp: new Date().toISOString(),
            };
          }
          return {
            ...prev,
            content: prev.content + (event.content || ''),
          };
        });
        break;

      case 'tool_call':
        console.log('Tool call:', event.tool_calls);
        break;

      case 'message_complete':
        setStreamingMessage((prev) => {
          if (prev) {
            setCurrentSession((session) => {
              if (!session) return null;
              return {
                ...session,
                messages: [...session.messages, prev],
              };
            });
          }
          return null;
        });
        break;

      case 'error':
        console.error('WebSocket error:', event.error);
        setIsWaiting(false);
        break;
    }
  }, []);

  const handleSelectSession = async (sessionId: string) => {
    try {
      const session = await api.getSession(sessionId);
      setCurrentSession(session);
      // Save as last active session
      localStorage.setItem('hermes-last-session', sessionId);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const handleNewSession = async () => {
    try {
      const session = await api.createSession('api', 'New Chat');
      setSessions((prev) => [session.info, ...prev]);
      setCurrentSession(session);
      // Save as last active session
      localStorage.setItem('hermes-last-session', session.info.id);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await api.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSession?.info.id === sessionId) {
        setCurrentSession(null);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleSendMessage = (content: string, images?: string[]) => {
    if (!content.trim() && (!images || images.length === 0)) return;

    // Ensure current session is saved
    if (currentSession) {
      localStorage.setItem('hermes-last-session', currentSession.info.id);
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim() || (images && images.length > 0 ? 'Sent images' : ''),
      timestamp: new Date().toISOString(),
      image_urls: images || [],
    };

    setCurrentSession((session) => {
      if (!session) return null;
      return {
        ...session,
        messages: [...session.messages, userMessage],
      };
    });

    wsService.sendMessage(content, currentSession?.info.id, images);
    setIsWaiting(true);
  };

  const handleExportSession = () => {
    if (!currentSession) return;

    const exportData = {
      session: currentSession.info,
      messages: currentSession.messages,
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hermes-session-${currentSession.info.id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Reorder sessions
  const handleReorderSessions = (dragIndex: number, hoverIndex: number) => {
    setSessions((prev) => {
      const newSessions = [...prev];
      const [removed] = newSessions.splice(dragIndex, 1);
      newSessions.splice(hoverIndex, 0, removed);
      return newSessions;
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <div style={{ zoom: zoom }}>
        <Header
          isConnected={isConnected}
          hermesConnected={hermesConnected}
          currentSession={currentSession?.info}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          theme={theme}
          onThemeChange={setTheme}
          accentColor={accentColor}
          onAccentColorChange={setAccentColor}
          zoom={zoom}
          onZoomChange={setZoom}
          onExport={currentSession ? handleExportSession : undefined}
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div style={{ zoom: zoom }}>
            <Sidebar
              sessions={sessions}
              currentSessionId={currentSession?.info.id}
              onSelectSession={handleSelectSession}
              onNewSession={handleNewSession}
              onDeleteSession={handleDeleteSession}
              onReorder={handleReorderSessions}
              width={sidebarWidth}
              isMobile={false}
            />
          </div>
        )}

        {/* Mobile Sidebar Overlay */}
        {isMobile && isSidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="fixed left-0 top-0 h-full z-50" style={{ zoom: zoom }}>
              <Sidebar
                sessions={sessions}
                currentSessionId={currentSession?.info.id}
                onSelectSession={(id) => {
                  handleSelectSession(id);
                  setIsSidebarOpen(false);
                }}
                onNewSession={() => {
                  handleNewSession();
                  setIsSidebarOpen(false);
                }}
                onDeleteSession={handleDeleteSession}
                onReorder={handleReorderSessions}
                width={280}
                isMobile={true}
                onClose={() => setIsSidebarOpen(false)}
              />
            </div>
          </>
        )}

        {/* Resizer - Desktop only */}
        {!isMobile && (
          <div
            className="resizer"
            onMouseDown={() => setIsDragging(true)}
          />
        )}

        <main
          className="flex-1 min-w-0"
          style={{
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            zoom: zoom,
          }}
        >
          <Chat
            session={currentSession}
            streamingMessage={streamingMessage}
            isWaiting={isWaiting}
            onSendMessage={handleSendMessage}
            fontSize={fontSize}
          />
        </main>
      </div>

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNav
          sessions={sessions}
          currentSessionId={currentSession?.info.id}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />
      )}
    </div>
  );
}

export default App;
