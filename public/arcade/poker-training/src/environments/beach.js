// Original, procedural scenery. No external art or texture downloads.
export function buildBeach(parent, materials, kit) {
  const { THREE, mat, mesh, box, sphere, cylinder, between, textPlane, noiseCanvas, textureFrom, bakeStatic } = kit;
  const group = new THREE.Group(); group.name = 'EnvironmentBeach'; parent.add(group);
  const tau = Math.PI * 2;
  const sand = mat('#ffffff', { map: textureFrom(noiseCanvas(256, 256, '#efd4a0', 16), 32), roughness: 1 });
  const wetSand = mat('#c9b087', { roughness: .64 });
  const timber = mat('#a87a4e', { roughness: .88 });
  const planks = ['#b78c5f', '#c4996d', '#ad8054', '#c09a70'].map(c => mat(c, { roughness: .94 }));
  const paleWood = mat('#e8d2ac', { roughness: .87 });
  const trunk = mat('#806043', { roughness: 1 });
  const trunkRing = mat('#b39466', { roughness: 1 });
  const leaves = [mat('#367a55', { side: THREE.DoubleSide }), mat('#549863', { side: THREE.DoubleSide }), mat('#226046', { side: THREE.DoubleSide })];
  const coral = mat('#ed886e', { roughness: .84 });
  const turquoise = mat('#49aaad', { roughness: .82 });
  const cream = mat('#fff0c9', { roughness: .85 });
  const foam = mat('#d8f1e4', { roughness: .72, emissive: '#6fbdaf', emissiveIntensity: .1 });
  const water = mat('#318e9e', { roughness: .32, metalness: .05 });
  const shallowWater = mat('#60bdb6', { roughness: .38, metalness: .03 });

  // The table is grounded on a broad deck, while the rest of the scene stays open.
  box(group, sand, [0, -.18, 16], [210, .2, 130]);
  box(group, timber, [0, -.01, 0], [12.8, .22, 8.9]);
  for (let i = 0; i < 36; i++) {
    const z = -4.3 + i * .245;
    for (const side of [-1, 1]) {
      const stagger = i % 2 === 0 ? .32 : -.32;
      box(group, planks[i % planks.length], [side * 3.16 + stagger, .117, z], [6.29, .065, .226]);
    }
  }
  for (const x of [-6.38, 6.38]) box(group, timber, [x, .13, 0], [.16, .12, 8.95]);
  for (const z of [-4.43, 4.43]) box(group, paleWood, [0, .132, z], [12.8, .09, .12]);
  // A low, wide step makes the platform legible without enclosing the camera.
  box(group, timber, [0, -.014, 4.64], [4.6, .13, .45]);

  function shore(x) { return -12.5 + Math.sin(x * .065) * 1.4 + Math.sin(x * .18) * .45; }
  function ribbon(material, offset, width, height, xmin = -95, xmax = 95, segments = 100) {
    const positions = [], uv = [];
    for (let i = 0; i < segments; i++) {
      const x1 = xmin + (xmax - xmin) * i / segments;
      const x2 = xmin + (xmax - xmin) * (i + 1) / segments;
      const z1 = shore(x1) + offset, z2 = shore(x2) + offset;
      positions.push(x1,height,z1, x2,height,z2, x1,height,z1-width, x2,height,z2, x2,height,z2-width, x1,height,z1-width);
      uv.push(i/segments,0, (i+1)/segments,0, i/segments,1, (i+1)/segments,0, (i+1)/segments,1, i/segments,1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.computeVertexNormals();
    return mesh(geometry, material, group);
  }
  ribbon(wetSand, 2.4, 4.5, -.065);
  ribbon(water, -.05, 190, -.035);
  ribbon(shallowWater, .1, 6.5, -.024);
  ribbon(foam, .18, .18, -.014);
  ribbon(foam, -1.05, .075, -.008);
  ribbon(foam, -3.75, .085, -.006);
  // Longer glints lead the eye from the shore out toward the sunset.
  const glint = mat('#aadbd5', { roughness: .4, emissive: '#96c9b9', emissiveIntensity: .16 });
  for (let i = 0; i < 22; i++) {
    const z = -20 - i * 2.45;
    const width = 3 + (i % 5) * 1.4 + i * .12;
    box(group, i % 3 === 0 ? foam : glint, [Math.sin(i * 2.3) * (6 + i * .16), -.004, z], [width, .012, .035 + (i % 3) * .022]);
  }

  // The sunset and distant islands give the open rear view a real horizon.
  const sunMaterial = new THREE.MeshBasicMaterial({ color: '#ffc47c', fog: false });
  mesh(new THREE.CircleGeometry(5.3, 64), sunMaterial, group, [-13, 9.5, -74]);
  const islandMaterial = mat('#547d79', { roughness: 1 });
  for (const [x, z, scale] of [[37, -70, 1], [-46, -82, 1.3]]) {
    sphere(group, islandMaterial, [x, -.25, z], [14 * scale, 3.1 * scale, 4 * scale], 18);
    sphere(group, islandMaterial, [x - 7 * scale, -.4, z + 1], [8 * scale, 1.8 * scale, 4 * scale], 14);
  }
  const cloud = mat('#f5dfcc', { roughness: 1, emissive: '#d0b7a8', emissiveIntensity: .12 });
  for (const [x, y, z, scale] of [[17, 16, -83, 1], [-39, 18, -92, 1.3], [54, 21, -95, 1.1]]) {
    for (let i = 0; i < 4; i++) sphere(group, cloud, [x + i * 2.9 * scale, y + Math.sin(i) * .7, z], [(3.5 + i * .25) * scale, .72 * scale, 1.15 * scale], 14);
  }

  function palm(x, z, height, lean, rotation) {
    const crown = new THREE.Vector3(x + lean, height, z);
    let last = new THREE.Vector3(x, 0, z);
    for (let i = 1; i <= 7; i++) {
      const t = i / 7, next = new THREE.Vector3(x + lean * t * t, height * t, z + Math.sin(t * Math.PI) * .14);
      between(group, trunk, last.toArray(), next.toArray(), .21 - (i - 1) * .013, .21 - i * .013);
      const ring = cylinder(group, trunkRing, next.toArray(), .225 - i * .013, .231 - i * .013, .06, 10);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), next.clone().sub(last).normalize());
      last = next;
    }
    for (let f = 0; f < 9; f++) {
      const angle = f / 9 * tau + rotation;
      const length = 2.75 + (f % 3) * .25;
      const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const side = new THREE.Vector3(-dir.z, 0, dir.x);
      const pts = [], positions = [];
      for (let j = 0; j <= 9; j++) {
        const t = j / 9;
        pts.push(crown.clone().addScaledVector(dir, length * t).add(new THREE.Vector3(0, Math.sin(t * Math.PI) * .73 - t * t * 1.05, 0)));
      }
      for (let j = 0; j < 9; j++) {
        const t = j / 9, nt = (j + 1) / 9;
        const w = Math.sin(t * Math.PI) * .38, nw = Math.sin(nt * Math.PI) * .38;
        const a = pts[j].clone().addScaledVector(side, w), b = pts[j].clone().addScaledVector(side, -w);
        const c = pts[j + 1].clone().addScaledVector(side, nw), d = pts[j + 1].clone().addScaledVector(side, -nw);
        for (const v of [a,b,c, b,d,c]) positions.push(v.x, v.y, v.z);
        // Split leaflets provide a recognisable palm silhouette at modest geometry cost.
        if (j > 0 && j < 8) {
          for (const sign of [-1, 1]) {
            const tip = pts[j].clone().addScaledVector(side, sign * w * 1.72).addScaledVector(dir, -.13).add(new THREE.Vector3(0, -.15, 0));
            for (const v of [pts[j], tip, pts[j + 1]]) positions.push(v.x, v.y, v.z);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.computeVertexNormals();
      mesh(geometry, leaves[f % leaves.length], group);
      for (let j = 0; j < 9; j++) between(group, leaves[2], pts[j].toArray(), pts[j + 1].toArray(), .024, .012);
    }
    for (let i = 0; i < 3; i++) sphere(group, trunk, [crown.x + Math.sin(i * 2.1) * .23, crown.y - .26, crown.z + Math.cos(i * 2.1) * .22], [.2,.26,.2], 10);
  }
  // Entire crowns remain outside the camera boundary, including their overhangs.
  palm(-13.9, -8.8, 7.4, .6, .2); palm(14.1, -7.7, 7.9, -.45, 1.2);
  palm(-14.8, 6.2, 6.4, -.5, .7); palm(15.4, 8.6, 7.1, .25, .1);
  palm(-21.5, -12.1, 6.9, .35, .6); palm(24, -15, 8.4, -.6, 1.7);

  function umbrella(x, z, color, radius = 2.15) {
    cylinder(group, paleWood, [x, 1.62, z], .045, .055, 3.28, 12);
    cylinder(group, cream, [x, .035, z], .43, .48, .07, 18);
    const peak = 3.45, rim = 2.66;
    for (let i = 0; i < 12; i++) {
      const positions = [];
      for (let j = 0; j < 3; j++) {
        const a = (i + j / 3) / 12 * tau, b = (i + (j + 1) / 3) / 12 * tau;
        positions.push(x,peak,z, x+Math.cos(a)*radius,rim,z+Math.sin(a)*radius, x+Math.cos(b)*radius,rim,z+Math.sin(b)*radius);
      }
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3)); geometry.computeVertexNormals();
      const m = i % 2 ? cream : color; m.side = THREE.DoubleSide;
      mesh(geometry, m, group);
      const angle = i / 12 * tau;
      between(group, paleWood, [x,peak-.025,z], [x+Math.cos(angle)*radius,rim-.015,z+Math.sin(angle)*radius], .014);
    }
    sphere(group, paleWood, [x, peak + .04, z], [.08,.1,.08], 10);
  }
  function lounger(x, z, angle, color) {
    const chair = new THREE.Group(); chair.position.set(x, .04, z); chair.rotation.y = angle; group.add(chair);
    box(chair, color, [0, .34, .24], [.82,.09,1.48]);
    const back = box(chair, color, [0, .67, -.77], [.82,.09,1.02]); back.rotation.x = .72;
    for (const side of [-1, 1]) {
      box(chair, paleWood, [side*.45, .3, .25], [.065,.095,1.6]);
      const rail = box(chair, paleWood, [side*.45, .65, -.77], [.06,.065,1.08]); rail.rotation.x = .72;
      for (const zz of [-.45,.73]) between(chair, paleWood, [side*.4,.31,zz], [side*.49,0,zz+.16], .035);
    }
    box(chair, cream, [0,.44,.32], [.73,.06,.29]);
  }
  umbrella(-12.5, 1.5, coral); umbrella(12.6, 1.5, turquoise);
  umbrella(-7.6, -10.2, turquoise, 1.85); umbrella(7.5, -9.6, coral, 1.9);
  lounger(-11.4, 3.3, -.35, coral); lounger(-13.5, 3.1, -.15, coral);
  lounger(11.4, 3.1, .35, turquoise); lounger(13.5, 3.4, .1, turquoise);
  lounger(-7.4, -7.8, .1, turquoise); lounger(7.2, -7.3, -.1, coral);
  // A beach-club sign and surfboards make the location distinct from a poolside set.
  for (const x of [-2.15, 2.15]) cylinder(group, timber, [x, 1.3, -9], .065,.09,2.65,12);
  box(group, turquoise, [0, 2.23, -9], [4.6,.96,.14]);
  box(group, paleWood, [0, 2.74, -9], [4.85,.075,.2]);
  textPlane(group, 'SUNSET BEACH CLUB', [0,2.34,-8.914], 4.16,.32, '#fff0cd');
  textPlane(group, 'GOOD HANDS · GOLDEN HOUR', [0,1.98,-8.912], 3.45,.16, '#d6eddf');
  for (const [x, color, lean] of [[-10.4, coral, .17], [10.6, turquoise, -.22]]) {
    const board = new THREE.Group(); board.position.set(x, 1.55, -6.4); board.rotation.z = lean; board.rotation.y = x > 0 ? -.3 : .3; group.add(board);
    sphere(board, color, [0,0,0], [.37,1.6,.07], 20);
    box(board, cream, [0,0,.068], [.065,2.82,.015]);
  }
  // Pebbles and small grasses are low enough to keep every camera-to-table ray clear.
  for (let i = 0; i < 24; i++) {
    const side = i % 2 ? -1 : 1, x = side * (7.7 + (i % 4)*.55), z = -4.7 + (i % 7)*1.65;
    sphere(group, i % 3 ? paleWood : cream, [x,-.02,z], [.1+(i%3)*.05,.06,.09], 8);
  }
  for (const [x,z] of [[-8,5.8],[8.1,5.9],[-9.3,-5.8],[9.5,-5.6]]) {
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * tau;
      between(group, leaves[i%3], [x,-.02,z], [x+Math.cos(angle)*.32,.36+(i%3)*.12,z+Math.sin(angle)*.32], .028,.008);
    }
  }
  bakeStatic(group);
  return group;
}
