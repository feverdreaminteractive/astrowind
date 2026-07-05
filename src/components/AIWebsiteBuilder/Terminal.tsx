import React, { useEffect, useRef, useState } from 'react';

interface Props {
  project: any;
}

const Terminal: React.FC<Props> = ({ project }) => {
  const [history, setHistory] = useState<string[]>([
    '$ Welcome to AI Website Builder Terminal',
    '$ Project: ' + project.name,
    '$ Type "help" for available commands'
  ]);
  const [currentCommand, setCurrentCommand] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);

  const commands: { [key: string]: () => string | string[] } = {
    help: () => [
      'Available commands:',
      '  help     - Show this help message',
      '  clear    - Clear terminal',
      '  ls       - List files',
      '  build    - Build project',
      '  preview  - Open preview',
      '  deploy   - Deploy to Netlify',
      '  git init - Initialize git repository'
    ],
    clear: () => {
      setHistory([]);
      return [];
    },
    ls: () => {
      return project.files.map((f: any) => f.name);
    },
    build: () => '✓ Project built successfully!',
    preview: () => '✓ Preview refreshed',
    'git init': () => '✓ Initialized empty Git repository',
    deploy: () => [
      '🚀 Deploying to Netlify...',
      '📦 Building project...',
      '⬆️  Uploading files...',
      '✅ Deployed successfully!',
      '🔗 URL: https://your-site.netlify.app'
    ]
  };

  const handleCommand = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const output = executeCommand(currentCommand);
      setHistory(prev => [
        ...prev,
        `$ ${currentCommand}`,
        ...Array.isArray(output) ? output : [output]
      ]);
      setCurrentCommand('');
    }
  };

  const executeCommand = (cmd: string): string | string[] => {
    const trimmedCmd = cmd.trim().toLowerCase();

    if (trimmedCmd === '') return '';

    if (commands[trimmedCmd]) {
      return commands[trimmedCmd]();
    }

    return `Command not found: ${cmd}. Type "help" for available commands.`;
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className="h-full bg-[#0a0a0a] flex flex-col">
      <div className="bg-[#161616] px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-300">
          <i className="fas fa-terminal mr-2 text-gray-500"></i>Terminal
        </span>
        <button
          onClick={() => setHistory([])}
          className="text-gray-500 hover:text-white text-xs transition-colors"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs"
      >
        {history.map((line, i) => (
          <div
            key={i}
            className={line.startsWith('$') ? 'text-green-500' : 'text-gray-400'}
          >
            {line}
          </div>
        ))}
        <div className="flex items-center text-green-400">
          <span>$ </span>
          <input
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyPress={handleCommand}
            className="flex-1 bg-transparent outline-none ml-2 text-gray-300"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
};

export default Terminal;