import React, { useState } from 'react';
import JSZip from 'jszip';

interface Props {
  project: any;
  onClose: () => void;
}

const DeploymentPanel: React.FC<Props> = ({ project, onClose }) => {
  const [step, setStep] = useState<'setup' | 'download' | 'complete'>('setup');
  const [repoName, setRepoName] = useState(project.name || 'my-website');

  const downloadProject = async () => {
    const zip = new JSZip();

    // Add project files to the zip
    project.files.forEach((file: any) => {
      if (file.content) {
        zip.file(file.name, file.content);
      }
    });

    // Create a README.md
    const readmeContent = `# ${repoName}

This website was created using AI Website Builder.

## Files
${project.files.map((f: any) => `- ${f.name}`).join('\n')}

## Getting Started

1. Open \`index.html\` in your browser to view the site locally
2. To deploy to GitHub Pages:
   - Push this code to a GitHub repository
   - Go to Settings → Pages
   - Select "Deploy from a branch"
   - Choose the main branch
   - Your site will be live at \`https://[username].github.io/[repository-name]/\`

## Development

To make changes, edit the HTML, CSS, and JavaScript files directly.

## License

MIT
`;
    zip.file('README.md', readmeContent);

    // Create a .gitignore file
    const gitignoreContent = `# OS files
.DS_Store
Thumbs.db

# Editor files
.vscode/
.idea/
*.swp
*.swo
*~

# Dependencies
node_modules/

# Build files
dist/
build/
`;
    zip.file('.gitignore', gitignoreContent);

    // Create package.json for live-server development
    const packageJsonContent = `{
  "name": "${repoName}",
  "version": "1.0.0",
  "description": "Website created with AI Website Builder",
  "scripts": {
    "start": "npx live-server --port=8080"
  },
  "keywords": ["website", "ai-generated"],
  "author": "",
  "license": "MIT"
}`;
    zip.file('package.json', packageJsonContent);

    // Initialize git repo structure
    const gitFolder = zip.folder('.git');
    if (gitFolder) {
      // Create a basic git config
      const gitConfig = `[core]
\trepositoryformatversion = 0
\tfilemode = true
\tbare = false
\tlogallrefupdates = true
[remote "origin"]
\turl = https://github.com/USERNAME/${repoName}.git
\tfetch = +refs/heads/*:refs/remotes/origin/*
[branch "main"]
\tremote = origin
\tmerge = refs/heads/main
`;
      gitFolder.file('config', gitConfig);

      // Create HEAD file pointing to main branch
      gitFolder.file('HEAD', 'ref: refs/heads/main\n');

      // Create basic folder structure
      gitFolder.folder('objects');
      gitFolder.folder('refs')?.folder('heads');
      gitFolder.folder('refs')?.folder('tags');
      gitFolder.folder('hooks');
    }

    // Generate the zip file
    const blob = await zip.generateAsync({ type: 'blob' });

    // Download the zip file
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repoName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStep('download');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 w-full max-w-2xl mx-4 border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            <i className="fas fa-rocket mr-2"></i>Deploy Your Project
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 'setup' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <i className="fab fa-github text-5xl text-white mb-4"></i>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Deploy with GitHub Pages
                </h3>
                <p className="text-gray-400">
                  Free hosting directly from your GitHub repository
                </p>
              </div>

              {/* Step-by-step guide */}
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">How to Deploy:</h4>
                <ol className="space-y-4 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">1</span>
                    <div>
                      <p className="text-gray-300 font-medium">Download your website as a ZIP file</p>
                      <p className="text-gray-500">Click the button below to download a complete git repository</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-gray-400 font-bold">2</span>
                    <div>
                      <p className="text-gray-300 font-medium">Create a new GitHub repository</p>
                      <p className="text-gray-500">Name it: <code className="bg-gray-800 px-2 py-1 rounded">{repoName}</code></p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-gray-400 font-bold">3</span>
                    <div>
                      <p className="text-gray-300 font-medium">Upload your files</p>
                      <p className="text-gray-500">Upload the downloaded files to your repository</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-gray-400 font-bold">4</span>
                    <div>
                      <p className="text-gray-300 font-medium">Enable GitHub Pages</p>
                      <p className="text-gray-500">Go to Settings → Pages → Deploy from main branch</p>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Repository name input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Repository Name (optional)
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="my-website"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Download Button */}
              <button
                onClick={downloadProject}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
              >
                <i className="fas fa-download mr-2"></i>
                Download as Git Repository (.zip)
              </button>
            </div>
          )}

          {step === 'download' && (
            <div className="space-y-6">
              <div className="text-center">
                <i className="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Git Repository Downloaded!
                </h3>
                <p className="text-gray-400 mb-6">
                  Your website has been downloaded as a ZIP file with git repository structure.
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Next Steps:</h4>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-gray-300">Git repository ZIP downloaded</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-400">→</span>
                    <div>
                      <a
                        href="https://github.com/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        Create new repository
                      </a>
                      <span className="text-gray-500"> named </span>
                      <code className="bg-gray-800 px-2 py-1 rounded">{repoName}</code>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-gray-500">○</span>
                    <span className="text-gray-300">Extract ZIP and push to the repository</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-gray-500">○</span>
                    <span className="text-gray-300">Enable GitHub Pages in repository settings</span>
                  </li>
                </ol>

                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded">
                  <p className="text-sm text-blue-300">
                    <i className="fas fa-info-circle mr-2"></i>
                    Your site will be available at:
                  </p>
                  <code className="text-blue-400">
                    https://[your-username].github.io/{repoName}/
                  </code>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => window.open('https://github.com/new', '_blank')}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  <i className="fab fa-github mr-2"></i>
                  Open GitHub
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeploymentPanel;