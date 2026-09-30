// A completely procedural company celebration hall. The camera can orbit the
// poker table freely: tall scenery is behind z=-7.2 or beyond the side margins.
export function buildGala(parent, materials, kit) {
  const { THREE, mat, mesh, box, sphere, cylinder, between, textPlane,
    noiseCanvas, textureFrom, bakeStatic } = kit;
  const room = new THREE.Group();
  room.name = 'EnvironmentGala';
  parent.add(room);
  const gold = materials.brass;
  const darkGold = materials.darkBrass;
  const charcoal = mat('#171221', { roughness: .42, metalness: .12 });
  const plum = mat('#28152e', { roughness: .87 });
  const velvet = mat('#8f1430', { roughness: .94 });
  const velvetShadow = mat('#4d0925', { roughness: .98 });
  const blush = mat('#db7386', { roughness: .64 });
  const pearl = mat('#f1dfba', { roughness: .34, metalness: .05 });
  const purple = mat('#693182', { roughness: .48, metalness: .16 });
  const balloonGold = mat('#e5b94e', { roughness: .26, metalness: .38 });
  const balloonRed = mat('#b72942', { roughness: .27, metalness: .15 });
  const bulb = mat('#ffde9b', { emissive: '#ffd283', emissiveIntensity: 1.9 });
  const pinkGlow = mat('#ffa6c9', { emissive: '#ea5b9c', emissiveIntensity: 1.6 });
  const ivoryGlow = mat('#fff1d1', { emissive: '#ffe2ae', emissiveIntensity: 1.5 });

  // Dark polished stone, a red carpet island, and broad gold inlays make the
  // entire table feel part of the banquet floor even from the overhead view.
  const stone = mat('#d8c6b4', {
    map: textureFrom(noiseCanvas(512, 512, '#726070', 14), 7),
    roughness: .25, metalness: .18,
  });
  box(room, stone, [0, -.065, .4], [32, .12, 29]);
  for (let x = -15; x <= 15; x += 3) {
    box(room, darkGold, [x, .001, .5], [.021, .009, 28]);
  }
  for (let z = -12; z <= 12; z += 3) {
    box(room, darkGold, [0, .002, z], [31, .009, .021]);
  }
  const carpet = mat('#ffffff', {
    map: textureFrom(noiseCanvas(512, 512, '#6c142e', 21), 4), roughness: .98,
  });
  box(room, darkGold, [0, .014, .15], [11.3, .027, 10.4]);
  box(room, carpet, [0, .036, .15], [11.04, .026, 10.14]);
  for (const x of [-5.3, 5.3]) {
    box(room, gold, [x, .052, .15], [.017, .008, 9.68]);
  }
  for (const z of [-4.69, 4.99]) {
    box(room, gold, [0, .052, z], [10.6, .008, .017]);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const emblem = mesh(new THREE.TorusGeometry(.31, .011, 4, 24), gold,
      room, [sx * 4.78, .056, .15 + sz * 4.35]);
    emblem.rotation.x = Math.PI / 2;
    const diamond = box(room, gold,
      [sx * 4.78, .054, .15 + sz * 4.35], [.16, .01, .16]);
    diamond.rotation.y = Math.PI / 4;
  }

  // The low stage reaches forward; all screen, curtain and truss geometry is
  // firmly behind the camera safety rectangle, never suspended over the table.
  box(room, charcoal, [0, .28, -8.2], [19.4, .56, 4.6]);
  box(room, velvet, [0, .571, -8.2], [19.2, .035, 4.4]);
  box(room, gold, [0, .38, -5.86], [19.35, .08, .05]);
  box(room, ivoryGlow, [0, .14, -5.85], [19.3, .024, .026]);
  box(room, charcoal, [0, .10, -5.58], [5.4, .20, .52]);
  box(room, gold, [0, .203, -5.44], [5.36, .015, .18]);
  box(room, plum, [0, 4.6, -10.64], [31.9, 9.2, .30]);
  box(room, charcoal, [-15.86, 4.6, 1.0], [.3, 9.2, 23]);
  box(room, charcoal, [15.86, 4.6, 1.0], [.3, 9.2, 23]);

  // An illuminated LED screen has a designed canvas texture rather than a
  // borrowed backdrop. Physical frame, riser and light strips remain geometry.
  box(room, darkGold, [0, 4.2, -9.87], [13.04, 5.19, .35]);
  box(room, gold, [0, 4.2, -9.655], [12.83, 4.98, .09]);
  box(room, charcoal, [0, 4.2, -9.589], [12.61, 4.76, .06]);
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 2048;
  screenCanvas.height = 768;
  const ctx = screenCanvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 2048, 768);
  gradient.addColorStop(0, '#341040');
  gradient.addColorStop(.52, '#731331');
  gradient.addColorStop(1, '#241136');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2048, 768);
  const halo = ctx.createRadialGradient(1024, 400, 40, 1024, 400, 1100);
  halo.addColorStop(0, '#b4574540');
  halo.addColorStop(1, '#e0ad5100');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 2048, 768);
  ctx.strokeStyle = '#efca7254';
  ctx.lineWidth = 2;
  for (let i = 0; i < 17; i++) {
    const offset = i * 61;
    ctx.beginPath();
    ctx.moveTo(0, 100 + offset);
    ctx.lineTo(180 + offset * .8, 768);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2048, 100 + offset);
    ctx.lineTo(1868 - offset * .8, 768);
    ctx.stroke();
  }
  ctx.strokeStyle = '#efc778';
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 30, 1980, 708);
  ctx.strokeStyle = '#bc813946';
  ctx.strokeRect(51, 47, 1946, 674);
  // Deterministic little stars keep the screen festive without visual noise.
  ctx.fillStyle = '#f8dda1';
  for (let i = 0; i < 84; i++) {
    const x = 75 + (i * 263 % 1898);
    const y = 60 + (i * 179 % 648);
    if (x > 380 && x < 1670 && y > 170 && y < 600) continue;
    const r = i % 7 === 0 ? 3 : 1.4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f6d68e';
  ctx.font = '500 41px Georgia, serif';
  ctx.fillText('A N N U A L   C E L E B R A T I O N', 1024, 169);
  ctx.shadowColor = '#ffb85280';
  ctx.shadowBlur = 19;
  ctx.fillStyle = '#ffe7b1';
  const headline = '年度盛典之夜';
  let headlineSize = 185;
  do {
    ctx.font = `700 ${headlineSize}px "PingFang SC", "Noto Sans CJK SC", sans-serif`;
    if (ctx.measureText(headline).width <= 1720) break;
    headlineSize -= 2;
  } while (headlineSize >= 96);
  ctx.fillText(headline, 1024, 360);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ebc883';
  ctx.fillRect(678, 507, 692, 2);
  ctx.font = '400 41px Georgia, serif';
  ctx.fillText('T O G E T H E R   W E   S H I N E', 1024, 580);
  const screen = new THREE.MeshBasicMaterial({ map: textureFrom(screenCanvas) });
  mesh(new THREE.PlaneGeometry(12.47, 4.66), screen, room, [0, 4.2, -9.549]);
  for (const x of [-6.57, 6.57]) {
    box(room, ivoryGlow, [x, 4.2, -9.55], [.027, 5.1, .036]);
  }

  // Pleated velvet wings, tasseled swags and fluted gold stage columns.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      const x = side * (7.06 + i * .30);
      cylinder(room, i % 2 ? velvetShadow : velvet, [x, 3.95, -9.53],
        .22, .29, 6.75, 12);
    }
    box(room, velvetShadow, [side * 8.45, 7.19, -9.56], [3.58, .55, .7]);
    between(room, gold, [side * 6.85, 2.32, -9.12],
      [side * 9.70, 2.73, -9.12], .04);
    cylinder(room, gold, [side * 10.22, 3.70, -9.18], .26, .31, 6.25, 24);
    for (let j = 0; j < 8; j++) {
      const a = j * Math.PI / 4;
      cylinder(room, darkGold, [side * 10.22 + Math.sin(a) * .245, 3.7,
        -9.18 + Math.cos(a) * .245], .018, .018, 5.95, 8);
    }
    cylinder(room, gold, [side * 10.22, .68, -9.18], .43, .5, .21, 24);
    cylinder(room, gold, [side * 10.22, 6.86, -9.18], .43, .3, .22, 24);
    sphere(room, ivoryGlow, [side * 10.22, 7.12, -9.18], [.24, .24, .24], 12);
  }

  function starAt(x, y, z, radius, material) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 ? radius * .42 : radius;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (!i) shape.moveTo(px, py); else shape.lineTo(px, py);
    }
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape,
      { depth: .12, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 1, steps: 1 });
    return mesh(g, material, room, [x, y, z]);
  }
  // Balloon bouquets frame the stage, all behind the orbit's rear boundary.
  for (const side of [-1, 1]) {
    const anchorX = side * 7.56, anchorZ = -7.8;
    cylinder(room, gold, [anchorX, .63, anchorZ], .30, .38, .10, 16);
    const colors = [balloonGold, balloonRed, purple, pearl, balloonGold, blush, balloonRed];
    for (let i = 0; i < colors.length; i++) {
      const a = i * 2.4;
      const x = anchorX + Math.sin(a) * .60;
      const z = anchorZ + Math.cos(a) * .25;
      const y = 2.55 + (i % 3) * .55;
      sphere(room, colors[i], [x, y, z], [.34, .45, .31], 16);
      cylinder(room, colors[i], [x, y - .46, z], .042, .075, .09, 8);
      between(room, gold, [anchorX, .69, anchorZ], [x, y - .49, z], .007);
    }
    starAt(side * 5.44, 1.40, -7.53, .52, balloonGold);
    starAt(side * 4.70, 1.01, -7.47, .29, pearl);
  }
  // Wrapped awards and gifts stay low and leave the central stage steps clear.
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const x = side * (4.05 + i * .69), z = -6.83 - (i % 2) * .43;
    const h = .32 + (i % 3) * .18, w = .46 + (i % 2) * .13;
    box(room, [purple, velvet, pearl, blush][i], [x, .60 + h / 2, z], [w, h, .49]);
    box(room, gold, [x, .61 + h / 2, z + .248], [.072, h, .008]);
    box(room, gold, [x, .61 + h, z], [.075, .012, .51]);
    box(room, gold, [x, .615 + h, z], [w + .012, .012, .074]);
    for (const d of [-1, 1]) {
      const bow = mesh(new THREE.TorusGeometry(.088, .021, 5, 14), gold,
        room, [x + d * .075, .68 + h, z]);
      bow.scale.y = .55;
      bow.rotation.z = d * .40;
    }
  }

  // Perimeter festoon strings never cross the poker table or camera volume.
  function stringLights(a, b, sag, count) {
    const points = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      points.push([a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag,
        a[2] + (b[2] - a[2]) * t]);
    }
    for (let i = 0; i < points.length; i++) {
      if (i) between(room, darkGold, points[i - 1], points[i], .011);
      const [x, y, z] = points[i];
      cylinder(room, charcoal, [x, y - .06, z], .028, .028, .1, 8);
      sphere(room, i % 4 === 0 ? pinkGlow : bulb, [x, y - .15, z], [.072, .095, .072], 10);
    }
  }
  stringLights([-14.7, 8.20, -9.0], [14.7, 8.20, -9.0], .58, 38);
  for (const side of [-1, 1]) {
    stringLights([side * 14.50, 6.5, -8.0], [side * 14.50, 6.5, 9.5], .6, 22);
    for (let z = -5.4; z <= 8.7; z += 4.7) {
      box(room, plum, [side * 15.64, 4.0, z], [.055, 6.35, 3.40]);
      for (const dz of [-1.76, 1.76]) {
        box(room, gold, [side * 15.59, 4.0, z + dz], [.075, 6.45, .027]);
      }
      sphere(room, bulb, [side * 15.22, 4.85, z], [.13, .27, .16], 12);
    }
  }

  function banquetTable(x, z, index) {
    cylinder(room, charcoal, [x, .70, z], .12, .22, 1.35, 16);
    cylinder(room, darkGold, [x, .06, z], .50, .59, .10, 24);
    cylinder(room, pearl, [x, 1.41, z], 1.36, 1.41, .13, 40);
    cylinder(room, velvet, [x, 1.485, z], .83, .85, .018, 32);
    cylinder(room, gold, [x, 1.60, z], .12, .24, .21, 16);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      const fx = x + Math.sin(a) * .23, fz = z + Math.cos(a) * .23;
      between(room, darkGold, [x, 1.61, z], [fx, 1.97, fz], .013);
      sphere(room, i % 2 ? blush : velvet, [fx, 1.97, fz], [.16, .13, .14], 12);
    }
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      const px = x + Math.sin(a) * 1.03, pz = z + Math.cos(a) * 1.03;
      cylinder(room, gold, [px, 1.49, pz], .25, .25, .023, 24);
      cylinder(room, pearl, [px, 1.51, pz], .21, .22, .021, 24);
      const napkin = box(room, velvet, [px, 1.537, pz], [.22, .014, .24]);
      napkin.rotation.y = a + .4;
      const gx = x + Math.sin(a + .3) * .91, gz = z + Math.cos(a + .3) * .91;
      cylinder(room, gold, [gx, 1.56, gz], .015, .015, .14, 10);
      cylinder(room, pearl, [gx, 1.69, gz], .072, .037, .13, 12);
      const chairX = x + Math.sin(a) * 1.80, chairZ = z + Math.cos(a) * 1.80;
      const chair = new THREE.Group();
      chair.position.set(chairX, 0, chairZ); chair.rotation.y = a; room.add(chair);
      cylinder(chair, purple, [0, .78, 0], .34, .33, .14, 20);
      box(chair, purple, [0, 1.22, .28], [.64, .77, .12]);
      box(chair, gold, [0, 1.63, .28], [.66, .04, .14]);
      for (const dx of [-.25, .25]) for (const dz of [-.22, .22]) {
        between(chair, gold, [dx, .05, dz], [dx, .73, dz], .025);
      }
    }
    const number = textPlane(room, `0${index}`, [x, 1.89, z - .10], .30, .19, '#b18643', '#fff0ce');
    number.rotation.y = x > 0 ? -.3 : .3;
  }
  // At x=13.25 even the nearest chair edge remains outside |x|=11.
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    banquetTable(side * 13.25, -3.1 + i * 5.1, i + (side < 0 ? 1 : 4));
  }
  const leftWash = new THREE.PointLight('#f486bf', 16, 20, 2);
  leftWash.position.set(-7.9, 4.8, -7.9); leftWash.castShadow = false; room.add(leftWash);
  const rightWash = new THREE.PointLight('#ffd58f', 19, 20, 2);
  rightWash.position.set(7.9, 4.8, -7.9); rightWash.castShadow = false; room.add(rightWash);
  bakeStatic(room);
  return room;
}
