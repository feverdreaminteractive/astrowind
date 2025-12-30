# Slack Contact Form Integration

This portfolio website now includes a contact form that sends messages directly to your Slack workspace! Visitors can message you and you'll receive beautiful, formatted notifications in Slack.

## Features

- 🎨 **Beautiful Contact Form**: Glassmorphism design that matches your portfolio
- 🚀 **Real-time Slack Notifications**: Messages appear instantly in your Slack channel
- 📧 **Rich Message Format**: Includes sender info, message content, and timestamp
- ⚡ **One-click Email Reply**: Button in Slack message to reply via email
- ✅ **Form Validation**: Ensures all required fields are filled
- 🔄 **Loading States**: Visual feedback during message sending

## Setup Instructions

### 1. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app (e.g., "Portfolio Contact Form")
4. Select your workspace

### 2. Enable Incoming Webhooks

1. In your app settings, go to "Incoming Webhooks"
2. Turn on "Activate Incoming Webhooks"
3. Click "Add New Webhook to Workspace"
4. Select the channel where you want to receive messages
5. Copy the webhook URL (starts with `https://hooks.slack.com/services/...`)

### 3. Update Environment Variables

1. Open your `.env` file
2. Replace `your_slack_webhook_url_here` with your actual webhook URL:

```env
SLACK_WEBHOOK_URL=your_slack_webhook_url_here
```

### 4. Deploy and Test

1. Deploy your changes to your hosting platform (Netlify, Vercel, etc.)
2. Make sure to add the `SLACK_WEBHOOK_URL` environment variable in your hosting platform's settings
3. Test the contact form on your live site

## Message Format

When someone submits the contact form, you'll receive a Slack message with:

- 📨 **Header**: "🚀 New Contact Form Message"
- 👤 **Name & Email**: Sender's information
- 💬 **Message Content**: Their full message
- 🕒 **Timestamp**: When the message was sent
- 📧 **Reply Button**: One-click email reply

## Customization

### Change the Slack Channel

To send messages to a different channel:
1. Go to your Slack app settings
2. "Incoming Webhooks" → "Add New Webhook to Workspace"
3. Select a different channel
4. Update your `SLACK_WEBHOOK_URL` environment variable

### Modify the Message Format

Edit `/src/pages/api/contact.ts` to customize the Slack message format. The message uses Slack's Block Kit format for rich formatting.

### Style the Contact Form

Edit `/src/components/SlackContactForm.tsx` to modify the form's appearance and behavior.

## Troubleshooting

### Messages Not Appearing in Slack

1. **Check Environment Variable**: Ensure `SLACK_WEBHOOK_URL` is correctly set in both `.env` and your hosting platform
2. **Verify Webhook URL**: Make sure the URL is complete and starts with `https://hooks.slack.com/services/`
3. **Check Browser Console**: Look for any JavaScript errors in the browser's developer tools
4. **Test API Endpoint**: Try making a direct POST request to `/api/contact` with test data

### Form Submission Errors

1. **Check Server Logs**: Look at your hosting platform's function logs for errors
2. **Verify Required Fields**: Ensure name, email, and message are all provided
3. **Test Locally**: Run `npm run dev` and test on localhost first

### Styling Issues

1. **Tailwind Classes**: Ensure all Tailwind classes are available in your build
2. **Component Hydration**: Check that the React component is properly hydrated with `client:only="react"`

## Security Notes

- Never commit your actual Slack webhook URL to git
- Keep your `.env` file in `.gitignore`
- The webhook URL should only be stored in environment variables
- Consider adding rate limiting for production use

## What's Next?

- 🤖 **Add Bot Responses**: Create a Slack bot that can respond to messages
- 📊 **Analytics**: Track contact form submissions
- 🔔 **Multiple Channels**: Route different types of messages to different channels
- 🛡️ **Spam Protection**: Add CAPTCHA or rate limiting

---

Your portfolio now has a direct line of communication to your Slack workspace! 🎉