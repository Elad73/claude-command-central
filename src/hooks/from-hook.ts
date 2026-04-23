import type { DashboardEvent, Phase } from '../events/types.js';
import type { ClaudeHookName } from './template.js';

/** Heuristic tool → phase mapping, used when Claude runs a tool. */
export const TOOL_PHASE: Record<string, Phase> = {
  // Code authorship
  Edit: 'BUILD',
  Write: 'BUILD',
  NotebookEdit: 'BUILD',
  // Execution / testing
  Bash: 'BUILD',
  // Reading / investigation
  Read: 'PLAN',
  Grep: 'PLAN',
  Glob: 'PLAN',
  // External research
  WebFetch: 'PLAN',
  WebSearch: 'PLAN',
  // Orchestration
  TodoWrite: 'PLAN',
  ExitPlanMode: 'BUILD',
};

export const phaseForTool = (toolName: string | undefined): Phase => {
  if (!toolName) return 'BUILD';
  return TOOL_PHASE[toolName] ?? 'BUILD';
};

export interface HookPayload {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
  prompt?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;
  source?: string;
  stop_hook_active?: boolean;
  // SubagentStart / SubagentStop envelope (Claude Code 2.x+):
  agent_id?: string;
  agent_type?: string;
  agent_transcript_path?: string;
  last_assistant_message?: string;
  [key: string]: unknown;
}

const MAX_OBJECTIVE_LEN = 160;
const MAX_TASK_LEN = 120;

/**
 * Scrub obvious secret shapes out of a string before it lands in the live feed.
 *
 * The feed is a plaintext file users may later open in a browser or screenshot, so
 * the raw `tool_input.command` must not echo bearer tokens, API keys, or env-var
 * assignments verbatim. The humanized bubble text already avoids most of this, but
 * the `default:` branch of `humanizeBash` (unknown binaries) falls through to the
 * original command — which is exactly the case where `export` / `curl` slip by.
 *
 * This is defense-in-depth, not a substitute for user hygiene. Patterns are
 * intentionally broad and false-positive-biased; the feed is not a forensics trail.
 *
 * Never throws — on any unexpected input returns the original string so the
 * "hooks must not fail loud" contract is preserved.
 */
export function redactSensitive(input: string): string {
  try {
    if (!input || typeof input !== 'string') return input;
    let out = input;
    // 1. Authorization / Bearer / Basic headers (curl -H "Authorization: Bearer xyz")
    out = out.replace(
      /(authorization\s*:\s*(?:bearer|basic|token)\s+)([^\s"'`]+)/gi,
      '$1[REDACTED]',
    );
    // 2. Anthropic / OpenAI / Stripe style prefixed keys (sk-..., sk_live_..., pk_live_..., rk_...)
    out = out.replace(/\b(?:sk|pk|rk)[-_][A-Za-z0-9_-]{12,}/g, '[REDACTED]');
    // 3. GitHub tokens (ghp_, gho_, ghu_, ghs_, ghr_)
    out = out.replace(/\bgh[pousr]_[A-Za-z0-9]{16,}/g, '[REDACTED]');
    // 4. AWS access key IDs
    out = out.replace(/\bAKIA[0-9A-Z]{12,}/g, '[REDACTED]');
    // 5. Slack bot / user tokens
    out = out.replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}/g, '[REDACTED]');
    // 6. Env-var assignments for anything that looks credential-shaped:
    //    API_KEY=xxx, FOO_TOKEN=xxx, MY_SECRET=xxx, PASSWORD=xxx, *_PAT=xxx, *_PWD=xxx
    //    Matches both `export KEY=val` and bare `KEY=val`. Stops at whitespace, quote, or shell separator.
    out = out.replace(
      /\b([A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|PAT|PWD|CREDENTIAL|CREDENTIALS))\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s;|&]+))/gi,
      '$1=[REDACTED]',
    );
    return out;
  } catch {
    // Defensive: never break the hook path on regex edge cases.
    return input;
  }
}

