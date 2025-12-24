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
    const { message, browserData } = requestBody;

    console.log('Parsed message:', message);

    // Get visitor context for smart recruiter detection
    const visitorIP = event.headers['x-forwarded-for']?.split(',')[0] ||
                     event.headers['x-real-ip'] ||
                     'unknown';
    const referrer = event.headers['referer'] || event.headers['referrer'] || '';
    const userAgent = event.headers['user-agent'] || '';

    let visitorContext = {
      hasCompanyInfo: false,
      isLikelyRecruiter: false,
      company: null,
      location: null,
      org: null,
      signals: []
    };

    // Try to get company info from IPinfo.io (50k free requests/month)
    if (visitorIP && visitorIP !== 'unknown') {
      try {
        const ipInfoResponse = await fetch(`https://ipinfo.io/${visitorIP}/json`);
        if (ipInfoResponse.ok) {
          const ipData = await ipInfoResponse.json();
          console.log('IPInfo data:', ipData);

          // More strict filtering for company IPs - exclude consumer ISPs and personal connections
          const orgLower = ipData.org?.toLowerCase() || '';
          const isConsumerISP = orgLower.includes('comcast') ||
                               orgLower.includes('verizon') ||
                               orgLower.includes('att') ||
                               orgLower.includes('spectrum') ||
                               orgLower.includes('cox') ||
                               orgLower.includes('xfinity') ||
                               orgLower.includes('fiber') ||
                               orgLower.includes('broadband') ||
                               orgLower.includes('cable') ||
                               orgLower.includes('isp') ||
                               orgLower.includes('wireless') ||
                               orgLower.includes('mobile');

          if (ipData.org && !isConsumerISP) {
            visitorContext.hasCompanyInfo = true;
            visitorContext.company = ipData.org.replace(/^AS\d+\s+/, ''); // Remove AS prefix
            visitorContext.location = ipData.city && ipData.region ? `${ipData.city}, ${ipData.region}` : ipData.country;
            visitorContext.org = ipData.org;
            visitorContext.signals.push('corporate_network');
          }
        }

        // Enhanced recruiter detection using multiple signals
        let recruiterScore = 0;

        // Referrer signals (strongest indicators)
        if (referrer.includes('linkedin.com')) {
          recruiterScore += 40;
          visitorContext.signals.push('linkedin_referrer');
        }
        if (referrer.includes('indeed.com') || referrer.includes('glassdoor.com') ||
            referrer.includes('monster.com') || referrer.includes('dice.com') ||
            referrer.includes('stackoverflow.com/jobs') || referrer.includes('angellist.com')) {
          recruiterScore += 35;
          visitorContext.signals.push('job_site_referrer');
        }

        // Browser data analysis (if available)
        if (browserData) {
          // Session engagement signals
          if (browserData.messageCount > 3) {
            recruiterScore += 15;
            visitorContext.signals.push('high_engagement');
          }

          // Professional timezone patterns (business hours in major recruiting hubs)
          const timeZone = browserData.timeZone || '';
          const hour = new Date().getHours();
          if ((timeZone.includes('America/New_York') || timeZone.includes('America/Chicago') ||
               timeZone.includes('America/Denver') || timeZone.includes('America/Los_Angeles')) &&
              hour >= 9 && hour <= 17) {
            recruiterScore += 8;
            visitorContext.signals.push('business_timezone_hours');
          }

          // Screen resolution patterns (recruiters often use larger screens)
          const resolution = browserData.screenResolution || '';
          if (resolution.includes('1920x') || resolution.includes('2560x') || resolution.includes('3440x')) {
            recruiterScore += 5;
            visitorContext.signals.push('professional_display');
          }

          // Session duration (recruiters tend to have longer, more focused sessions)
          const sessionDuration = Date.now() - browserData.sessionStart;
          if (sessionDuration > 300000) { // 5+ minutes
            recruiterScore += 10;
            visitorContext.signals.push('extended_session');
          }
        }

        // Corporate network signals
        if (visitorContext.hasCompanyInfo) {
          const companyLower = visitorContext.company.toLowerCase();
          if (companyLower.includes('recruit') || companyLower.includes('staffing') ||
              companyLower.includes('talent') || companyLower.includes('human resources') ||
              companyLower.includes('hr ') || companyLower.includes('hiring')) {
            recruiterScore += 30;
            visitorContext.signals.push('recruiting_company');
          } else {
            recruiterScore += 10; // Generic corporate network
            visitorContext.signals.push('corporate_network');
          }
        }

        // Time-based signals (recruiters often browse during business hours)
        const hour = new Date().getHours();
        if (hour >= 9 && hour <= 17) {
          recruiterScore += 5;
          visitorContext.signals.push('business_hours');
        }

        // User agent signals
        if (userAgent.includes('LinkedIn') || userAgent.includes('Indeed')) {
          recruiterScore += 20;
          visitorContext.signals.push('recruiting_app');
        }

        // Set recruiter status based on score threshold
        visitorContext.isLikelyRecruiter = recruiterScore >= 30;

        console.log(`Enhanced recruiter score: ${recruiterScore}, Signals: ${visitorContext.signals.join(', ')}`);
        if (browserData) {
          console.log('Browser analytics data:', {
            messageCount: browserData.messageCount,
            timeZone: browserData.timeZone,
            screenResolution: browserData.screenResolution,
            sessionDuration: Date.now() - browserData.sessionStart
          });
        }
      } catch (error) {
        console.log('IPInfo lookup failed, using default conversation:', error.message);
      }
    }

    console.log('Visitor context:', visitorContext);

    // Handle special welcome message request
    if (message === '__WELCOME_MESSAGE__') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: visitorContext.isLikelyRecruiter
            ? "Hi! I'm Ryan's AI assistant. I'd love to discuss my background, technical leadership experience, and what I'm looking for in my next role. What would you like to know?"
            : "Hi! I'm Ryan's AI assistant. I can help with coding questions, discuss my technical projects, or tell you about my development experience. What can I help you with?"
        }),
      };
    }

    // Handle visitor info request for GA4 tracking
    if (message === '__GET_VISITOR_INFO__') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyInfo: {
            company: visitorContext.company,
            location: visitorContext.location,
            isLikelyRecruiter: visitorContext.isLikelyRecruiter,
            signals: visitorContext.signals,
            score: recruiterScore,
            referrerType: referrer.includes('linkedin.com') ? 'linkedin' :
                         referrer.includes('indeed.com') || referrer.includes('glassdoor.com') ? 'job_board' :
                         referrer.includes('google.com') ? 'google' : 'direct',
            hasCompanyInfo: visitorContext.hasCompanyInfo
          }
        }),
      };
    }

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

