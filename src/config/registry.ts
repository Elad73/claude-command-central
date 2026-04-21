import { promises as fs } from 'fs';
import { dirname } from 'path';
import { registryPath } from './paths.js';

export interface ProjectEntry {
  slug: string;
  path: string;
  feed: string;
  createdAt: string;
}

export interface Registry {
  version: 1;
  projects: Record<string, ProjectEntry>;
}

const empty = (): Registry => ({ version: 1, projects: {} });

export async function loadRegistry(path: string = registryPath()): Promise<Registry> {
  try {
    const data = await fs.readFile(path, 'utf8');
    const parsed = JSON.parse(data) as Partial<Registry>;
    if (!parsed || typeof parsed !== 'object') return empty();
    return {
      version: 1,
      projects: parsed.projects ?? {},
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return empty();
    throw err;
  }
}

export async function saveRegistry(
  registry: Registry,
  path: string = registryPath(),
): Promise<void> {
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, JSON.stringify(registry, null, 2) + '\n', 'utf8');
}

export async function upsertProject(
  entry: ProjectEntry,
  path: string = registryPath(),
): Promise<Registry> {
  const registry = await loadRegistry(path);
  registry.projects[entry.slug] = entry;
  await saveRegistry(registry, path);
  return registry;
}

export async function removeProject(
  slug: string,
  path: string = registryPath(),
): Promise<Registry> {
  const registry = await loadRegistry(path);
  delete registry.projects[slug];
  await saveRegistry(registry, path);
  return registry;
}
