import { createDetailedHuman } from './detailed-humans.js?v=6';
import { createDetailedFloat } from './detailed-floats.js?v=6';
import { createHeroOutfit } from './hero-outfit.js?v=2';

// Baking static details together preserves the animated pivots while avoiding one
// mobile draw call per eye, tuft, shoelace or sprinkle. Keep indices to avoid
// expanding every sphere into three vertices per triangle.
function mergeStaticMeshes(THREE, scope, recursive = false) {
  scope.updateWorldMatrix(true, true);
  const byMaterial = new Map();
  const add = item => {
    if (!item.isMesh || Array.isArray(item.material)) return;
    if (!byMaterial.has(item.material)) byMaterial.set(item.material, []);
    byMaterial.get(item.material).push(item);
  };
  if (recursive) scope.traverse(add);
  else scope.children.forEach(add);
  const inverse = scope.matrixWorld.clone().invert();
  const transform = new THREE.Matrix4();
  const normalTransform = new THREE.Matrix3();
  const vertex = new THREE.Vector3();
  for (const [material, parts] of byMaterial) {
    if (parts.length < 2) continue;
    let vertexCount = 0, indexCount = 0;
    for (const part of parts) {
      const geometry = part.geometry;
      vertexCount += geometry.attributes.position.count;
      indexCount += geometry.index ? geometry.index.count : geometry.attributes.position.count;
    }
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
    let vertexOffset = 0, indexOffset = 0;
    for (const part of parts) {
      const source = part.geometry;
      const { position, normal, uv } = source.attributes;
      transform.multiplyMatrices(inverse, part.matrixWorld);
      normalTransform.getNormalMatrix(transform);
      for (let n = 0; n < position.count; n++) {
        const target = vertexOffset + n;
        vertex.fromBufferAttribute(position, n).applyMatrix4(transform);
        vertex.toArray(positions, target * 3);
        if (normal) {
          vertex.fromBufferAttribute(normal, n).applyMatrix3(normalTransform).normalize();
          vertex.toArray(normals, target * 3);
        }
        if (uv) {
          uvs[target * 2] = uv.getX(n);
          uvs[target * 2 + 1] = uv.getY(n);
        }
      }
      const count = source.index ? source.index.count : position.count;
      for (let n = 0; n < count; n++) indices[indexOffset + n] = vertexOffset + (source.index ? source.index.getX(n) : n);
      vertexOffset += position.count;
      indexOffset += count;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeBoundingSphere();
    const combined = new THREE.Mesh(geometry, material);
    combined.name = `${scope.name || 'detail'}-merged`;
    combined.castShadow = true;
    combined.receiveShadow = true;
    combined.userData.ownsGeometry = true;
    scope.add(combined);
    for (const part of parts) {
      part.removeFromParent();
      if (part.userData.ownsGeometry) part.geometry.dispose();
    }
  }
}

export function createRider(THREE, actor = {}) {
  const id = Number(actor.id || 0) % 5;
  const root = new THREE.Group();
  root.name = `rider-${id}`;
  const ring = createDetailedFloat(THREE,id);
  const headRestored = id === 0 && actor.variant !== 'previous';
  let human;
  if (headRestored) {
    human = createHeroOutfit(THREE);
    // Keep the newer outfit and seated pose, but restore the previous head
    // without reshaping its geometry, facial UVs, hair or proportions.
    const previous = createDetailedHuman(THREE, id);
    human.head = previous.head;
    human.head.removeFromParent();
    human.head.position.set(0, 0, 0);
    human.headAnchor.position.y += .048;
    human.headAnchor.add(human.head);
    human.body.userData.referenceFace = previous.body.userData.referenceFace;
    // Temporary outfit meshes own only some geometry; the materials, atlas and
    // unmarked geometry remain shared with the restored head and other riders.
    const discarded = new Set();
    previous.body.traverse(item => {
      if (item.isMesh && item.userData.ownsGeometry) discarded.add(item.geometry);
    });
    discarded.forEach(geometry => geometry.dispose());
  } else human = createDetailedHuman(THREE,id);
  root.add(ring,human.body);
  root.traverse(item=>{if(item.isMesh&&item.material.envMapIntensity!==undefined)item.material.envMapIntensity=.42;});
  mergeStaticMeshes(THREE,ring,true);
  mergeStaticMeshes(THREE,human.head,true);
  human.arms.forEach(arm=>mergeStaticMeshes(THREE,arm,true));
  human.legs.forEach(leg=>mergeStaticMeshes(THREE,leg,true));
  human.mergeScopes?.forEach(scope=>mergeStaticMeshes(THREE,scope,true));
  mergeStaticMeshes(THREE,human.body);
  root.userData.forwardAxis = '+Z';
  root.userData.actorId = id;
  root.userData.detailLevel = headRestored ? 'head-restored' : 'reference-reconstruction';
  return {
    root,ring,...human,
    dispose() {
      root.traverse(item=>{if(item.isMesh&&item.userData.ownsGeometry)item.geometry.dispose();});
      root.removeFromParent();
    }
  };
}
