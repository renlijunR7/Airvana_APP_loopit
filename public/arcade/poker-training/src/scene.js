import * as THREE from '../vendor/three.module.js';
import { CAMERA_LIMITS, resolveOrbit } from './camera-rig.js';
import { SCENE_THEMES, getSceneTheme } from './scene-themes.js';
import { buildVegas } from './environments/vegas.js';
import { buildBeach } from './environments/beach.js';
import { buildGala } from './environments/gala.js?v=1.2.1';

// All scenery is live geometry. No screenshot or pre-rendered room is used.
const TAU = Math.PI * 2;
const TABLE_Y = 1.42;
const SEATS = Array.from({ length: 6 }, (_, i) => {
  const a = i * TAU / 6;
  return { seat: i, angle: a, x: Math.sin(a) * 4.05, z: Math.cos(a) * 2.45 };
});


function noiseCanvas(width, height, base, grain = 9) {
  const c = document.createElement('canvas'); c.width = width; c.height = height;
  const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, width, height);
  const data = x.getImageData(0, 0, width, height);
  let seed = 301;
  for (let i = 0; i < data.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const n = ((seed / 2147483647) - .5) * grain;
    data.data[i] += n; data.data[i + 1] += n; data.data[i + 2] += n;
  }
  x.putImageData(data, 0, 0); return c;
}
function textureFrom(canvas, repeat = 1) {
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); return t;
}
function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .7, metalness: 0, ...options });
}
function mesh(geo, material, parent, position = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, material); m.position.set(...position);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function box(parent, material, pos, size, bevel = 0) {
  return mesh(new THREE.BoxGeometry(...size), material, parent, pos);
}
function sphere(parent, material, pos, scale, detail = 20) {
  const m = mesh(new THREE.SphereGeometry(1, detail, 14), material, parent, pos);
  m.scale.set(...scale); return m;
}
function cylinder(parent, material, pos, r1, r2, h, segments = 24) {
  return mesh(new THREE.CylinderGeometry(r1, r2, h, segments), material, parent, pos);
}
function between(parent, material, a, b, r1, r2 = r1) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const delta = end.clone().sub(start);
  const m = cylinder(parent, material, start.add(end).multiplyScalar(.5).toArray(), r2, r1, delta.length(), 14);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return m;
}
function ellipse(parent, material, y, rx, rz, h, segments = 96) {
  const m = cylinder(parent, material, [0, y, 0], 1, 1, h, segments); m.scale.set(rx, 1, rz); return m;
}
function ellipseLine(parent, material, y, rx, rz, tube = .018) {
  const pts = Array.from({ length: 121 }, (_, i) => new THREE.Vector3(Math.sin(i * TAU / 120) * rx, y, Math.cos(i * TAU / 120) * rz));
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, tube, 5, true), material, parent);
}
function labelTexture(text, foreground = '#d9bb74', background = null, width = 512, height = 128) {
  const c = document.createElement('canvas'); c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, width, height); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = foreground;
  let fontSize = Math.floor(height * .43);
  ctx.font = `500 ${fontSize}px Georgia, serif`;
  const textWidth = ctx.measureText(text).width;
  if (textWidth > width * .94) { fontSize *= width * .94 / textWidth; ctx.font = `500 ${fontSize}px Georgia, serif`; }
  ctx.fillText(text, width / 2, height / 2);
  return textureFrom(c);
}
function textPlane(parent, text, pos, width, height, color, background) {
  const material = new THREE.MeshBasicMaterial({ map: labelTexture(text, color, background), transparent: !background, side: THREE.DoubleSide, depthWrite: false });
  return mesh(new THREE.PlaneGeometry(width, height), material, parent, pos);
}
function buildFeltTexture(color) {
  const c = noiseCanvas(1024, 512, color, 16), x = c.getContext('2d');
  x.strokeStyle = 'rgba(229,211,149,.025)'; x.lineWidth = 1;
  for (let y = 0; y < 512; y += 12) for (let px = 0; px < 1024; px += 12) {
    x.beginPath(); x.moveTo(px, y); x.lineTo(px + 6, y + 6); x.lineTo(px, y + 12); x.stroke();
  }
  return textureFrom(c, 2);
}

// Material-based static batching keeps the detailed room inexpensive on phones.
function bakeStatic(root) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(), batches = new Map(), removed = [];
  root.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh || o.parent?.userData.noBatch || Array.isArray(o.material) || o.material.transparent) return;
    const m = o.material;
    const key = [m.type, m.color?.getHex(), m.emissive?.getHex(), m.emissiveIntensity, m.roughness, m.metalness, m.map?.uuid, m.side, m.opacity].join('|');
    const geometry = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, o.matrixWorld));
    if (!batches.has(key)) batches.set(key, { material: m, parts: [] });
    batches.get(key).parts.push(geometry); removed.push(o);
  });
  for (const { material, parts } of batches.values()) {
    const geometry = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const components = name === 'uv' ? 2 : 3;
      const total = parts.reduce((sum, g) => sum + g.attributes.position.count * components, 0);
      const merged = new Float32Array(total); let offset = 0;
      for (const p of parts) {
        if (p.attributes[name]) merged.set(p.attributes[name].array, offset);
        offset += p.attributes.position.count * components;
      }
      geometry.setAttribute(name, new THREE.BufferAttribute(merged, components));
    }
    geometry.computeBoundingSphere(); mesh(geometry, material, root); parts.forEach(g => g.dispose());
  }
  removed.forEach(o => o.parent?.remove(o));
}

