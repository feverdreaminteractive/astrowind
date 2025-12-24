// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

// Site Configuration
// These values are used throughout the site to provide consistent branding and descriptions.
import authorImage from './assets/profile.avif';

export const SITE_URL = 'https://feverdream.dev';
export const SITE_TITLE = 'feverdream | Full Stack Developer & AI Specialist';
export const SITE_DESCRIPTION =
  'Portfolio of feverdream - Full Stack Developer specializing in AI automation, web technologies, and innovative solutions. Building the future with code.';

// Profile Configuration
export const PROFILE_CONFIG = {
  name: 'feverdream',
  title: 'Full Stack Developer & AI Specialist',
  bio: 'Building innovative web applications with AI integration, automation tools, and modern technologies. Passionate about creating solutions that matter.',
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
    href: '#',
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
    href: 'mailto:hello@feverdream.dev',
  },
] as const;

// Newsletter Configuration
export const NEWSLETTER_CONFIG = {
  title: 'Stay Updated',
  description: 'Get notified about new projects and tech insights.',
  buttonText: 'Subscribe',
  placeholderText: 'Enter your email',
  successMessage: 'Thanks for subscribing!',
  errorMessage: 'Something went wrong. Please try again.',
};