/**
 * Agents are namespaced by project so multiple concurrent sessions
 * (e.g. daily-logger + gmail-board at the same time) don't collide on
 * the single "claude" key.
 */
const agentName = (project?: string): string =>
  project ? `claude@${project}` : 'claude';

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : text.slice(0, max - 1) + '…';

/**
 * Collapse a noisy filesystem path down to something a human scans quickly.
 *   /home/eladr/personal-space/playground/gmail-board/src/App.tsx  ->  …/src/App.tsx
 *   /home/eladr/.claude/skills/foo/SKILL.md                         ->  ~/.claude/skills/foo/SKILL.md
 */
const shortenPath = (p: string): string => {
  const home = process.env['HOME'];
  let s = p.trim();
  if (home && s.startsWith(home)) s = '~' + s.slice(home.length);
  const segs = s.split('/').filter(Boolean);
  if (segs.length <= 3) return s;
  // Keep the last 3 segments for context.
  const tail = segs.slice(-3).join('/');
  const lead = s.startsWith('~') ? '~/…/' : s.startsWith('/') ? '/…/' : '…/';
  return `${lead}${tail}`;
};

/**
 * Turn a raw bash command line into a short, human-readable sentence.
 * Falls back to the original command when we don't recognize the shape.
 */
const humanizeBash = (command: string): string => {
  const cmd = command.trim();
  // Strip redirections and the `2>&1 | head -N` noise that clutters most lines
  // by looking at the first "word phrase" before a pipe/redirect.
  const head = cmd.split(/\s*(?:\||&&|;|>|2>)/)[0]?.trim() ?? cmd;
  const parts = head.split(/\s+/);
  const bin = (parts[0] ?? '').toLowerCase();

  const rest = parts.slice(1).filter((p) => !p.startsWith('-')); // drop flags

  const first = rest[0];
  const firstShort = first ? shortenPath(first) : '';

  switch (bin) {
    case 'ls':
      return first ? `Exploring ${firstShort}` : 'Listing directory';
    case 'cat':
    case 'head':
    case 'tail':
    case 'less':
    case 'more':
      return first ? `Reading ${firstShort}` : `Reading output`;
    case 'mkdir':
      return first ? `Creating folder ${firstShort}` : 'Creating folder';
    case 'rm':
      return first ? `Removing ${firstShort}` : 'Removing files';
    case 'cp':
      return rest[1] ? `Copying ${firstShort} → ${shortenPath(rest[1])}` : 'Copying files';
    case 'mv':
      return rest[1] ? `Moving ${firstShort} → ${shortenPath(rest[1])}` : 'Moving files';
    case 'touch':
      return first ? `Creating file ${firstShort}` : 'Creating file';
    case 'echo':
      return 'Writing output';
    case 'find':
      return first ? `Searching under ${firstShort}` : 'Searching filesystem';
    case 'grep':
    case 'rg':
      return first ? `Searching for "${first}"` : 'Searching code';
    case 'curl':
    case 'wget':
      return first ? `Fetching ${firstShort}` : 'Fetching URL';
    case 'npm':
    case 'pnpm':
    case 'yarn': {
      const sub = (rest[0] ?? '').toLowerCase();
      if (sub === 'install' || sub === 'i' || sub === 'add') return 'Installing dependencies';
      if (sub === 'test') return 'Running tests';
      if (sub === 'run') return rest[1] ? `Running ${rest[1]}` : `Running ${bin} script`;
      if (sub === 'build') return 'Building project';
      if (sub === 'start') return 'Starting dev server';
      return `Running ${bin} ${sub}`.trim();
    }
    case 'git': {
      const sub = (rest[0] ?? '').toLowerCase();
      if (sub === 'status') return 'Checking git status';
      if (sub === 'diff') return 'Viewing changes';
      if (sub === 'log') return 'Reading git history';
      if (sub === 'add') return 'Staging changes';
      if (sub === 'commit') return 'Committing';
      if (sub === 'push') return 'Pushing to remote';
      if (sub === 'pull') return 'Pulling from remote';
      if (sub === 'checkout') return rest[1] ? `Switching to ${rest[1]}` : 'Switching branch';
      if (sub === 'branch') return 'Managing branches';
      if (sub === 'merge') return rest[1] ? `Merging ${rest[1]}` : 'Merging';
      if (sub === 'rebase') return 'Rebasing';
      return `git ${sub}`;
    }
    case 'docker':
    case 'kubectl':
    case 'gcloud':
    case 'aws':
      return `Running ${bin} ${rest[0] ?? ''}`.trim();
    case 'node':
    case 'python':
    case 'python3':
    case 'tsx':
    case 'ts-node':
      return first ? `Running ${firstShort}` : `Running ${bin}`;
    case 'pm2':
      return rest[0] ? `pm2 ${rest[0]}` : 'Managing pm2';
    default:
      return truncate(cmd, MAX_TASK_LEN);
  }
};

