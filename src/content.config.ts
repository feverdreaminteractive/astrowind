import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const links = defineCollection({
  // Load Markdown files in the `src/content/links/` directory
  loader: glob({ base: './src/content/links', pattern: '**/*.md' }),
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string(),
    href: z.string(),
    target: z.enum(['_blank', '_self']).default('_blank'),
    order: z.number().default(0),
  }),
});

export const collections = { links };
