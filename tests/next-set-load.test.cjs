const test = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { suggestedNextLoad, estimateE1RM } = require(join(process.env.DOCTORCOACH_TEST_BUILD, 'domain.js'));

function numeric(result) { return Number(result.replace(' kg', '')); }

test('raises load proportionally for RPE 6 to target RPE 8', () => {
  const load = numeric(suggestedNextLoad({ load: 80, reps: 8, effort: 6 }, 8, 'RPE'));
  assert.equal(load, 84);
});

test('lowers load for an overshot RPE target', () => {
  const load = numeric(suggestedNextLoad({ load: 100, reps: 8, effort: 9 }, 7, 'RPE'));
  assert.ok(load < 100 && load > 90);
});

test('maintains exact load when actual effort matches target', () => {
  assert.equal(suggestedNextLoad({ load: 80, reps: 8, effort: 8 }, 8, 'RPE'), '80 kg');
});

test('RIR equivalent yields the same recommendation', () => {
  assert.equal(suggestedNextLoad({ load: 80, reps: 8, effort: 4 }, 2, 'RIR'),
    suggestedNextLoad({ load: 80, reps: 8, effort: 6 }, 8, 'RPE'));
});

test('recommendations are not rounded to plate increments', () => {
  const result = numeric(suggestedNextLoad({ load: 83, reps: 7, effort: 6 }, 8, 'RPE'));
  assert.ok(Number.isFinite(result));
  assert.notEqual(result * 2, Math.round(result * 2));
});

test('missing or invalid inputs do not yield load recommendations', () => {
  assert.equal(suggestedNextLoad({ load: 0, reps: 8, effort: 8 }, 8, 'RPE'), 'Enter load');
  assert.equal(suggestedNextLoad({ load: 80, reps: 0, effort: 8 }, 8, 'RPE'), 'Enter reps');
  assert.equal(suggestedNextLoad({ load: 80, reps: 8, effort: 11 }, 8, 'RPE'), 'Invalid RPE');
  assert.equal(suggestedNextLoad({ load: 80, reps: 8, effort: -1 }, 2, 'RIR'), 'Invalid RIR');
});

test('e1RM matches effective reps formula', () => {
  assert.equal(estimateE1RM({ load: 80, reps: 8, effort: 6 }, 'RPE'), 112);
});
