/** Sculpted, printed vinyl inflatables. Front = +Z; ground = Y 0. */
const floatCaches = new WeakMap();
const TAU = Math.PI * 2;

function getCache(T) {
  if (!floatCaches.has(T)) floatCaches.set(T, { geometries: new Map(), materials: new Map(), textures: new Map() });
  return floatCaches.get(T);
}

function printedTexture(T, id, cache) {
  if (cache.textures.has(id)) return cache.textures.get(id);
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height;
  const pixels = ctx.createImageData(width, height);
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  for (let y = 0; y < height; y++) {
    const phi = y / height * TAU;
    const top = Math.sin(phi);
    // Welds live on the existing surface. Intersecting hair-thin toruses caused
    // jagged self-shadow/depth intersections along the inflated outer wall.
    const weldDistance = Math.min(y, height - y, Math.abs(y - height / 2));
    const weldShade = weldDistance < 1 ? .93 : weldDistance < 2 ? .98 : 1;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      let rgb;
      if (id === 0) {
        const stripe = Math.sin(u * TAU * 13 + Math.sin(phi * 7) * .23 + Math.sin(u * TAU * 29) * .08);
        rgb = top > .11 ? [252, 73, 89] : top > -.015 ? [250, 245, 185] : stripe > -.06 ? [113, 176, 50] : [38, 114, 42];
      } else if (id === 1) {
        const edge = .18 + Math.sin(u * TAU * 13) * .11 + Math.sin(u * TAU * 7 + 1.4) * .065;
        rgb = top > edge ? [249, 73, 179] : [241, 184, 103];
        if (top <= edge) {
          const warmth = Math.max(0, -.1 - top) * .16;
          rgb = mix(rgb, [204, 136, 70], warmth);
        }
      } else if (id === 2) {
        rgb = [255, 216, 34];
      } else if (id === 3) {
        const band = ((u * 8 + Math.sin(phi) * .65 + Math.cos(phi) * .25) % 1 + 1) % 1;
        rgb = band < .31 ? [243, 225, 255] : band < .45 ? mix([243, 225, 255], [200, 146, 240], (band - .31) / .14) : band < .88 ? [155, 75, 214] : mix([155, 75, 214], [243, 225, 255], (band - .88) / .12);
      } else rgb = [32, 192, 166];
      // Restrained vinyl variation; lighting and gloss remain real-time.
      const variation = Math.sin(x * .037 + y * .021) * .8;
      const offset = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) pixels.data[offset + c] = rgb[c] * weldShade + variation;
      pixels.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const periodic = (x, draw) => { for (const offset of [-width, 0, width]) { ctx.save();ctx.translate(x + offset, 0);draw();ctx.restore(); } };
  if (id === 0) {
    for (let n = 0; n < 22; n++) {
      const x = (n * .61803398875 % 1) * width;
      const y = 63 + ((n * 47) % 120);
      periodic(x, () => {
        ctx.translate(0, y);ctx.rotate((n % 3 - 1) * .29);
        ctx.fillStyle = '#482432';ctx.beginPath();ctx.moveTo(0, -13);
        ctx.bezierCurveTo(-7, -5, -8, 6, -3, 10);ctx.bezierCurveTo(5, 16, 12, 4, 0, -13);ctx.fill();
        ctx.strokeStyle = 'rgba(255,190,189,.25)';ctx.lineWidth = 1.5;
        ctx.beginPath();ctx.moveTo(-2, -4);ctx.quadraticCurveTo(-4, 4, -1, 7);ctx.stroke();
      });
    }
  } else if (id === 1) {
    const colors = ['#ffe477', '#87e4ef', '#fff0f8', '#b996ff', '#ffad51'];
    for (let n = 0; n < 55; n++) {
      const x = ((n * .61803398875 + .08) % 1) * width;
      const y = 51 + ((n * 37) % 150);
      periodic(x, () => {
        ctx.translate(0, y);ctx.rotate((n * 1.73) % Math.PI);
        ctx.fillStyle = 'rgba(166,44,131,.22)';ctx.beginPath();ctx.roundRect(-3.5, -9, 8, 21, 4);ctx.fill();
        ctx.fillStyle = colors[n % colors.length];ctx.beginPath();ctx.roundRect(-4.5, -11, 8, 21, 4);ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.4)';ctx.beginPath();ctx.roundRect(-3, -8, 2, 12, 1);ctx.fill();
      });
    }
  } else if (id === 4) {
    for (let n = 0; n < 19; n++) {
      const x = ((n * .61803398875 + .025) % 1) * width;
      const y = n < 13 ? 25 + ((n * 47) % 187) : 425 + ((n * 23) % 65);
      const size = n % 3 ? 23 : 15;
      periodic(x, () => {
        ctx.translate(0, y);ctx.rotate(n * .81);ctx.fillStyle = n % 3 ? '#ffe76b' : '#f0fff5';ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? size * .45 : size;
          if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();ctx.fill();
      });
    }
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.flipY = false;
  texture.wrapS = T.RepeatWrapping;
  texture.wrapT = T.RepeatWrapping;
  texture.anisotropy = 4;
  cache.textures.set(id, texture);
  return texture;
}

