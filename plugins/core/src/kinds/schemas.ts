import { z } from "zod";

export const baseConfigSchema = z.object({
  name: z.string().optional(),
});

export const clockConfigSchema = baseConfigSchema.extend({
  period: z.enum(["turn", "day", "week", "month", "year"]).default("month"),
});

export const worldConfigSchema = baseConfigSchema.extend({
  name: z.string().default("World"),
});

export const actorConfigSchema = z.object({ name: z.string().min(1) });

export const resourceConfigSchema = baseConfigSchema.extend({
  name: z.string().default("Resource"),
  amount: z.number().default(0),
});

export const eventConfigSchema = baseConfigSchema.extend({
  name: z.string().default("Event"),
  description: z.string().default(""),
});

export const personalityConfigSchema = baseConfigSchema.extend({
  aggression: z.number().min(0).max(100).default(50),
  paranoia: z.number().min(0).max(100).default(50),
  cooperation: z.number().min(0).max(100).default(50),
  risk: z.number().min(0).max(100).default(50),
});

export const goalConfigSchema = baseConfigSchema.extend({
  statement: z.string().default("New goal"),
  priority: z.number().min(0).max(100).default(50),
});

export const memoryConfigSchema = baseConfigSchema.extend({
  seed: z.string().default(""),
});

export const agentConfigSchema = baseConfigSchema.extend({
  llmProvider: z
    .enum(["anthropic", "openai", "openrouter", "perplexity"])
    .optional(),
  llmModel: z.string().min(1).optional(),
});

export const perceptionConfigSchema = baseConfigSchema.extend({
  fog: z.number().min(0).max(100).default(50),
});

export const systemConfigSchema = baseConfigSchema.extend({
  mechanic: z.string().default("generic"),
});

export const relationshipConfigSchema = baseConfigSchema.extend({
  stance: z.number().min(0).max(100).default(50),
});

export const inspectorConfigSchema = baseConfigSchema.extend({
  title: z.string().default("Inspector"),
});

export const loggerConfigSchema = baseConfigSchema.extend({
  record: z.enum(["events", "actions", "both"]).default("both"),
});
