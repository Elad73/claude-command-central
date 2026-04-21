import { homedir } from 'os';
import { join } from 'path';

/**
 * Root directory for all CCC config + per-project feeds.
 * Can be overridden via the `CCC_CONFIG_DIR` env var — useful for tests and
 * for relocating the registry/feeds to a shared drive.
 */
export const configDir = (): string => {
  const override = process.env['CCC_CONFIG_DIR'];
  if (override && override.length > 0) return override;
  return join(homedir(), '.claude-command-central');
};

export const feedsDir = (): string => join(configDir(), 'feeds');

export const registryPath = (): string => join(configDir(), 'projects.json');

/** Default feed path for a given project slug. */
export const feedPathFor = (slug: string): string =>
  join(feedsDir(), `${slug}.jsonl`);

/** Slugify a directory name or arbitrary label into a stable, filesystem-safe id. */
export const slugify = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
