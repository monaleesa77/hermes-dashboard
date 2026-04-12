import { useState, useRef, useCallback, FC } from 'react';
import { Send, X, Image as ImageIcon } from 'lucide-react';
import { api } from '../../services/api';

interface ChatInputProps {
  onSend: (content: string, images?: string[]) => void;
}

interface PendingImage {
  id: string;
  data: string;
  file: File;
}

export const ChatInput: FC<ChatInputProps> = ({ onSend }) => {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    if (!content.trim() && pendingImages.length === 0) return;

    // Extract image data for sending
    const imageDataList = pendingImages.map(img => img.data);

    onSend(content.trim(), imageDataList.length > 0 ? imageDataList : undefined);
    setContent('');
    setIsTyping(false);
    setPendingImages([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, pendingImages, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsTyping(e.target.value.length > 0 || pendingImages.length > 0);

    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        console.warn(`Skipping non-image file: ${file.name}`);
        continue;
      }

      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        console.warn(`File too large: ${file.name}`);
        continue;
      }

      try {
        const result = await api.uploadFile(file);
        if (result.success) {
          const newImage: PendingImage = {
            id: Math.random().toString(36).substring(7),
            data: result.data,
            file: file,
          };
          setPendingImages(prev => [...prev, newImage]);
          setIsTyping(true);
        }
      } catch (error) {
        console.error('Failed to upload image:', error);
      }
    }

    setIsUploading(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeImage = useCallback((id: string) => {
    setPendingImages(prev => prev.filter(img => img.id !== id));
    if (pendingImages.length <= 1 && !content.trim()) {
      setIsTyping(false);
    }
  }, [pendingImages.length, content]);

  return (
    <div className="relative">
      {/* Pending Images Preview */}
      {pendingImages.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {pendingImages.map((image) => (
            <div
              key={image.id}
              className="relative group"
            >
              <img
                src={image.data}
                alt={image.file.name}
                className="w-16 h-16 object-cover rounded-lg border"
                style={{ borderColor: 'var(--border-color)' }}
              />
              <button
                onClick={() => removeImage(image.id)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  backgroundColor: 'var(--error)',
                  color: 'white',
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className="flex items-end gap-1.5 rounded-xl p-1.5 transition-all duration-200"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Attachment Button */}
        <button
          className="p-2.5 rounded-lg transition-all duration-150 flex-shrink-0 relative"
          style={{ color: isUploading ? 'var(--accent)' : 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            if (!isUploading) {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-tertiary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isUploading) {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          title="Attach images"
          disabled={isUploading}
        >
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          ) : (
            <ImageIcon className="w-5 h-5" />
          )}
        </button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={pendingImages.length > 0 ? "Add a message or send images..." : "Message Hermes..."}
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
          disabled={!isTyping || isUploading}
          className="p-2.5 rounded-lg transition-all duration-150 flex-shrink-0"
          style={{
            backgroundColor: isTyping && !isUploading ? 'var(--accent)' : 'transparent',
            color: isTyping && !isUploading ? 'white' : 'var(--text-muted)',
            cursor: isTyping && !isUploading ? 'pointer' : 'not-allowed',
            opacity: isTyping && !isUploading ? 1 : 0.5,
          }}
          onMouseEnter={(e) => {
            if (isTyping && !isUploading) {
              (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (isTyping && !isUploading) {
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
        {pendingImages.length > 0 && (
          <span className="ml-2">· {pendingImages.length} image{pendingImages.length > 1 ? 's' : ''} attached</span>
        )}
      </div>
    </div>
  );
};
