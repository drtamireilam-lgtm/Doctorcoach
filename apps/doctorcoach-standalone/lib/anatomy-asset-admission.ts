/**
 * DoctorCoach anatomy 3D asset admission gate.
 * No model is medically validated merely because its node names match.
 * This module has no network, filesystem, or production side effects.
 */
export type AssetReview = {
  assetId: string;
  sourceUrl: string;
  creator: string;
  licenseId: string;
  licenseUrl: string;
  attribution: string;
  permitsCommercialUse: boolean;
  permitsModification: boolean;
  permitsWebDistribution: boolean;
  provenanceReviewed: boolean;
  anatomicalReview: 'pending' | 'approved' | 'rejected';
};
export type MeshBinding = {
  anatomySlug: string;
  meshNodeName: string;
  review: 'pending' | 'approved' | 'rejected';
};
export type AdmissionResult = { ok: boolean; reasons: string[] };
const nonEmpty = (value: string) => value.trim().length > 0;
/** Fail closed: a license claim is not itself a verified grant of rights. */
export function reviewAsset(asset: AssetReview): AdmissionResult {
  const reasons: string[] = [];
  if (!nonEmpty(asset.assetId)) reasons.push('missing_asset_id');
  if (!/^https:\/\//.test(asset.sourceUrl)) reasons.push('invalid_source_url');
  if (!nonEmpty(asset.creator)) reasons.push('missing_creator');
  if (!nonEmpty(asset.licenseId) || !/^https:\/\//.test(asset.licenseUrl)) reasons.push('missing_license_evidence');
  if (!nonEmpty(asset.attribution)) reasons.push('missing_attribution');
  if (!asset.permitsCommercialUse) reasons.push('commercial_use_not_cleared');
  if (!asset.permitsModification) reasons.push('modification_not_cleared');
  if (!asset.permitsWebDistribution) reasons.push('web_distribution_not_cleared');
  if (!asset.provenanceReviewed) reasons.push('provenance_not_reviewed');
  if (asset.anatomicalReview !== 'approved') reasons.push('anatomy_not_approved');
  return { ok: reasons.length === 0, reasons };
}
/**
 * Validate exact mesh-node bindings against the supplied asset inventory.
 * Never infer anatomical correctness from names or fuzzy matching.
 */
export function reviewBindings(
  bindings: readonly MeshBinding[],
  anatomySlugs: ReadonlySet<string>,
  meshNodeNames: ReadonlySet<string>
): AdmissionResult {
  const reasons: string[] = [];
  const usedSlugs = new Set<string>();
  const usedNodes = new Set<string>();
  for (const binding of bindings) {
    if (!anatomySlugs.has(binding.anatomySlug)) reasons.push('unknown_anatomy:' + binding.anatomySlug);
    if (!meshNodeNames.has(binding.meshNodeName)) reasons.push('unknown_mesh:' + binding.meshNodeName);
    if (usedSlugs.has(binding.anatomySlug)) reasons.push('duplicate_anatomy:' + binding.anatomySlug);
    if (usedNodes.has(binding.meshNodeName)) reasons.push('duplicate_mesh:' + binding.meshNodeName);
    if (binding.review !== 'approved') reasons.push('binding_not_approved:' + binding.anatomySlug);
    usedSlugs.add(binding.anatomySlug);
    usedNodes.add(binding.meshNodeName);
  }
  if (bindings.length === 0) reasons.push('no_bindings');
  return { ok: reasons.length === 0, reasons };
}
