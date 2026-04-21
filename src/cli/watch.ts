import type { Command } from 'commander';
import { resolve, basename } from 'path';

const slugifyPath = (path: string): string =>
  basename(path, '.jsonl').replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'feed';

export function registerWatch(program: Command): void {
  program
    .command('watch')
    .description('Render the live mission control dashboard.')
    .option('--feed <path...>', 'One or more JSONL event feed paths.')
    .option('--project <name>', 'Project label when only one --feed is given.')
    .action(async (options: { feed?: string[]; project?: string }) => {
      const feeds = options.feed ?? [];
      if (feeds.length === 0) {
        console.error('ccc watch: at least one --feed is required.');
        console.error('  try: ccc watch --feed runtime/demo-feed.jsonl');
        process.exit(1);
      }

      const sources = feeds.map((path) => ({
        path: resolve(path),
        project: feeds.length === 1 && options.project ? options.project : slugifyPath(path),
      }));

      const [{ render }, React, { App }, { MultiFeedWatcher }] = await Promise.all([
        import('ink'),
        import('react'),
        import('../app/index.js'),
        import('../events/watcher.js'),
      ]);

      const watcher = new MultiFeedWatcher(sources);
      const instance = render(React.createElement(App, { watcher }));
      try {
        await instance.waitUntilExit();
      } finally {
        watcher.stop();
      }
    });
}
