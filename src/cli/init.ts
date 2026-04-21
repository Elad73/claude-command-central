import type { Command } from 'commander';
import { promises as fs } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { configDir, feedPathFor, feedsDir, slugify } from '../config/paths.js';
import { upsertProject } from '../config/registry.js';
import { buildHooks, mergeHooks, type ClaudeSettings } from '../hooks/template.js';

const readJson = async <T>(path: string, fallback: T): Promise<T> => {
  try {
    const data = await fs.readFile(path, 'utf8');
    return JSON.parse(data) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw err;
  }
};

const writeJson = async (path: string, content: unknown): Promise<void> => {
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, JSON.stringify(content, null, 2) + '\n', 'utf8');
};

export interface InitOptions {
  project?: string;
  local?: boolean;
  cccCommand?: string;
  projectDir?: string;
  dryRun?: boolean;
}

export interface InitResult {
  slug: string;
  projectDir: string;
  feedPath: string;
  settingsPath: string;
  registryPath: string;
  wrote: boolean;
}

export async function runInit(options: InitOptions = {}): Promise<InitResult> {
  const projectDir = resolve(options.projectDir ?? process.cwd());
  const slug = slugify(options.project ?? basename(projectDir));

  const feedPath = options.local
    ? join(projectDir, '.claude', 'feeds', `${slug}.jsonl`)
    : feedPathFor(slug);

  const settingsPath = join(projectDir, '.claude', 'settings.json');
  const cccCommand = options.cccCommand ?? 'ccc';

  const hooks = buildHooks({ cccCommand, project: slug, feed: feedPath });
  const existing = await readJson<ClaudeSettings>(settingsPath, {});
  const merged = mergeHooks(existing, hooks);

  if (options.dryRun) {
    return {
      slug,
      projectDir,
      feedPath,
      settingsPath,
      registryPath: join(configDir(), 'projects.json'),
      wrote: false,
    };
  }

  // Ensure directories exist
  await fs.mkdir(dirname(settingsPath), { recursive: true });
  await fs.mkdir(dirname(feedPath), { recursive: true });
  if (!options.local) await fs.mkdir(feedsDir(), { recursive: true });

  // Touch the feed file if missing (so `ccc watch` can start before any events land)
  try {
    await fs.access(feedPath);
  } catch {
    await fs.writeFile(feedPath, '', 'utf8');
  }

  await writeJson(settingsPath, merged);

  const registry = await upsertProject({
    slug,
    path: projectDir,
    feed: feedPath,
    createdAt: new Date().toISOString(),
  });

  return {
    slug,
    projectDir,
    feedPath,
    settingsPath,
    registryPath: join(configDir(), 'projects.json'),
    wrote: true,
  };
}

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Wire this project to the dashboard via Claude Code hooks.')
    .option('--project <slug>', 'Override the project slug (default: directory name).')
    .option('--local', 'Keep the feed inside this project (.claude/feeds/).', false)
    .option('--ccc-command <cmd>', 'Command to invoke CCC from hooks (default: "ccc").')
    .option('--dry-run', 'Print what would be written without modifying anything.', false)
    .action(async (options: InitOptions) => {
      try {
        const result = await runInit(options);
        const label = result.wrote ? 'wrote' : 'would write';
        console.log(`Project slug:   ${result.slug}`);
        console.log(`Project dir:    ${result.projectDir}`);
        console.log(`Feed path:      ${result.feedPath}`);
        console.log(`Settings:       ${result.settingsPath}`);
        console.log(`Registry:       ${result.registryPath}`);
        console.log('');
        console.log(`${result.wrote ? 'Installed' : 'Would install'} hooks into ${result.settingsPath}.`);
        if (result.wrote) {
          console.log('');
          console.log(`Next: run \`ccc watch --feed ${result.feedPath}\` in another pane.`);
        }
        void label;
      } catch (err) {
        console.error(`ccc init: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
