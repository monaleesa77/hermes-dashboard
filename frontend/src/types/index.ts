export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'completed' | 'error';
  started_at?: string;
  completed_at?: string;
}

export interface ToolResult {
  id: string;
  tool_call_id: string;
  content: string;
  timestamp?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
  thinking?: string;
  image_urls?: string[];
  model?: string;
}

export interface SessionInfo {
  id: string;
  platform: string;
  chat_id: string;
  name?: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  is_active: boolean;
  model?: string;
}

export interface SessionDetail {
  info: SessionInfo;
  messages: ChatMessage[];
  token_usage?: {
    input: number;
    output: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  context_window: number;
  supports_vision: boolean;
  supports_tools: boolean;
}

export interface GatewayStatus {
  running: boolean;
  pid?: number;
  platforms: Record<string, string>;
  uptime_seconds?: number;
}

export interface StreamEvent {
  type: 'message_received' | 'content_delta' | 'tool_call' | 'message_complete' | 'error';
  content?: string;
  tool_calls?: ToolCall[];
  finish_reason?: string;
  error?: string;
  timestamp?: string;
}
