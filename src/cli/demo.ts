import type { Command } from 'commander';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { loadRegistry } from '../config/registry.js';
import { writeEvent } from './emit.js';
import type {
  AgentEvent,
  DashboardEvent,
  FlowEvent,
  LogEvent,
} from '../events/types.js';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

type DemoStep =
  | Omit<FlowEvent, 'ts'>
  | Omit<AgentEvent, 'ts'>
  | Omit<LogEvent, 'ts'>;

function buildScript(project: string, agent: string): DemoStep[] {
  return [
    {
      v: 1,
      project,
      type: 'flow',
      title: 'CCC Demo Run',
      objective: 'Walking a demo agent through all six phases',
      status: 'running',
      progress: 0,
      message: 'Demo started',
    },
    {
      v: 1,
      project,
      type: 'agent',
      agent,
      phase: 'PROMPT',
      status: 'active',
      task: 'Receiving operator prompt',
    },
    { v: 1, project, type: 'log', message: '→ Operator prompt received' },
    { v: 1, project, type: 'flow', progress: 10 },
    {
      v: 1,
      project,
      type: 'agent',
      agent,
      phase: 'PLAN',
      status: 'active',
      task: 'Mapping work into phases',
    },
    { v: 1, project, type: 'log', message: '✓ TodoWrite: 6 items' },
    { v: 1, project, type: 'flow', progress: 25 },
    {
      v: 1,
      project,
      type: 'agent',
      agent,
      phase: 'BUILD',
      status: 'active',
      task: 'Writing cyberpunk sprites',
    },
    { v: 1, project, type: 'log', message: '✓ Edit: web/src/components/AgentSprite.tsx' },
    { v: 1, project, type: 'log', message: '✓ Edit: web/src/components/Room.tsx' },
    { v: 1, project, type: 'flow', progress: 50 },
    {
      v: 1,
      project,
      type: 'agent',
      agent,
      phase: 'REVIEW',
      status: 'active',
      task: 'Inspecting animation layers',
    },
    { v: 1, project, type: 'log', message: '✓ Read: web/src/components/AgentSprite.tsx' },
    { v: 1, project, type: 'flow', progress: 70 },
    {
      v: 1,
      project,
      type: 'agent',
      agent,
      phase: 'TEST',
      status: 'active',
      task: 'Running vitest suite',
    },
    { v: 1, project, type: 'log', message: '✓ Bash: npm test' },
    { v: 1, project, type: 'flow', progress: 90 },
    {
      v: 1,
      project,
      type: 'agent',
      agent,
      phase: 'DEPLOY',
      status: 'active',
      task: 'Packaging release bundle',
    },
    { v: 1, project, type: 'log', message: '✓ Bash: npm run build' },
    {
      v: 1,
      project,
      type: 'flow',
      progress: 100,
      status: 'done',
      message: 'Demo complete',
    },
    {
      v: 1,
      project,
      type: 'agent',
      agent,
      phase: 'DEPLOY',
      status: 'done',
      task: 'Awaiting next mission',
    },
  ];
}

export function registerDemo(program: Command): void {
  program
    .command('demo')
    .description('Walk a demo agent through all six phases to showcase the dashboard.')
    .option('--feed <path>', 'Feed path. Defaults to the first registered project.')
    .option('--project <slug>', 'Project label shown in the UI.', 'demo')
    .option('--reset', 'Clear the feed before running.', false)
    .option('--speed <seconds>', 'Seconds between steps.', '1.5')
    .action(
      async (options: {
        feed?: string;
        project: string;
        reset: boolean;
        speed: string;
      }) => {
        let feedPath = options.feed;
        if (!feedPath) {
          const registry = await loadRegistry();
          const first = Object.values(registry.projects)[0];
          if (!first) {
            console.error(
              'ccc demo: no --feed given and no registered projects found.',
            );
            console.error('  run `ccc init` in a project first, or pass --feed explicitly.');
            process.exit(1);
          }
          feedPath = first.feed;
          console.log(`→ using feed from project '${first.slug}': ${feedPath}`);
        }

        const absPath = resolve(feedPath);
        if (options.reset) {
          await fs.rm(absPath, { force: true });
          console.log('→ feed cleared');
        }

        const stepMs = Math.max(100, Number(options.speed) * 1000);
        const project = options.project;
        const agent = `demo-${project}`;
        const script = buildScript(project, agent);

        console.log(`→ driving ${script.length} events into the feed (${stepMs}ms apart)…\n`);
        for (const [idx, event] of script.entries()) {
          const withTs: DashboardEvent = {
            ...(event as DashboardEvent),
            ts: new Date().toISOString(),
          };
          await writeEvent(absPath, withTs);
          const label =
            event.type === 'agent'
              ? `${event.type} phase=${event.phase ?? '—'}`
              : event.type === 'flow'
                ? `flow progress=${event.progress ?? '—'}%`
                : `log: ${event.message?.slice(0, 50)}`;
          console.log(`  [${String(idx + 1).padStart(2, '0')}/${script.length}] ${label}`);
          await sleep(stepMs);
        }
        console.log('\n✓ demo complete.');
      },
    );
}
