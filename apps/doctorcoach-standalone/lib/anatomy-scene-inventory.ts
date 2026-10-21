import { approvedMeshLookup } from './anatomy-scene-preflight.ts';
import type { AssetReview, MeshBinding } from './anatomy-asset-admission.ts';

/** Minimal structural interface for Three.js / GLTFLoader Object3D. */
export type SceneNode = {
  name: string;
  children?: readonly SceneNode[];
  isMesh?: boolean;
};

/** Report ambiguous mesh names before a click-to-select mapping is built. */
export function duplicateMeshNodeNames(root: SceneNode): readonly string[] {
  const counts = new Map<string, number>();
  const walk = (node: SceneNode) => {
    if (node.isMesh && node.name.trim()) counts.set(node.name, (counts.get(node.name) ?? 0) + 1);
    for (const child of node.children ?? []) walk(child);
  };
  walk(root);
  return [...counts].filter(([, count]) => count > 1).map(([name]) => name);
}

/** Traverse actual loaded geometry; group nodes are not selectable meshes. */
export function inventoryMeshNodes(root: SceneNode): ReadonlySet<string> {
  const names = new Set<string>();
  const walk = (node: SceneNode) => {
    if (node.isMesh && node.name.trim()) names.add(node.name);
    for (const child of node.children ?? []) walk(child);
  };
  walk(root);
  return names;
}

/**
 * Build an exact node-name -> anatomy ID lookup only after both
 * the asset and its explicit bindings pass review.
 * No implicit matching or anatomy assertions are made.
 */
export function createApprovedSceneSelection(
  root: SceneNode,
  asset: AssetReview,
  bindings: readonly MeshBinding[],
  anatomySlugs: ReadonlySet<string>
): ReadonlyMap<string, string> {
  const duplicates = duplicateMeshNodeNames(root);
  if (duplicates.length > 0) throw new Error('Ambiguous anatomy mesh names: ' + duplicates.join(', '));
  return approvedMeshLookup(asset, bindings, anatomySlugs, inventoryMeshNodes(root));
}
