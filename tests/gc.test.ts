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

  it('keeps active agents regardless of age', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'agent', agent: 'busy', project: 'proj', status: 'active' },
      T0,
    );
    const pruned = pruneStale(state, T0 + TTL * 10, TTL);
    expect(pruned.agents['proj::busy']).toBeDefined();
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
