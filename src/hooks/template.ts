/**
 * Generates Claude Code hook entries that pipe each hook's stdin JSON into
 * `ccc emit --from-hook <HookName>`, tagged with the project slug and feed path.
 *
 * Hook format matches Claude Code's `.claude/settings.json`:
 *
 *   {
 *     "hooks": {
 *       "<HookName>": [ { "hooks": [ { "type": "command", "command": "..." } ] } ]
 *     }
 *   }
 */

export type ClaudeHookName =
  | 'SessionStart'
  | 'UserPromptSubmit'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'Stop';

export const HOOK_NAMES: ClaudeHookName[] = [
  'SessionStart',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'SubagentStart',
  'SubagentStop',
  'Stop',
];

export interface HookCommand {
  type: 'command';
  command: string;
}

export interface HookGroup {
  hooks: HookCommand[];
}

export type HookConfig = Partial<Record<ClaudeHookName, HookGroup[]>>;

export interface ClaudeSettings {
  hooks?: HookConfig;
  [key: string]: unknown;
}

export interface BuildHooksOptions {
  /** Shell-invocable command that runs CCC's emitter (e.g. "ccc" or "/abs/path/bin.js"). */
  cccCommand: string;
  project: string;
  feed: string;
}

/** Unique marker on each command so we can find and remove CCC's hooks later without disturbing others. */
export const CCC_MARKER = '# ccc-hook';

/** Render one shell command that pipes stdin to `ccc emit --from-hook <name>`. */
const renderHookCommand = (
  name: ClaudeHookName,
  opts: BuildHooksOptions,
): string => {
  const { cccCommand, project, feed } = opts;
  // Quote feed path defensively in case it contains spaces.
  return `${cccCommand} emit --from-hook ${name} --project ${shellEscape(project)} --feed ${shellEscape(feed)} ${CCC_MARKER}`;
};

const shellEscape = (value: string): string => {
  if (/^[A-Za-z0-9_.\-/]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
};

export function buildHooks(options: BuildHooksOptions): HookConfig {
  const out: HookConfig = {};
  for (const name of HOOK_NAMES) {
    out[name] = [
      {
        hooks: [
          {
            type: 'command',
            command: renderHookCommand(name, options),
          },
        ],
      },
    ];
  }
  return out;
}

/** Detects whether a HookCommand was installed by CCC. */
export const isCCCHook = (cmd: HookCommand): boolean =>
  cmd.type === 'command' && cmd.command.includes(CCC_MARKER);

/**
 * Merge CCC's hooks into an existing Claude Code settings object without clobbering
 * user-authored hooks. CCC's own prior hooks are replaced (idempotent `ccc init`).
 */
export function mergeHooks(
  existing: ClaudeSettings,
  ours: HookConfig,
): ClaudeSettings {
  const merged: ClaudeSettings = { ...existing };
  const existingHooks: HookConfig = existing.hooks ?? {};
  const nextHooks: HookConfig = {};

  const allNames = new Set<ClaudeHookName>([
    ...HOOK_NAMES,
    ...(Object.keys(existingHooks) as ClaudeHookName[]),
  ]);

  for (const name of allNames) {
    const existingGroups = existingHooks[name] ?? [];
    const cleaned: HookGroup[] = existingGroups
      .map((group) => ({
        ...group,
        hooks: group.hooks.filter((h) => !isCCCHook(h)),
      }))
      .filter((group) => group.hooks.length > 0);

    const ourGroups = ours[name] ?? [];
    const combined = [...cleaned, ...ourGroups];
    if (combined.length > 0) nextHooks[name] = combined;
  }

  merged.hooks = nextHooks;
  return merged;
}
