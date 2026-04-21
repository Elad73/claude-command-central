import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadRegistry,
  saveRegistry,
  upsertProject,
  removeProject,
} from '../src/config/registry.js';

let dir: string;
let path: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), 'ccc-registry-'));
  path = join(dir, 'projects.json');
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe('registry', () => {
  it('loads an empty registry when file does not exist', async () => {
    const reg = await loadRegistry(path);
    expect(reg.version).toBe(1);
    expect(reg.projects).toEqual({});
  });

  it('round-trips save and load', async () => {
    await saveRegistry(
      {
        version: 1,
        projects: {
          alpha: {
            slug: 'alpha',
            path: '/tmp/alpha',
            feed: '/tmp/alpha.jsonl',
            createdAt: '2026-04-19T00:00:00Z',
          },
        },
      },
      path,
    );
    const reg = await loadRegistry(path);
    expect(reg.projects['alpha']?.slug).toBe('alpha');
  });

  it('upserts and removes projects', async () => {
    await upsertProject(
      {
        slug: 'a',
        path: '/tmp/a',
        feed: '/tmp/a.jsonl',
        createdAt: '2026-04-19T00:00:00Z',
      },
      path,
    );
    await upsertProject(
      {
        slug: 'b',
        path: '/tmp/b',
        feed: '/tmp/b.jsonl',
        createdAt: '2026-04-19T00:00:00Z',
      },
      path,
    );
    const afterInsert = await loadRegistry(path);
    expect(Object.keys(afterInsert.projects).sort()).toEqual(['a', 'b']);

    await removeProject('a', path);
    const afterRemove = await loadRegistry(path);
    expect(Object.keys(afterRemove.projects)).toEqual(['b']);
  });

  it('gracefully handles corrupt JSON', async () => {
    await fs.writeFile(path, '{broken json');
    await expect(loadRegistry(path)).rejects.toThrow();
  });
});
