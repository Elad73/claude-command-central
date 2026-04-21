import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runInit } from '../src/cli/init.js';
import { loadRegistry } from '../src/config/registry.js';
import { CCC_MARKER, type ClaudeSettings } from '../src/hooks/template.js';

let configDir: string;
let projectDir: string;

beforeEach(async () => {
  configDir = await fs.mkdtemp(join(tmpdir(), 'ccc-init-config-'));
  projectDir = await fs.mkdtemp(join(tmpdir(), 'ccc-init-project-'));
  vi.stubEnv('CCC_CONFIG_DIR', configDir);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await fs.rm(configDir, { recursive: true, force: true });
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('runInit', () => {
  it('writes Claude Code hooks into .claude/settings.json', async () => {
    const result = await runInit({ projectDir, project: 'demo' });
    expect(result.wrote).toBe(true);
    expect(result.slug).toBe('demo');

    const settings = JSON.parse(
      await fs.readFile(result.settingsPath, 'utf8'),
    ) as ClaudeSettings;
    expect(settings.hooks?.SessionStart).toBeDefined();
    const cmd = settings.hooks?.SessionStart?.[0]?.hooks[0]?.command ?? '';
    expect(cmd).toContain(CCC_MARKER);
    expect(cmd).toContain('--project demo');
  });

  it('creates the feed file so watch can start before events land', async () => {
    const result = await runInit({ projectDir, project: 'x' });
    const stat = await fs.stat(result.feedPath);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBe(0);
  });

  it('registers the project in the global registry', async () => {
    await runInit({ projectDir, project: 'xyz' });
    const reg = await loadRegistry(join(configDir, 'projects.json'));
    expect(reg.projects['xyz']).toBeDefined();
    expect(reg.projects['xyz']?.path).toBe(projectDir);
  });

  it('re-running is idempotent (no duplicate CCC hooks)', async () => {
    await runInit({ projectDir, project: 'again' });
    await runInit({ projectDir, project: 'again' });
    const settings = JSON.parse(
      await fs.readFile(
        join(projectDir, '.claude', 'settings.json'),
        'utf8',
      ),
    ) as ClaudeSettings;
    const cccHooks = (settings.hooks?.SessionStart ?? [])
      .flatMap((g) => g.hooks)
      .filter((h) => h.command.includes(CCC_MARKER));
    expect(cccHooks).toHaveLength(1);
  });

  it('places the feed inside the project when --local is set', async () => {
    const result = await runInit({ projectDir, project: 'loc', local: true });
    expect(result.feedPath.startsWith(projectDir)).toBe(true);
    expect(result.feedPath).toContain('.claude/feeds');
  });

  it('preserves user-authored hooks when merging', async () => {
    const settingsPath = join(projectDir, '.claude', 'settings.json');
    await fs.mkdir(join(projectDir, '.claude'), { recursive: true });
    await fs.writeFile(
      settingsPath,
      JSON.stringify({
        hooks: {
          SessionStart: [
            { hooks: [{ type: 'command', command: 'echo user-owned' }] },
          ],
        },
      }),
    );
    await runInit({ projectDir, project: 'merge' });
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8')) as ClaudeSettings;
    const commands = (settings.hooks?.SessionStart ?? [])
      .flatMap((g) => g.hooks)
      .map((h) => h.command);
    expect(commands.some((c) => c.includes('user-owned'))).toBe(true);
    expect(commands.some((c) => c.includes(CCC_MARKER))).toBe(true);
  });

  it('dry-run returns the plan without writing anything', async () => {
    const result = await runInit({ projectDir, project: 'dry', dryRun: true });
    expect(result.wrote).toBe(false);
    await expect(
      fs.access(join(projectDir, '.claude', 'settings.json')),
    ).rejects.toThrow();
  });
});
