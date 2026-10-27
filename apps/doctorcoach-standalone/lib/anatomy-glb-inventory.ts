/** Read the node inventory from a GLB 2.0 header and JSON chunk. */
export function inspectGlb(buffer: ArrayBuffer): { meshNodeNames: string[]; meshCount: number } {
  if (buffer.byteLength > 50 * 1024 * 1024) throw new Error('GLB exceeds 50MB');
  const view = new DataView(buffer);
  if (buffer.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) throw new Error('Invalid GLB magic');
  if (view.getUint32(4, true) !== 2) throw new Error('Unsupported GLB version');
  if (view.getUint32(8, true) !== buffer.byteLength) throw new Error('GLB length mismatch');
  const chunkLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || chunkLength > buffer.byteLength - 20) throw new Error('Invalid GLB JSON chunk');
  let json: unknown;
  try { json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, chunkLength))); }
  catch { throw new Error('Invalid GLB JSON'); }
  const checkUris = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'uri') throw new Error('External resources are not allowed in self-contained GLB');
      checkUris(child);
    }
  };
  checkUris(json);
  if (!json || typeof json !== 'object') throw new Error('Invalid glTF document');
  const doc = json as { asset?: { version?: string }; meshes?: unknown[]; nodes?: Array<{ name?: unknown; mesh?: unknown }> };
  if (doc.asset?.version !== '2.0') throw new Error('Invalid glTF asset version');
  const meshes = doc.meshes ?? [];
  if (!Array.isArray(meshes)) throw new Error('Invalid glTF meshes');
  const nodes = doc.nodes ?? [];
  if (!Array.isArray(nodes)) throw new Error('Invalid glTF nodes');
  const names: string[] = [];
  for (const node of nodes) {
    if (!node || typeof node !== 'object' || node.mesh === undefined) continue;
    if (!Number.isInteger(node.mesh) || (node.mesh as number) < 0 || (node.mesh as number) >= meshes.length) throw new Error('Invalid mesh index');
    if (typeof node.name === 'string' && node.name.trim()) {
      if (names.includes(node.name)) throw new Error('Duplicate mesh node name: ' + node.name);
      names.push(node.name);
    }
  }
  return { meshNodeNames: names, meshCount: meshes.length };
}
