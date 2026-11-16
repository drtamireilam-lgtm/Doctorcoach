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
        material.roughness = layer === 'muscle' ? 0.82 : layer === 'bone' ? 0.9 : 0.72;
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
  scene.add(new THREE.HemisphereLight(0xfff3e5, 0x26384a, 0.9));
  const add = (color: number, intensity: number, x: number, y: number, z: number) => {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.copy(center).add(new THREE.Vector3(x, y, z).multiplyScalar(span));
    light.target.position.copy(center);
    scene.add(light, light.target);
  };
  add(0xffeee1, 2.5, -1.5, 1.5, 2);
  add(0xd5e7ff, 0.85, 1.5, 0.3, 1);
  add(0xffe5d0, 1.8, 0.5, 1, -2);
}
