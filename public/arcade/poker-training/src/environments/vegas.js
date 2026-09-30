// Project-original casino architecture; all tall scenery stays outside the orbit.
export function buildVegas(parent, materials, kit) {
  const { THREE, mat, mesh, box, sphere, cylinder, between, textPlane, noiseCanvas, textureFrom, bakeStatic } = kit;
  const room = new THREE.Group(); room.name = 'EnvironmentVegas'; parent.add(room);
  const gold = materials.brass;
  const darkGold = materials.darkBrass;
  const black = mat('#12131a', { roughness: .33, metalness: .2 });
  const red = mat('#591521', { roughness: .67 });
  const redVelvet = mat('#8c2132', { roughness: .88 });
  const stone = mat('#c5b799', { roughness: .36, metalness: .12 });
  const cream = mat('#fff0cc', { roughness: .38, emissive: '#ffbd68', emissiveIntensity: .17 });
  const warmGlow = mat('#fff0b7', { emissive: '#ffd382', emissiveIntensity: 3.4, roughness: .2 });
  const redGlow = mat('#ff335a', { emissive: '#ff1649', emissiveIntensity: 2.3 });
  const tealGlow = mat('#5adfd7', { emissive: '#20a69f', emissiveIntensity: 1.9 });

  // One woven texture supplies the full Art Deco carpet, including its gold diamonds.
  const carpetCanvas = noiseCanvas(512, 512, '#49111e', 17);
  const ctx = carpetCanvas.getContext('2d');
  ctx.strokeStyle = '#ad874b'; ctx.lineWidth = 3;
  for (let x = -256; x < 769; x += 256) for (let y = -256; y < 769; y += 256) {
    ctx.beginPath(); ctx.moveTo(x, y - 119); ctx.lineTo(x + 119, y);
    ctx.lineTo(x, y + 119); ctx.lineTo(x - 119, y); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = '#6e4141'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(x, y - 88); ctx.lineTo(x + 88, y);
    ctx.lineTo(x, y + 88); ctx.lineTo(x - 88, y); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#18161c'; ctx.beginPath(); ctx.moveTo(x, y - 43); ctx.lineTo(x + 43, y);
    ctx.lineTo(x, y + 43); ctx.lineTo(x - 43, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c39b59'; ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.strokeStyle = '#ad874b'; ctx.lineWidth = 3;
  }
  const carpet = mat('#ffffff', { map: textureFrom(carpetCanvas, 6), roughness: .97 });
  box(room, carpet, [0, -.06, 0], [24, .11, 24]);
  // Dark walkways frame the playing area without crowding the seats.
  for (const side of [-1, 1]) {
    box(room, black, [side * 9.6, .002, 0], [2.75, .015, 22]);
    box(room, gold, [side * 8.2, .013, 0], [.045, .017, 22]);
    box(room, darkGold, [side * 8.34, .013, 0], [.018, .017, 22]);
  }
  box(room, black, [0, .002, -6.05], [18.8, .015, 1.8]);
  box(room, gold, [0, .013, -5.14], [16.45, .017, .043]);

  // No ceiling or hanging lights: every camera orbit retains an open view of the table.
  box(room, black, [0, 4.3, -7.17], [23, 8.6, .3]);
  box(room, red, [0, 3.55, -6.99], [21.4, 6.9, .055]);
  for (const side of [-1, 1]) {
    box(room, black, [side * 11.1, 4.3, .5], [.24, 8.6, 15.5]);
    box(room, red, [side * 10.95, 3.9, .5], [.04, 7.1, 14.8]);
    for (const y of [.22, 1.35, 7.25]) box(room, gold, [side * 10.88, y, .5], [.085, .055, 15.3]);
    for (const z of [-4.7, -.7, 3.3, 7.1]) {
      box(room, black, [side * 10.87, 4.15, z], [.12, 5.65, 2.5]);
      box(room, redGlow, [side * 10.76, 4.16, z - 1.15], [.035, 5.26, .035]);
      box(room, gold, [side * 10.77, 4.16, z + 1.15], [.04, 5.26, .035]);
      box(room, gold, [side * 10.77, 6.77, z], [.04, .035, 2.32]);
    }
  }
  for (const y of [.16, 1.35, 7.25, 7.42]) box(room, gold, [0, y, -6.89], [22.1, y > 7 ? .055 : .045, .075]);

  // Fluted columns and stepped capitals echo the casino's geometric language.
  for (const x of [-9.5, -5.85, 5.85, 9.5]) {
    box(room, black, [x, .25, -6.55], [.86, .5, .73]);
    box(room, gold, [x, .53, -6.55], [.94, .095, .78]);
    box(room, stone, [x, 3.54, -6.61], [.52, 5.92, .43]);
    for (let f = -2; f <= 2; f++) box(room, darkGold, [x + f * .092, 3.54, -6.378], [.025, 5.87, .025]);
    box(room, gold, [x, 6.52, -6.55], [.77, .13, .64]);
    box(room, gold, [x, 6.68, -6.55], [.97, .14, .79]);
    box(room, black, [x, 6.82, -6.55], [1.16, .14, .87]);
  }

  // Stepped wings and sunburst inlays make the room unmistakable even before the sign.
  for (const side of [-1, 1]) {
    for (let step = 0; step < 5; step++) {
      const x = side * (6.43 + step * .49), h = 1.8 + step * .56;
      box(room, black, [x, 2.55 + h / 2, -6.86], [.4, h, .09]);
      box(room, gold, [x, 2.55 + h, -6.79], [.42, .035, .04]);
      box(room, darkGold, [x - side * .195, 2.55 + h / 2, -6.79], [.025, h, .04]);
    }
    for (let i = 0; i < 7; i++) {
      const angle = -.75 + i * .25;
      between(room, gold, [side * 7.62, 2.25, -6.71], [side * 7.62 + Math.sin(angle) * 1.38, 2.25 + Math.cos(angle) * 1.38, -6.71], .018);
    }
  }

  // Bulb-framed marquee. Its title is local typography, not an imported casino logo.
  const sign = new THREE.Group(); sign.position.set(0, 4.65, -6.53); room.add(sign);
  box(sign, gold, [0, 0, -.08], [9.1, 2.67, .27]);
  box(sign, black, [0, 0, .075], [8.88, 2.45, .07]);
  box(sign, cream, [0, 0, .12], [8.41, 2.0, .06]);
  box(sign, redVelvet, [0, -.83, .158], [8.4, .13, .025]);
  textPlane(sign, 'WELCOME TO', [0, .7, .168], 3.4, .34, '#82312b');
  textPlane(sign, 'LAS VEGAS', [0, .065, .173], 7.77, 1.21, '#801e2a');
  textPlane(sign, 'THE GOLDEN HOUR  ·  PRIVATE POKER LOUNGE', [0, -.55, .174], 6.66, .27, '#6c4c34');
  for (let i = 0; i <= 28; i++) for (const y of [-1.12, 1.12]) sphere(sign, warmGlow, [-4.3 + i * 8.6 / 28, y, .165], [.057, .057, .05], 8);
  for (let i = 1; i < 7; i++) for (const x of [-4.3, 4.3]) sphere(sign, warmGlow, [x, -1.12 + i * 2.24 / 7, .165], [.057, .057, .05], 8);
  const starShape = new THREE.Shape();
  for (let i = 0; i < 16; i++) {
    const a = Math.PI / 2 + i * Math.PI / 8, r = i % 2 ? .17 : (i % 4 ? .42 : .63);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (!i) starShape.moveTo(x, y); else starShape.lineTo(x, y);
  }
  starShape.closePath();
  mesh(new THREE.ShapeGeometry(starShape), redGlow, room, [0, 6.64, -6.37]);
  for (const side of [-1, 1]) {
    box(room, redGlow, [side * 2.65, 6.58, -6.55], [3.58, .035, .05]);
    box(room, gold, [side * 2.65, 6.72, -6.55], [3.58, .019, .04]);
  }

  // A low upholstered banquette is safely below the playing surface.
  for (const x of [-3.45, 3.45]) {
    box(room, black, [x, .18, -5.86], [3.6, .35, .82]);
    box(room, redVelvet, [x, .53, -5.84], [3.6, .29, .93]);
    box(room, redVelvet, [x, 1.06, -6.18], [3.6, .81, .24]);
    box(room, gold, [x, 1.46, -6.18], [3.63, .033, .25]);
    for (let i = 0; i < 5; i++) sphere(room, gold, [x - 1.38 + i * .69, 1.07, -6.047], [.027, .027, .016], 8);
  }
  cylinder(room, black, [0, .08, -5.76], .58, .69, .13, 24);
  cylinder(room, gold, [0, .42, -5.76], .075, .12, .6, 16);
  cylinder(room, black, [0, .76, -5.76], .64, .64, .09, 32);

  // Decorative slot machines sit wholly outside the safe camera rectangle.
  const screenCanvas = document.createElement('canvas'); screenCanvas.width = 256; screenCanvas.height = 256;
  const sc = screenCanvas.getContext('2d'); sc.fillStyle = '#0e272b'; sc.fillRect(0, 0, 256, 256);
  sc.strokeStyle = '#e2b466'; sc.lineWidth = 6; sc.strokeRect(9, 9, 238, 238);
  sc.fillStyle = '#e9ca83'; sc.textAlign = 'center'; sc.font = 'bold 21px Georgia'; sc.fillText('GOLDEN NIGHTS', 128, 40);
  for (let i = 0; i < 3; i++) { sc.fillStyle = '#f6e8c8'; sc.fillRect(23 + i * 73, 68, 63, 108); sc.fillStyle = '#a22531'; sc.font = 'bold 76px Georgia'; sc.fillText('7', 54 + i * 73, 148); }
  sc.fillStyle = '#5ef0d5'; sc.font = '15px sans-serif'; sc.fillText('★  ★  ★', 128, 217);
  const screen = mat('#ffffff', { map: textureFrom(screenCanvas), emissive: '#71c5b8', emissiveIntensity: .55, roughness: .3 });
  for (const side of [-1, 1]) for (const z of [-3.4, -.9, 1.6, 4.1]) {
    const machine = new THREE.Group(); machine.position.set(side * 10.13, 0, z); machine.rotation.y = -side * Math.PI / 2; room.add(machine);
    box(machine, black, [0, .53, 0], [1.04, 1.06, .75]);
    box(machine, gold, [0, 1.09, .14], [1.13, .12, 1.04]);
    box(machine, black, [0, 1.96, -.06], [1.12, 1.62, .54]);
    box(machine, gold, [0, 2.03, .224], [1.035, 1.41, .035]);
    box(machine, black, [0, 2.03, .25], [.97, 1.34, .027]);
    mesh(new THREE.PlaneGeometry(.81, 1.12), screen, machine, [0, 2.03, .269]);
    box(machine, tealGlow, [0, 2.83, -.03], [1.11, .043, .57]);
    box(machine, black, [0, 3.025, -.065], [.99, .32, .45]);
    textPlane(machine, '777', [0, 3.024, .177], .8, .27, '#ffd78d');
    for (const x of [-.28, 0, .28]) sphere(machine, x ? gold : redGlow, [x, 1.164, .43], [.075, .022, .065], 8);
    box(machine, darkGold, [0, .74, .388], [.72, .055, .023]);
    cylinder(machine, gold, [0, .42, 1.05], .04, .06, .77, 12);
    cylinder(machine, black, [0, .07, 1.05], .28, .34, .07, 18);
    cylinder(machine, redVelvet, [0, .84, 1.05], .31, .32, .14, 24);
  }
  for (const side of [-1, 1]) {
    const light = new THREE.PointLight('#ffd295', 22, 16, 2);
    light.position.set(side * 5.1, 5.5, -5.8); room.add(light);
  }
  bakeStatic(room);
  return room;
}
