import React, { useState } from 'react';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  path: string;
}

interface Props {
  files: FileNode[];
  selectedFile: FileNode | null;
  onFileSelect: (file: FileNode) => void;
  project: any;
  setProject: (project: any) => void;
}

const FileExplorer: React.FC<Props> = ({ files, selectedFile, onFileSelect, project, setProject }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const createNewFile = () => {
    if (!newFileName) return;

    const newFile: FileNode = {
      name: newFileName,
      type: 'file',
      path: `/${newFileName}`,
      content: '',
    };

    setProject({
      ...project,
      files: [...project.files, newFile]
    });

    setNewFileName('');
    setShowNewFileInput(false);
  };

  const deleteFile = (filePath: string) => {
    setProject({
      ...project,
      files: project.files.filter((f: FileNode) => f.path !== filePath)
    });
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.path}>
        <div
          className={`flex items-center px-3 py-1.5 hover:bg-gray-800 cursor-pointer text-sm group ${
            selectedFile?.path === node.path ? 'bg-gray-800 text-white' : 'text-gray-400'
          }`}
          style={{ paddingLeft: `${depth * 1 + 0.75}rem` }}
          onClick={() => {
            if (node.type === 'file') {
              onFileSelect(node);
            } else {
              toggleFolder(node.path);
            }
          }}
        >
          <i className={`mr-2 text-xs ${
            node.type === 'folder'
              ? expandedFolders.has(node.path)
                ? 'fas fa-folder-open text-yellow-500'
                : 'fas fa-folder text-yellow-600'
              : getFileIcon(node.name)
          }`}></i>
          <span className="flex-1">{node.name}</span>
          {node.type === 'file' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteFile(node.path);
              }}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          )}
        </div>
        {node.type === 'folder' && expandedFolders.has(node.path) && node.children && (
          <div>{renderFileTree(node.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop();
    switch (ext) {
      case 'html': return 'fab fa-html5 text-orange-500';
      case 'css': return 'fab fa-css3-alt text-blue-500';
      case 'js': return 'fab fa-js text-yellow-400';
      case 'json': return 'fas fa-code text-gray-400';
      case 'md': return 'fab fa-markdown text-gray-400';
      default: return 'fas fa-file-code text-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#161616]">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Explorer</h3>
        <button
          onClick={() => setShowNewFileInput(true)}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <i className="fas fa-plus text-xs"></i>
        </button>
      </div>

      {showNewFileInput && (
        <div className="px-4 py-2 border-b border-gray-800">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createNewFile()}
            onBlur={() => setShowNewFileInput(false)}
            placeholder="filename.html"
            className="w-full px-2 py-1 bg-[#0a0a0a] text-sm border border-gray-700 rounded focus:border-blue-500 focus:outline-none text-white"
            autoFocus
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2">
        {renderFileTree(files)}
      </div>
    </div>
  );
};

export default FileExplorer;