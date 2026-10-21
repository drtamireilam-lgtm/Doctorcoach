import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewAnatomyScene, approvedMeshLookup } from '../lib/anatomy-scene-preflight.ts';

const asset = {
  assetId: 'example-shoulder', sourceUrl: 'https://example.org/shoulder',
  creator: 'Example author', licenseId: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: 'Example author', permitsCommercialUse: true,
  permitsModification: true, permitsWebDistribution: true,
  provenanceReviewed: true, anatomicalReview: 'approved',
};
const bindings = [{ anatomySlug: 'deltoid', meshNodeName: 'DeltoidMesh', review: 'approved' }];

test('preflight accepts complete approved review records', () => {
  assert.equal(reviewAnatomyScene(asset, bindings, new Set(['deltoid']), new Set(['DeltoidMesh'])).ok, true);
  assert.equal(approvedMeshLookup(asset, bindings, new Set(['deltoid']), new Set(['DeltoidMesh'])).get('DeltoidMesh'), 'deltoid');
});

test('preflight fails closed on unreviewed anatomy', () => {
  const decision = reviewAnatomyScene({...asset, anatomicalReview: 'pending'}, bindings, new Set(['deltoid']), new Set(['DeltoidMesh']));
  assert.equal(decision.ok, false);
  assert.ok(decision.reasons.includes('anatomy_not_approved'));
});

test('preflight rejects a missing mesh node', () => {
  assert.throws(() => approvedMeshLookup(asset, bindings, new Set(['deltoid']), new Set(['OtherMesh'])), /unknown_mesh/);
});

test('preflight rejects duplicate mappings', () => {
  const decision = reviewAnatomyScene(asset, [...bindings, ...bindings], new Set(['deltoid']), new Set(['DeltoidMesh']));
  assert.equal(decision.ok, false);
  assert.ok(decision.reasons.includes('duplicate_mesh:DeltoidMesh'));
});
