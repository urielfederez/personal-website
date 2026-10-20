import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection, reference } from "astro:content";

const projects = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/projects",
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      shortDescription: z.string(),
      status: z.enum(["in-progress", "completed", "paused"]),
      technologies: z.array(z.string()),
      startedDate: z.coerce.date(),
      repository: z.string().url().optional(),
      showcase: image(),
      links: z
        .array(z.object({ title: z.string(), url: z.string() }))
        .default([]),
    }),
});

const articles = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/articles",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    project: reference("projects").optional(),
  }),
});

export const collections = { projects, articles };
