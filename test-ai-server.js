// Simple test server for AI Website Builder
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Mock Claude endpoint for testing
app.post('/.netlify/functions/claude', async (req, res) => {
  console.log('Received request:', req.body.message?.substring(0, 200));

  const { message } = req.body;

  // Parse the user's request from the message
  const userRequestMatch = message.match(/User's request: "(.+?)"/);
  const userRequest = userRequestMatch ? userRequestMatch[1] : 'website';

  console.log('User request:', userRequest);

  // Generate a simple response based on the request
  const response = {
    response: JSON.stringify({
      message: `I've created a ${userRequest.toLowerCase()} website for you with modern design.`,
      files: [
        {
          name: 'index.html',
          type: 'file',
          path: '/index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${userRequest}</title>
    <link href="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.css" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
</head>
<body class="bg-gray-50">
    <nav class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <div class="flex items-center">
                    <h1 class="text-xl font-bold">${userRequest}</h1>
                </div>
            </div>
        </div>
    </nav>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="px-4 py-6 sm:px-0">
            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                    <h2 class="text-2xl font-bold mb-4">Welcome to ${userRequest}</h2>
                    <p class="text-gray-600">This is an AI-generated website based on your request: "${userRequest}"</p>

                    ${userRequest.toLowerCase().includes('product') || userRequest.toLowerCase().includes('shop') ? `
                    <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="border rounded-lg p-4">
                            <img src="https://picsum.photos/300/200?random=1" alt="Product 1" class="w-full h-48 object-cover rounded mb-4">
                            <h3 class="font-bold">Product One</h3>
                            <p class="text-gray-600">Amazing product with great features</p>
                            <p class="text-2xl font-bold mt-2">$99</p>
                        </div>
                        <div class="border rounded-lg p-4">
                            <img src="https://picsum.photos/300/200?random=2" alt="Product 2" class="w-full h-48 object-cover rounded mb-4">
                            <h3 class="font-bold">Product Two</h3>
                            <p class="text-gray-600">Another fantastic product</p>
                            <p class="text-2xl font-bold mt-2">$149</p>
                        </div>
                        <div class="border rounded-lg p-4">
                            <img src="https://picsum.photos/300/200?random=3" alt="Product 3" class="w-full h-48 object-cover rounded mb-4">
                            <h3 class="font-bold">Product Three</h3>
                            <p class="text-gray-600">Premium quality product</p>
                            <p class="text-2xl font-bold mt-2">$199</p>
                        </div>
                    </div>
                    ` : ''}

                    ${userRequest.toLowerCase().includes('dark') ? `
                    <div class="mt-4 p-4 bg-gray-800 text-white rounded">
                        <p>Dark theme has been applied to this section!</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    </main>

    <script src="script.js"></script>
</body>
</html>`
        },
        {
          name: 'styles.css',
          type: 'file',
          path: '/styles.css',
          content: `/* Custom styles */
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

${userRequest.toLowerCase().includes('dark') ? `
/* Dark theme styles */
body {
    background-color: #111827;
    color: #e5e7eb;
}

nav {
    background-color: #1f2937 !important;
}

.bg-white {
    background-color: #1f2937 !important;
}

h1, h2, h3 {
    color: #f3f4f6 !important;
}` : ''}`
        },
        {
          name: 'script.js',
          type: 'file',
          path: '/script.js',
          content: `console.log('Website loaded: ${userRequest}');

// Add any interactivity here
document.addEventListener('DOMContentLoaded', () => {
    console.log('AI-generated website is ready!');
});`
        }
      ]
    })
  };

  res.json(response);
});

const PORT = 8888;
app.listen(PORT, () => {
  console.log(`Test AI server running on http://localhost:${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/.netlify/functions/claude`);
});