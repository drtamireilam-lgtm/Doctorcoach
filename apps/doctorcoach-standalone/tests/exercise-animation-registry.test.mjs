import test from 'node:test';
import assert from 'node:assert/strict';
import {exercises} from '../lib/content.ts';
import {exerciseAnimation, interactiveExerciseAnimation, pressClipFor} from '../lib/exercise-animation-registry.ts';

test('pilot metadata connects to exact catalog identities and separates technical and anatomical status', () => {
  for (const id of ['barbell-bench', 'back-squat', 'barbell-curl']) {
    assert.equal(exercises.filter(exercise => exercise.id === id).length, 1);
    assert.equal(exerciseAnimation(id)?.exerciseId, id);
    assert.equal(exerciseAnimation(id)?.review, 'pending');
    assert.equal(interactiveExerciseAnimation(id, false), undefined);
  }
  assert.equal(interactiveExerciseAnimation('barbell-curl', true)?.technicalStatus, 'prototype');
  assert.equal(interactiveExerciseAnimation('barbell-bench', true), undefined);
  assert.equal(interactiveExerciseAnimation('back-squat', true), undefined);
});

test('unmatched names and other catalog variants never inherit an interactive demonstration', () => {
  for (const id of [undefined, null, '', 'Barbell Curl', 'hammer-curl', 'bench', 'incline-barbell-bench', 'front-squat']) {
    assert.equal(interactiveExerciseAnimation(id, true), undefined);
  }
});

test('the existing clips remain available for the matching catalog entries only', () => {
  assert.equal(pressClipFor('barbell-bench'), 'bench');
  assert.equal(pressClipFor('overhead-press'), 'overhead');
  for (const id of ['bench', 'movement-chest-press', 'movement-overhead-press', 'back-squat', 'Flat bench press']) {
    assert.equal(pressClipFor(id), undefined);
  }
});
