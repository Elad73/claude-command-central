import { describe, it, expect } from 'vitest';
import { reduce, reduceAll, LOG_BOUND } from '../src/state/reducer.js';
import { initialDashboardState } from '../src/state/types.js';

const T0 = 1_700_000_000_000;

describe('reducer: flow', () => {
  it('only mutates fields present in the event', () => {
    const state = initialDashboardState();
    const next = reduce(
      state,
      { type: 'flow', title: 'New Title' },
      T0,
    );
    expect(next.flow.title).toBe('New Title');
    expect(next.flow.objective).toBe(state.flow.objective);
    expect(next.flow.status).toBe(state.flow.status);
    expect(next.flow.progress).toBe(0);
    expect(next.flow.updatedAt).toBe(T0);
  });

  it('clamps progress to [0, 100]', () => {
    const over = reduce(initialDashboardState(), { type: 'flow', progress: 250 }, T0);
    expect(over.flow.progress).toBe(100);
    const under = reduce(initialDashboardState(), { type: 'flow', progress: -10 }, T0);
    expect(under.flow.progress).toBe(0);
  });

  it('truncates non-integer progress', () => {
    const next = reduce(initialDashboardState(), { type: 'flow', progress: 42.9 }, T0);
    expect(next.flow.progress).toBe(42);
  });

  it('updates updatedAt even when no other fields change', () => {
    const state = initialDashboardState();
    const next = reduce(state, { type: 'flow' }, T0);
    expect(next.flow.updatedAt).toBe(T0);
  });

  it('returns a new flow object (immutable)', () => {
    const state = initialDashboardState();
    const next = reduce(state, { type: 'flow', title: 'X' }, T0);
    expect(next.flow).not.toBe(state.flow);
    expect(next).not.toBe(state);
  });
});

describe('reducer: agent', () => {
  it('creates a new agent with defaults when not present', () => {
    const next = reduce(
      initialDashboardState(),
      { type: 'agent', agent: 'planner', phase: 'PLAN' },
      T0,
    );
    const agent = next.agents['planner'];
    expect(agent).toBeDefined();
    expect(agent?.name).toBe('planner');
    expect(agent?.phase).toBe('PLAN');
    expect(agent?.status).toBe('idle');
    expect(agent?.task).toBe('Waiting for assignment');
    expect(agent?.updatedAt).toBe(T0);
  });

  it('preserves fields not present in the event', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'agent', agent: 'coder', phase: 'BUILD', status: 'active', task: 'writing X' },
      T0,
    );
    state = reduce(state, { type: 'agent', agent: 'coder', status: 'done' }, T0 + 1);
    const agent = state.agents['coder'];
    expect(agent?.phase).toBe('BUILD');
    expect(agent?.task).toBe('writing X');
    expect(agent?.status).toBe('done');
  });

  it('uppercases phase on ingest', () => {
    const next = reduce(
      initialDashboardState(),
      { type: 'agent', agent: 'x', phase: 'build' },
      T0,
    );
    expect(next.agents['x']?.phase).toBe('BUILD');
  });

  it('ignores unknown phases and preserves prior phase', () => {
    let state = initialDashboardState();
    state = reduce(state, { type: 'agent', agent: 'x', phase: 'PLAN' }, T0);
    state = reduce(state, { type: 'agent', agent: 'x', phase: 'NOPE' }, T0 + 1);
    expect(state.agents['x']?.phase).toBe('PLAN');
  });

  it('returns a new agents map on update (reference changes)', () => {
    const state = initialDashboardState();
    const next = reduce(state, { type: 'agent', agent: 'z' }, T0);
    expect(next.agents).not.toBe(state.agents);
  });
});

describe('reducer: log', () => {
  it('appends a timestamped entry', () => {
    const next = reduce(
      initialDashboardState(),
      { type: 'log', message: 'hello' },
      T0,
    );
    expect(next.logLines).toHaveLength(1);
    expect(next.logLines[0]).toMatch(/^\d{2}:\d{2}:\d{2}  hello$/);
  });

  it(`bounds log to ${LOG_BOUND} lines`, () => {
    let state = initialDashboardState();
    for (let i = 0; i < LOG_BOUND + 3; i++) {
      state = reduce(state, { type: 'log', message: `line-${i}` }, T0 + i);
    }
    expect(state.logLines).toHaveLength(LOG_BOUND);
    expect(state.logLines[0]).toContain('line-3');
    expect(state.logLines.at(-1)).toContain(`line-${LOG_BOUND + 2}`);
  });
});

describe('reducer: cross-cutting message', () => {
  it('flow event with message also appends to log', () => {
    const next = reduce(
      initialDashboardState(),
      { type: 'flow', progress: 50, message: 'midway' },
      T0,
    );
    expect(next.flow.progress).toBe(50);
    expect(next.logLines).toHaveLength(1);
    expect(next.logLines[0]).toContain('midway');
  });

  it('agent event with message also appends to log', () => {
    const next = reduce(
      initialDashboardState(),
      { type: 'agent', agent: 'a', message: 'started' },
      T0,
    );
    expect(next.logLines[0]).toContain('started');
  });

  it('log event with message does not double-log', () => {
    const next = reduce(
      initialDashboardState(),
      { type: 'log', message: 'only once' },
      T0,
    );
    expect(next.logLines).toHaveLength(1);
  });
});

describe('reduceAll', () => {
  it('folds a sequence of events', () => {
    let tick = T0;
    const state = reduceAll(
      initialDashboardState(),
      [
        { type: 'flow', title: 'Mission', progress: 10 },
        { type: 'agent', agent: 'alpha', phase: 'BUILD' },
        { type: 'log', message: 'tick' },
      ],
      () => tick++,
    );
    expect(state.flow.title).toBe('Mission');
    expect(state.agents['alpha']?.phase).toBe('BUILD');
    expect(state.logLines).toHaveLength(1);
  });
});
