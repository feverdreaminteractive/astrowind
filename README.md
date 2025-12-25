# Ryan Clayton - AI-Powered Portfolio

A modern, interactive portfolio website featuring voice-enabled AI assistant capabilities for an enhanced recruitment experience.

## Live Site

Visit the live portfolio at: [ryanclayton.io](https://ryanclayton.io)

## Key Features

### Voice-Powered Interview Mode
- **Voice Input**: Click the microphone to ask questions with speech recognition
- **Audio Responses**: Automatic text-to-speech playback for voice questions
- **Replay Functionality**: Click play buttons to replay any AI response
- **Professional Voice**: Uses Alex voice with optimized speech settings
- **Real-time Transcription**: Shows your words as you speak

### AI Career Assistant
- **Conversational Interface**: Natural language Q&A about professional background
- **Intelligent Analytics**: Company detection and recruiter identification
- **Privacy Protection**: Owner traffic filtering and secure data handling
- **Third-person Responses**: Professional tone discussing Ryan's experience

### Modern Tech Stack
- **Astro**: Static site generation with optimal performance
- **React + TypeScript**: Interactive components with type safety
- **Tailwind CSS**: Utility-first styling with dark mode support
- **Web Speech API**: Browser-native voice recognition and synthesis
- **Claude AI Integration**: Serverless function proxy for AI responses

### Analytics & Insights
- **Company Intelligence**: Automatic visitor organization detection
- **Recruitment Tracking**: Enhanced analytics for hiring manager visits
- **GA4 Integration**: Custom events and user property tracking
- **Privacy Focused**: Respects user privacy with smart filtering

## Technical Architecture

### Frontend
- **Framework**: Astro with React islands
- **Styling**: Tailwind CSS with custom design system
- **Voice Features**: Web Speech API with cross-browser support
- **Responsive Design**: Mobile-first approach with adaptive layouts

### Backend
- **Serverless Functions**: Netlify Functions for API proxy
- **AI Integration**: Claude API for conversational responses
- **Analytics**: Google Analytics 4 with custom dimensions
- **Deployment**: Automatic deployment via Netlify

### Voice Technology
- **Speech Recognition**: Continuous listening with interim results
- **Text-to-Speech**: Professional voice synthesis with cleanup
- **Cross-Platform**: Support for Chrome, Safari, Edge browsers
- **Intelligent Fallbacks**: Graceful degradation for unsupported browsers

## Development

### Prerequisites
- Node.js 20+
- npm or yarn package manager

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables
Create a `.env` file with:
```
CLAUDE_API_KEY=your_claude_api_key_here
```

## Deployment

The site is deployed on Netlify with automatic builds from the main branch:

- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Node Version**: 20 (specified in .nvmrc)

### Netlify Functions
- `/netlify/functions/claude.js`: AI assistant API proxy
- Handles CORS, rate limiting, and response processing

## Performance Features

- **Static Generation**: Pre-built pages for optimal loading
- **Code Splitting**: Dynamic imports for React components
- **Image Optimization**: Optimized images with multiple formats
- **Caching**: Aggressive caching strategies for assets
- **Minimal JavaScript**: Only essential client-side code

## Privacy & Security

- **Data Protection**: No personal information stored client-side
- **Secure API**: Serverless functions with proper CORS handling
- **Analytics Filtering**: Owner traffic excluded from tracking
- **Content Security**: Sanitized AI responses and user inputs

## Browser Support

- **Chrome**: Full feature support including voice
- **Safari**: Full feature support including voice
- **Firefox**: Visual features, voice support limited
- **Edge**: Full feature support including voice

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── CareerAssistant.tsx    # AI chat interface
│   ├── Profile.astro          # Header profile section
│   ├── Skills.astro           # Technical skills display
│   └── Bio.astro             # Professional summary
├── layouts/            # Page layout templates
├── pages/             # Astro pages and routes
├── styles/            # Global CSS and Tailwind config
└── assets/           # Images and static files

netlify/
└── functions/        # Serverless API endpoints
    └── claude.js     # AI assistant proxy

public/
├── favicon.svg       # Site favicon
├── og-image.png     # Social media preview image
└── robots.txt       # SEO directives
```

## Contributing

This is a personal portfolio project. However, if you find bugs or have suggestions for improvements, feel free to open an issue.

## License

This project is for personal use. The code structure and components may be referenced for learning purposes.

## Contact

For questions about this portfolio or potential opportunities:

- **LinkedIn**: [ryan-clayton-atx](https://linkedin.com/in/ryan-clayton-atx)
- **GitHub**: [feverdreaminteractive](https://github.com/feverdreaminteractive)
- **Email**: Available through the portfolio contact form

---

Built with modern web technologies and a focus on creating an engaging, interactive experience for recruiters and potential collaborators.
