import { z } from "zod";

export const baseConfigSchema = z.object({
  name: z.string().optional(),
});

export const clockConfigSchema = baseConfigSchema.extend({
  period: z.string().default("month"),
});

export const personalityConfigSchema = baseConfigSchema.extend({
  aggression: z.number().min(0).max(100).default(50),
  paranoia: z.number().min(0).max(100).default(50),
  cooperation: z.number().min(0).max(100).default(50),
  risk: z.number().min(0).max(100).default(50),
});

export const agentConfigSchema = baseConfigSchema.extend({
  llmProvider: z
    .enum(["anthropic", "openai", "openrouter", "perplexity"])
    .optional(),
  llmModel: z.string().min(1).optional(),
});

export const systemConfigSchema = baseConfigSchema.extend({
  mechanic: z.string().default("generic"),
});

export const actorConfigSchema = baseConfigSchema.extend({
  name: z.string(),
});
