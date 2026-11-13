import test from 'node:test';
import assert from 'node:assert/strict';
import { israelWorkoutTime } from '../lib/retrospective-workout.ts';

test('Jerusalem workout time converts winter and summer independently of host timezone', () => {
  assert.equal(israelWorkoutTime('2026-01-20', '19:45'), '2026-01-20T17:45:00.000Z');
  assert.equal(israelWorkoutTime('2026-07-20', '19:45'), '2026-07-20T16:45:00.000Z');
  assert.equal(israelWorkoutTime('2026-07-20', '00:15'), '2026-07-19T21:15:00.000Z');
});
test('nonexistent and repeated DST wall-clock times require truthful resolution', () => {
  assert.throws(() => israelWorkoutTime('2026-03-27', '02:30'), /אינה קיימת/);
  assert.throws(() => israelWorkoutTime('2026-10-25', '01:30'), /פעמיים/);
  assert.equal(israelWorkoutTime('2026-10-25', '01:30', 'earlier'), '2026-10-24T22:30:00.000Z');
  assert.equal(israelWorkoutTime('2026-10-25', '01:30', 'later'), '2026-10-24T23:30:00.000Z');
  for (const time of ['24:00', '1:30', '13:60', 'no']) assert.throws(() => israelWorkoutTime('2026-01-20', time));
});

test('parser rejects future performed time without inventing time for date-only logs', async () => {
  const { parseRetrospectiveWorkout } = await import('../lib/retrospective-workout.ts');
  const p = { requestId: crypto.randomUUID(), version: 0, source: 'free', date: '2026-11-13', durationMinutes: null, before: null, after: null, note: '', exercises: [{ id: crypto.randomUUID(), exerciseId: 'goblet', name: '', sets: [{done: true, amount: 8, weight: 33.125, actualRpe: 7}]}] };
  const now = new Date('2026-11-13T10:00:00Z');
  assert.equal(parseRetrospectiveWorkout(p, [], now).performedAt, null);
  assert.equal(parseRetrospectiveWorkout({...p, time: '11:45'}, [], now).at, '2026-11-13T09:45:00.000Z');
  assert.throws(() => parseRetrospectiveWorkout({...p, time: '12:01'}, [], now));
});
