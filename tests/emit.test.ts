import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildEventFromFlags, writeEvent } from '../src/cli/emit.js';
import { parseEventLine } from '../src/events/schema.js';

let dir: string;
let path: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), 'ccc-emit-'));
  path = join(dir, 'feed.jsonl');
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe('buildEventFromFlags', () => {
  it('builds a flow event with a timestamp', () => {
    const e = buildEventFromFlags({ type: 'flow', progress: '40' });
    expect(e.type).toBe('flow');
    if (e.type === 'flow') expect(e.progress).toBe(40);
    expect(e.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(e.v).toBe(1);
  });

  it('builds an agent event and uppercases phase', () => {
    const e = buildEventFromFlags({
      type: 'agent',
      agent: 'planner',
      phase: 'plan',
    });
    expect(e.type).toBe('agent');
    if (e.type === 'agent') {
      expect(e.agent).toBe('planner');
      expect(e.phase).toBe('PLAN');
    }
  });

  it('builds a log event', () => {
    const e = buildEventFromFlags({ type: 'log', message: 'hi' });
    expect(e.type).toBe('log');
    if (e.type === 'log') expect(e.message).toBe('hi');
  });

  it('stamps project when provided', () => {
    const e = buildEventFromFlags({ type: 'log', message: 'x', project: 'demo' });
    expect(e.project).toBe('demo');
  });

  it('throws if agent event is missing --agent', () => {
    expect(() => buildEventFromFlags({ type: 'agent' })).toThrow();
  });

  it('throws if log event is missing --message', () => {
    expect(() => buildEventFromFlags({ type: 'log' })).toThrow();
  });

  it('throws when type is missing', () => {
    expect(() => buildEventFromFlags({})).toThrow();
  });
});

describe('writeEvent', () => {
  it('appends a line that round-trips through the parser', async () => {
    const event = buildEventFromFlags({ type: 'log', message: 'round trip' });
    await writeEvent(path, event);
    const content = await fs.readFile(path, 'utf8');
    const parsed = parseEventLine(content.trim());
    expect(parsed?.type).toBe('log');
  });

  it('creates missing parent directories', async () => {
    const nested = join(dir, 'a', 'b', 'c', 'feed.jsonl');
    await writeEvent(nested, buildEventFromFlags({ type: 'log', message: 'x' }));
    const stat = await fs.stat(nested);
    expect(stat.isFile()).toBe(true);
  });

  it('appends without overwriting', async () => {
    await writeEvent(path, buildEventFromFlags({ type: 'log', message: 'a' }));
    await writeEvent(path, buildEventFromFlags({ type: 'log', message: 'b' }));
    const content = await fs.readFile(path, 'utf8');
    expect(content.split('\n').filter(Boolean)).toHaveLength(2);
  });
});
