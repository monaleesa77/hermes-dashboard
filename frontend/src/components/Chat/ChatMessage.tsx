import { FC, useState } from 'react';
import { User, Bot, Wrench, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ChatMessage as ChatMessageType, ToolCall } from '../../types';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  fontSize?: number;
}

export const ChatMessage: FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  fontSize = 14,
}) => {
  const isUser = message.role === 'user';
  const [expandedThinking, setExpandedThinking] = useState(true);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const toggleTool = (toolId: string) => {
    setExpandedTools(prev => ({
      ...prev,
      [toolId]: !prev[toolId],
    }));
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      completed: { bg: 'rgba(34, 197, 94, 0.15)', color: 'var(--success)' },
      error: { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)' },
      running: { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' },
      pending: { bg: 'var(--bg-elevated)', color: 'var(--text-muted)' },
    };
    const style = styles[status] || styles.pending;
    return (
      <span
        className="text-xs px-1.5 py-0.5 rounded font-medium"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        {status}
      </span>
    );
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fadeIn`}>
      {/* Avatar */}
      <div
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
        style={{
          backgroundColor: isUser ? 'var(--accent)' : 'var(--bg-elevated)',
        }}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            {isUser ? 'You' : 'Hermes'}
          </span>
          {message.model && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {message.model}
            </span>
          )}
          <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
            {format(new Date(message.timestamp), 'HH:mm')}
          </span>
        </div>

        {/* Message Content */}
        <div
          className="max-w-full rounded-xl px-3.5 py-2.5 overflow-hidden"
          style={{
            fontSize: `${fontSize}px`,
            backgroundColor: isUser ? 'var(--accent-alpha)' : 'var(--bg-tertiary)',
            border: `1px solid ${isUser ? 'var(--accent-alpha)' : 'var(--border-color)'}`,
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          {/* Thinking Block - Collapsible */}
          {message.thinking && (
            <div
              className="mb-2 rounded-lg overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => setExpandedThinking(!expandedThinking)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                <div className="flex items-center gap-1.5">
                  {expandedThinking ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <span>Thinking</span>
                </div>
                <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Clock className="w-3 h-3" />
                  <span>~2s</span>
                </div>
              </button>
              {expandedThinking && (
                <div
                  className="px-3 py-2 text-sm italic border-t"
                  style={{
                    color: 'var(--text-muted)',
                    borderColor: 'var(--border-color)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {message.thinking as string}
                </div>
              )}
            </div>
          )}

          {/* Tool Calls - PinchChat Style */}
          {message.tool_calls && message.tool_calls.length > 0 && (
            <div className="space-y-2 mb-3">
              {message.tool_calls.map((tool: ToolCall) => {
                const isExpanded = expandedTools[tool.id] ?? true;
                return (
                  <div
                    key={tool.id}
                    className="rounded-lg overflow-hidden"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {/* Tool Header */}
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 transition-colors"
                      onClick={() => toggleTool(tool.id)}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                        )}
                        <Wrench className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {tool.name}
                        </span>
                      </div>
                      {getStatusBadge(tool.status)}
                    </button>

                    {/* Tool Content */}
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        {/* Arguments */}
                        <div className="mt-2">
                          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                            Arguments
                          </div>
                          <pre
                            className="p-2 rounded text-xs overflow-x-auto"
                            style={{
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {JSON.stringify(tool.arguments, null, 2)}
                          </pre>
                        </div>

                        {/* Result */}
                        {!!tool.result && (
                          <div className="mt-2">
                            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                              Result
                            </div>
                            <pre
                              className="p-2 rounded text-xs overflow-x-auto"
                              style={{
                                backgroundColor: 'var(--bg-secondary)',
                                color: tool.status === 'error' ? 'var(--error)' : 'var(--success)',
                              }}
                            >
                              {typeof tool.result === 'string'
                                ? tool.result
                                : JSON.stringify(tool.result as Record<string, unknown>, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Text Content */}
          {message.content && (
            <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-primary)' }}>
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code
                        className={className}
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '4px',
                          fontSize: '0.875em',
                        }}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Images */}
          {message.image_urls && message.image_urls.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {message.image_urls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt="Attached"
                  className="max-w-[200px] rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ borderColor: 'var(--border-color)' }}
                  onClick={() => window.open(url, '_blank')}
                />
              ))}
            </div>
          )}

          {/* Streaming Indicator */}
          {isStreaming && (
            <span
              className="inline-block w-1.5 h-4 ml-1 animate-pulse rounded-sm"
              style={{ backgroundColor: 'var(--accent)' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
