import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { message, userName, timestamp } = await request.json();

    // Validate required fields
    if (!message || !userName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get Slack webhook URL from environment variable
    const slackWebhookUrl = import.meta.env.SLACK_WEBHOOK_URL;

    if (!slackWebhookUrl) {
      console.error('SLACK_WEBHOOK_URL environment variable not set');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create rich Slack message for real-time chat
    const slackMessage = {
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
              text: `*Visitor:*\n${userName}`
            },
            {
              type: "mrkdwn",
              text: `*Time:*\n${new Date(timestamp).toLocaleTimeString()}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Message:*\n> ${message}`
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `🌐 Live from ryanclayton.io • Real-time chat session`
            }
          ]
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "💬 Reply in Thread"
              },
              style: "primary",
              action_id: "reply_to_chat"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "👀 View Chat History"
              },
              action_id: "view_chat_history"
            }
          ]
        }
      ]
    };

    // Send to Slack
    const slackResponse = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage)
    });

    if (!slackResponse.ok) {
      console.error('Failed to send to Slack:', slackResponse.status, slackResponse.statusText);
      return new Response(JSON.stringify({ error: 'Failed to send message' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // TODO: In production, you'd also:
    // 1. Store the message in a database
    // 2. Send to WebSocket server to notify connected clients
    // 3. Handle Slack Socket Mode events for responses

    return new Response(JSON.stringify({
      success: true,
      messageId: Date.now().toString(),
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Real-time chat error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};