function collectResourcesFromMaterials(materials) {
  const result = { geometries: new Set(), materials: new Set(materials), textures: new Set() };
  for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) result.textures.add(value);
  return result;
}
function collectResources(root) {
  const geometries = new Set(), materials = new Set();
  root.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
  });
  return { ...collectResourcesFromMaterials(materials), geometries };
}
function unionResources(a, b) {
  return Object.fromEntries(Object.keys(a).map(key => [key, new Set([...a[key], ...b[key]])]));
}
function releaseResources(resources, retained = { geometries: new Set(), materials: new Set(), textures: new Set() }) {
  for (const key of Object.keys(resources)) for (const value of resources[key]) if (!retained[key].has(value)) value.dispose();
}

function buildTable(scene, materials) {
  const table = new THREE.Group(); scene.add(table);
  const { wood, brass, black, felt } = materials;
  // Pedestal and carved supports remain visible below the leather rail.
  box(table, wood, [0, .63, 0], [4.3, 1.13, 1.02]);
  for (const x of [-2.25, 2.25]) {
    cylinder(table, wood, [x, .66, 0], .3, .45, 1.2, 24);
    sphere(table, brass, [x, .17, 0], [.6, .10, .58]);
    cylinder(table, brass, [x, .58, 0], .306, .31, .06, 24);
  }
  ellipse(table, wood, TABLE_Y - .18, 4, 2.05, .30);
  ellipse(table, brass, TABLE_Y - .025, 4.04, 2.085, .037);
  ellipse(table, black, TABLE_Y + .025, 4.06, 2.11, .095);
  ellipse(table, felt, TABLE_Y + .072, 3.58, 1.665, .044);
  ellipseLine(table, mat('#383932', { roughness: .55 }), TABLE_Y + .079, 3.88, 1.954, .12);
  ellipseLine(table, mat('#a38a51', { roughness: .74 }), TABLE_Y + .116, 3.67, 1.76, .011);
  ellipseLine(table, mat('#544e3c', { roughness: .9 }), TABLE_Y + .135, 3.9, 1.955, .006);
  ellipseLine(table, mat('#8c946b', { roughness: 1, transparent: true, opacity: .42 }), TABLE_Y + .100, 2.95, 1.18, .009);
  const emblem = textPlane(table, 'F R E E  T R A I N I N G', [0, TABLE_Y + .105, -.73], 2.52, .21, '#a6bca5'); emblem.rotation.x = -Math.PI / 2;
  const subtitle = textPlane(table, 'F R E E   T R A I N I N G   ·   D E M O', [0, TABLE_Y + .107, -.95], 2.37, .1, '#a6bca5'); subtitle.rotation.x = -Math.PI / 2;
  // Six cup holders sunk into the rail, with visible metallic rims.
  for (const p of SEATS) {
    const x = Math.sin(p.angle + .12) * 3.82, z = Math.cos(p.angle + .12) * 1.87;
    cylinder(table, brass, [x, TABLE_Y + .10, z], .105, .105, .028, 24);
    cylinder(table, black, [x, TABLE_Y + .12, z], .084, .084, .014, 24);
  }
  bakeStatic(table);
  return table;
}

function triangle(parent, material, points) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3)); geo.computeVertexNormals();
  const m = mesh(geo, material, parent); m.material.side = THREE.DoubleSide; return m;
}

