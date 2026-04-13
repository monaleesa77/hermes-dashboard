import { FC } from 'react';
import { User, Bot, Wrench, Clock } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ChatMessage as ChatMessageType, ToolCall, ToolResult } from '../../types';

/** Format tool result content for display */
function formatResult(content: unknown): string {
  if (!content) return '';
  const str = String(content);
  try {
    const parsed = JSON.parse(str);
    // If it's a simple object with total_count or similar, show as-is
    if (typeof parsed === 'object' && parsed !== null && 'total_count' in parsed) {
      return str;
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return str;
  }
}

/** Clean thinking content by removing XML/HTML tags */
function cleanThinkingContent(content: string | undefined): string {
  if (!content) return '';

  // 方案A：仅移除<think>标签（推荐）
  // 针对已知问题，风险最低
  let cleaned = content
    .replace(/<think>/gi, '')
    .replace(/<\/think>/gi, '')
    .replace(/<\/thinking>/gi, '')
    .trim();

  // 如果仍有明显的XML标签，进行通用清理
  if (/<[^>]+>/.test(cleaned)) {
    cleaned = cleaned.replace(/<[^>]*>/g, '');
  }

  return cleaned.trim();
}

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  fontSize?: number;
  showThinking?: boolean;
  showTools?: boolean;
  showToolResults?: boolean;
}

export const ChatMessage: FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  fontSize = 14,
  showThinking = true,
  showTools = true,
  showToolResults = true,
}) => {
  const isUser = message.role === 'user';

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
          {/* Thinking Block - Controlled by showThinking prop */}
          {showThinking && message.thinking && (
            <div
              className="mb-2 rounded-lg overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div
                className="flex items-center justify-between px-3 py-2 text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                <div className="flex items-center gap-1.5">
                  <span>Thinking</span>
                </div>
                <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Clock className="w-3 h-3" />
                  <span>~2s</span>
                </div>
              </div>
              <div
                className="px-3 py-2 text-sm italic border-t"
                style={{
                  color: 'var(--text-muted)',
                  borderColor: 'var(--border-color)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {cleanThinkingContent(message.thinking)}
              </div>
            </div>
          )}

          {/* Tool Calls - Controlled by showTools prop */}
          {showTools && message.tool_calls && message.tool_calls.length > 0 && (
            <div className="space-y-2 mb-3">
              {message.tool_calls.map((tool: ToolCall) => {
                // Look up actual result from message.tool_results (set by backend's _attach_tool_results)
                const toolResult: ToolResult | undefined = message.tool_results?.find(
                  (tr: ToolResult) => tr.tool_call_id === tool.id
                );
                const hasResult = !!(tool.result || toolResult);
                const resultContent = tool.result ?? (toolResult?.content ?? '');
                // Show completed if we have a result, otherwise use stored status
                const displayStatus = hasResult ? 'completed' : tool.status;

                return (
                  <div
                    key={tool.id}
                    className="rounded-lg overflow-hidden"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {/* Tool Header - Always visible */}
                    <div
                      className="flex items-center justify-between px-3 py-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Wrench className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                        <span className="text-sm font-medium">
                          {tool.name}
                        </span>
                      </div>
                      {getStatusBadge(displayStatus)}
                    </div>

                    {/* Tool Content - Controlled by showToolResults prop */}
                    {showToolResults && (
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
                        {hasResult && (
                          <div className="mt-2">
                            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                              Result
                            </div>
                            <pre
                              className="p-2 rounded text-xs overflow-x-auto"
                              style={{
                                backgroundColor: 'var(--bg-secondary)',
                                color: displayStatus === 'error' ? 'var(--error)' : 'var(--success)',
                              }}
                            >
                              {formatResult(resultContent)}
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
