import { reviewAsset, reviewBindings, type AssetReview, type MeshBinding, type AdmissionResult } from './anatomy-asset-admission';

/**
 * Preflight for loading anatomical geometry in the DoctorCoach viewer.
 * Caller must obtain real mesh node names from the actual GLB inventory.
 * This is an authorization/validation helper, not a GLB renderer.
 */
export function reviewAnatomyScene(
  asset: AssetReview,
  bindings: readonly MeshBinding[],
  knownAnatomySlugs: ReadonlySet<string>,
  actualMeshNodeNames: ReadonlySet<string>
): AdmissionResult {
  const assetResult = reviewAsset(asset);
  const mappingResult = reviewBindings(bindings, knownAnatomySlugs, actualMeshNodeNames);
  const reasons = [...assetResult.reasons, ...mappingResult.reasons];
  return { ok: reasons.length === 0, reasons };
}

/** Only reviewed bindings may be used to build the click-to-select lookup. */
export function approvedMeshLookup(
  asset: AssetReview,
  bindings: readonly MeshBinding[],
  knownAnatomySlugs: ReadonlySet<string>,
  actualMeshNodeNames: ReadonlySet<string>
): ReadonlyMap<string, string> {
  const decision = reviewAnatomyScene(asset, bindings, knownAnatomySlugs, actualMeshNodeNames);
  if (!decision.ok) throw new Error('Anatomy scene not approved: ' + decision.reasons.join(', '));
  return new Map(bindings.map(binding => [binding.meshNodeName, binding.anatomySlug]));
}