function buildPerson(index, materials) {
  const person = new THREE.Group();
  const appearances = [
    { skin: '#bb8668', suit: '#20262e', shirt: '#e0d6c7', hair: '#27201d', tie: '#7b2735', style: 'short' },
    { skin: '#b97e5a', suit: '#212528', shirt: '#ded8c7', hair: '#181918', tie: '#bc9854', style: 'hat' },
    { skin: '#e2b393', suit: '#4d2630', shirt: '#d6bc9d', hair: '#6c3020', tie: '#43202a', style: 'long' },
    { skin: '#b88d70', suit: '#8b7650', shirt: '#e7e3d5', hair: '#47362a', tie: '#202a23', style: 'slick' },
    { skin: '#784d36', suit: '#242d3b', shirt: '#d5d9d6', hair: '#1b1612', tie: '#67333b', style: 'beard' },
    { skin: '#d2a185', suit: '#171b20', shirt: '#c9c4b5', hair: '#a19b89', tie: '#413345', style: 'glasses' },
  ];
  const a = appearances[index], skin = mat(a.skin, { roughness: .75 }), suit = mat(a.suit, { roughness: .9 });
  const shirt = mat(a.shirt), hair = mat(a.hair, { roughness: 1 }), tie = mat(a.tie), shoes = mat('#151212', { roughness: .36 });
  const chair = new THREE.Group(); person.add(chair);
  const chairLeather = mat(index % 2 ? '#392820' : '#372326', { roughness: .68 });
  sphere(chair, chairLeather, [0, .72, -.03], [.47, .12, .44]);
  const back = sphere(chair, chairLeather, [0, 1.08, -.41], [.47, .59, .09]); back.rotation.x = -.10;
  for (const x of [-.37, .37]) {
    between(chair, materials.wood, [x, .03, -.38], [x, 1.59, -.43], .028, .03);
    between(chair, materials.wood, [x, .03, .37], [x, .71, .31], .033, .036);
    for (const y of [.86, 1.08, 1.29, 1.49]) sphere(chair, materials.brass, [x, y, -.303], [.014, .014, .012], 8);
  }
  bakeStatic(chair);
  const body = new THREE.Group(); person.add(body);
  // Seated adult anatomy: thighs, angled calves, tailored torso, neck and hands.
  for (const side of [-1, 1]) {
    between(body, suit, [side * .20, .80, -.02], [side * .24, .68, .57], .135, .12);
    between(body, suit, [side * .24, .68, .57], [side * .24, .16, .69], .11, .075);
    sphere(body, shoes, [side * .24, .09, .80], [.105, .09, .24]);
  }
  const torso = sphere(body, suit, [0, 1.29, .015], [.37, .52, .24]); torso.rotation.x = -.08;
  sphere(body, suit, [-.32, 1.49, .03], [.15, .20, .18]); sphere(body, suit, [.32, 1.49, .03], [.15, .20, .18]);
  // Shirt, collar and sharply cut lapels read at gameplay scale.
  triangle(body, shirt, [[-.15, 1.68, .17], [.15, 1.68, .17], [0, 1.07, .252]]);
  triangle(body, materials.black, [[-.24, 1.62, .185], [-.075, 1.18, .252], [-.025, 1.48, .265]]);
  triangle(body, materials.black, [[.24, 1.62, .185], [.075, 1.18, .252], [.025, 1.48, .265]]);
  triangle(body, shirt, [[-.15, 1.71, .165], [-.015, 1.65, .25], [-.075, 1.51, .235]]);
  triangle(body, shirt, [[.15, 1.71, .165], [.015, 1.65, .25], [.075, 1.51, .235]]);
  between(body, tie, [0, 1.57, .255], [0, 1.22, .273], .036, .055);
  sphere(body, tie, [0, 1.605, .25], [.049, .055, .023]);
  for (const y of [1.13, .99]) sphere(body, materials.darkBrass, [.058, y, .255], [.015, .017, .007], 8);
  box(body, shirt, [-.20, 1.42, .219], [.065, .025, .016]);
  const cuff = mat('#d4cdba');
  for (const side of [-1, 1]) {
    const elbow = [side * .49, 1.18, .28];
    const wrist = [side * (.25 + (index % 2) * .04), TABLE_Y + .18, .72];
    between(body, suit, [side * .34, 1.49, .04], elbow, .145, .112);
    sphere(body, suit, elbow, [.119, .13, .12]);
    between(body, suit, elbow, wrist, .11, .068);
    between(body, cuff, [wrist[0], wrist[1], wrist[2] - .015], [wrist[0], wrist[1] + .016, wrist[2] + .06], .072);
    sphere(body, skin, [wrist[0], wrist[1] + .016, wrist[2] + .13], [.085, .048, .14]);
    for (let f = 0; f < 4; f++) {
      const fx = wrist[0] - .056 + f * .033;
      between(body, skin, [fx, wrist[1] + .01, wrist[2] + .18], [fx + side * .012, wrist[1] - .01, wrist[2] + .285 - Math.abs(f - 1.5) * .015], .017, .015);
    }
    sphere(body, skin, [wrist[0] - side * .081, wrist[1] + .002, wrist[2] + .15], [.028, .033, .074]);
    if (side === -1) {
      const watch = cylinder(body, materials.brass, [wrist[0], wrist[1] + .075, wrist[2] + .016], .044, .044, .026, 16);
      cylinder(body, materials.black, [wrist[0], wrist[1] + .09, wrist[2] + .016], .034, .034, .004, 16);
    }
  }
  cylinder(body, skin, [0, 1.72, .02], .105, .12, .24, 16);
  const head = new THREE.Group(); head.position.set(0, 1.98, .015); body.add(head);
  // Several overlapping surfaces produce jaw, cheekbones and brow rather than a sphere head.
  sphere(head, skin, [0, .015, 0], [.195, .252, .18], 24);
  sphere(head, skin, [0, -.14, .047], [.142, .137, .131], 20);
  sphere(head, skin, [-.113, -.025, .126], [.070, .085, .05], 16);
  sphere(head, skin, [.113, -.025, .126], [.070, .085, .05], 16);
  for (const side of [-1, 1]) {
    sphere(head, skin, [side * .195, -.018, -.006], [.042, .074, .033], 12);
    sphere(head, mat('#895947'), [side * .209, -.019, .014], [.018, .042, .008], 10);
    sphere(head, mat('#e2ddd0'), [side * .073, .035, .161], [.049, .021, .022], 12);
    sphere(head, mat(index === 2 ? '#39755e' : '#332820'), [side * .073, .033, .182], [.017, .018, .007], 10);
    sphere(head, mat('#121111'), [side * .073, .033, .187], [.007, .012, .004], 8);
    sphere(head, hair, [side * .077, .080, .163], [.053, .012, .014], 12).rotation.z = side * -.12;
  }
  sphere(head, skin, [0, -.024, .190], [.036, .070, .04], 16);
  sphere(head, skin, [0, -.066, .201], [.042, .026, .035], 12);
  const lips = mat('#8a5548'); sphere(head, lips, [0, -.121, .169], [.057, .013, .009], 12);
  sphere(head, mat(a.skin), [0, -.168, .126], [.064, .044, .052], 12);
  // A scalp cap, combed side pieces and asymmetric waves for each character.
  const cap = mesh(new THREE.SphereGeometry(1, 22, 12, 0, TAU, 0, 1.40), hair, head, [0, .032, -.018]); cap.scale.set(.202, .239, .181);
  for (const side of [-1, 1]) sphere(head, hair, [side * .162, .055, -.047], [.054, .146, .124], 16);
  if (a.style === 'long') {
    for (const side of [-1, 1]) {
      sphere(head, hair, [side * .171, -.169, -.057], [.079, .34, .127], 16).rotation.z = side * .1;
      sphere(head, hair, [side * .14, .164, .077], [.103, .112, .107], 16).rotation.z = side * -.45;
    }
  } else {
    for (let i = 0; i < 5; i++) sphere(head, hair, [-.13 + i * .055, .212 + Math.sin(i) * .012, .015], [.065, .07, .15], 14).rotation.x = -.25;
  }
  if (a.style === 'beard') {
    sphere(head, hair, [0, -.146, .094], [.155, .10, .095], 16);
    sphere(head, lips, [0, -.117, .191], [.055, .011, .008], 12);
  }
  if (a.style === 'hat') {
    cylinder(head, materials.black, [0, .24, -.005], .305, .30, .035, 32);
    cylinder(head, materials.black, [0, .35, -.015], .165, .19, .22, 32);
    cylinder(head, materials.darkBrass, [0, .277, -.015], .191, .192, .035, 32);
  }
  if (a.style === 'glasses' || a.style === 'slick') {
    for (const side of [-1, 1]) {
      const r = mesh(new THREE.TorusGeometry(.053, .007, 5, 16), materials.brass, head, [side * .072, .037, .19]); r.scale.y = .77;
      between(head, materials.brass, [side * .124, .046, .18], [side * .20, .049, .018], .007);
    }
    between(head, materials.brass, [-.019, .042, .19], [.019, .042, .19], .006);
  }
  person.userData = { index, body, head, baseHeadY: head.position.y, suit, phase: index * 1.3 };
  return person;
}

