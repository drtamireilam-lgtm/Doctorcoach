import * as THREE from 'three';

/** Presentation only: source meshes, normals, textures and anatomical IDs stay intact. */
export function prepareAnatomyMaterials(meshes: THREE.Mesh[], layers: ReadonlyMap<string, string>) {
  const originals = new Set<THREE.Material>();
  for (const mesh of meshes) {
    const layer = layers.get(mesh.name);
    const prepare = (source: THREE.Material) => {
      originals.add(source);
      const material = source.clone();
      if (material instanceof THREE.MeshStandardMaterial) {
        material.metalness = 0;
        material.roughness = layer === 'muscle' ? 0.66 : layer === 'bone' ? 0.84 : layer === 'cartilage' ? 0.46 : 0.74;
        // Modest highlights describe the surface without making tissue look lacquered.
        material.envMapIntensity = 0.3;
      }
      return material;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(prepare) : prepare(mesh.material);
  }
  // Materials own no source textures; cloning keeps maps shared and untouched.
  for (const material of originals) material.dispose();
}

export function anatomyColor(layer: string, selected: boolean): THREE.ColorRepresentation {
  if (selected) return '#49c7d2';
  if (layer === 'bone') return '#ded4bc';
  if (layer === 'surface' || layer === 'cartilage') return '#81999e';
  return '#9e4541';
}

export function lightAnatomyScene(scene: THREE.Scene, center: THREE.Vector3, size: THREE.Vector3) {
  // Lights scale with the model: a regional joint and a whole body use the same setup.
  const span = Math.max(size.x, size.y, size.z, 0.001);
  scene.add(new THREE.HemisphereLight(0xf3f5f7, 0x243342, 0.65));
  const add = (color: number, intensity: number, x: number, y: number, z: number) => {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.copy(center).add(new THREE.Vector3(x, y, z).multiplyScalar(span));
    light.target.position.copy(center);
    scene.add(light, light.target);
  };
  add(0xfff4eb, 2.25, -1.8, 1.3, 1.6);
  add(0xe3edff, 0.9, 1.7, 0.4, 0.8);
  add(0xf4f7ff, 1.4, 0.6, 1, -1.8);
}
