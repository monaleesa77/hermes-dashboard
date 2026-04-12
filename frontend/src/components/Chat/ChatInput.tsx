import { useState, useRef, useCallback, FC } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => void;
}

export const ChatInput: FC<ChatInputProps> = ({ onSend }) => {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!content.trim()) return;

    onSend(content.trim());
    setContent('');
    setIsTyping(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsTyping(e.target.value.length > 0);

    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  return (
    <div className="relative">
      <div
        className="flex items-end gap-1.5 rounded-xl p-1.5 transition-all duration-200"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Message Hermes..."
          rows={1}
          className="flex-1 bg-transparent border-none outline-none resize-none py-3 px-2 max-h-[200px]"
          style={{
            minHeight: '44px',
            color: 'var(--text-primary)',
            fontSize: '15px',
            lineHeight: '1.5',
          }}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!isTyping}
          className="p-2.5 rounded-lg transition-all duration-150 flex-shrink-0"
          style={{
            backgroundColor: isTyping ? 'var(--accent)' : 'transparent',
            color: isTyping ? 'white' : 'var(--text-muted)',
            cursor: isTyping ? 'pointer' : 'not-allowed',
            opacity: isTyping ? 1 : 0.5,
          }}
          onMouseEnter={(e) => {
            if (isTyping) {
              (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (isTyping) {
              (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
            }
          }}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Helper Text - Hidden on mobile */}
      <div
        className="text-center mt-2 text-xs hidden md:block"
        style={{ color: 'var(--text-muted)' }}
      >
        Press <kbd className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>Shift+Enter</kbd> for new line
      </div>
    </div>
  );
};