function buildDrink(scene, index, angle) {
  const group = new THREE.Group(); const a = angle - .21;
  group.position.set(Math.sin(a) * 3.32, TABLE_Y + .11, Math.cos(a) * 1.42); scene.add(group);
  const glass = mat('#d5dbc3', { roughness: .09, metalness: .08, transparent: true, opacity: .25, depthWrite: false });
  const gold = mat('#917235', { roughness: .3, metalness: .7 });
  cylinder(group, gold, [0, .009, 0], .12, .12, .012, 24);
  if (index % 3 === 0) {
    cylinder(group, glass, [0, .13, 0], .089, .065, .25, 24);
    cylinder(group, mat('#963e10', { roughness: .24, metalness: .1, transparent: true, opacity: .83 }), [0, .089, 0], .072, .059, .14, 24);
    for (let i = 0; i < 3; i++) {
      const ice = box(group, mat('#f4eaca', { transparent: true, opacity: .42, roughness: .13 }), [(i - 1) * .032, .15, (i % 2) * .03], [.053, .04, .048]); ice.rotation.y = i * .7;
    }
  } else if (index % 3 === 1) {
    cylinder(group, glass, [0, .029, 0], .085, .085, .018, 24);
    cylinder(group, glass, [0, .13, 0], .011, .011, .2, 10);
    sphere(group, glass, [0, .29, 0], [.086, .127, .086], 20);
    sphere(group, mat('#5d0920', { roughness: .2 }), [0, .265, 0], [.071, .070, .071], 16);
  } else {
    const green = mat('#243e23', { roughness: .15, metalness: .15 });
    cylinder(group, green, [0, .13, 0], .06, .067, .24, 16);
    cylinder(group, green, [0, .28, 0], .025, .059, .07, 16);
    cylinder(group, green, [0, .35, 0], .025, .025, .10, 12);
    cylinder(group, gold, [0, .407, 0], .028, .028, .016, 12);
    box(group, mat('#d2c99e'), [0, .155, .066], [.078, .102, .008]);
  }
  return group;
}

function boneByName(model, name) {
  return model.getObjectByName(name) || model.getObjectByName(name.replaceAll('.', '')) || model.getObjectByName(name.replaceAll('.', '_'));
}
function aimBone(bone, destination) {
  if (!bone) return;
  bone.updateWorldMatrix(true, true);
  const origin = bone.getWorldPosition(new THREE.Vector3());
  const worldQ = bone.getWorldQuaternion(new THREE.Quaternion());
  const current = new THREE.Vector3(0, 1, 0).applyQuaternion(worldQ);
  const desired = destination.clone().sub(origin).normalize();
  const delta = new THREE.Quaternion().setFromUnitVectors(current, desired);
  const newQ = delta.multiply(worldQ);
  const parentQ = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  bone.quaternion.copy(parentQ.multiply(newQ)); bone.updateWorldMatrix(false, true);
}
function setBoneWorldPosition(bone, point) {
  if (!bone) return;
  bone.position.copy(bone.parent.worldToLocal(point.clone())); bone.updateWorldMatrix(false, true);
}
function poseCharacter(model, host, animation) {
  const mixer = new THREE.AnimationMixer(model);
  if (animation) { mixer.clipAction(animation).play(); mixer.update(.01); }
  model.scale.setScalar(1.43); model.position.y = -.24;
  host.add(model); host.updateWorldMatrix(true, true);
  // Resting forearms and sitting legs are posed in table space, independent of
  // the source rig's unusual bone roll. The original skin weights stay intact.
  const world = (x, y, z) => host.localToWorld(new THREE.Vector3(x, y, z));
  const body = boneByName(model, 'Body');
  if (body) body.rotation.y = 0;
  const torso = boneByName(model, 'Torso'); if (torso) { torso.rotation.y = 0; torso.rotation.x = .08; }
  model.updateWorldMatrix(true, true);
  for (const [suffix, side] of [['L', 1], ['R', -1]]) {
    const upper = boneByName(model, 'UpperArm.' + suffix), lower = boneByName(model, 'LowerArm.' + suffix), wrist = boneByName(model, 'Wrist.' + suffix);
    aimBone(upper, world(side * .33, 1.42, .17));
    aimBone(lower, world(side * .24, 1.55, side > 0 ? .57 : .51));
    if (wrist) {
      const palmBasis = new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));
      const worldQ = host.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromRotationMatrix(palmBasis));
      wrist.quaternion.copy(wrist.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldQ));
      for (const finger of ['Index', 'Middle', 'Ring', 'Pinky']) {
        for (const segment of [1, 2, 3]) {
          const bone = boneByName(model, finger + segment + '.' + suffix);
          if (bone) bone.rotateX(segment === 1 ? -.24 : -.48);
        }
      }
    }
    const thigh = boneByName(model, 'UpperLeg.' + suffix), shin = boneByName(model, 'LowerLeg.' + suffix), foot = boneByName(model, 'Foot.' + suffix);
    aimBone(thigh, world(side * .22, .68, .55));
    aimBone(shin, world(side * .24, .07, .62));
    if (foot) setBoneWorldPosition(foot, world(side * .24, .075, .60));
  }
  model.traverse(o => {
    if (/pistol|gun|sword/i.test(o.name)) o.visible = false;
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        m.roughness = .88; m.metalness = 0;
      }
    }
  });
  const head = boneByName(model, 'Head'), chest = boneByName(model, 'Chest');
  return { model, head, chest, headQuaternion: head?.quaternion.clone(), chestQuaternion: chest?.quaternion.clone() };
}