const inferSubagentPhase = (subagentType: string | undefined): Phase => {
  if (!subagentType) return 'PLAN';
  const s = subagentType.toLowerCase();
  if (/test|qa|automator/.test(s)) return 'TEST';
  if (/review|audit|critic|security-auditor/.test(s)) return 'REVIEW';
  if (/deploy|cloud|release|devops/.test(s)) return 'DEPLOY';
  if (/architect|planner|explore|research|docs-architect|tutorial/.test(s)) return 'PLAN';
  if (/debug/.test(s)) return 'REVIEW';
  return 'BUILD';
};

const summarizeTool = (name: string | undefined, input: unknown): string => {
  if (!name) return 'working';
  const i = (input ?? {}) as Record<string, unknown>;
  if (name === 'Bash' && typeof i['command'] === 'string') {
    // Redact BEFORE humanize so the fallback `truncate(cmd)` branch doesn't leak
    // raw `export API_KEY=…` or `curl -H "Authorization: Bearer …"` into the feed.
    return truncate(humanizeBash(redactSensitive(i['command'])), MAX_TASK_LEN);
  }
  if (name === 'Edit' && typeof i['file_path'] === 'string') {
    return truncate(`Editing ${shortenPath(i['file_path'])}`, MAX_TASK_LEN);
  }
  if (name === 'Write' && typeof i['file_path'] === 'string') {
    return truncate(`Writing ${shortenPath(i['file_path'])}`, MAX_TASK_LEN);
  }
  if (name === 'Read' && typeof i['file_path'] === 'string') {
    return truncate(`Reading ${shortenPath(i['file_path'])}`, MAX_TASK_LEN);
  }
  if (name === 'NotebookEdit' && typeof i['notebook_path'] === 'string') {
    return truncate(`Editing ${shortenPath(i['notebook_path'])}`, MAX_TASK_LEN);
  }
  if (name === 'Grep' && typeof i['pattern'] === 'string') {
    return truncate(`Searching for "${i['pattern']}"`, MAX_TASK_LEN);
  }
  if (name === 'Glob' && typeof i['pattern'] === 'string') {
    return truncate(`Finding files: ${i['pattern']}`, MAX_TASK_LEN);
  }
  if (name === 'WebFetch' && typeof i['url'] === 'string') {
    return truncate(`Fetching ${i['url']}`, MAX_TASK_LEN);
  }
  if (name === 'WebSearch' && typeof i['query'] === 'string') {
    return truncate(`Searching web: ${i['query']}`, MAX_TASK_LEN);
  }
  if (name === 'TodoWrite') return 'Updating plan';
  return `Running ${name}`;
};

