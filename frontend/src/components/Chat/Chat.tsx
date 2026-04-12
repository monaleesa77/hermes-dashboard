import { useRef, useEffect, FC } from 'react';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { Bot, Sparkles, Loader2 } from 'lucide-react';
import type { SessionDetail, ChatMessage as ChatMessageType } from '../../types';

interface ChatProps {
  session: SessionDetail | null;
  streamingMessage: ChatMessageType | null;
  isWaiting?: boolean;
  onSendMessage: (content: string) => void;
  fontSize?: number;
}

export const Chat: FC<ChatProps> = ({
  session,
  streamingMessage,
  isWaiting = false,
  onSendMessage,
  fontSize = 14,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, streamingMessage]);

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center px-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'var(--accent-alpha)' }}
          >
            <Bot className="w-8 h-8" style={{ color: 'var(--accent)' }} />
          </div>
          <h2
            className="text-2xl font-semibold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Welcome to Hermes
          </h2>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            Select a conversation or start a new chat
          </p>
          <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <Sparkles className="w-4 h-4" />
            <span>Powered by Hermes AI Agent</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6 min-w-0"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="max-w-3xl mx-auto space-y-5 w-full">
          {session.messages.length === 0 && (
            <div className="text-center py-12">
              <p style={{ color: 'var(--text-muted)' }}>
                Send a message to start the conversation
              </p>
            </div>
          )}

          {session.messages.map((message) => (
            <ChatMessage key={message.id} message={message} fontSize={fontSize} />
          ))}

          {streamingMessage && (
            <ChatMessage
              message={streamingMessage}
              isStreaming={true}
              fontSize={fontSize}
            />
          )}

          {isWaiting && !streamingMessage && (
            <div className="flex items-start gap-3 animate-fadeIn">
              <div
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <Bot className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              <div
                className="px-3.5 py-2.5 rounded-xl"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Fixed at bottom */}
      <div
        className="flex-shrink-0 border-t px-4 py-4 md:pb-4"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="max-w-3xl mx-auto">
          <ChatInput onSend={onSendMessage} />
        </div>
      </div>
    </div>
  );
};