function cardTexture(card) {
  const c = document.createElement('canvas'); c.width = 192; c.height = 272;
  const x = c.getContext('2d'); x.fillStyle = '#f2eedf'; x.fillRect(0, 0, 192, 272);
  if (!card) {
    x.fillStyle = '#552630'; x.fillRect(8, 8, 176, 256);
    x.strokeStyle = '#ba9e69'; x.lineWidth = 2; x.strokeRect(14, 14, 164, 244);
    x.strokeStyle = 'rgba(213,180,127,.48)'; x.lineWidth = .9;
    for (let y = 23; y < 250; y += 15) for (let px = 22; px < 174; px += 15) {
      x.beginPath(); x.moveTo(px, y - 5); x.lineTo(px + 5, y); x.lineTo(px, y + 5); x.lineTo(px - 5, y); x.closePath(); x.stroke();
    }
    x.fillStyle = '#552630'; x.beginPath(); x.ellipse(96, 136, 44, 56, 0, 0, TAU); x.fill();
    x.strokeStyle = '#d9bb79'; x.lineWidth = 3; x.stroke();
    x.fillStyle = '#d9bb79'; x.font = 'bold 64px Georgia'; x.textAlign = 'center'; x.fillText('P', 96, 157);
  } else {
    const rank = card.slice(0, -1).replace('T', '10'), suit = card.slice(-1).toLowerCase();
    const symbol = { s: '♠', h: '♥', d: '♦', c: '♣' }[suit] || suit;
    x.fillStyle = suit === 'h' || suit === 'd' ? '#a52834' : '#182522';
    x.textAlign = 'center'; x.font = 'bold 44px Georgia'; x.fillText(rank, 30, 46);
    x.font = '40px Georgia'; x.fillText(symbol, 30, 84);
    x.save(); x.translate(192, 272); x.rotate(Math.PI); x.font = 'bold 44px Georgia'; x.fillText(rank, 30, 46); x.font = '40px Georgia'; x.fillText(symbol, 30, 84); x.restore();
    x.font = '102px Georgia'; x.fillText(symbol, 96, 173);
  }
  return textureFrom(c);
}

