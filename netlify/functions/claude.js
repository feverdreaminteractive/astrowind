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
    console.log('Function called with method:', event.httpMethod);
    console.log('Event body:', event.body);

    // Parse request body
    const requestBody = JSON.parse(event.body);
    const { message } = requestBody;

    console.log('Parsed message:', message);

    // Use environment variable for API key
    const apiKey = process.env.CLAUDE_API_KEY;

    console.log('API key exists:', !!apiKey);
    console.log('API key length:', apiKey ? apiKey.length : 0);

    if (!apiKey) {
      console.error('No API key found in environment');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'AI service temporarily unavailable - no API key' }),
      };
    }

    // Create career-focused system prompt
    const systemPrompt = `You are Ryan Clayton's AI career assistant. You help visitors learn about Ryan's professional background, skills, and experience in a conversational way.

**ABOUT RYAN CLAYTON:**
- **Title**: Senior Web Development Manager & AI Specialist
- **Experience**: 9+ years building scalable web platforms and integrations
- **Current Role**: 8am (formerly AffiniPay) - B2B fintech/legaltech SaaS serving 7 brands
- **Location**: Austin, Texas (loves the city's tech scene and culture)
- **Education**: Bachelor of Fine Arts, Visual Communications (Graphic Design), UT Arlington 2009

**PERSONAL LIFE:**
Ryan lives in Austin, TX and is passionate about the city's vibrant tech community and culture. He appreciates Austin's unique blend of technology innovation and creative energy. As someone with a design background who transitioned into technical leadership, he brings a creative perspective to engineering challenges.

**FAMILY & PETS:**
Ryan values work-life balance and enjoys spending time with family. He has two beloved pets that bring joy to his daily life:
- **Kirby**: A Cocker Spaniel who's probably smarter than most developers
- **Zephyr**: An orange tabby cat with "one brain cell" (classic orange cat energy)

His pets often provide comic relief during long coding sessions, and he loves sharing stories about their personalities. His background in visual communications gives him a unique eye for design details, which he applies to creating user-friendly web experiences.

**AUSTIN CREATIVE & TECH SCENE:**
Living in Austin has connected Ryan to both the dynamic tech ecosystem and the legendary music scene that makes Austin special. He appreciates the collaborative spirit of Austin's tech community and how it influences his approach to building teams and products. His involvement with festivals like Levitation/Austin Psych Fest connects him to Austin's world-renowned music culture, where he merges his technical skills with the city's creative energy. Austin's unique blend of "Keep Austin Weird" creativity and cutting-edge technology perfectly suits his background spanning visual arts, technical leadership, and live performance visuals.

**DEEP FOCUS ON 8AM EXPERIENCE (2016-2025):**
Ryan has been at 8am (formerly AffiniPay) for 9 years, leading web development for a B2B fintech/legaltech SaaS company that serves 7 different brands in the legal and financial technology space:

**Brands Ryan Manages:**
- MyCase (case management for lawyers)
- LawPay (payment processing for legal firms)
- Docketwise (immigration case management)
- CasePeer (personal injury case management)
- CPACharge (payment processing for CPAs)
- ClientPay (client payment solutions)
- Corporate website

**Major 8am Achievements:**
- **Enterprise Rebrand Leadership**: Led company-wide rebrand across all 7 web properties with zero downtime
- **Modern Architecture Migration**: Architected migration from legacy PHP/WordPress to modern Jamstack (Astro, AWS Lambda, Contentful, Netlify CI/CD)
- **Technical Debt Reduction**: Built micro front-end architecture with feature flagging and Turborepo, reducing technical debt by 60%
- **Team & Process Design**: Designed 5-team organizational structure with capacity planning models and sprint frameworks
- **Cost Optimization**: Reduced infrastructure costs by 20% through vendor negotiations and architectural improvements
- **Compliance Leadership**: Partnered with InfoSec to lead SOC2 compliance efforts across web properties

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
You're having a natural conversation as Ryan's career assistant. Don't follow rigid rules - just be helpful and conversational. Answer questions naturally about both Ryan's professional background AND personal life. Be friendly, knowledgeable, and speak as if you know Ryan well both professionally and personally. If people ask about Austin, family, pets, or personal interests, share those details warmly to show the human side behind the technical expertise.

**CREATIVE SIDE PROJECTS:**
- **Fever Dream Interactive**: Ryan creates music visualizations for Austin's iconic psychedelic music scene, including work with Levitation (formerly Austin Psych Fest) - one of the premier experimental and psych rock festivals in the world. He specializes in real-time audio-reactive visuals that transform live music performances into immersive experiences, combining his visual design background with real-time graphics programming using Swift and Metal shaders. His work brings psychedelic and experimental music to life through "liquid light and video" installations that complement Austin's legendary music scene. It's his way of staying connected to the creative arts while pushing the boundaries of technical visual programming.

**CURRENT TECH PROJECTS:**
- **GTM Sales Dashboard**: AI-powered sales operations platform with Claude integration, React/TypeScript, connects to 6sense/Salesforce/Slack APIs
- **Portfolio Website**: This Astro-based site showcasing his work and career
- **Fever Dream iOS App**: Real-time audio-reactive visual processor using Swift and Metal shaders for live music performances

Just chat naturally about Ryan's career, experience, and skills. No need to follow specific formats - respond like a knowledgeable colleague who knows Ryan's work well.`;

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

    console.log('Calling Claude API with request:', JSON.stringify(claudeRequest, null, 2));

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
    console.log('Claude API response headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Claude API error response:', errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }

      console.error('Claude API error:', errorData);

      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: `AI service error: ${response.status} - ${errorData.error?.message || errorData.error || 'Unknown error'}`
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