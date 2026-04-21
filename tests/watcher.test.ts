import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { MultiFeedWatcher } from '../src/events/watcher.js';
import type { DashboardEvent } from '../src/events/types.js';

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), 'ccc-watcher-'));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const feed = (name: string) => join(dir, `${name}.jsonl`);
const append = (path: string, line: string) => fs.appendFile(path, line + '\n');

describe('MultiFeedWatcher', () => {
  it('dispatches events from multiple feeds', async () => {
    const a = feed('a');
    const b = feed('b');
    const watcher = new MultiFeedWatcher([
      { path: a, project: 'a' },
      { path: b, project: 'b' },
    ]);
    const received: DashboardEvent[] = [];
    watcher.onEvent((e) => received.push(e));

    await append(a, '{"type":"log","message":"from-a"}');
    await append(b, '{"type":"log","message":"from-b"}');
    await watcher.tick();

    expect(received).toHaveLength(2);
    expect(received.map((e) => e.project).sort()).toEqual(['a', 'b']);
  });

  it('does not dispatch events twice across ticks', async () => {
    const path = feed('p');
    const watcher = new MultiFeedWatcher([{ path, project: 'p' }]);
    const received: DashboardEvent[] = [];
    watcher.onEvent((e) => received.push(e));

    await append(path, '{"type":"log","message":"once"}');
    await watcher.tick();
    await watcher.tick();

    expect(received).toHaveLength(1);
  });

  it('supports unsubscribe', async () => {
    const path = feed('p');
    const watcher = new MultiFeedWatcher([{ path, project: 'p' }]);
    const received: DashboardEvent[] = [];
    const unsub = watcher.onEvent((e) => received.push(e));

    await append(path, '{"type":"log","message":"a"}');
    await watcher.tick();
    unsub();
    await append(path, '{"type":"log","message":"b"}');
    await watcher.tick();

    expect(received).toHaveLength(1);
  });

  it('can add sources at runtime', async () => {
    const watcher = new MultiFeedWatcher();
    const received: DashboardEvent[] = [];
    watcher.onEvent((e) => received.push(e));

    const path = feed('late');
    await append(path, '{"type":"log","message":"late-joiner"}');
    watcher.addSource({ path, project: 'late' });
    await watcher.tick();

    expect(received).toHaveLength(1);
    expect(received[0]?.project).toBe('late');
  });

  it('can remove sources at runtime', async () => {
    const path = feed('p');
    const watcher = new MultiFeedWatcher([{ path, project: 'p' }]);
    const received: DashboardEvent[] = [];
    watcher.onEvent((e) => received.push(e));

    await append(path, '{"type":"log","message":"before"}');
    await watcher.tick();
    watcher.removeSource('p');
    await append(path, '{"type":"log","message":"after"}');
    await watcher.tick();

    expect(received).toHaveLength(1);
  });

  it('ignores missing feed files gracefully', async () => {
    const watcher = new MultiFeedWatcher([
      { path: feed('ghost'), project: 'ghost' },
    ]);
    const errors: unknown[] = [];
    watcher.onError((err) => errors.push(err));

    await expect(watcher.tick()).resolves.toBeUndefined();
    expect(errors).toHaveLength(0);
  });

  it('start/stop is idempotent and dispatches on start', async () => {
    const path = feed('s');
    const watcher = new MultiFeedWatcher([{ path, project: 's' }], { pollMs: 50 });
    const received: DashboardEvent[] = [];
    watcher.onEvent((e) => received.push(e));

    await append(path, '{"type":"log","message":"boot"}');
    await watcher.start();
    expect(received).toHaveLength(1);
    await watcher.start(); // no-op
    watcher.stop();
    watcher.stop(); // no-op
  });
});