export function translateHook(
  hookName: ClaudeHookName,
  payload: HookPayload,
  options: { project?: string } = {},
): DashboardEvent[] {
  const ts = new Date().toISOString();
  const base = { v: 1 as const, ts, ...(options.project ? { project: options.project } : {}) };

  switch (hookName) {
    case 'SessionStart': {
      return [
        {
          ...base,
          type: 'flow',
          status: 'running',
          progress: 0,
          objective: 'Session started',
          message: 'Claude Code session started',
        },
        {
          ...base,
          type: 'agent',
          agent: agentName(options.project),
          phase: 'PROMPT',
          status: 'idle',
          task: 'Waiting for prompt',
        },
      ];
    }

    case 'UserPromptSubmit': {
      const rawPrompt = typeof payload.prompt === 'string' ? payload.prompt : '';
      const prompt = redactSensitive(rawPrompt);
      const snippet = truncate(prompt || 'New prompt submitted', MAX_OBJECTIVE_LEN);
      return [
        {
          ...base,
          type: 'flow',
          objective: snippet,
          status: 'running',
          progress: 0,
          message: `> ${truncate(prompt, MAX_TASK_LEN)}`,
        },
        {
          ...base,
          type: 'agent',
          agent: agentName(options.project),
          phase: 'PROMPT',
          status: 'active',
          task: truncate(prompt, MAX_TASK_LEN),
        },
      ];
    }

    case 'PreToolUse': {
      const tool = payload.tool_name;
      const phase = phaseForTool(tool);
      const task = summarizeTool(tool, payload.tool_input);
      // Claude Code does NOT fire PreToolUse/PostToolUse for the Task tool —
      // subagents come in via SubagentStart/SubagentStop instead.
      return [
        {
          ...base,
          type: 'agent',
          agent: agentName(options.project),
          phase,
          status: 'active',
          task,
        },
      ];
    }

    case 'PostToolUse': {
      const tool = payload.tool_name ?? 'tool';
      const summary = summarizeTool(tool, payload.tool_input);
      return [
        {
          ...base,
          type: 'log',
          message: `✓ ${summary}`,
        },
      ];
    }

    case 'SubagentStart': {
      const agentType =
        typeof payload.agent_type === 'string' && payload.agent_type.trim()
          ? payload.agent_type
          : 'subagent';
      const phase = inferSubagentPhase(agentType);
      const subName = options.project ? `${agentType}@${options.project}` : agentType;
      return [
        {
          ...base,
          type: 'log',
          message: `▶ ${agentType} dispatched`,
        },
        {
          ...base,
          type: 'agent',
          agent: subName,
          phase,
          status: 'active',
          task: 'Working…',
        },
      ];
    }

    case 'SubagentStop': {
      const agentType =
        typeof payload.agent_type === 'string' && payload.agent_type.trim()
          ? payload.agent_type
          : '';
      const last =
        typeof payload.last_assistant_message === 'string'
          ? payload.last_assistant_message
          : '';
      const label = agentType || 'subagent';
      const events: DashboardEvent[] = [
        {
          ...base,
          type: 'log',
          message: `✓ ${label} finished`,
        },
      ];
      if (agentType) {
        events.push({
          ...base,
          type: 'agent',
          agent: options.project ? `${agentType}@${options.project}` : agentType,
          phase: inferSubagentPhase(agentType),
          status: 'done',
          task: truncate(last || 'Completed', MAX_TASK_LEN),
        });
      }
      return events;
    }

    case 'Stop': {
      return [
        {
          ...base,
          type: 'flow',
          status: 'done',
          progress: 100,
          message: 'Session complete',
        },
        {
          ...base,
          type: 'agent',
          agent: agentName(options.project),
          phase: 'DEPLOY',
          status: 'done',
          task: 'Awaiting next prompt',
        },
      ];
    }

    default:
      return [];
  }
}

/** Read stdin fully as a UTF-8 string. Used by the CLI entry. */
export async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function parseHookPayload(raw: string): HookPayload {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'object' && parsed !== null ? (parsed as HookPayload) : {};
  } catch {
    return {};
  }
}
