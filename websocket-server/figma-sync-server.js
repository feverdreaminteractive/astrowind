// WebSocket Server for Figma Live Sync
// This server maintains WebSocket connections and broadcasts Figma changes in real-time

const WebSocket = require('ws');
const http = require('http');
const fetch = require('node-fetch');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store client connections and their subscriptions
const clients = new Map();
const figmaSubscriptions = new Map(); // fileId -> Set of client IDs
const figmaCache = new Map(); // Cache Figma data
const pollingIntervals = new Map(); // Active polling intervals

// Figma API configuration
const FIGMA_API_BASE = 'https://api.figma.com/v1';
const FIGMA_TOKEN = process.env.FIGMA_TOKEN || 'your_figma_token_here';

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const clientId = generateClientId();
  const clientIp = req.socket.remoteAddress;

  console.log(`[WebSocket] New client connected: ${clientId} from ${clientIp}`);

  // Store client connection
  clients.set(clientId, {
    ws,
    id: clientId,
    subscribedFiles: new Set(),
    cursor: { x: 0, y: 0 },
    user: `User-${clientId.substr(0, 4)}`
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    message: 'Connected to Figma Live Sync WebSocket'
  }));

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      handleClientMessage(clientId, data);
    } catch (error) {
      console.error(`[WebSocket] Error parsing message from ${clientId}:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  // Handle cursor movements (high frequency)
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'cursor') {
        handleCursorUpdate(clientId, data);
      }
    } catch (error) {
      // Silent fail for cursor updates to avoid spam
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log(`[WebSocket] Client disconnected: ${clientId}`);
    handleClientDisconnect(clientId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`[WebSocket] Error with client ${clientId}:`, error);
  });

  // Send ping to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000); // Ping every 30 seconds
});

// Handle client messages
function handleClientMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (data.type) {
    case 'subscribe':
      subscribeToFigmaFile(clientId, data.fileId, data.interval || 5000);
      break;

    case 'unsubscribe':
      unsubscribeFromFigmaFile(clientId, data.fileId);
      break;

    case 'cursor':
      handleCursorUpdate(clientId, data);
      break;

    case 'comment':
      broadcastComment(clientId, data);
      break;

    case 'presence':
      updatePresence(clientId, data);
      break;

    case 'request-sync':
      forceSyncFigmaFile(data.fileId);
      break;

    default:
      console.log(`[WebSocket] Unknown message type from ${clientId}:`, data.type);
  }
}

// Subscribe client to Figma file updates
function subscribeToFigmaFile(clientId, fileId, interval) {
  const client = clients.get(clientId);
  if (!client) return;

  console.log(`[Subscribe] ${clientId} subscribing to ${fileId} with ${interval}ms interval`);

  // Add to subscription map
  if (!figmaSubscriptions.has(fileId)) {
    figmaSubscriptions.set(fileId, new Set());
  }
  figmaSubscriptions.get(fileId).add(clientId);
  client.subscribedFiles.add(fileId);

  // Start polling if not already polling this file
  if (!pollingIntervals.has(fileId)) {
    startPollingFigmaFile(fileId, interval);
  }

  // Send cached data if available
  if (figmaCache.has(fileId)) {
    client.ws.send(JSON.stringify({
      type: 'figma-update',
      fileId,
      payload: figmaCache.get(fileId),
      fromCache: true
    }));
  }

  // Notify other clients about new presence
  broadcastPresence(fileId, {
    type: 'presence',
    action: 'join',
    userId: clientId,
    user: client.user
  });
}

// Unsubscribe client from Figma file
function unsubscribeFromFigmaFile(clientId, fileId) {
  const client = clients.get(clientId);
  if (!client) return;

  console.log(`[Unsubscribe] ${clientId} unsubscribing from ${fileId}`);

  client.subscribedFiles.delete(fileId);

  if (figmaSubscriptions.has(fileId)) {
    figmaSubscriptions.get(fileId).delete(clientId);

    // Stop polling if no more subscribers
    if (figmaSubscriptions.get(fileId).size === 0) {
      stopPollingFigmaFile(fileId);
      figmaSubscriptions.delete(fileId);
    }
  }

  // Notify other clients about presence leaving
  broadcastPresence(fileId, {
    type: 'presence',
    action: 'leave',
    userId: clientId,
    user: client.user
  });
}

// Start polling Figma file
function startPollingFigmaFile(fileId, interval) {
  console.log(`[Polling] Starting to poll ${fileId} every ${interval}ms`);

  // Initial fetch
  fetchFigmaFile(fileId);

  // Set up polling interval
  const intervalId = setInterval(() => {
    fetchFigmaFile(fileId);
  }, interval);

  pollingIntervals.set(fileId, intervalId);
}

// Stop polling Figma file
function stopPollingFigmaFile(fileId) {
  console.log(`[Polling] Stopping polling for ${fileId}`);

  if (pollingIntervals.has(fileId)) {
    clearInterval(pollingIntervals.get(fileId));
    pollingIntervals.delete(fileId);
  }

  // Clear cache after a delay
  setTimeout(() => {
    if (!figmaSubscriptions.has(fileId)) {
      figmaCache.delete(fileId);
    }
  }, 60000); // Clear cache after 1 minute
}

// Fetch Figma file from API
async function fetchFigmaFile(fileId) {
  try {
    console.log(`[Figma API] Fetching file ${fileId}`);

    const response = await fetch(`${FIGMA_API_BASE}/files/${fileId}`, {
      headers: {
        'X-Figma-Token': FIGMA_TOKEN
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status}`);
    }

    const data = await response.json();

    // Check for changes
    const previousData = figmaCache.get(fileId);
    const hasChanges = JSON.stringify(previousData) !== JSON.stringify(data);

    if (hasChanges) {
      console.log(`[Changes] Detected changes in ${fileId}`);

      // Update cache
      figmaCache.set(fileId, data);

      // Broadcast to all subscribers
      broadcastFigmaUpdate(fileId, data);
    }

  } catch (error) {
    console.error(`[Figma API] Error fetching ${fileId}:`, error);

    // Broadcast error to subscribers
    broadcastError(fileId, error.message);
  }
}

