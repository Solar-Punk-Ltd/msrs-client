import { describe, expect, it } from 'vitest';

import { MediaType, StateEntry, StateType } from '@/types/stream';

import {
  assertStreamListHasRoom,
  countRollingEntries,
  isStreamListFull,
  STREAM_LIST_ROLLING_LIMIT,
  streamListFullMessage,
} from './streamListCapacity';

const entry = (topic: string, overrides: Partial<StateEntry> = {}): StateEntry =>
  ({
    owner: 'owner',
    topic,
    title: topic,
    state: StateType.VOD,
    mediaType: MediaType.VIDEO,
    ...overrides,
  } as StateEntry);

const rolling = (count: number) => Array.from({ length: count }, (_, i) => entry(`s${i}`));
const archived = (count: number) => Array.from({ length: count }, (_, i) => entry(`a${i}`, { isExternal: true }));

describe('stream list capacity', () => {
  it('matches the aggregator default of ten rolling places', () => {
    expect(STREAM_LIST_ROLLING_LIMIT).toBe(10);
  });

  it('counts only rolling entries, never archived ones', () => {
    expect(countRollingEntries([...rolling(4), ...archived(7)])).toBe(4);
  });

  it('is full once every rolling place is taken', () => {
    expect(isStreamListFull(rolling(10))).toBe(true);
  });

  it('has room while a rolling place is free, however many archived entries there are', () => {
    expect(isStreamListFull([...rolling(9), ...archived(20)])).toBe(false);
  });

  it('refuses with a message the stream creator can act on', () => {
    expect(() => assertStreamListHasRoom(rolling(10))).toThrow(streamListFullMessage());
    expect(streamListFullMessage()).toMatch(/all 10 places are taken/i);
    expect(streamListFullMessage()).toMatch(/stream manager/i);
  });

  it('lets a create through while there is room', () => {
    expect(() => assertStreamListHasRoom(rolling(9))).not.toThrow();
  });
});