export function createScene(container, { onReady, onSeatClick, theme = 'vegas' } = {}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#100b10'); scene.fog = new THREE.FogExp2('#130b10', .026);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6)); renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.34;
  renderer.domElement.className = 'poker-canvas'; renderer.domElement.setAttribute('aria-label', 'Interactive 3D poker table. Drag to rotate the camera.');
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
  renderer.domElement.tabIndex = 0; container.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 180);
  const materials = {
    brass: mat('#ad8a4c', { roughness: .34, metalness: .8 }),
    darkBrass: mat('#69522d', { roughness: .43, metalness: .65 }),
    wood: mat('#241510', { roughness: .4, map: textureFrom(noiseCanvas(256, 256, '#635043', 26), 3) }),
    black: mat('#181b1b', { roughness: .46 }), cream: mat('#d3c5a6'),
    felt: mat('#ffffff', { map: buildFeltTexture(SCENE_THEMES.vegas.felt), roughness: .99 }),
  };
  const ambient = new THREE.HemisphereLight('#cec9b4', '#24151a', 1.23); scene.add(ambient);
  const key = new THREE.SpotLight('#ffe1ad', 130, 24, Math.PI / 3, .68, 1.45);
  key.position.set(-1, 8.4, 1); key.target.position.set(0, TABLE_Y, 0); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.00025; key.shadow.normalBias = .025;
  key.shadow.camera.near = .5; key.shadow.camera.far = 22; scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#cad6e5', 1.65); fill.position.set(1, 4, 6); scene.add(fill);
  const rim = new THREE.DirectionalLight('#ffb45f', 2); rim.position.set(-4, 4, -5); scene.add(rim);
  buildTable(scene, materials);
  const people = SEATS.map((p, i) => {
    const person = buildPerson(i, materials); person.position.set(p.x, 0, p.z); person.rotation.y = p.angle + Math.PI;
    person.userData.seat = i; scene.add(person); buildDrink(scene, i, p.angle); return person;
  });
  // CC0 Quaternius rigs replace the procedural fallback as soon as local GLBs
  // are decoded. Failed model loads never prevent the table from being playable.
  const characterFiles = ['male-casual', 'male-suit', 'female-formal', 'male-punk', 'female-suit', 'female-punk'];
  import('../vendor/GLTFLoader.js').then(({ GLTFLoader }) => {
    const loader = new GLTFLoader();
    return Promise.allSettled(characterFiles.map(async (name, i) => {
      const gltf = await loader.loadAsync(new URL('../assets/characters/' + name + '.glb', import.meta.url).href);
      if (!running) return;
      const host = people[i];
      const animation = gltf.animations.find(a => a.name === 'Idle_Neutral') || gltf.animations.find(a => a.name === 'Idle');
      const rig = poseCharacter(gltf.scene, host, animation);
      host.userData.body.visible = false;
      host.userData.rig = rig;
      host.userData.loadedCharacter = name;
    }));
  }).then(() => { if (running) container.dataset.characters = String(people.filter(p => p.userData.rig).length); }).catch(error => {
    console.info('Local character models unavailable; procedural characters remain active.', error.message);
  });
  const playing = new THREE.Group(); scene.add(playing);
  const chips = new THREE.Group(); playing.add(chips);
  const cards = new THREE.Group(); playing.add(cards);
  const tokenMaterial = mat('#ede4ca', { roughness: .5 });
  const dealer = cylinder(playing, tokenMaterial, [0, TABLE_Y + .14, 0], .13, .13, .04, 32);
  const dealerText = textPlane(playing, 'D', [0, TABLE_Y + .163, 0], .18, .18, '#222320'); dealerText.rotation.x = -Math.PI / 2;
  const activeRing = ellipseLine(playing, mat('#d7ba78', { emissive: '#cfa959', emissiveIntensity: .3, transparent: true, opacity: .7 }), TABLE_Y + .16, .41, .20, .009);
  const chipGeo = new THREE.CylinderGeometry(.075, .075, .026, 24);
  const chipMaterials = ['#e5d9b6', '#ad303b', '#215786', '#39905b', '#3c293b'].map(c => mat(c, { roughness: .45 }));
  const stripeMat = mat('#ddcca7', { roughness: .7 });
  const cardTextures = new Map();
  let lastState = null, signature = '', running = true, frame = 0, targetAzimuth = 0, azimuth = 0, elevation = .69, targetElevation = .69, radius = 13.8, targetRadius = 13.8;
  let activeEnvironment = null, currentTheme = null;
  let framing = 'scenic';
  let cameraMode = 'scenic', portrait = false, drag = null, moved = false, sinceInteraction = performance.now();
  const target = new THREE.Vector3(0, 1.45, 0);
  const clock = new THREE.Clock();
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  function clear(group) {
    for (const child of [...group.children]) {
      group.remove(child); child.traverse(m => {
        if (m.geometry && m.geometry !== chipGeo) m.geometry.dispose();
        // Card textures are cached and shared, while their materials are per deal.
        if (group === cards && m.material) {
          for (const material of Array.isArray(m.material) ? m.material : [m.material]) material.dispose();
        }
      });
    }
  }
  function chipStack(parent, x, z, count, color, baseY = TABLE_Y + .12) {
    for (let j = 0; j < count; j++) {
      const m = mesh(chipGeo, chipMaterials[color % chipMaterials.length], parent, [x, baseY + j * .031, z]);
      m.rotation.y = j * .27; m.castShadow = j === count - 1;
      if (j === count - 1) {
        const top = mesh(new THREE.TorusGeometry(.052, .004, 4, 18), stripeMat, parent, [x, baseY + j * .031 + .014, z]); top.rotation.x = Math.PI / 2;
      }
      for (let s = 0; s < 4; s++) {
        const a = s * Math.PI / 2 + j * .27;
        const stripe = box(parent, stripeMat, [x + Math.sin(a) * .068, baseY + j * .031, z + Math.cos(a) * .068], [.029, .021, .013]); stripe.rotation.y = a;
        stripe.castShadow = false;
      }
    }
  }
  function putCard(card, x, z, rotation = 0, y = TABLE_Y + .112) {
    const cacheKey = card || 'back';
    if (!cardTextures.has(cacheKey)) cardTextures.set(cacheKey, cardTexture(card));
    const material = new THREE.MeshStandardMaterial({ map: cardTextures.get(cacheKey), roughness: .77, side: THREE.DoubleSide });
    const c = mesh(new THREE.PlaneGeometry(.33, .468), material, cards, [x, y, z]); c.rotation.set(-Math.PI / 2, 0, rotation); return c;
  }
  function update(state) {
    lastState = state;
    const sig = JSON.stringify([state.phase, state.board, state.pot, state.buttonSeat, state.currentPlayerId, state.players?.map(p => [p.id, p.stack, p.cards || p.holeCards, p.streetBet, p.folded, p.inHand, p.canAct])]);
    if (sig === signature) return; signature = sig;
    clear(chips); clear(cards);
    (state.board || []).forEach((card, i) => putCard(card, (i - 2) * .40, .02));
    (state.players || []).forEach(p => {
      const loc = SEATS[p.seat]; if (!loc) return;
      const person = people[p.seat]; person.visible = true; person.userData.folded = p.folded;
      person.userData.active = p.id === state.currentPlayerId;
      const radial = new THREE.Vector3(Math.sin(loc.angle), 0, Math.cos(loc.angle));
      const tangent = new THREE.Vector3(Math.cos(loc.angle), 0, -Math.sin(loc.angle));
      const px = Math.sin(loc.angle) * 3.09, pz = Math.cos(loc.angle) * 1.21;
      const stackCount = p.stack > 0 ? Math.min(5, Math.max(1, Math.ceil(p.stack / 1500))) : 0;
      for (let s = 0; s < stackCount; s++) {
        const o = (s - (stackCount - 1) / 2) * .17;
        chipStack(chips, px + tangent.x * o, pz + tangent.z * o, 3 + ((p.stack + s * 3) % 8), (s + p.seat) % 5);
      }
      if (p.streetBet > 0) chipStack(chips, Math.sin(loc.angle) * 2.29, Math.cos(loc.angle) * .80, Math.min(10, Math.max(2, Math.ceil(p.streetBet / 100))), 1 + p.seat % 3);
      const hole = p.cards || p.holeCards || [];
      if (!p.folded) hole.forEach((card, i) => {
        const o = i === 0 ? -.20 : .20;
        putCard(card, Math.sin(loc.angle) * 2.72 + tangent.x * o, Math.cos(loc.angle) * 1.00 + tangent.z * o, -loc.angle + (i === 0 ? -.07 : .07), TABLE_Y + .115 + i * .003);
      });
      if (p.isButton || p.seat === state.buttonSeat) {
        dealer.position.set(px + tangent.x * .57, TABLE_Y + .14, pz + tangent.z * .57);
        dealerText.position.set(dealer.position.x, TABLE_Y + .163, dealer.position.z);
      }
      if (p.id === state.currentPlayerId) { activeRing.position.set(px, 0, pz); activeRing.rotation.y = -loc.angle; }
    });
    activeRing.visible = !!state.currentPlayerId;
    const potCount = state.pot > 0 ? Math.min(7, Math.ceil(state.pot / 800)) : 0;
    for (let i = 0; i < potCount; i++) chipStack(chips, -.42 + i * .14, -.46 + (i % 2) * .17, Math.min(7, 2 + Math.floor(state.pot / 500)), i % 5);
    bakeStatic(chips);
  }
  function nearestAzimuth(angle) {
    return azimuth + Math.atan2(Math.sin(angle - azimuth), Math.cos(angle - azimuth));
  }
  function resize() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; portrait = w / h < .85;
    camera.fov = portrait ? 45 : 43; camera.updateProjectionMatrix();
    if (!drag && (cameraMode === 'table' || cameraMode === 'scenic')) {
      const scenic = framing === 'scenic';
      targetAzimuth = nearestAzimuth(portrait && !scenic ? Math.PI / 2 : 0);
      targetElevation = scenic ? (portrait ? .92 : .64) : (portrait ? 1.00 : .77);
      targetRadius = scenic ? (portrait ? 13.4 : (w / h < 1.25 ? 11.9 : 9.4)) : (portrait ? 13.4 : (w / h < 1.25 ? 11.9 : 10.0));
    }
    if (cameraMode === 'overhead') targetRadius = portrait ? 15.6 : 12.5;
  }
  function setCamera(mode = 'table') {
    cameraMode = mode; framing = mode === 'scenic' ? 'scenic' : 'table'; sinceInteraction = performance.now();
    if (mode === 'scenic') { resize(); }
    else if (mode === 'overhead' || mode === 'top') { targetElevation = 1.38; targetAzimuth = nearestAzimuth(portrait ? Math.PI / 2 : 0); targetRadius = portrait ? 15.6 : 12.5; }
    else if (mode === 'cinematic' || mode === 'orbit') { targetElevation = .43; targetRadius = 13.7; }
    else if (mode === 'close' || mode === 'player') { targetElevation = .48; targetRadius = 10.3; targetAzimuth = nearestAzimuth(.34); }
    else { cameraMode = 'table'; resize(); }
  }
  const sharedResources = collectResourcesFromMaterials(Object.values(materials));
  const kit = { THREE, mat, mesh, box, sphere, cylinder, between, textPlane, noiseCanvas, textureFrom,
    bakeStatic(group) {
      const before = collectResources(group);
      bakeStatic(group);
      releaseResources(before, unionResources(collectResources(group), sharedResources));
    },
  };
  function setTheme(name = 'vegas') {
    const t = getSceneTheme(name);
    if (t.id === currentTheme) return t.id;
    // Build first so a failed replacement never destroys the visible environment.
    const next = { vegas: buildVegas, beach: buildBeach, gala: buildGala }[t.id](scene, materials, kit);
    if (activeEnvironment) {
      scene.remove(activeEnvironment);
      releaseResources(collectResources(activeEnvironment), sharedResources);
    }
    activeEnvironment = next; currentTheme = t.id;
    materials.felt.map.dispose(); materials.felt.map = buildFeltTexture(t.felt); materials.felt.needsUpdate = true;
    materials.wood.color.set(t.wood); materials.brass.color.set(t.brass); materials.black.color.set(t.black);
    ambient.color.set(t.sky); ambient.groundColor.set(t.ground); ambient.intensity = t.ambient;
    key.color.set(t.key); key.intensity = t.keyIntensity;
    fill.color.set(t.fill); fill.intensity = t.fillIntensity;
    rim.color.set(t.rim); rim.intensity = t.rimIntensity;
    scene.background = new THREE.Color(t.background); scene.fog = new THREE.FogExp2(t.fog, t.density);
    renderer.toneMappingExposure = t.exposure;
    container.dataset.environment = t.id;
    return t.id;
  }

  function projectSeats() {
    return SEATS.map((p, i) => {
      const v = new THREE.Vector3(p.x, 2.77, p.z).project(camera);
      return { seat: i, x: (v.x + 1) / 2, y: (1 - v.y) / 2, visible: v.z < 1 && v.x >= -1.15 && v.x <= 1.15, depth: v.z };
    });
  }
  function pointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, pointerId: event.pointerId }; moved = false;
    renderer.domElement.setPointerCapture?.(event.pointerId); sinceInteraction = performance.now();
  }
  function pointerMove(event) {
    if (!drag) return;
    const dx = event.clientX - drag.lastX, dy = event.clientY - drag.lastY;
    if (!moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5) {
      moved = true;
      // Start manual input from the pose actually shown after room constraints,
      // so an automatically raised camera responds to the first upward drag.
      targetAzimuth = azimuth;
      elevation = targetElevation = actualOrbit.elevation;
      radius = targetRadius = actualOrbit.radius;
    }
    if (moved) {
      targetAzimuth -= dx * .0047;
      targetElevation = THREE.MathUtils.clamp(targetElevation + dy * .003, CAMERA_LIMITS.minElevation, CAMERA_LIMITS.maxElevation);
      cameraMode = 'manual';
    }
    drag.lastX = event.clientX; drag.lastY = event.clientY; sinceInteraction = performance.now();
  }
  function pointerUp(event) {
    if (drag && !moved && onSeatClick) {
      const rect = renderer.domElement.getBoundingClientRect(), uv = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      const ray = new THREE.Raycaster(); ray.setFromCamera(uv, camera);
      const intersections = ray.intersectObjects(people, true);
      if (intersections.length) {
        let object = intersections[0].object;
        while (object && object.userData.seat === undefined) object = object.parent;
        if (object) onSeatClick(object.userData.seat);
      }
    }
    drag = null;
  }
  function wheel(event) {
    event.preventDefault();
    const limits = portrait ? CAMERA_LIMITS.portrait : CAMERA_LIMITS.landscape;
    targetRadius = THREE.MathUtils.clamp(targetRadius + event.deltaY * .007, limits.minRadius, limits.maxRadius);
    sinceInteraction = performance.now();
  }
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', pointerUp); canvas.addEventListener('wheel', wheel, { passive: false });
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  azimuth = targetAzimuth; elevation = targetElevation; radius = targetRadius;
  let actualOrbit = resolveOrbit({ azimuth, elevation, radius, portrait });
  function animate() {
    if (!running) return; frame = requestAnimationFrame(animate);
    const t = motionPreference.matches ? 0 : clock.getElapsedTime();
    if (!motionPreference.matches && (cameraMode === 'cinematic' || cameraMode === 'orbit')) targetAzimuth += .00115;
    azimuth += (targetAzimuth - azimuth) * .085; elevation += (targetElevation - elevation) * .085; radius += (targetRadius - radius) * .075;
    actualOrbit = resolveOrbit({ azimuth, elevation, radius, portrait });
    const chandelier = scene.getObjectByName('Chandeliers');
    if (chandelier) chandelier.visible = !portrait && actualOrbit.elevation < .63;
    camera.position.set(actualOrbit.x, target.y + actualOrbit.y, actualOrbit.z);
    const scenic = framing === 'scenic';
    const fov = scenic ? (portrait ? 74 : 53) : (portrait ? 45 : 43);
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.lookAt(0, scenic ? (portrait ? 3.1 : 2.8) : target.y, 0);
    container.dataset.framing = framing;
    // Screen framing reserves space at the bottom for the betting controls.
    camera.setViewOffset(renderer.domElement.width, renderer.domElement.height, 0, renderer.domElement.height * -.025, renderer.domElement.width, renderer.domElement.height);
    for (const person of people) {
      const p = person.userData;
      p.body.position.y = Math.sin(t * 1.34 + p.phase) * .009;
      p.head.rotation.y = Math.sin(t * .30 + p.phase) * .13 + (p.active ? Math.sin(t * .75) * .035 : 0);
      p.head.rotation.x = (p.folded ? .12 : -.035) + Math.sin(t * .70 + p.phase) * .016;
      p.body.rotation.z = Math.sin(t * .48 + p.phase) * .008;
      if (p.rig) {
        const r = p.rig;
        r.model.position.y = -.24 + Math.sin(t * 1.25 + p.phase) * .004;
        if (r.head) {
          r.head.quaternion.copy(r.headQuaternion);
          r.head.rotateY(Math.sin(t * .30 + p.phase) * .12);
          r.head.rotateX(p.folded ? .10 : -.025);
        }
        if (r.chest) {
          r.chest.quaternion.copy(r.chestQuaternion);
          r.chest.rotateX(Math.sin(t * 1.25 + p.phase) * .006);
        }
      }
    }
    if (activeRing.visible) activeRing.material.opacity = .48 + Math.sin(t * 3) * .18;
    if (!motionPreference.matches) activeEnvironment?.userData.animate?.(t);
    renderer.render(scene, camera);
    container.dataset.geometries = String(renderer.info.memory.geometries);
    container.dataset.textures = String(renderer.info.memory.textures);
    container.dataset.drawCalls = String(renderer.info.render.calls);
    container.dataset.triangles = String(renderer.info.render.triangles);
  }
  function dispose() {
    running = false; cancelAnimationFrame(frame); observer.disconnect();
    canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerUp); canvas.removeEventListener('wheel', wheel);
    const geometries = new Set(), mats = new Set(), textures = new Set();
    scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) { mats.add(m); if (m.map) textures.add(m.map); } });
    geometries.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); cardTextures.forEach(t => t.dispose()); renderer.dispose(); canvas.remove();
  }
  setTheme(theme);
  animate(); queueMicrotask(() => onReady?.());
  const getViewState = () => ({ ...actualOrbit, position: camera.position.toArray(), mode: cameraMode, framing, portrait, environment: currentTheme });
  return { update, setCamera, setTheme, resize, dispose, projectSeats, getViewState, renderer, scene, camera };
}
