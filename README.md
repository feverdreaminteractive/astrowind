# Linkk - Astro Link in Bio Template

A minimal, customizable link-in-bio template built with Astro and Tailwind CSS. Perfect for creators and developers looking for a self-hosted Linktree alternative.

For a detailed list of changes and version history, please see the [CHANGELOG](CHANGELOG.md).

## ⚙️ Configuration

The theme can be customized through the `src/consts.ts` file.

### Configuration Options

- **Site Configuration**
  - `SITE_URL`: Your site's full URL (used for canonical links and SEO)
  - `SITE_TITLE`: The name of your site
  - `SITE_DESCRIPTION`: Default meta description for the site

- **Profile Configuration**
  - Edit `PROFILE_CONFIG` in `src/consts.ts` to customize your profile
  - Configuration includes:
    ```ts
    {
      name: 'Your Name',      // Your display name
      title: 'Your Title',    // Your job title or descriptor
      bio: 'Your bio text',   // Brief description about you
      avatar: authorImage,    // Profile image (import from assets)
    }
    ```

- **Social Links**
  - Edit `SOCIAL_LINKS` in `src/consts.ts` to customize your social links
  - Each link requires:
    ```ts
    {
      name: 'Platform Name',           // Name of the platform
      icon: 'simple-icons:platform',   // Icon from Iconify
      href: 'https://link-url.com',    // URL to your profile
    }
    ```
  - Available icons can be found at [Iconify](https://icon-sets.iconify.design/simple-icons/)

- **Newsletter Configuration**
  - Edit `NEWSLETTER_CONFIG` in `src/consts.ts` to customize the newsletter component
  - Configuration includes:
    ```ts
    {
      title: 'Subscribe title',         // Newsletter title
      description: 'Newsletter text',   // Description text
      buttonText: 'Button label',       // Button label
      placeholderText: 'Placeholder',   // Input placeholder
      successMessage: 'Success text',   // Success message
      errorMessage: 'Error text',       // Error message
    }
    ```

## 🎨 Customization

### Theme Colors

The theme uses a grayscale color palette by default. Customize colors in `src/styles/global.css`:

```css
@theme {
  /* Primary colors - Replace with your brand colors */
  --color-primary-50: oklch(0.984 0.003 247.858);  /* Lightest */
  --color-primary-100: oklch(0.968 0.007 247.896);
  --color-primary-200: oklch(0.929 0.013 255.508);
  /* ... */
  --color-primary-900: oklch(0.208 0.042 265.755); /* Darkest */
}
```

### Link Cards

Add or edit links using content collections in `src/content/links/`:

1. Create a new `.md` file in `src/content/links/`
2. Add frontmatter with the following properties:

```markdown
---
title: My Project
description: Check out my latest project
href: https://myproject.com
target: _blank
order: 1  # Controls the display order
---
```

The links will automatically appear based on the order specified in the frontmatter.

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── content/
│   │   └── links/        # Link card content
│   ├── components/       # UI components
│   ├── layouts/          # Page layouts
│   ├── pages/            # Routes
│   ├── styles/           # Global styles
│   └── consts.ts         # Site configuration
└── package.json
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 🛟 Support

Support is provided as described in the `LICENSE.md` file.

For further help on getting started with Astro, check out the official [Astro documentation](https://docs.astro.build).
