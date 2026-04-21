import { describe, it, expect } from 'vitest';
import { PHASES, ROOM_BY_PHASE } from '../src/events/types.js';

describe('sanity', () => {
  it('has six phases in canonical order', () => {
    expect(PHASES).toEqual(['PROMPT', 'PLAN', 'BUILD', 'REVIEW', 'TEST', 'DEPLOY']);
  });

  it('maps every phase to a room', () => {
    for (const phase of PHASES) {
      expect(ROOM_BY_PHASE[phase]).toBeTruthy();
    }
  });
});
