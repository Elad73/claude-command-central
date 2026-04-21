import { describe, it, expect } from 'vitest';
import {
  buildHooks,
  mergeHooks,
  HOOK_NAMES,
  CCC_MARKER,
  type ClaudeSettings,
} from '../src/hooks/template.js';

const options = {
  cccCommand: 'ccc',
  project: 'demo',
  feed: '/home/u/.ccc/feeds/demo.jsonl',
};

describe('buildHooks', () => {
  it('emits an entry for every supported Claude Code hook', () => {
    const hooks = buildHooks(options);
    for (const name of HOOK_NAMES) {
      expect(hooks[name]).toBeDefined();
      expect(hooks[name]?.[0]?.hooks).toHaveLength(1);
    }
  });

  it('embeds the CCC marker so hooks can be recognized later', () => {
    const hooks = buildHooks(options);
    const cmd = hooks.SessionStart?.[0]?.hooks[0]?.command ?? '';
    expect(cmd).toContain(CCC_MARKER);
    expect(cmd).toContain('--from-hook SessionStart');
    expect(cmd).toContain('--project demo');
  });

  it('shell-quotes paths that contain spaces', () => {
    const hooks = buildHooks({
      ...options,
      feed: '/tmp/path with spaces/feed.jsonl',
    });
    const cmd = hooks.SessionStart?.[0]?.hooks[0]?.command ?? '';
    expect(cmd).toContain(`'/tmp/path with spaces/feed.jsonl'`);
  });
});

describe('mergeHooks', () => {
  it('adds CCC hooks when settings.json is empty', () => {
    const merged = mergeHooks({}, buildHooks(options));
    expect(merged.hooks?.SessionStart).toBeDefined();
  });

  it('preserves user-authored hooks under the same event name', () => {
    const existing: ClaudeSettings = {
      hooks: {
        SessionStart: [
          {
            hooks: [{ type: 'command', command: 'echo user-owned' }],
          },
        ],
      },
    };
    const merged = mergeHooks(existing, buildHooks(options));
    const commands = (merged.hooks?.SessionStart ?? [])
      .flatMap((g) => g.hooks)
      .map((h) => h.command);
    expect(commands.some((c) => c.includes('user-owned'))).toBe(true);
    expect(commands.some((c) => c.includes(CCC_MARKER))).toBe(true);
  });

  it('is idempotent — re-running replaces CCC hooks instead of duplicating', () => {
    const first = mergeHooks({}, buildHooks(options));
    const second = mergeHooks(first, buildHooks(options));
    const cccCommandsInSecond = (second.hooks?.SessionStart ?? [])
      .flatMap((g) => g.hooks)
      .filter((h) => h.command.includes(CCC_MARKER));
    expect(cccCommandsInSecond).toHaveLength(1);
  });

  it('preserves unknown top-level settings keys', () => {
    const existing: ClaudeSettings = {
      hooks: {},
      permissions: { allow: ['npm *'] },
    };
    const merged = mergeHooks(existing, buildHooks(options));
    expect(merged['permissions']).toEqual({ allow: ['npm *'] });
  });
});
