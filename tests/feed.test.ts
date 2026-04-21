import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { FeedReader } from '../src/events/feed.js';

let dir: string;
let path: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), 'ccc-feed-'));
  path = join(dir, 'feed.jsonl');
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const append = (line: string) => fs.appendFile(path, line + '\n');

describe('FeedReader', () => {
  it('returns empty for a missing feed file', async () => {
    const reader = new FeedReader(path, { project: 'p' });
    await expect(reader.poll()).resolves.toEqual([]);
  });

  it('reads appended events', async () => {
    const reader = new FeedReader(path, { project: 'p' });
    await append('{"type":"flow","progress":25}');
    await append('{"type":"log","message":"hi"}');
    const events = await reader.poll();
    expect(events).toHaveLength(2);
    expect(events[0]?.type).toBe('flow');
    expect(events[1]?.type).toBe('log');
  });

  it('does not re-read previously-consumed lines', async () => {
    const reader = new FeedReader(path, { project: 'p' });
    await append('{"type":"log","message":"a"}');
    await reader.poll();
    await append('{"type":"log","message":"b"}');
    const second = await reader.poll();
    expect(second).toHaveLength(1);
    expect(second[0]?.type).toBe('log');
    if (second[0]?.type === 'log') expect(second[0].message).toBe('b');
  });

  it('skips malformed JSON lines', async () => {
    const reader = new FeedReader(path, { project: 'p' });
    await fs.writeFile(path, 'not json\n{"type":"log","message":"ok"}\n{broken\n');
    const events = await reader.poll();
    expect(events).toHaveLength(1);
  });

  it('buffers partial trailing lines until a newline arrives', async () => {
    const reader = new FeedReader(path, { project: 'p' });
    await fs.writeFile(path, '{"type":"log","mess');
    const first = await reader.poll();
    expect(first).toEqual([]);
    await fs.appendFile(path, 'age":"done"}\n');
    const second = await reader.poll();
    expect(second).toHaveLength(1);
  });

  it('handles unlink + recreate by detecting content replacement', async () => {
    const reader = new FeedReader(path, { project: 'p' });
    await append('{"type":"log","message":"old"}');
    await reader.poll();
    await fs.unlink(path);
    await fs.writeFile(path, '{"type":"log","message":"fresh"}\n');
    const events = await reader.poll();
    expect(events).toHaveLength(1);
    if (events[0]?.type === 'log') expect(events[0].message).toBe('fresh');
  });

  it('handles in-place shrink (file truncated to shorter content)', async () => {
    const reader = new FeedReader(path, { project: 'p' });
    await append('{"type":"log","message":"a long message"}');
    await append('{"type":"log","message":"another long one"}');
    await reader.poll();
    await fs.writeFile(path, '{"type":"log","message":"short"}\n');
    const events = await reader.poll();
    expect(events).toHaveLength(1);
    if (events[0]?.type === 'log') expect(events[0].message).toBe('short');
  });

  it('stamps project field when event has none', async () => {
    const reader = new FeedReader(path, { project: 'alpha' });
    await append('{"type":"log","message":"hi"}');
    const [event] = await reader.poll();
    expect(event?.project).toBe('alpha');
  });

  it('preserves project field when event sets it explicitly', async () => {
    const reader = new FeedReader(path, { project: 'alpha' });
    await append('{"type":"log","message":"hi","project":"bravo"}');
    const [event] = await reader.poll();
    expect(event?.project).toBe('bravo');
  });

  it('handles empty lines without crashing', async () => {
    const reader = new FeedReader(path, { project: 'p' });
    await fs.writeFile(path, '\n\n{"type":"log","message":"x"}\n\n');
    const events = await reader.poll();
    expect(events).toHaveLength(1);
  });
});
