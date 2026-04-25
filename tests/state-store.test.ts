import { describe, it, expect } from 'vitest';
import { createStateStore } from '../src/server/state-store.js';
import { pruneStale } from '../src/state/dashboard-reducer.js';

describe('createStateStore', () => {
  it('starts at an empty-ish initial state', () => {
    const store = createStateStore();
    const s = store.get();
    expect(s.agents).toEqual({});
    expect(s.logLines).toEqual([]);
    expect(s.missions).toEqual({});
    expect(s.latestProject).toBeNull();
  });

  it('applies flow + agent events', () => {
    const store = createStateStore();
    store.apply({
      type: 'flow',
      project: 'proj',
      objective: 'Ship fix',
      status: 'active',
      progress: 42,
    });
    store.apply({
      type: 'agent',
      project: 'proj',
      agent: 'worker',
      phase: 'BUILD',
      status: 'active',
    });
    const s = store.get();
    expect(s.latestProject).toBe('proj');
    expect(s.missions['proj']?.objective).toBe('Ship fix');
    expect(s.missions['proj']?.progress).toBe(42);
    expect(s.agents['proj::worker']?.phase).toBe('BUILD');
    expect(s.agents['proj::worker']?.status).toBe('active');
  });

  it('swallows thrown errors (never fail loud)', () => {
    const store = createStateStore();
    // Malformed event missing required fields — the reducer is total so this
    // won't throw today, but even if a future refactor changes that, apply()
    // must not propagate.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => store.apply({ type: 'agent' } as any)).not.toThrow();
  });

  it('snapshot round-trips through JSON without loss', () => {
    const store = createStateStore();
    store.apply({
      type: 'flow',
      project: 'proj',
      objective: 'Write tests',
      status: 'active',
      progress: 10,
    });
    store.apply({
      type: 'agent',
      project: 'proj',
      agent: 'dev',
      phase: 'PLAN',
      status: 'active',
      task: 'drafting',
    });
    store.apply({ type: 'log', project: 'proj', message: 'hello' });

    const snapshot = store.get();
    const roundTripped = JSON.parse(JSON.stringify(snapshot));
    expect(roundTripped).toEqual(snapshot);
    // Shape sanity: all keys the web client expects are present on the wire.
    expect(Object.keys(roundTripped).sort()).toEqual(
      ['agents', 'flow', 'lastEventAt', 'latestProject', 'logLines', 'missions'].sort(),
    );
  });

  it('mission lifecycle: startedAt latches on first running flow event', () => {
    const store = createStateStore();
    store.apply({ type: 'flow', project: 'p', objective: 'do thing', status: 'running' });
    const s1 = store.get();
    expect(s1.missions['p']?.startedAt).toBeGreaterThan(0);
    expect(s1.missions['p']?.completedAt).toBeUndefined();
  });

  it('mission lifecycle: completedAt latches on running→done', () => {
    const store = createStateStore();
    store.apply({ type: 'flow', project: 'p', objective: 'ship', status: 'running' });
    store.apply({ type: 'flow', project: 'p', status: 'done' });
    const s = store.get();
    expect(s.missions['p']?.completedAt).toBeGreaterThan(0);
    const completedAt = s.missions['p']?.completedAt;
    // A subsequent done event must not overwrite the original completedAt.
    store.apply({ type: 'flow', project: 'p', status: 'done' });
    expect(store.get().missions['p']?.completedAt).toBe(completedAt);
  });

  it('mission lifecycle: actionCount increments per project event', () => {
    const store = createStateStore();
    store.apply({ type: 'flow', project: 'p', objective: 'work', status: 'running' });
    store.apply({ type: 'agent', project: 'p', agent: 'a', status: 'active' });
    store.apply({ type: 'log', project: 'p', message: 'hi' });
    expect(store.get().missions['p']?.actionCount).toBe(3);
  });

  it('mission lifecycle: a fresh running event resets the lifecycle', () => {
    const store = createStateStore();
    store.apply({ type: 'flow', project: 'p', objective: 'a', status: 'running' });
    store.apply({ type: 'agent', project: 'p', agent: 'x', status: 'active' });
    store.apply({ type: 'flow', project: 'p', status: 'done' });
    expect(store.get().missions['p']?.completedAt).toBeDefined();
    const firstStartedAt = store.get().missions['p']?.startedAt ?? 0;
    // New prompt → new session for the same project.
    store.apply({ type: 'flow', project: 'p', objective: 'b', status: 'running' });
    const after = store.get().missions['p'];
    expect(after?.completedAt).toBeUndefined();
    expect(after?.startedAt).toBeGreaterThanOrEqual(firstStartedAt);
    // actionCount was reset, then this running event itself bumped it to 1.
    expect(after?.actionCount).toBe(1);
  });

  it('pruneStale on a live store removes only the stale agent', () => {
    const store = createStateStore();
    const now = Date.now();
    // Build state via raw reducer calls at fixed timestamps by going through
    // the store + time-sensitive API is not exposed, so we build state fresh
    // via the exported reducer through pruneStale's pure check:
    store.apply({ type: 'agent', project: 'p', agent: 'active', status: 'active' });
    store.apply({ type: 'agent', project: 'p', agent: 'done', status: 'done' });
    const s = store.get();
    // Fake the done agent's updatedAt to be past TTL.
    const fakedAgents = {
      ...s.agents,
    };
    const doneKey = 'p::done';
    const done = fakedAgents[doneKey];
    if (!done) throw new Error('test fixture: missing done agent');
    fakedAgents[doneKey] = { ...done, updatedAt: now - 120_000 };
    const fakedState = { ...s, agents: fakedAgents };
    const pruned = pruneStale(fakedState, now, 60_000);
    expect(pruned.agents['p::active']).toBeDefined();
    expect(pruned.agents['p::done']).toBeUndefined();
  });
});
