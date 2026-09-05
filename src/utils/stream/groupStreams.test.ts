import { describe, expect, it } from 'vitest';

import { MediaType, StateEntry, StateType } from '@/types/stream';

import { groupStreams } from './groupStreams';

const NOW = Date.parse('2026-08-25T12:00:00.000Z');

function makeStream(overrides: Partial<StateEntry>): StateEntry {
  return {
    title: 'stream',
    state: StateType.VOD,
    owner: '0xowner',
    topic: 'topic',
    mediaType: MediaType.VIDEO,
    createdAt: NOW - 1000,
    updatedAt: NOW - 1000,
    ...overrides,
  };
}

describe('groupStreams', () => {
  it('puts live streams first, most recently updated on top', () => {
    const a = makeStream({ title: 'a', state: StateType.LIVE, updatedAt: 1 });
    const b = makeStream({ title: 'b', state: StateType.LIVE, updatedAt: 2 });
    const { live } = groupStreams([a, b], NOW);
    expect(live.map((s) => s.title)).toEqual(['b', 'a']);
  });

  it('features the scheduled stream with the earliest future start time', () => {
    const past = makeStream({ title: 'past', state: StateType.SCHEDULED, scheduledStartTime: '2026-08-01T17:00:00Z' });
    const soon = makeStream({ title: 'soon', state: StateType.SCHEDULED, scheduledStartTime: '2026-08-27T17:00:00Z' });
    const later = makeStream({
      title: 'later',
      state: StateType.SCHEDULED,
      scheduledStartTime: '2026-09-24T17:00:00Z',
    });
    const { next, upcoming } = groupStreams([later, past, soon], NOW);
    expect(next?.title).toBe('soon');
    expect(upcoming.map((s) => s.title)).toEqual(['past', 'later']);
  });

  it('lets a pinned scheduled stream override the featured slot', () => {
    const soon = makeStream({ title: 'soon', state: StateType.SCHEDULED, scheduledStartTime: '2026-08-27T17:00:00Z' });
    const pinned = makeStream({
      title: 'pinned',
      state: StateType.SCHEDULED,
      scheduledStartTime: '2026-09-24T17:00:00Z',
      pinned: true,
    });
    const { next } = groupStreams([soon, pinned], NOW);
    expect(next?.title).toBe('pinned');
  });

  it('falls back to the earliest scheduled stream when none are in the future', () => {
    const older = makeStream({
      title: 'older',
      state: StateType.SCHEDULED,
      scheduledStartTime: '2026-07-01T17:00:00Z',
    });
    const newer = makeStream({
      title: 'newer',
      state: StateType.SCHEDULED,
      scheduledStartTime: '2026-08-01T17:00:00Z',
    });
    const { next, upcoming } = groupStreams([newer, older], NOW);
    expect(next?.title).toBe('older');
    expect(upcoming.map((s) => s.title)).toEqual(['newer']);
  });

  it('sorts past streams newest first and returns null next when nothing is scheduled', () => {
    const a = makeStream({ title: 'a', createdAt: 1 });
    const b = makeStream({ title: 'b', createdAt: 2 });
    const { next, past, upcoming } = groupStreams([a, b], NOW);
    expect(next).toBeNull();
    expect(upcoming).toEqual([]);
    expect(past.map((s) => s.title)).toEqual(['b', 'a']);
  });

  it('does not let an undated scheduled stream win the featured slot over past dated ones', () => {
    const pastA = makeStream({
      title: 'pastA',
      state: StateType.SCHEDULED,
      scheduledStartTime: '2026-07-01T17:00:00Z',
    });
    const pastB = makeStream({
      title: 'pastB',
      state: StateType.SCHEDULED,
      scheduledStartTime: '2026-08-01T17:00:00Z',
    });
    const undated = makeStream({ title: 'undated', state: StateType.SCHEDULED });
    const { next, upcoming } = groupStreams([undated, pastB, pastA], NOW);
    expect(next?.title).toBe('pastA');
    expect(upcoming.map((s) => s.title)).toEqual(['pastB', 'undated']);
  });

  it('orders past streams by when they happened, not when their entry was created', () => {
    // placeholder created early but held last (like a scheduled community call)
    const call = makeStream({
      title: 'call',
      createdAt: NOW - 7 * 86_400_000,
      scheduledStartTime: '2026-08-25T09:00:00Z', // held most recently
    });
    const adhoc = makeStream({ title: 'adhoc', createdAt: NOW - 86_400_000 }); // created later, no schedule
    const older = makeStream({ title: 'older', createdAt: NOW - 10 * 86_400_000 });
    const { past } = groupStreams([adhoc, call, older], NOW);
    expect(past.map((s) => s.title)).toEqual(['call', 'adhoc', 'older']);
  });

  it('treats scheduled streams without a parseable start time as furthest in the future', () => {
    const soon = makeStream({ title: 'soon', state: StateType.SCHEDULED, scheduledStartTime: '2026-08-27T17:00:00Z' });
    const undated = makeStream({ title: 'undated', state: StateType.SCHEDULED });
    const { next, upcoming } = groupStreams([undated, soon], NOW);
    expect(next?.title).toBe('soon');
    expect(upcoming.map((s) => s.title)).toEqual(['undated']);
  });
});
