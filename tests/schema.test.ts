import { describe, it, expect } from 'vitest';
import { parseEvent, parseEventLine } from '../src/events/schema.js';

describe('parseEvent', () => {
  it('accepts a valid flow event', () => {
    const e = parseEvent({ type: 'flow', title: 'X', progress: 10 });
    expect(e).not.toBeNull();
    expect(e?.type).toBe('flow');
  });

  it('accepts a valid agent event', () => {
    const e = parseEvent({ type: 'agent', agent: 'planner', phase: 'PLAN' });
    expect(e).not.toBeNull();
    expect(e?.type).toBe('agent');
  });

  it('accepts a valid log event', () => {
    const e = parseEvent({ type: 'log', message: 'hi' });
    expect(e).not.toBeNull();
    expect(e?.type).toBe('log');
  });

  it('rejects unknown type', () => {
    expect(parseEvent({ type: 'wat' })).toBeNull();
  });

  it('rejects agent event without agent name', () => {
    expect(parseEvent({ type: 'agent' })).toBeNull();
  });

  it('rejects log event without message', () => {
    expect(parseEvent({ type: 'log' })).toBeNull();
  });

  it('rejects non-object input', () => {
    expect(parseEvent('oops')).toBeNull();
    expect(parseEvent(null)).toBeNull();
    expect(parseEvent(42)).toBeNull();
  });

  it('preserves optional metadata (v, ts, project)', () => {
    const e = parseEvent({
      type: 'flow',
      v: 1,
      ts: '2026-04-19T12:00:00Z',
      project: 'demo',
    });
    expect(e).not.toBeNull();
    if (e?.type === 'flow') {
      expect(e.v).toBe(1);
      expect(e.ts).toBe('2026-04-19T12:00:00Z');
      expect(e.project).toBe('demo');
    }
  });
});

describe('parseEventLine', () => {
  it('parses a single JSONL line', () => {
    const e = parseEventLine('{"type":"flow","progress":5}');
    expect(e?.type).toBe('flow');
  });

  it('returns null on malformed JSON', () => {
    expect(parseEventLine('not json')).toBeNull();
    expect(parseEventLine('{broken')).toBeNull();
  });

  it('returns null on empty / whitespace-only lines', () => {
    expect(parseEventLine('')).toBeNull();
    expect(parseEventLine('   ')).toBeNull();
  });

  it('returns null on valid JSON that is not a valid event', () => {
    expect(parseEventLine('{"foo":"bar"}')).toBeNull();
  });
});
