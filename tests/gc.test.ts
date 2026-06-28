import { describe, it, expect } from 'vitest';
import {
  initialDashboardState,
  pruneStale,
  reduce,
} from '../src/state/dashboard-reducer.js';

const T0 = 1_700_000_000_000;
const TTL = 60_000;

describe('pruneStale', () => {
  it('removes done agents past TTL', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'agent', agent: 'worker', project: 'proj', status: 'done' },
      T0,
    );
    const later = T0 + TTL + 1;
    const pruned = pruneStale(state, later, TTL);
    expect(pruned.agents['proj::worker']).toBeUndefined();
  });

  it('removes idle agents past TTL', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'agent', agent: 'sitter', project: 'proj', status: 'idle' },
      T0,
    );
    const pruned = pruneStale(state, T0 + TTL + 10, TTL);
    expect(pruned.agents['proj::sitter']).toBeUndefined();
  });

  it('keeps agents still within TTL', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'agent', agent: 'fresh', project: 'proj', status: 'done' },
      T0,
    );
    const pruned = pruneStale(state, T0 + TTL - 1, TTL);
    expect(pruned.agents['proj::fresh']).toBeDefined();
  });

  it('keeps active agents regardless of age when no active TTL is given', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'agent', agent: 'busy', project: 'proj', status: 'active' },
      T0,
    );
    const pruned = pruneStale(state, T0 + TTL * 10, TTL);
    expect(pruned.agents['proj::busy']).toBeDefined();
  });

  it('reaps active/blocked agents past the active TTL (crash backstop)', () => {
    const ACTIVE_TTL = 30 * 60_000;
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'agent', agent: 'zombie', project: 'proj', status: 'active' },
      T0,
    );
    state = reduce(
      state,
      { type: 'agent', agent: 'stuck', project: 'proj', status: 'blocked' },
      T0,
    );
    const pruned = pruneStale(state, T0 + ACTIVE_TTL + 1, TTL, ACTIVE_TTL);
    expect(pruned.agents['proj::zombie']).toBeUndefined();
    expect(pruned.agents['proj::stuck']).toBeUndefined();
  });

  it('keeps active agents still within the active TTL', () => {
    const ACTIVE_TTL = 30 * 60_000;
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'agent', agent: 'working', project: 'proj', status: 'active' },
      T0,
    );
    // Older than the done/idle TTL but younger than the active TTL → kept.
    const pruned = pruneStale(state, T0 + TTL * 10, TTL, ACTIVE_TTL);
    expect(pruned.agents['proj::working']).toBeDefined();
  });

  it('is pure: returns the same reference when nothing is stale', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'agent', agent: 'busy', project: 'p', status: 'active' },
      T0,
    );
    const pruned = pruneStale(state, T0 + 5, TTL);
    expect(pruned).toBe(state);
  });

  it('does not mutate the input state', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'agent', agent: 'worker', project: 'proj', status: 'done' },
      T0,
    );
    const before = Object.keys(state.agents);
    pruneStale(state, T0 + TTL + 1, TTL);
    expect(Object.keys(state.agents)).toEqual(before);
  });
});

describe('dashboard-reducer: despawn', () => {
  it('removes the targeted agent', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'agent', agent: 'alpha', project: 'p', phase: 'BUILD' },
      T0,
    );
    state = reduce(
      state,
      { type: 'agent', agent: 'beta', project: 'p', phase: 'REVIEW' },
      T0,
    );
    state = reduce(
      state,
      { type: 'agent', agent: 'alpha', project: 'p', status: 'despawn' },
      T0 + 1,
    );
    expect(state.agents['p::alpha']).toBeUndefined();
    expect(state.agents['p::beta']).toBeDefined();
  });

  it('is a no-op when the agent is already absent', () => {
    const state = initialDashboardState();
    const next = reduce(
      state,
      { type: 'agent', agent: 'ghost', project: 'p', status: 'despawn' },
      T0,
    );
    expect(Object.keys(next.agents)).toHaveLength(0);
  });
});

describe('dashboard-reducer: session-end cascade (flow → done)', () => {
  it('evicts an orphaned active subagent when its session stops', () => {
    let state = initialDashboardState();
    // Main agent + a subagent whose SubagentStop never arrived.
    state = reduce(
      state,
      { type: 'agent', agent: 'claude@p', project: 'p', status: 'active', phase: 'BUILD' },
      T0,
    );
    state = reduce(
      state,
      { type: 'agent', agent: 'taxonomy-curator@p', project: 'p', status: 'active', phase: 'BUILD' },
      T0,
    );
    // Session stops.
    state = reduce(state, { type: 'flow', project: 'p', status: 'done' }, T0 + 1);
    expect(state.agents['p::claude@p']).toBeUndefined();
    expect(state.agents['p::taxonomy-curator@p']).toBeUndefined();
  });

  it('only evicts agents of the stopping project, and leaves resting agents alone', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'agent', agent: 'busy@p', project: 'p', status: 'active' },
      T0,
    );
    state = reduce(
      state,
      { type: 'agent', agent: 'resting@p', project: 'p', status: 'done' },
      T0,
    );
    state = reduce(
      state,
      { type: 'agent', agent: 'other@q', project: 'q', status: 'active' },
      T0,
    );
    state = reduce(state, { type: 'flow', project: 'p', status: 'done' }, T0 + 1);
    expect(state.agents['p::busy@p']).toBeUndefined(); // working in p → evicted
    expect(state.agents['p::resting@p']).toBeDefined(); // done → left for TTL GC
    expect(state.agents['q::other@q']).toBeDefined(); // different project → untouched
  });

  it('lets the main agent reappear as a resting card from its own done event', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'agent', agent: 'claude@p', project: 'p', status: 'active', phase: 'BUILD' },
      T0,
    );
    // Stop hook order: flow done, then the main agent's own done event.
    state = reduce(state, { type: 'flow', project: 'p', status: 'done' }, T0 + 1);
    state = reduce(
      state,
      { type: 'agent', agent: 'claude@p', project: 'p', status: 'done', phase: 'DEPLOY' },
      T0 + 1,
    );
    const main = state.agents['p::claude@p'];
    expect(main).toBeDefined();
    expect(main?.status).toBe('done');
    expect(main?.phase).toBe('DEPLOY');
  });
});
