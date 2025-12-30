const WebSocket = require('ws');
const { WebClient } = require('@slack/web-api');
const { SocketModeClient } = require('@slack/socket-mode');

// Environment variables
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || '#recruiter';

// Initialize Slack clients
const slackWeb = new WebClient(SLACK_BOT_TOKEN);
const slackSocket = new SocketModeClient({ appToken: SLACK_APP_TOKEN });

// WebSocket server for website connections
const wss = new WebSocket.Server({ port: 8080 });

// Store active website connections
const websiteConnections = new Map();

console.log('🚀 Real-time Slack Chat Server starting...');

// WebSocket server for website connections
wss.on('connection', (ws, req) => {
  const connectionId = Date.now().toString();
  websiteConnections.set(connectionId, ws);

  console.log(`🌐 Website client connected: ${connectionId}`);

  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    connectionId,
    ryanOnline: true
  }));

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Received from website:', message);

      switch (message.type) {
        case 'chat_message':
          await handleWebsiteMessage(message, connectionId);
          break;
        case 'typing_start':
          await notifySlackTyping(message, connectionId, true);
          break;
        case 'typing_stop':
          await notifySlackTyping(message, connectionId, false);
          break;
      }
    } catch (error) {
      console.error('❌ Error handling website message:', error);
    }
  });

  ws.on('close', () => {
    websiteConnections.delete(connectionId);
    console.log(`🔌 Website client disconnected: ${connectionId}`);
  });
});

// Handle messages from website
async function handleWebsiteMessage(message, connectionId) {
  try {
    // Send message to Slack
    const result = await slackWeb.chat.postMessage({
      channel: SLACK_CHANNEL,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "💬 Live Chat Message"
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Visitor:* ${message.userName || 'Anonymous'}`
            },
            {
              type: "mrkdwn",
              text: `*Connection:* ${connectionId}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Message:*\n> ${message.text}`
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `🌐 Live from ryanclayton.io • ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    });

    console.log('📤 Sent to Slack:', result.ts);

    // Confirm message received
    const ws = websiteConnections.get(connectionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'message_received',
        messageId: message.id,
        slackTimestamp: result.ts
      }));
    }

  } catch (error) {
    console.error('❌ Error sending to Slack:', error);
  }
}

// Handle typing notifications
async function notifySlackTyping(message, connectionId, isTyping) {
  try {
    if (isTyping) {
      await slackWeb.chat.postMessage({
        channel: SLACK_CHANNEL,
        text: `💭 ${message.userName || 'Someone'} is typing on the website...`,
        thread_ts: message.threadTs // If in a thread
      });
    }
  } catch (error) {
    console.error('❌ Error sending typing notification:', error);
  }
}

// Slack Socket Mode - Listen for real-time events
slackSocket.on('message', async ({ event, ack }) => {
  await ack();

  // Only process messages from the portfolio chat channel
  if (event.channel !== SLACK_CHANNEL) return;

  // Don't process bot messages
  if (event.bot_id) return;

  console.log('📱 Received from Slack:', event);

  // Get user info
  let userName = 'Ryan';
  try {
    const userInfo = await slackWeb.users.info({ user: event.user });
    userName = userInfo.user.real_name || userInfo.user.name || 'Ryan';
  } catch (error) {
    console.log('Could not get user info, using default name');
  }

  // Send message to all connected website clients
  const slackMessage = {
    type: 'slack_message',
    id: event.ts,
    text: event.text,
    sender: 'ryan',
    senderName: userName,
    timestamp: new Date(parseFloat(event.ts) * 1000).toISOString(),
    threadTs: event.thread_ts
  };

  // Broadcast to all website connections
  websiteConnections.forEach((ws, connectionId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(slackMessage));
      console.log(`📤 Forwarded to website client: ${connectionId}`);
    }
  });
});

// Handle Slack Socket Mode connection
slackSocket.on('ready', () => {
  console.log('⚡ Connected to Slack Socket Mode!');
});

slackSocket.on('disconnect', () => {
  console.log('🔌 Disconnected from Slack Socket Mode');
});

slackSocket.on('error', (error) => {
  console.error('❌ Slack Socket Mode error:', error);
});

// Start the Slack Socket Mode connection
async function start() {
  try {
    await slackSocket.start();
    console.log('✅ Real-time Slack Chat Server is running!');
    console.log(`📡 WebSocket server listening on port 8080`);
    console.log(`💬 Slack channel: ${SLACK_CHANNEL}`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  wss.close();
  slackSocket.disconnect();
  process.exit(0);
});

start();