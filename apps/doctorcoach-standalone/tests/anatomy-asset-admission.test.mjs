import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewAsset, reviewBindings } from '../lib/anatomy-asset-admission.ts';
test('missing asset metadata is rejected', () => {
  const result = reviewAsset({assetId:'',sourceUrl:'',creator:'',licenseId:'',licenseUrl:'',attribution:'',permitsCommercialUse:false,permitsModification:false,permitsWebDistribution:false,provenanceReviewed:false,anatomicalReview:'pending'});
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes('anatomy_not_approved'));
});
test('unreviewed mesh binding is rejected', () => {
  const result = reviewBindings([{anatomySlug:'deltoid',meshNodeName:'Mesh',review:'pending'}],new Set(['deltoid']),new Set(['Mesh']));
  assert.equal(result.ok,false);
});
test('empty mesh mapping is rejected', () => {
  assert.equal(reviewBindings([],new Set(),new Set()).ok,false);
});
