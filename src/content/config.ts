import { defineCollection, z } from 'astro:content';

const links = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		href: z.string(),
		target: z.string().optional().default('_self'),
		order: z.number(),
	}),
});

export const collections = {
	links,
};