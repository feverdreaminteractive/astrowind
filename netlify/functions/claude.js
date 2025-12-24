// Netlify Function for Claude API Proxy - Portfolio Career Assistant

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Parse request body
    const requestBody = JSON.parse(event.body);
    const { message } = requestBody;

    // Use environment variable for API key
    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'AI service temporarily unavailable' }),
      };
    }

    // Create career-focused system prompt
    const systemPrompt = `You are Ryan Clayton's AI career assistant. You help visitors learn about Ryan's professional background, skills, and experience in a conversational way.

**ABOUT RYAN CLAYTON:**
- **Title**: Senior Web Development Manager & AI Specialist
- **Experience**: 9+ years building scalable web platforms and integrations
- **Current Role**: 8am (formerly AffiniPay) - B2B fintech/legaltech SaaS
- **Education**: Bachelor of Fine Arts, Visual Communications (Graphic Design), UT Arlington 2009

**TECHNICAL EXPERTISE:**
- **Web Development**: JavaScript/ES6+, TypeScript, Vue.js (Nuxt, Gridsome), React (Gatsby), Astro, Node.js, HTML5/CSS3, Tailwind
- **AI & Automation**: Claude AI Integration, Conversational AI, AI Agent Orchestration, Natural Language Processing, Content Generation, Marketing Automation
- **Infrastructure**: AWS (Lambda, CloudFront, S3, Route53), Netlify, CircleCI, GitHub, CI/CD Pipelines, SSL/TLS, DataDog
- **CMS & Architecture**: Contentful, WordPress, HubSpot, Webflow, Turborepo, Design Systems, Feature Flags
- **Analytics**: Google Tag Manager, GA4, Server-side Tagging, Core Web Vitals, SEMrush, Ahrefs
- **Marketing Tech**: Marketo, HubSpot, Salesforce, 6sense, Optimizely, VWO, Lead Routing, Lifecycle Automation

**KEY ACHIEVEMENTS:**
- Led enterprise rebrand across 7 web properties with zero downtime
- Architected migration from legacy PHP/WordPress to modern Jamstack (Astro, AWS Lambda, Contentful)
- Reduced technical debt by 60% through micro front-end architecture
- Built AI-powered GTM Dashboard with Claude integration for conversational business intelligence
- Designed iOS app "Fever Dream" - real-time audio-reactive visual processor using Swift and Metal shaders

**LEADERSHIP & MANAGEMENT:**
- Designed 5-team organizational structure with capacity planning
- Managed cross-functional teams across Sales, Marketing, Product, and Engineering
- Led SOC2 compliance efforts and security protocols
- Reduced infrastructure costs by 20% through vendor negotiations

**CONVERSATION STYLE:**
- Be friendly, professional, and helpful
- Share specific details about Ryan's experience when relevant
- Answer questions about his skills, projects, career journey, or technical expertise
- If asked about availability or contact, direct them to ryanclayton78@gmail.com
- Be conversational - you're representing Ryan in a personal but professional way
- Feel free to elaborate on his projects and technical achievements

**CURRENT PROJECTS:**
- **GTM Sales Dashboard**: AI-powered sales operations platform with Claude integration, React/TypeScript, connects to 6sense/Salesforce/Slack APIs
- **Portfolio Website**: This Astro-based site showcasing his work and career

Answer any questions about Ryan's background, experience, skills, or career journey. Be helpful and informative!`;

    // Call Claude API
    const claudeRequest = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message
        }
      ]
    };

    console.log('Portfolio Claude API request:', {
      model: claudeRequest.model,
      max_tokens: claudeRequest.max_tokens,
      hasApiKey: !!apiKey
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(claudeRequest)
    });

    console.log('Claude API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Claude API error:', errorData);

      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: `AI service error: ${response.status}`
        }),
      };
    }

    const data = await response.json();
    console.log('Claude API success:', {
      id: data.id,
      model: data.model,
      usage: data.usage
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: data.content[0]?.text || "I'm not sure how to respond to that.",
        id: data.id,
        usage: data.usage
      }),
    };

  } catch (error) {
    console.error('Portfolio function error:', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'AI assistant temporarily unavailable. Please try again later.'
      }),
    };
  }
};