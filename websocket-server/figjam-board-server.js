// WebSocket Server for FigJam Board
// Real-time collaborative whiteboard using WebSockets

const WebSocket = require('ws');
const http = require('http');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store board state
const boards = new Map(); // boardId -> board state
const clients = new Map(); // clientId -> client info

// Initialize default board
boards.set('main', {
  id: 'main',
  elements: new Map(),
  users: new Set()
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const clientId = generateId();
  console.log(`[FigJam] New client connected: ${clientId}`);

  // Store client
  clients.set(clientId, {
    id: clientId,
    ws: ws,
    boardId: null,
    user: null
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    clientId: clientId
  }));

  // Handle messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      handleMessage(clientId, data);
    } catch (error) {
      console.error(`[FigJam] Error parsing message:`, error);
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    console.log(`[FigJam] Client disconnected: ${clientId}`);
    handleDisconnect(clientId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`[FigJam] WebSocket error for ${clientId}:`, error);
  });
});

// Handle incoming messages
function handleMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  console.log(`[FigJam] Message from ${clientId}:`, data.type);

  switch(data.type) {
    case 'join-board':
      handleJoinBoard(clientId, data);
      break;

    case 'element-add':
      handleElementAdd(clientId, data);
      break;

    case 'element-update':
      handleElementUpdate(clientId, data);
      break;

    case 'element-remove':
      handleElementRemove(clientId, data);
      break;

    case 'cursor-move':
      handleCursorMove(clientId, data);
      break;

    case 'drawing':
      handleDrawing(clientId, data);
      break;

    case 'emoji-reaction':
      handleEmojiReaction(clientId, data);
      break;

    default:
      console.log(`[FigJam] Unknown message type: ${data.type}`);
  }
}

// Handle join board
function handleJoinBoard(clientId, data) {
  const client = clients.get(clientId);
  const boardId = data.boardId || 'main';
  const board = boards.get(boardId) || boards.get('main');

  // Update client info
  client.boardId = boardId;
  client.user = data.user || {
    id: clientId,
    name: `User-${clientId.substr(0, 4)}`,
    color: getRandomColor()
  };

  // Add user to board
  board.users.add(clientId);

  // Send current board state to new user
  const boardState = {
    type: 'board-state',
    elements: Array.from(board.elements.values())
  };
  client.ws.send(JSON.stringify(boardState));

  // Notify others of new user
  broadcastToBoard(boardId, {
    type: 'user-join',
    user: client.user
  }, clientId);

  console.log(`[FigJam] ${client.user.name} joined board ${boardId}`);
}

// Handle element operations
function handleElementAdd(clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.boardId) return;

  const board = boards.get(client.boardId);
  if (!board) return;

  // Store element
  board.elements.set(data.element.id, data.element);

  // Broadcast to others
  broadcastToBoard(client.boardId, {
    type: 'element-add',
    element: data.element
  }, clientId);
}

function handleElementUpdate(clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.boardId) return;

  const board = boards.get(client.boardId);
  if (!board) return;

  // Update element
  if (board.elements.has(data.element.id)) {
    board.elements.set(data.element.id, data.element);

    // Broadcast to others
    broadcastToBoard(client.boardId, {
      type: 'element-update',
      element: data.element
    }, clientId);
  }
}

function handleElementRemove(clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.boardId) return;

  const board = boards.get(client.boardId);
  if (!board) return;

  // Remove element
  board.elements.delete(data.elementId);

  // Broadcast to others
  broadcastToBoard(client.boardId, {
    type: 'element-remove',
    elementId: data.elementId
  }, clientId);
}

// Handle cursor movement
function handleCursorMove(clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.boardId) return;

  // Broadcast cursor position to others on the same board
  broadcastToBoard(client.boardId, {
    type: 'cursor-move',
    user: client.user,
    position: data.position
  }, clientId);
}

// Handle drawing
function handleDrawing(clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.boardId) return;

  // Broadcast drawing to others
  broadcastToBoard(client.boardId, {
    type: 'drawing',
    drawing: data.drawing
  }, clientId);
}

// Handle emoji reaction
function handleEmojiReaction(clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.boardId) return;

  // Broadcast emoji to all users
  broadcastToBoard(client.boardId, {
    type: 'emoji-reaction',
    emoji: data.emoji,
    position: data.position,
    user: client.user
  });
}

// Handle disconnect
function handleDisconnect(clientId) {
  const client = clients.get(clientId);
  if (!client) return;

  // Remove from board
  if (client.boardId) {
    const board = boards.get(client.boardId);
    if (board) {
      board.users.delete(clientId);

      // Notify others
      broadcastToBoard(client.boardId, {
        type: 'user-leave',
        userId: clientId,
        user: client.user
      }, clientId);
    }
  }

  // Remove client
  clients.delete(clientId);
}

// Broadcast to all users on a board
function broadcastToBoard(boardId, message, excludeClientId = null) {
  const board = boards.get(boardId);
  if (!board) return;

  const messageStr = JSON.stringify(message);

  board.users.forEach(clientId => {
    if (clientId === excludeClientId) return;

    const client = clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

// Utility functions
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function getRandomColor() {
  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Start server
const PORT = process.env.WS_PORT || 8889;

server.listen(PORT, () => {
  console.log(`[FigJam Server] Running on ws://localhost:${PORT}`);
  console.log(`[FigJam Server] Ready for collaborative whiteboarding!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[FigJam Server] Shutting down...');

  // Close all connections
  clients.forEach(client => {
    client.ws.close(1000, 'Server shutting down');
  });

  server.close(() => {
    console.log('[FigJam Server] Shutdown complete');
    process.exit(0);
  });
});