function inflatableGeometry(T) {
  const around = 112, cross = 36;
  const positions = [], normals = [], uvs = [], indices = [];
  for (let j = 0; j <= cross; j++) {
    const phi = j / cross * TAU;
    for (let i = 0; i <= around; i++) {
      const theta = i / around * TAU;
      const radial = .60 + .25 * Math.cos(phi);
      positions.push(Math.sin(theta) * radial, .24 + .195 * Math.sin(phi), Math.cos(theta) * radial);
      const normal = new T.Vector3(Math.sin(theta) * Math.cos(phi) / .25, Math.sin(phi) / .195, Math.cos(theta) * Math.cos(phi) / .25).normalize();
      normals.push(...normal.toArray());uvs.push(i / around, j / cross);
      if (i < around && j < cross) {
        const a = j * (around + 1) + i, b = a + around + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function candyWrapperGeometry(T, side) {
  const positions = [], indices = [], uvs = [];
  const lengthSegments = 18, around = 36;
  for (let j = 0; j <= lengthSegments; j++) {
    const t = j / lengthSegments;
    const radius = .045 + Math.sin(Math.min(1, t * 1.2) * Math.PI / 2) * .135;
    for (let i = 0; i <= around; i++) {
      const a = i / around * TAU + t * .48;
      const pleat = 1 + .19 * Math.cos(a * 6 + t * 3);
      positions.push(side * (.845 + t * .29), .265 + Math.sin(a) * radius * pleat, Math.cos(a) * radius * pleat);
      uvs.push(i / around, t);
      if (j < lengthSegments && i < around) {
        const a0 = j * (around + 1) + i, b = a0 + around + 1;
        if (side > 0) indices.push(a0, b, a0 + 1, a0 + 1, b, b + 1);
        else indices.push(a0, a0 + 1, b, a0 + 1, b + 1, b);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  // The UV seam duplicates position vertices. Share their normals so clearcoat
  // cannot expose a hard lighting crease at the otherwise continuous seam.
  const normals = geometry.attributes.normal;
  const normal = new T.Vector3(), other = new T.Vector3();
  for (let j = 0; j <= lengthSegments; j++) {
    const first = j * (around + 1), last = first + around;
    normal.fromBufferAttribute(normals, first);
    other.fromBufferAttribute(normals, last);
    normal.add(other).normalize();
    normals.setXYZ(first, normal.x, normal.y, normal.z);
    normals.setXYZ(last, normal.x, normal.y, normal.z);
  }
  return geometry;
}

export function createDetailedFloat(T, id = 0) {
  id = Math.max(0, Math.min(4, Number(id) || 0));
  const cache = getCache(T);
  const geometry = (key, create) => { if (!cache.geometries.has(key)) cache.geometries.set(key, create());return cache.geometries.get(key); };
  const vinyl = (color, roughness = .24) => {
    const key = `${color}:${roughness}`;
    if (!cache.materials.has(key)) cache.materials.set(key, new T.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: .6, clearcoatRoughness: .19, ior: 1.46 }));
    return cache.materials.get(key);
  };
  const root = new T.Group();root.name = `detailed-float-${id}`;
  const sphere = geometry('sphere', () => new T.SphereGeometry(1, 28, 20));
  function part(parent, g, mat, position = [0, 0, 0], scale = [1, 1, 1]) {
    const m = new T.Mesh(g, mat);m.position.set(...position);m.scale.set(...scale);m.castShadow = true;m.receiveShadow = true;parent.add(m);return m;
  }
  const ball = (parent, mat, p, s) => part(parent, sphere, mat, p, s);
  function tube(parent, mat, points, radius, key) {
    const g = geometry(key, () => new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), 28, radius, 10, false));
    return part(parent, g, mat);
  }
  function handle(side, color) {
    const material = vinyl(color, .22);
    tube(root, material, [[side * .795, .265, -.15], [side * .925, .295, -.12], [side * .948, .305, 0], [side * .925, .295, .12], [side * .795, .265, .15]], .032, `handle-${side}`);
    for (const z of [-.15, .15]) ball(root, material, [side * .81, .27, z], [.046, .049, .054]);
  }

  if (!cache.materials.has(`printed-${id}`)) cache.materials.set(`printed-${id}`, new T.MeshPhysicalMaterial({ color: '#ffffff', map: printedTexture(T, id, cache), roughness: .265, metalness: 0, clearcoat: .52, clearcoatRoughness: .2, ior: 1.46 }));
  part(root, geometry('inflatable', () => inflatableGeometry(T)), cache.materials.get(`printed-${id}`));
  const colors = ['#398635', '#eba356', '#e7ae16', '#9051c4', '#179c86'];
  // A recessed vinyl seat closes the underside without obscuring the ring hole.
  ball(root, vinyl(colors[id], .42), [0, .104, 0], [.39, .027, .39]);
  const valve = ball(root, vinyl(colors[id], .4), [0, .255, -.848], [.033, .037, .018]);
  valve.rotation.x = -.12;

  if (id === 0) {
    handle(-1, '#4e982d');handle(1, '#4e982d');
  } else if (id === 1) {
    const unicorn = new T.Group();unicorn.name = 'sculpted-unicorn';root.add(unicorn);
    const white = vinyl('#fffcf6', .30), pink = vinyl('#f3a4d4', .30), eye = vinyl('#231c34', .12);
    // Tapered upright neck with a broad welded base.
    const neckGeometry = geometry('unicorn-neck', () => {
      const points = [[.0,.0], [.17,.0], [.165,.07], [.123,.27], [.11,.49], [.135,.68], [.12,.76], [.0,.80]].map(([r,y]) => new T.Vector2(r,y));
      return new T.LatheGeometry(points, 36);
    });
    const neck = part(unicorn, neckGeometry, white, [.595, .32, -.02]);neck.rotation.x = .095;
    ball(unicorn, white, [.602, 1.07, .145], [.163, .212, .242]);
    ball(unicorn, white, [.602, .986, .333], [.163, .127, .163]);
    ball(unicorn, pink, [.602, .962, .452], [.139, .063, .032]);
    for (const side of [-1, 1]) {
      const ear = ball(unicorn, white, [.602 + side * .103, 1.26, -.018], [.058, .135, .039]);ear.rotation.z = -side * .22;
      const earInside = ball(unicorn, pink, [.602 + side * .103, 1.266, .014], [.033, .088, .009]);earInside.rotation.z = -side * .22;
      const x = .602 + side * .123;
      ball(unicorn, vinyl('#fff9f5', .32), [x, 1.10, .303], [.047, .057, .018]);
      ball(unicorn, eye, [x, 1.10, .321], [.035, .044, .013]);
      ball(unicorn, vinyl('#ffffff', .18), [x - .009, 1.119, .333], [.010, .014, .005]);
      for (let lash = 0; lash < 2; lash++) tube(unicorn, eye, [[x + side * .018,1.129,.322],[x + side * (.041 + lash * .008),1.148 + lash * .016,.318]], .005, `unicorn-lash-${side}-${lash}`);
      ball(unicorn, vinyl('#cb91b3', .5), [.602 + side * .066, .985, .473], [.011, .018, .006]);
    }
    const hornGeometry = geometry('unicorn-horn', () => new T.ConeGeometry(.055, .32, 28));
    const horn = part(unicorn, hornGeometry, vinyl('#ffcb50', .23), [.602, 1.365, .177]);horn.rotation.x = .14;
    const spiral = [];
    for (let n = 0; n <= 100; n++) {
      const t = n / 100, r = .053 * (1 - t), angle = t * TAU * 4;
      const localY = -.157 + t * .307, localZ = Math.sin(angle) * r;
      spiral.push([.602 + Math.cos(angle) * r, 1.365 + localY * Math.cos(.14) - localZ * Math.sin(.14), .177 + localY * Math.sin(.14) + localZ * Math.cos(.14)]);
    }
    tube(unicorn, vinyl('#ffe39a', .24), spiral, .004, 'horn-spiral');
    const maneColors = ['#fa80bd','#a27bea','#62cfe8','#f38ed0'];
    for (let n = 0; n < 8; n++) {
      const x = .50 + n * .03;
      tube(unicorn, vinyl(maneColors[n % 4], .27), [[x,1.242,-.038],[x-.006,1.189,-.178],[x+.025,1.026,-.226],[x-.018,.851,-.198],[x+.014,.670,-.143],[x,.523,-.08]], .032, `mane-${n}`);
    }
    // Small curled tail on the opposite rear edge balances the tall unicorn neck.
    for (let n = 0; n < 3; n++) {
      const offset = n * .033;
      tube(root, vinyl(maneColors[n], .27), [[-.56+offset,.34,-.40],[-.65+offset,.44,-.49],[-.66+offset,.53,-.43],[-.60+offset,.50,-.40]], .025, `unicorn-tail-${n}`);
    }
  } else if (id === 2) {
    const yellow = vinyl('#ffda31', .24), orange = vinyl('#ff8c1f', .27), black = vinyl('#171b24', .11), white = vinyl('#ffffff', .18);
    ball(root, yellow, [0, .455, .563], [.22, .21, .20]);
    ball(root, yellow, [0, .648, .617], [.249, .258, .229]);
    const bill = ball(root, orange, [0, .556, .845], [.170, .064, .138]);bill.rotation.x = -.06;
    ball(root, vinyl('#f07b16', .29), [0, .527, .851], [.155, .029, .119]);
    tube(root, vinyl('#d96713', .40), [[-.131,.548,.895],[0,.539,.970],[.131,.548,.895]], .006, 'duck-beak-smile');
    for (const side of [-1, 1]) {
      ball(root, black, [side * .106, .691, .817], [.040, .060, .020]);
      ball(root, white, [side * .106 - .010, .714, .836], [.012, .016, .006]);
      ball(root, white, [side * .106 + .013, .675, .836], [.005, .007, .004]);
      ball(root, vinyl('#df7919', .5), [side * .047, .596, .900], [.012, .007, .008]);
      const wing = ball(root, vinyl('#fbc52a', .27), [side * .763, .324, -.055], [.113, .127, .261]);wing.rotation.y = side * -.15;
      for (let n = 0; n < 3; n++) {
        const feather = ball(root, yellow, [side * (.793 - n * .011), .334 + n * .032, -.045 - n * .023], [.075, .032, .156]);feather.rotation.y = side * -.15;
      }
    }
    ball(root, yellow, [0, .341, -.804], [.135, .09, .115]);
  } else if (id === 3) {
    const wrapperKey = 'candy-clear-vinyl';
    if (!cache.materials.has(wrapperKey)) cache.materials.set(wrapperKey, new T.MeshPhysicalMaterial({ color:'#ac69e7', roughness:.16, metalness:.04, clearcoat:1, clearcoatRoughness:.10, transparent:true, opacity:.76, depthWrite:false, side:T.DoubleSide, shadowSide:T.FrontSide }));
    for (const side of [-1, 1]) {
      part(root, geometry(`wrapper-${side}`, () => candyWrapperGeometry(T, side)), cache.materials.get(wrapperKey));
      ball(root, vinyl('#c796ef', .22), [side * .855, .265, 0], [.067, .075, .075]);
      // The film already contains six modeled pleats. Separate subpixel tubes
      // over those folds produced crossing surfaces and jagged shadow strokes.
    }
  } else {
    handle(-1, '#34c6a7');handle(1, '#34c6a7');
  }
  root.userData.forwardAxis = '+Z';
  root.userData.reference = 'riders-atlas-v2.png';
  return root;
}