// Force sync a Figma file
function forceSyncFigmaFile(fileId) {
  console.log(`[Force Sync] Manually syncing ${fileId}`);
  fetchFigmaFile(fileId);
}

// Broadcast Figma updates to subscribers
function broadcastFigmaUpdate(fileId, data) {
  const subscribers = figmaSubscriptions.get(fileId);
  if (!subscribers) return;

  const message = JSON.stringify({
    type: 'figma-update',
    fileId,
    payload: data,
    timestamp: Date.now()
  });

  subscribers.forEach(clientId => {
    const client = clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });

  console.log(`[Broadcast] Sent update for ${fileId} to ${subscribers.size} clients`);
}

// Broadcast error to subscribers
function broadcastError(fileId, errorMessage) {
  const subscribers = figmaSubscriptions.get(fileId);
  if (!subscribers) return;

  const message = JSON.stringify({
    type: 'error',
    fileId,
    message: errorMessage,
    timestamp: Date.now()
  });

  subscribers.forEach(clientId => {
    const client = clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}

// Handle cursor updates (real-time)
function handleCursorUpdate(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  // Update client's cursor position
  client.cursor = { x: data.x, y: data.y, nodeId: data.nodeId };

  // Broadcast to all other clients watching the same files
  client.subscribedFiles.forEach(fileId => {
    const subscribers = figmaSubscriptions.get(fileId);
    if (!subscribers) return;

    const message = JSON.stringify({
      type: 'cursor-move',
      payload: {
        id: clientId,
        name: client.user,
        color: generateColorForClient(clientId),
        x: data.x,
        y: data.y,
        nodeId: data.nodeId
      }
    });

    subscribers.forEach(subscriberId => {
      if (subscriberId !== clientId) { // Don't send back to sender
        const subscriber = clients.get(subscriberId);
        if (subscriber && subscriber.ws.readyState === WebSocket.OPEN) {
          subscriber.ws.send(message);
        }
      }
    });
  });
}

// Broadcast comment
function broadcastComment(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  client.subscribedFiles.forEach(fileId => {
    const subscribers = figmaSubscriptions.get(fileId);
    if (!subscribers) return;

    const message = JSON.stringify({
      type: 'comment',
      payload: {
        ...data,
        userId: clientId,
        user: client.user,
        timestamp: Date.now()
      }
    });

    subscribers.forEach(subscriberId => {
      const subscriber = clients.get(subscriberId);
      if (subscriber && subscriber.ws.readyState === WebSocket.OPEN) {
        subscriber.ws.send(message);
      }
    });
  });
}

// Update and broadcast presence
function updatePresence(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  // Update client info
  if (data.user) client.user = data.user;
  if (data.status) client.status = data.status;

  // Broadcast presence update
  client.subscribedFiles.forEach(fileId => {
    broadcastPresence(fileId, {
      type: 'presence',
      action: 'update',
      userId: clientId,
      user: client.user,
      status: client.status
    });
  });
}

// Broadcast presence to all subscribers of a file
function broadcastPresence(fileId, data) {
  const subscribers = figmaSubscriptions.get(fileId);
  if (!subscribers) return;

  const message = JSON.stringify(data);

  subscribers.forEach(subscriberId => {
    const subscriber = clients.get(subscriberId);
    if (subscriber && subscriber.ws.readyState === WebSocket.OPEN) {
      subscriber.ws.send(message);
    }
  });
}

// Handle client disconnect
function handleClientDisconnect(clientId) {
  const client = clients.get(clientId);
  if (!client) return;

  // Unsubscribe from all files
  client.subscribedFiles.forEach(fileId => {
    unsubscribeFromFigmaFile(clientId, fileId);
  });

  // Remove client
  clients.delete(clientId);
}

// Utility functions
function generateClientId() {
  return Math.random().toString(36).substr(2, 9);
}

function generateColorForClient(clientId) {
  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
  const index = parseInt(clientId, 36) % colors.length;
  return colors[index];
}

// Start server
const PORT = process.env.WS_PORT || 8889;

server.listen(PORT, () => {
  console.log(`[Server] WebSocket server running on ws://localhost:${PORT}`);
  console.log(`[Server] Figma token: ${FIGMA_TOKEN ? 'Set' : 'Not set (set FIGMA_TOKEN env var)'}`);
  console.log(`[Server] Ready to accept connections...`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] Shutting down...');

  // Close all connections
  clients.forEach(client => {
    client.ws.close(1000, 'Server shutting down');
  });

  // Clear all intervals
  pollingIntervals.forEach(interval => clearInterval(interval));

  server.close(() => {
    console.log('[Server] Shutdown complete');
    process.exit(0);
  });
});