IMPORTANT: You are Ryan's AI Career Assistant. Respond naturally about Ryan in third person using "Ryan", "his", "him" instead of "I", "my", "me". Keep responses professional and direct - avoid overly casual language, filler phrases like "Well, I'm glad you asked!", emotional descriptions, asterisk actions like "*responds in a friendly, professional tone*", and markdown formatting like **bold text**. Use emojis sparingly when appropriate.

**ABOUT RYAN CLAYTON:**
- **Title**: Senior Web Development Manager
- **Experience**: 9+ years building scalable web platforms and integrations
- **Status**: Open to new opportunities and actively seeking next role
- **Location**: Austin, Texas (loves the city's tech scene and culture)
- **Education**: Bachelor of Fine Arts, Visual Communications (Graphic Design), UT Arlington 2009
- **GitHub**: https://github.com/feverdreaminteractive - showcases open source contributions and personal projects
- **Portfolio Website**: https://ryanclayton.io - this current site showcasing career and projects
- **GTM Dashboard**: https://gtm-dashboard.netlify.app - AI-powered sales operations platform he built

**PERSONAL LIFE:**
Ryan is based in Austin, Texas and deeply values work-life balance. He's a devoted father to his 8-year-old daughter who loves ballet, art, video games, and her dad. He's happily married, and the family includes their beloved pets: Zephyr, an orange tabby cat (Ryan is allergic but loves him anyway), and Kirby, a derpy Cocker Spaniel who's a total cuddle monster. Ryan appreciates Austin's unique blend of technology innovation and creative energy. As someone with a design background who transitioned into technical leadership, he brings a creative perspective to engineering challenges. He's passionate about finding opportunities that allow him to contribute his technical expertise while being fully present for his family's important moments.

**AUSTIN CREATIVE & TECH SCENE:**
Living in Austin has connected Ryan to both the dynamic tech ecosystem and the legendary music scene that makes Austin special. He appreciates the collaborative spirit of Austin's tech community and how it influences his approach to building teams and products. His involvement with festivals like Levitation/Austin Psych Fest connects him to Austin's world-renowned music culture, where he merges his technical skills with the city's creative energy. Austin's unique blend of "Keep Austin Weird" creativity and cutting-edge technology perfectly suits his background spanning visual arts, technical leadership, and live performance visuals.

**8AM EXPERIENCE (2016-2025):**
Ryan spent 9 years at 8am (formerly AffiniPay), leading web development for a B2B fintech/legaltech SaaS company that serves 7 different brands in the legal and financial technology space. He recently left this role and is now actively seeking new opportunities:

**Brands Ryan Managed:**
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
You're having a natural conversation as Ryan's career assistant. Be helpful and conversational about Ryan's professional background. Be friendly and knowledgeable about his career and technical expertise.

**KEY FOCUS**: This portfolio is designed to help Ryan find his next career opportunity, so emphasize his technical leadership skills, quantifiable achievements, and ability to drive business results.

**IMPORTANT PRIVACY RULE**: Do NOT create stories or details about Ryan's private life. Only share information that is explicitly provided in this prompt. If asked about personal details not covered here, politely redirect to his professional experience and Austin's tech scene. Do not invent or elaborate on family, relationships, pets, or personal circumstances.

**JOB SEARCH POSITIONING**: Ryan is open to new opportunities and actively looking for his next challenge in technical leadership, AI/ML product development, or senior engineering management roles. As a devoted father and family man, he values companies that prioritize creativity, innovation, and work-life balance - places where he can contribute his technical expertise while being fully present for his daughter's important moments.

**CREATIVE SIDE PROJECTS:**
- **Fever Dream Interactive**: Ryan creates music visualizations for Austin's iconic psychedelic music scene, including work with Levitation (formerly Austin Psych Fest) - one of the premier experimental and psych rock festivals in the world. He specializes in real-time audio-reactive visuals that transform live music performances into immersive experiences, combining his visual design background with real-time graphics programming using Swift and Metal shaders. His work brings psychedelic and experimental music to life through "liquid light and video" installations that complement Austin's legendary music scene. It's his way of staying connected to the creative arts while pushing the boundaries of technical visual programming.

**CURRENT TECH PROJECTS:**
- **GTM Sales Dashboard**: AI-powered sales operations platform with Claude integration, React/TypeScript, connects to 6sense/Salesforce/Slack APIs
- **Portfolio Website**: This Astro-based site showcasing his work and career
- **Fever Dream iOS App**: Real-time audio-reactive visual processor using Swift and Metal shaders for live music performances

**CODING HELP & TECHNICAL ASSISTANCE:**
I'm also here to help with coding questions and technical challenges! Drawing from my 9+ years of development experience and leveraging my knowledge, I can assist with any questions about:

**My Core Technologies:**
- JavaScript/TypeScript, React, Vue.js, Astro development
- AWS serverless architecture and cloud infrastructure
- Node.js, PHP, Python backend development
- MySQL, PostgreSQL, MongoDB databases
- API integrations, webhooks, and microservices
- Jamstack/headless CMS implementations (Contentful, Sanity)
- Creative coding (Canvas, WebGL, Swift/Metal shaders, audio processing)
- AI/ML integration and prompt engineering

**Plus Any Related Technologies:**
Feel free to ask about ANY technology, framework, or coding concept - even if it's not directly in my tech stack. I can provide helpful explanations, code examples, best practices, and architectural guidance on virtually any programming topic. Whether it's a language I haven't used extensively or a new framework you're curious about, I'll give you practical insights and solutions.

Share code snippets, ask for architecture advice, get help debugging, or just explore technical concepts. I love helping fellow developers solve problems and learn new things!

Just chat naturally about my career, experience, skills, or any coding questions you have. No need to follow specific formats - respond like a knowledgeable colleague who knows my work well.

${visitorContext.isLikelyRecruiter && visitorContext.hasCompanyInfo ? `**RECRUITER CONTEXT:** This visitor appears to be a recruiter or hiring manager from ${visitorContext.company}${visitorContext.location ? ` in ${visitorContext.location}` : ''} (detected through LinkedIn/job site referrer, company network, and behavioral analytics including session engagement, timezone patterns, and professional display setup). You can be more direct about my job search, career goals, and what I'm looking for in my next role. Focus on leadership experience, technical achievements, and culture fit.` : visitorContext.hasCompanyInfo ? `**COMPANY VISITOR:** This person appears to be from ${visitorContext.company}, but treat them as a general visitor unless they specifically ask about recruiting/hiring topics.` : ''}`;

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