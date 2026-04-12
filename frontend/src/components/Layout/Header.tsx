import { useState, useRef, useEffect, FC } from 'react';
import {
  Bot, Settings, Type, Sun, Moon, Download, ZoomIn,
  Monitor, Palette
} from 'lucide-react';
import type { SessionInfo } from '../../types';
import type { Theme, AccentColor } from '../../App';

interface HeaderProps {
  isConnected: boolean;
  hermesConnected: boolean;
  currentSession?: SessionInfo;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  accentColor: AccentColor;
  onAccentColorChange: (color: AccentColor) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onExport?: () => void;
}

const ACCENT_COLORS: { value: AccentColor; label: string; hue: number }[] = [
  { value: 'cyan', label: 'Cyan', hue: 180 },
  { value: 'violet', label: 'Violet', hue: 260 },
  { value: 'emerald', label: 'Emerald', hue: 150 },
  { value: 'amber', label: 'Amber', hue: 38 },
  { value: 'rose', label: 'Rose', hue: 340 },
  { value: 'blue', label: 'Blue', hue: 217 },
];

export const Header: FC<HeaderProps> = ({
  isConnected,
  hermesConnected,
  currentSession,
  fontSize,
  onFontSizeChange,
  theme,
  onThemeChange,
  accentColor,
  onAccentColorChange,
  zoom,
  onZoomChange,
  onExport,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="w-5 h-5" />;
      case 'oled': return <Monitor className="w-5 h-5" />;
      default: return <Moon className="w-5 h-5" />;
    }
  };

  const cycleTheme = () => {
    const themes: Theme[] = ['dark', 'light', 'oled'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    onThemeChange(themes[nextIndex]);
  };

  return (
    <header
      className="h-14 flex items-center justify-between px-4 border-b flex-shrink-0"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          <h1 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            Hermes
          </h1>
        </div>

        {currentSession && (
          <>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span className="text-sm truncate max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>
              {currentSession.name || currentSession.id.slice(0, 8)}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Connection Status */}
        <div className="flex items-center gap-3 text-sm mr-4">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: hermesConnected ? 'var(--success)' : 'var(--error)',
                boxShadow: hermesConnected ? '0 0 8px var(--success)' : 'none',
              }}
            />
            <span style={{ color: 'var(--text-muted)' }}>Hermes</span>
          </div>

          <div
            className="w-px h-3"
            style={{ backgroundColor: 'var(--border-color)' }}
          />

          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: isConnected ? 'var(--success)' : 'var(--error)',
                boxShadow: isConnected ? '0 0 8px var(--success)' : 'none',
              }}
            />
            <span style={{ color: 'var(--text-muted)' }}>Dashboard</span>
          </div>
        </div>

        {/* Export Button */}
        {currentSession && onExport && (
          <button
            className="p-2 rounded-lg transition-all duration-150"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'transparent')
            }
            onClick={onExport}
            title="Export session"
          >
            <Download className="w-5 h-5" />
          </button>
        )}

        {/* Theme Toggle */}
        <button
          className="p-2 rounded-lg transition-all duration-150"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'transparent')
          }
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
        >
          {getThemeIcon()}
        </button>

        {/* Settings Dropdown */}
        <div className="relative" ref={settingsRef}>
          <button
            className="p-2 rounded-lg transition-all duration-150"
            style={{
              backgroundColor: showSettings ? 'var(--bg-tertiary)' : 'transparent',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              if (!showSettings) {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showSettings) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-5 h-5" />
          </button>

          {showSettings && (
            <div
              className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl py-4 px-4 z-50"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {/* Font Size */}
              <div className="mb-5">
                <div
                  className="flex items-center gap-2 mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Type className="w-4 h-4" />
                  <span className="text-sm font-medium">Font Size</span>
                  <span
                    className="text-xs ml-auto"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {fontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="24"
                  value={fontSize}
                  onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--accent) ${((fontSize - 10) / (24 - 10)) * 100}%, var(--bg-tertiary) ${((fontSize - 10) / (24 - 10)) * 100}%)`,
                  }}
                />
                <div
                  className="flex justify-between text-xs mt-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span>10px</span>
                  <span>24px</span>
                </div>
              </div>

              {/* Page Zoom */}
              <div className="mb-5">
                <div
                  className="flex items-center gap-2 mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ZoomIn className="w-4 h-4" />
                  <span className="text-sm font-medium">Page Zoom</span>
                  <span
                    className="text-xs ml-auto"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--accent) ${((zoom - 0.7) / (1.5 - 0.7)) * 100}%, var(--bg-tertiary) ${((zoom - 0.7) / (1.5 - 0.7)) * 100}%)`,
                  }}
                />
                <div
                  className="flex justify-between text-xs mt-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span>70%</span>
                  <span>150%</span>
                </div>
              </div>

              {/* Accent Color */}
              <div className="mb-2">
                <div
                  className="flex items-center gap-2 mb-3"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Palette className="w-4 h-4" />
                  <span className="text-sm font-medium">Accent Color</span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className="w-8 h-8 rounded-full transition-all duration-150"
                      style={{
                        backgroundColor: `hsl(${color.hue}, 70%, 50%)`,
                        transform: accentColor === color.value ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: accentColor === color.value
                          ? `0 0 0 2px var(--bg-secondary), 0 0 0 4px hsl(${color.hue}, 70%, 50%)`
                          : 'none',
                      }}
                      onClick={() => onAccentColorChange(color.value)}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
