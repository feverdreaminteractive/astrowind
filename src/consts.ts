// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

// Site Configuration
// These values are used throughout the site to provide consistent branding and descriptions.
import authorImage from './assets/profile.avif'; // Replace this file with your headshot

export const SITE_URL = 'https://feverdream.dev';
export const SITE_TITLE = 'Ryan Clayton | Senior Web Development Manager & AI Specialist';
export const SITE_DESCRIPTION =
  'Portfolio of Ryan Clayton - Senior Web Development Manager with 9+ years building scalable platforms, AI automation, and enterprise integrations. Leading technical innovation in fintech/legaltech.';

// Profile Configuration
export const PROFILE_CONFIG = {
  name: 'Ryan Clayton',
  title: 'Senior Web Development Manager & AI Specialist',
  bio: 'Web Development Manager with 9+ years building scalable platforms and AI-powered integrations. Led enterprise rebrand across 7 web properties with zero downtime. Expert in modern Jamstack, conversational AI, and marketing automation.',
  avatar: authorImage,
};

// Social Links Configuration
export const SOCIAL_LINKS = [
  {
    name: 'GitHub',
    icon: 'simple-icons:github',
    href: 'https://github.com/feverdreaminteractive',
  },
  {
    name: 'LinkedIn',
    icon: 'simple-icons:linkedin',
    href: 'https://linkedin.com/in/ryan-clayton-atx',
  },
  {
    name: 'Twitter',
    icon: 'simple-icons:x',
    href: '#',
  },
  {
    name: 'Discord',
    icon: 'simple-icons:discord',
    href: '#',
  },
  {
    name: 'Email',
    icon: 'simple-icons:gmail',
    href: 'mailto:ryanclayton78@gmail.com',
  },
] as const;

// Skills Configuration
export const SKILLS_CONFIG = {
  webDevelopment: [
    'JavaScript/ES6+',
    'TypeScript',
    'Vue.js (Nuxt, Gridsome)',
    'React (Gatsby)',
    'Astro',
    'Node.js',
    'HTML5/CSS3',
    'Tailwind'
  ],
  aiAndAutomation: [
    'Claude AI Integration',
    'Conversational AI',
    'AI Agent Orchestration',
    'Natural Language Processing',
    'Content Generation',
    'Marketing Automation'
  ],
  infrastructure: [
    'AWS (Lambda, CloudFront, S3, Route53)',
    'Netlify',
    'CircleCI',
    'GitHub',
    'CI/CD Pipelines',
    'SSL/TLS',
    'DataDog'
  ],
  cms: [
    'Contentful',
    'WordPress',
    'HubSpot',
    'Webflow',
    'Turborepo',
    'Design Systems',
    'Feature Flags'
  ],
  analytics: [
    'Google Tag Manager',
    'GA4',
    'Server-side Tagging',
    'Core Web Vitals',
    'SEMrush',
    'Ahrefs',
    'Screaming Frog'
  ],
  marketingTech: [
    'Marketo',
    'HubSpot',
    'Salesforce',
    '6sense',
    'Optimizely',
    'VWO',
    'Lead Routing',
    'Lifecycle Automation'
  ]
} as const;

// Newsletter Configuration
export const NEWSLETTER_CONFIG = {
  title: 'Stay Updated',
  description: 'Get notified about new projects and tech insights.',
  buttonText: 'Subscribe',
  placeholderText: 'Enter your email',
  successMessage: 'Thanks for subscribing!',
  errorMessage: 'Something went wrong. Please try again.',
};
