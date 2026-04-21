import { describe, it, expect } from 'vitest';
import {
  translateHook,
  phaseForTool,
  parseHookPayload,
} from '../src/hooks/from-hook.js';

describe('phaseForTool', () => {
  it('maps authoring tools to BUILD', () => {
    expect(phaseForTool('Edit')).toBe('BUILD');
    expect(phaseForTool('Write')).toBe('BUILD');
    expect(phaseForTool('Bash')).toBe('BUILD');
  });

  it('maps investigation tools to PLAN', () => {
    expect(phaseForTool('Read')).toBe('PLAN');
    expect(phaseForTool('Grep')).toBe('PLAN');
    expect(phaseForTool('WebFetch')).toBe('PLAN');
  });

  it('falls back to BUILD for unknown tools', () => {
    expect(phaseForTool('MysteryTool')).toBe('BUILD');
    expect(phaseForTool(undefined)).toBe('BUILD');
  });
});

describe('parseHookPayload', () => {
  it('parses valid JSON', () => {
    const p = parseHookPayload('{"prompt":"hi","tool_name":"Edit"}');
    expect(p.prompt).toBe('hi');
    expect(p.tool_name).toBe('Edit');
  });

  it('returns empty object on malformed JSON (must not crash)', () => {
    expect(parseHookPayload('garbage')).toEqual({});
    expect(parseHookPayload('')).toEqual({});
  });
});

describe('translateHook: SessionStart', () => {
  it('resets the flow and parks the agent', () => {
    const events = translateHook('SessionStart', {});
    expect(events).toHaveLength(2);
    expect(events[0]?.type).toBe('flow');
    if (events[0]?.type === 'flow') {
      expect(events[0].status).toBe('running');
      expect(events[0].progress).toBe(0);
    }
    expect(events[1]?.type).toBe('agent');
  });
});

describe('translateHook: UserPromptSubmit', () => {
  it('sets the prompt as the flow objective', () => {
    const events = translateHook('UserPromptSubmit', {
      prompt: 'Add dark mode to settings',
    });
    const flow = events.find((e) => e.type === 'flow');
    expect(flow?.type).toBe('flow');
    if (flow?.type === 'flow') expect(flow.objective).toContain('dark mode');
    const agent = events.find((e) => e.type === 'agent');
    expect(agent?.type).toBe('agent');
    if (agent?.type === 'agent') expect(agent.phase).toBe('PROMPT');
  });

  it('truncates very long prompts gracefully', () => {
    const long = 'x'.repeat(500);
    const events = translateHook('UserPromptSubmit', { prompt: long });
    const flow = events.find((e) => e.type === 'flow');
    if (flow?.type === 'flow') {
      expect(flow.objective?.length ?? 0).toBeLessThanOrEqual(200);
    }
  });
});

describe('translateHook: PreToolUse', () => {
  it('emits an agent event with the mapped phase', () => {
    const events = translateHook('PreToolUse', {
      tool_name: 'Edit',
      tool_input: { file_path: '/a/b.ts' },
    });
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e?.type).toBe('agent');
    if (e?.type === 'agent') {
      expect(e.phase).toBe('BUILD');
      expect(e.task).toContain('/a/b.ts');
    }
  });

  it('humanizes common bash commands into plain-English task text', () => {
    const events = translateHook('PreToolUse', {
      tool_name: 'Bash',
      tool_input: { command: 'npm test' },
    });
    const e = events[0];
    if (e?.type === 'agent') expect(e.task?.toLowerCase()).toContain('running tests');
  });

  it('humanizes git commands', () => {
    const events = translateHook('PreToolUse', {
      tool_name: 'Bash',
      tool_input: { command: 'git commit -m "x"' },
    });
    const e = events[0];
    if (e?.type === 'agent') expect(e.task?.toLowerCase()).toContain('committing');
  });

  it('handles Grep pattern input', () => {
    const events = translateHook('PreToolUse', {
      tool_name: 'Grep',
      tool_input: { pattern: 'TODO' },
    });
    const e = events[0];
    if (e?.type === 'agent') {
      expect(e.phase).toBe('PLAN');
      expect(e.task).toContain('TODO');
    }
  });
});

describe('translateHook: PostToolUse', () => {
  it('logs the tool name', () => {
    const events = translateHook('PostToolUse', { tool_name: 'Edit' });
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e?.type).toBe('log');
    if (e?.type === 'log') expect(e.message).toContain('Edit');
  });
});

describe('translateHook: SubagentStart', () => {
  it('emits a dedicated agent event for each subagent so the team is visible', () => {
    const events = translateHook(
      'SubagentStart',
      { agent_type: 'code-reviewer', agent_id: 'abc123' },
      { project: 'demo' },
    );
    const agent = events.find((e) => e.type === 'agent');
    expect(agent?.type).toBe('agent');
    if (agent?.type === 'agent') {
      expect(agent.agent).toBe('code-reviewer@demo');
      expect(agent.status).toBe('active');
      expect(agent.phase).toBe('REVIEW');
    }
    const log = events.find((e) => e.type === 'log');
    expect(log?.type).toBe('log');
    if (log?.type === 'log') expect(log.message).toContain('code-reviewer');
  });

  it('falls back to a generic subagent label when agent_type is missing', () => {
    const events = translateHook('SubagentStart', {}, { project: 'demo' });
    const agent = events.find((e) => e.type === 'agent');
    if (agent?.type === 'agent') expect(agent.agent).toBe('subagent@demo');
  });
});

describe('translateHook: SubagentStop', () => {
  it('marks the specific subagent as done using agent_type', () => {
    const events = translateHook(
      'SubagentStop',
      { agent_type: 'typescript-pro', last_assistant_message: 'Finished refactor' },
      { project: 'demo' },
    );
    const agent = events.find((e) => e.type === 'agent');
    expect(agent?.type).toBe('agent');
    if (agent?.type === 'agent') {
      expect(agent.agent).toBe('typescript-pro@demo');
      expect(agent.status).toBe('done');
      expect(agent.task).toContain('Finished refactor');
    }
  });
});

describe('translateHook: Stop', () => {
  it('marks the flow done at 100%', () => {
    const events = translateHook('Stop', {});
    const flow = events.find((e) => e.type === 'flow');
    if (flow?.type === 'flow') {
      expect(flow.status).toBe('done');
      expect(flow.progress).toBe(100);
    }
  });
});

describe('translateHook: project stamping', () => {
  it('stamps the project slug onto every event', () => {
    const events = translateHook('SessionStart', {}, { project: 'demo' });
    for (const e of events) expect(e.project).toBe('demo');
  });
});
