import { z } from 'zod';
import type { DashboardEvent } from './types.js';

const baseEvent = z.object({
  v: z.number().optional(),
  ts: z.string().optional(),
  project: z.string().optional(),
  message: z.string().optional(),
});

export const flowEventSchema = baseEvent.extend({
  type: z.literal('flow'),
  title: z.string().optional(),
  objective: z.string().optional(),
  status: z.string().optional(),
  progress: z.number().optional(),
});

export const agentEventSchema = baseEvent.extend({
  type: z.literal('agent'),
  agent: z.string().min(1),
  phase: z.string().optional(),
  status: z.string().optional(),
  task: z.string().optional(),
});

export const logEventSchema = baseEvent.extend({
  type: z.literal('log'),
  message: z.string().min(1),
});

export const eventSchema = z.discriminatedUnion('type', [
  flowEventSchema,
  agentEventSchema,
  logEventSchema,
]);

export function parseEvent(raw: unknown): DashboardEvent | null {
  const result = eventSchema.safeParse(raw);
  return result.success ? (result.data as DashboardEvent) : null;
}

export function parseEventLine(line: string): DashboardEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  return parseEvent(parsed);
}
