import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const trips = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/trips' }),
  schema: ({ image }) =>
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('trip'),
        title: z.string(),
        description: z.string(),
        date: z.coerce.date(),
        dateLabel: z.string().optional(),
        location: z.string(),
        images: z
          .array(z.object({ src: image(), alt: z.string(), caption: z.string().optional() }))
          .min(1),
        draft: z.boolean().default(false),
      }),
      z.object({
        type: z.literal('index'),
        intro: z.object({
          eyebrow: z.string(),
          titleLine1: z.string(),
          titleLine2: z.string().optional(),
          description: z.string(),
        }),
      }),
    ]),
});

const creative = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/creative' }),
  schema: ({ image }) =>
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('events'),
        title: z.string(),
        eyebrow: z.string(),
        description: z.string(),
        images: z
          .array(z.object({ src: image(), alt: z.string(), caption: z.string().optional() }))
          .min(1),
      }),
      z.object({
        type: z.literal('blender'),
        title: z.string(),
        eyebrow: z.string(),
        description: z.string(),
        projects: z
          .array(
            z.object({
              title: z.string(),
              category: z.string(),
              description: z.string(),
              image: image(),
              alt: z.string(),
              blendFile: z.string(),
              size: z.string(),
              tools: z.array(z.string()),
              downloadUrl: z.string(),
            }),
          )
          .min(1),
      }),
      z.object({
        type: z.literal('python'),
        title: z.string(),
        eyebrow: z.string(),
        description: z.string(),
        pieces: z
          .array(
            z.object({
              title: z.string(),
              subtitle: z.string().optional(),
              category: z.string(),
              description: z.string(),
              image: image(),
              alt: z.string(),
              filename: z.string(),
              tags: z.array(z.string()),
            }),
          )
          .min(1),
      }),
      z.object({
        type: z.literal('index'),
        intro: z.object({
          eyebrow: z.string(),
          titleLine1: z.string(),
          titleLine2: z.string(),
          description: z.string(),
        }),
        collections: z.array(
          z.object({
            id: z.string(),
            tag: z.string(),
            noun: z.string().optional(),
          }),
        ),
        spotlight: z.object({
          eyebrow: z.string(),
          title: z.string(),
          description: z.string(),
          image: image(),
          alt: z.string().default(''),
        }),
      }),
    ]),
});

export const collections = { trips, creative };
