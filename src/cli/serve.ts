import type { Command } from 'commander';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadRegistry } from '../config/registry.js';
import { slugify } from '../config/paths.js';
import type { FeedSource } from '../events/watcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function registerServe(program: Command): void {
  program
    .command('serve')
    .description('Start the web mission control (localhost) and stream events from registered projects.')
    .option('--port <n>', 'Port to listen on.', '7777')
    .option('--host <addr>', 'Interface to bind.', '127.0.0.1')
    .option('--feed <path...>', 'Explicit feed path(s). When omitted, all registered projects are used.')
    .option('--project <slug>', 'Project label for a single --feed path.')
    .action(
      async (options: {
        port: string;
        host: string;
        feed?: string[];
        project?: string;
      }) => {
        const port = Number(options.port);
        if (!Number.isInteger(port) || port <= 0 || port > 65535) {
          console.error(`ccc serve: invalid --port ${options.port}`);
          process.exit(1);
        }

        const sources: FeedSource[] = [];
        const useRegistry = !options.feed || options.feed.length === 0;
        if (!useRegistry) {
          for (const path of options.feed!) {
            const slug =
              options.feed!.length === 1 && options.project
                ? options.project
                : slugify(path.replace(/\.jsonl$/, ''));
            sources.push({ path: resolve(path), project: slug });
          }
        } else {
          const registry = await loadRegistry();
          for (const entry of Object.values(registry.projects)) {
            sources.push({ path: entry.feed, project: entry.slug });
          }
          if (sources.length === 0) {
            console.error('ccc serve: no projects registered and no --feed given.');
            console.error('  run `ccc init` in a project first, or pass --feed explicitly.');
            process.exit(1);
          }
        }

        const { createServer } = await import('../server/serve.js');
        const webRoot = join(__dirname, 'web');
        const server = await createServer({
          port,
          host: options.host,
          sources,
          webRoot,
          autoReload: useRegistry,
        });

        const url = await server.start();
        console.log(`\n  CCC mission control → ${url}`);
        console.log(`  watching ${sources.length} feed${sources.length === 1 ? '' : 's'}:`);
        for (const s of sources) console.log(`    • ${s.project}  ${s.path}`);
        if (useRegistry) {
          console.log('  hot-reload: ON — new `ccc init`s auto-attach within 5s');
        }
        console.log('\n  Ctrl-C to stop.\n');

        const shutdown = async () => {
          console.log('\n  shutting down…');
          await server.stop();
          process.exit(0);
        };
        process.on('SIGINT', () => void shutdown());
        process.on('SIGTERM', () => void shutdown());
      },
    );
}
