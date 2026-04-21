import type { Command } from 'commander';
import { promises as fs } from 'fs';
import { dirname, resolve } from 'path';
import type { DashboardEvent } from '../events/types.js';
import {
  parseHookPayload,
  readStdin,
  translateHook,
} from '../hooks/from-hook.js';
import { HOOK_NAMES, type ClaudeHookName } from '../hooks/template.js';

export interface EmitOptions {
  feed?: string;
  type?: 'flow' | 'agent' | 'log';
  agent?: string;
  phase?: string;
  status?: string;
  task?: string;
  title?: string;
  objective?: string;
  progress?: string;
  message?: string;
  project?: string;
  fromHook?: string;
}

export async function writeEvent(feedPath: string, event: DashboardEvent): Promise<void> {
  const absolute = resolve(feedPath);
  await fs.mkdir(dirname(absolute), { recursive: true });
  await fs.appendFile(absolute, JSON.stringify(event) + '\n', 'utf8');
}

export function buildEventFromFlags(options: EmitOptions): DashboardEvent {
  const type = options.type;
  if (!type) throw new Error('--type is required (flow | agent | log)');

  const base = {
    v: 1,
    ts: new Date().toISOString(),
    ...(options.project ? { project: options.project } : {}),
  };

  if (type === 'flow') {
    return {
      ...base,
      type: 'flow',
      ...(options.title !== undefined && { title: options.title }),
      ...(options.objective !== undefined && { objective: options.objective }),
      ...(options.status !== undefined && { status: options.status }),
      ...(options.progress !== undefined && { progress: Number(options.progress) }),
      ...(options.message !== undefined && { message: options.message }),
    };
  }

  if (type === 'agent') {
    if (!options.agent) throw new Error('--agent is required for agent events');
    return {
      ...base,
      type: 'agent',
      agent: options.agent,
      ...(options.phase !== undefined && { phase: options.phase.toUpperCase() }),
      ...(options.status !== undefined && { status: options.status }),
      ...(options.task !== undefined && { task: options.task }),
      ...(options.message !== undefined && { message: options.message }),
    };
  }

  // log
  if (!options.message) throw new Error('--message is required for log events');
  return {
    ...base,
    type: 'log',
    message: options.message,
  };
}

export function registerEmit(program: Command): void {
  program
    .command('emit')
    .description('Append a single event to a feed.')
    .option('--feed <path>', 'Path to a JSONL event feed.')
    .option('--type <type>', 'flow | agent | log')
    .option('--agent <name>', 'Agent name (for agent events).')
    .option('--phase <phase>', 'Phase name.')
    .option('--status <status>', 'Status value.')
    .option('--task <task>', 'Task description.')
    .option('--title <title>', 'Flow title.')
    .option('--objective <text>', 'Flow objective.')
    .option('--progress <n>', 'Flow progress (0-100).')
    .option('--message <text>', 'Narrative message.')
    .option('--project <slug>', 'Project slug to stamp on the event.')
    .option('--from-hook <hookName>', 'Parse Claude Code hook JSON from stdin.')
    .allowExcessArguments(true) // tolerate trailing markers from settings.json
    .action(async (options: EmitOptions) => {
      if (!options.feed) {
        console.error('ccc emit: --feed is required');
        process.exit(1);
      }

      if (options.fromHook) {
        const hookName = options.fromHook as ClaudeHookName;
        if (!HOOK_NAMES.includes(hookName)) {
          // Unknown hook — don't crash Claude Code; just exit silently.
          process.exit(0);
        }
        try {
          const raw = await readStdin();
          // When CCC_HOOK_DEBUG=1 is set, dump the raw payload to a sidecar
          // file before translating. This lets us inspect what Claude Code
          // actually sends (esp. for Task-tool / subagent invocations), without
          // polluting the main feed.
          if (process.env['CCC_HOOK_DEBUG']) {
            try {
              const { promises: fs2 } = await import('fs');
              const { homedir } = await import('os');
              const { join, dirname: dn } = await import('path');
              const dbgPath = join(homedir(), '.claude-command-central', 'hook-debug.jsonl');
              await fs2.mkdir(dn(dbgPath), { recursive: true });
              await fs2.appendFile(
                dbgPath,
                JSON.stringify({
                  _ts: new Date().toISOString(),
                  _hook: hookName,
                  _project: options.project ?? null,
                  _raw: raw,
                }) + '\n',
                'utf8',
              );
            } catch {
              /* never break the user's Claude session on debug-write failure */
            }
          }
          const payload = parseHookPayload(raw);
          const events = translateHook(hookName, payload, { project: options.project });
          for (const event of events) await writeEvent(options.feed, event);
        } catch {
          // Hooks must never fail-loud and break the user's Claude session.
          process.exit(0);
        }
        return;
      }

      try {
        const event = buildEventFromFlags(options);
        await writeEvent(options.feed, event);
      } catch (err) {
        console.error(`ccc emit: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
