import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryMeshNodes, createApprovedSceneSelection } from '../lib/anatomy-scene-inventory.ts';

const tree = { name: 'Root', children: [
  { name: 'ShoulderGroup', children: [
    { name: 'DeltoidMesh', isMesh: true },
    { name: 'ScapulaMesh', isMesh: true }
  ] },
  { name: 'EmptyGroup', isMesh: false }
] };
const asset = {
  assetId: 'reviewed-test-fixture', sourceUrl: 'https://example.org/model',
  creator: 'Test fixture author', licenseId: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: 'Test fixture', permitsCommercialUse: true,
  permitsModification: true, permitsWebDistribution: true,
  provenanceReviewed: true, anatomicalReview: 'approved'
};

test('mesh inventory traverses nested geometry and excludes groups', () => {
  assert.deepEqual([...inventoryMeshNodes(tree)].sort(), ['DeltoidMesh', 'ScapulaMesh']);
});

test('approved selection uses exact mesh node names', () => {
  const lookup = createApprovedSceneSelection(tree, asset,
    [{ anatomySlug: 'deltoid', meshNodeName: 'DeltoidMesh', review: 'approved' }],
    new Set(['deltoid']));
  assert.equal(lookup.get('DeltoidMesh'), 'deltoid');
});

test('selection rejects mesh names absent from the actual geometry', () => {
  assert.throws(() => createApprovedSceneSelection(tree, asset,
    [{ anatomySlug: 'deltoid', meshNodeName: 'NotInGLB', review: 'approved' }],
    new Set(['deltoid'])), /unknown_mesh/);
});
