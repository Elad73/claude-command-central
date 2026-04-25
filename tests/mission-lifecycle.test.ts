import { describe, it, expect } from 'vitest';
import {
  initialDashboardState,
  reduce,
} from '../src/state/dashboard-reducer.js';

const T0 = 1_700_000_000_000;

describe('dashboard-reducer: mission lifecycle', () => {
  it('startedAt is 0 until the first running flow event', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'flow', project: 'p', objective: 'do', status: 'idle' },
      T0,
    );
    expect(state.missions['p']?.startedAt).toBe(0);
    expect(state.missions['p']?.completedAt).toBeUndefined();

    state = reduce(state, { type: 'flow', project: 'p', status: 'running' }, T0 + 1);
    expect(state.missions['p']?.startedAt).toBe(T0 + 1);
  });

  it('startedAt is preserved across subsequent running events in the same lifecycle', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'flow', project: 'p', objective: 'x', status: 'running' },
      T0,
    );
    expect(state.missions['p']?.startedAt).toBe(T0);
    state = reduce(state, { type: 'flow', project: 'p', status: 'running' }, T0 + 500);
    // Latched once, not re-stamped per running event.
    expect(state.missions['p']?.startedAt).toBe(T0);
  });

  it('completedAt latches on the running→done transition and is never overwritten', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'flow', project: 'p', objective: 'x', status: 'running' },
      T0,
    );
    state = reduce(state, { type: 'flow', project: 'p', status: 'done' }, T0 + 100);
    expect(state.missions['p']?.completedAt).toBe(T0 + 100);
    // A second done event must not bump the timestamp.
    state = reduce(state, { type: 'flow', project: 'p', status: 'done' }, T0 + 999);
    expect(state.missions['p']?.completedAt).toBe(T0 + 100);
  });

  it('actionCount counts every event that names the project', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'flow', project: 'p', objective: 'x', status: 'running' },
      T0,
    );
    state = reduce(state, { type: 'agent', project: 'p', agent: 'a' }, T0 + 1);
    state = reduce(state, { type: 'log', project: 'p', message: 'hi' }, T0 + 2);
    expect(state.missions['p']?.actionCount).toBe(3);
  });

  it('actionCount auto-creates a mission bucket when first event is non-flow', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'agent', project: 'p', agent: 'a', status: 'active' },
      T0,
    );
    expect(state.missions['p']?.actionCount).toBe(1);
    expect(state.missions['p']?.objective).toBe('');
    expect(state.missions['p']?.startedAt).toBe(0);
  });

  it('a new running event after done resets the full lifecycle', () => {
    let state = initialDashboardState();
    // First lifecycle: running → some events → done
    state = reduce(
      state,
      { type: 'flow', project: 'p', objective: 'first', status: 'running' },
      T0,
    );
    state = reduce(state, { type: 'agent', project: 'p', agent: 'x' }, T0 + 1);
    state = reduce(state, { type: 'log', project: 'p', message: 'tick' }, T0 + 2);
    state = reduce(state, { type: 'flow', project: 'p', status: 'done' }, T0 + 3);
    expect(state.missions['p']?.actionCount).toBe(4);
    expect(state.missions['p']?.completedAt).toBe(T0 + 3);

    // Fresh prompt arrives — new lifecycle for the same project.
    state = reduce(
      state,
      { type: 'flow', project: 'p', objective: 'second', status: 'running' },
      T0 + 1000,
    );
    const m = state.missions['p'];
    expect(m?.completedAt).toBeUndefined();
    expect(m?.startedAt).toBe(T0 + 1000);
    // Reset → 0, then this very event bumps actionCount to 1.
    expect(m?.actionCount).toBe(1);
    expect(m?.objective).toBe('second');
    expect(m?.status).toBe('running');
  });

  it('GC despawn events do not increment actionCount', () => {
    let state = initialDashboardState();
    state = reduce(
      state,
      { type: 'flow', project: 'p', objective: 'x', status: 'running' },
      T0,
    );
    state = reduce(state, { type: 'agent', project: 'p', agent: 'a' }, T0 + 1);
    expect(state.missions['p']?.actionCount).toBe(2);
    state = reduce(
      state,
      { type: 'agent', project: 'p', agent: 'a', status: 'despawn' },
      T0 + 2,
    );
    // Despawn is GC bookkeeping, not a real action.
    expect(state.missions['p']?.actionCount).toBe(2);
  });

  it('does not pollute the default mission for events without an explicit project', () => {
    let state = initialDashboardState();
    // No project → reducer falls back to 'default'. We just verify it doesn't
    // crash and the mission map gets a single entry under the fallback slug.
    state = reduce(state, { type: 'log', message: 'hello' }, T0);
    expect(state.missions['default']?.actionCount).toBe(1);
  });
});
