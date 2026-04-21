import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { App } from '../src/app/index.js';
import { MultiFeedWatcher } from '../src/events/watcher.js';

const waitFor = async (check: () => boolean, timeoutMs = 1000): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('waitFor timed out');
};

describe('App', () => {
  it('renders a baseline dashboard without events', () => {
    const watcher = new MultiFeedWatcher();
    const { lastFrame, unmount } = render(React.createElement(App, { watcher }));
    try {
      const frame = lastFrame() ?? '';
      expect(frame).toContain('Claude Code Mission Control');
      expect(frame).toContain('PROMPT');
      expect(frame).toContain('DEPLOY');
      expect(frame).toContain('Agent Roster');
      expect(frame).toContain('Live Feed');
    } finally {
      unmount();
    }
  });

  it('renders all six room labels', () => {
    const watcher = new MultiFeedWatcher();
    const { lastFrame, unmount } = render(React.createElement(App, { watcher }));
    try {
      const frame = lastFrame() ?? '';
      for (const room of ['INTAKE', 'STRATEGY', 'BUILD BAY', 'REVIEW', 'QA LAB', 'DEPLOY']) {
        expect(frame).toContain(room);
      }
    } finally {
      unmount();
    }
  });
});

describe('App + watcher integration', () => {
  let dir: string;
  let path: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(join(tmpdir(), 'ccc-app-'));
    path = join(dir, 'feed.jsonl');
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('reflects flow events written to the feed', async () => {
    await fs.writeFile(
      path,
      '{"type":"flow","title":"Ship It","objective":"Test the renderer","progress":42}\n',
    );
    const watcher = new MultiFeedWatcher([{ path, project: 'p' }], { pollMs: 40 });
    const { lastFrame, unmount } = render(React.createElement(App, { watcher }));
    try {
      await waitFor(() => (lastFrame() ?? '').includes('Ship It'));
      const frame = lastFrame() ?? '';
      expect(frame).toContain('Ship It');
      expect(frame).toContain('Test the renderer');
      expect(frame).toContain('42%');
    } finally {
      unmount();
    }
  });

  it('places an agent into the right room after an agent event', async () => {
    await fs.writeFile(
      path,
      '{"type":"agent","agent":"builder-1","phase":"BUILD","status":"active","task":"writing code"}\n',
    );
    const watcher = new MultiFeedWatcher([{ path, project: 'p' }], { pollMs: 40 });
    const { lastFrame, unmount } = render(React.createElement(App, { watcher }));
    try {
      await waitFor(() => (lastFrame() ?? '').includes('builder-1'));
      const frame = lastFrame() ?? '';
      expect(frame).toContain('builder-1');
      expect(frame).toContain('BUILD BAY');
    } finally {
      unmount();
    }
  });

  it('streams log events into the live feed', async () => {
    await fs.writeFile(path, '{"type":"log","message":"hello from the feed"}\n');
    const watcher = new MultiFeedWatcher([{ path, project: 'p' }], { pollMs: 40 });
    const { lastFrame, unmount } = render(React.createElement(App, { watcher }));
    try {
      await waitFor(() => (lastFrame() ?? '').includes('hello from the feed'));
      expect(lastFrame() ?? '').toContain('hello from the feed');
    } finally {
      unmount();
    }
  });
});
