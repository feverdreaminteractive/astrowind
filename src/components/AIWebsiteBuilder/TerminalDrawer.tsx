import React, { useState, useRef, useEffect } from 'react';

interface TerminalDrawerProps {
  output: string[];
  onCommand?: (command: string) => void;
  isRunning?: boolean;
}

const TerminalDrawer: React.FC<TerminalDrawerProps> = ({ output, onCommand, isRunning = false }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [height, setHeight] = useState(256); // Default height in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const deltaY = startYRef.current - e.clientY;
      const newHeight = Math.min(Math.max(100, startHeightRef.current + deltaY), 600);
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
  };

  const handleCommand = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && command.trim() && onCommand) {
      onCommand(command);
      setCommandHistory(prev => [...prev, command]);
      setHistoryIndex(-1);
      setCommand('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`fixed bottom-0 left-0 right-0 bg-black border-t-2 border-gray-700 transition-all duration-300 z-40 ${
        isMinimized ? 'h-10' : ''
      }`}
      style={!isMinimized ? { height: `${height}px` } : {}}
    >
      {/* Resize Handle */}
      {!isMinimized && (
        <div
          className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-500/20 transition-colors"
          onMouseDown={handleResizeStart}
        />
      )}

      {/* Terminal Header */}
      <div className="bg-gray-900 px-4 py-2 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-300">TERMINAL</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Running
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isMinimized && (
            <>
              <button
                onClick={() => {
                  if (terminalRef.current) {
                    terminalRef.current.innerHTML = '';
                  }
                }}
                className="text-xs px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              >
                Clear
              </button>
              <span className="text-gray-600">|</span>
            </>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-white transition-colors"
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      {!isMinimized && (
        <div className="flex flex-col h-full">
          <div
            ref={terminalRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-5"
            style={{ maxHeight: `${height - 80}px` }}
          >
            {output.map((line, idx) => {
              const isError = line.toLowerCase().includes('error') || line.startsWith('✗');
              const isSuccess = line.toLowerCase().includes('success') || line.startsWith('✓');
              const isWarning = line.toLowerCase().includes('warning') || line.startsWith('⚠');
              const isCommand = line.startsWith('>') || line.startsWith('$');

              return (
                <div
                  key={idx}
                  className={`
                    ${isError ? 'text-red-400' : ''}
                    ${isSuccess ? 'text-green-400' : ''}
                    ${isWarning ? 'text-yellow-400' : ''}
                    ${isCommand ? 'text-blue-400 font-semibold' : ''}
                    ${!isError && !isSuccess && !isWarning && !isCommand ? 'text-gray-300' : ''}
                  `}
                >
                  {line}
                </div>
              );
            })}
          </div>

          {/* Command Input */}
          {onCommand && (
            <div className="border-t border-gray-800 px-4 py-2 flex items-center gap-2">
              <span className="text-green-400 text-sm">$</span>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleCommand}
                placeholder="Enter command..."
                className="flex-1 bg-transparent text-gray-300 text-sm outline-none placeholder-gray-600"
                disabled={isRunning}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TerminalDrawer;