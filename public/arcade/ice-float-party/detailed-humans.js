/**
 * Seated reference-inspired characters. Local +Y is up and +Z is forward.
 * The facial artwork is projected on a sculpted, closed 3D head; it is not a
 * camera-facing sprite. Hair, clothing, limbs and footwear are separate meshes.
 */
const resourceSets = new WeakMap();

const THEMES = [
  { skin: '#f5be9c', hair: '#583522', lightHair: '#85543a', darkHair: '#3b261e', coat: '#d72e3c', seam: '#a91929', lining: '#fff5e5', trouser: '#292634', shoe: '#dd303d', eyes: '#513020' },
  { skin: '#f4bc93', hair: '#382821', lightHair: '#624637', darkHair: '#251c19', coat: '#f4f5fc', seam: '#c1cddd', lining: '#2777d8', trouser: '#2663c5', shoe: '#3b88ed', eyes: '#593e30' },
  { skin: '#f2ba8b', hair: '#ffc54e', lightHair: '#ffe589', darkHair: '#ce892c', coat: '#25262d', seam: '#111319', lining: '#f8f4ed', trouser: '#25252c', shoe: '#f6f4ef', eyes: '#402f2a' },
  { skin: '#f8c1a2', hair: '#382437', lightHair: '#654364', darkHair: '#231923', coat: '#9247dc', seam: '#6629a6', lining: '#f9eefc', trouser: '#352b48', shoe: '#9a60d6', eyes: '#573c71' },
  { skin: '#f3ba91', hair: '#624028', lightHair: '#8e6545', darkHair: '#382820', coat: '#0c9d98', seam: '#086f70', lining: '#fbf8ee', trouser: '#282a33', shoe: '#42b8b6', eyes: '#5b3c28' }
];

// Pixel landmarks from the supplied 2172 × 724 reference atlas. The portraits
// have a slight three-quarter pose, which remains in the projected expression.
const FACE_RECTS = [
  [201, 181, 87, 97],
  [611, 184, 80, 89],
  [1018, 172, 94, 98],
  [1499, 177, 80, 101],
  [1906, 185, 88, 92]
];

function resources(T) {
  let r = resourceSets.get(T);
  if (r) return r;
  const geometries = new Map();
  const materials = new Map();
  const atlas = new T.TextureLoader().load(new URL('./assets/riders-atlas-v2.png', import.meta.url).href);
  atlas.colorSpace = T.SRGBColorSpace;
  atlas.anisotropy = 4;
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = maskCanvas.height = 128;
  const context = maskCanvas.getContext('2d');
  const fade = context.createRadialGradient(64, 64, 48, 64, 64, 64);
  fade.addColorStop(0, '#ffffff');
  fade.addColorStop(.68, '#ffffff');
  fade.addColorStop(1, '#000000');
  context.fillStyle = fade;
  context.fillRect(0, 0, 128, 128);
  const faceMask = new T.CanvasTexture(maskCanvas);
  faceMask.channel = 1;
  r = {
    atlas, faceMask, geometries, materials,
    geo(key, make) { if (!geometries.has(key)) geometries.set(key, make()); return geometries.get(key); },
    mat(color, roughness = .67, metalness = 0) {
      const key = `${color}/${roughness}/${metalness}`;
      if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({ color, roughness, metalness }));
      return materials.get(key);
    },
    face(id) {
      const key = `portrait-${id}`;
      if (!materials.has(key)) {
        materials.set(key, new T.MeshStandardMaterial({ map: atlas, alphaMap: faceMask, transparent: true, depthWrite: false, roughness: .91, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
      }
      return materials.get(key);
    }
  };
  resourceSets.set(T, r);
  return r;
}

export function createDetailedHuman(T, actorId = 0) {
  const id = ((Number(actorId) || 0) % 5 + 5) % 5;
  const r = resources(T), palette = THEMES[id];
  const body = new T.Group();
  body.name = `detailed-human-${id}`;
  const skin = r.mat(palette.skin, .83);
  const hair = r.mat(palette.hair, .53);
  const hairLight = r.mat(palette.lightHair, .57);
  const hairDark = r.mat(palette.darkHair, .73);
  const coat = r.mat(palette.coat, id === 0 || id === 3 ? .42 : .69);
  const seam = r.mat(palette.seam, .77);
  const lining = r.mat(palette.lining, .86);
  const trouser = r.mat(palette.trouser, .9);
  const shoe = r.mat(palette.shoe, .65);
  const white = r.mat('#fffcf4', .76);
  const rubber = r.mat(id === 0 ? '#9f3932' : id === 3 ? '#c798ed' : '#dce8e8', .92);
  const metal = r.mat('#c3c9cb', .3, .55);
  const eyeDark = r.mat('#302633', .64);
  const sphere = r.geo('soft-ellipsoid', () => new T.SphereGeometry(1, 20, 12));
  const vector = p => new T.Vector3(...p);

  function mesh(parent, geometry, material, position, scale) {
    const object = new T.Mesh(geometry, material);
    if (position) object.position.set(...position);
    if (scale) object.scale.set(...scale);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function ellipsoid(parent, material, p, scale, rotation) {
    const result = mesh(parent, sphere, material, p, scale);
    if (rotation) result.rotation.set(...rotation);
    return result;
  }
  function tube(parent, material, points, radius = .005, segments = 18, radial = 5) {
    const curve = new T.CatmullRomCurve3(points.map(vector));
    const geometry = new T.TubeGeometry(curve, segments, radius, radial, false);
    const result = mesh(parent, geometry, material);
    result.userData.ownsGeometry = true;
    return result;
  }
  function segment(parent, material, a, b, rx, rz = rx) {
    const av = vector(a), delta = vector(b).sub(av);
    const result = ellipsoid(parent, material, av.addScaledVector(delta, .5).toArray(), [rx, delta.length() / 2 + rx * .38, rz]);
    result.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    return result;
  }
  // An elliptic loft is used for garments and shoe soles. It provides flat
  // fabric fronts and natural changes of section instead of stacked spheres.
  function loft(parent, material, profiles, count = 32, power = 1, openFront = false) {
    const position = [], uv = [], index = [];
    for (let j = 0; j < profiles.length; j++) {
      const [y, rx, rz, z = 0, x = 0] = profiles[j];
      for (let n = 0; n <= count; n++) {
        const a = n / count * Math.PI * 2;
        const sine = Math.sin(a), cosine = Math.cos(a);
        position.push(Math.sign(sine) * Math.pow(Math.abs(sine), power) * rx + x, y, Math.sign(cosine) * Math.pow(Math.abs(cosine), power) * rz + z);
        uv.push(n / count, j / (profiles.length - 1));
        if (j && n && !(openFront && Math.cos((n-.5)/count*Math.PI*2) > .34)) {
          const b = j * (count + 1) + n, a = b - count - 1;
          index.push(a - 1, a, b - 1, a, b, b - 1);
        }
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(position, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    const result = mesh(parent, geometry, material);
    result.userData.ownsGeometry = true;
    return result;
  }

  function garmentPanel(parent, material, points, depth = .045, bevel = .025) {
    const shape = new T.Shape();
    points.forEach(([x, y], n) => n ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    const geometry = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 3, bevelSize: bevel, bevelThickness: bevel * .75, curveSegments: 4, steps: 1 });
    const object = mesh(parent, geometry, material);
    object.userData.ownsGeometry = true;
    return object;
  }

  // Tapered swept locks: flattened cross-sections, a raised central ridge and a
  // narrow tip make a sculpted hair silhouette. Fine strands follow that ridge.
  function lock(parent, points, width, depth, material = hair, highlight = true) {
    const path = new T.CatmullRomCurve3(points.map(vector));
    const position = [], uv = [], indices = [];
    const frames = [], sections = 16, around = 8;
    for (let j = 0; j <= sections; j++) {
      const t = j / sections, center = path.getPoint(t), tangent = path.getTangent(t).normalize();
      const front = new T.Vector3(0, 0, 1);
      if (Math.abs(tangent.dot(front)) > .94) front.set(0, 1, 0);
      const side = new T.Vector3().crossVectors(tangent, front).normalize();
      const raised = new T.Vector3().crossVectors(side, tangent).normalize();
      const taper = Math.max(.055, Math.pow(Math.sin(Math.PI * (.065 + t * .935)), .6));
      frames.push({ center, side, raised, taper });
      for (let k = 0; k <= around; k++) {
        const a = k / around * Math.PI * 2;
        const p = center.clone().addScaledVector(side, Math.cos(a) * width * taper).addScaledVector(raised, Math.sin(a) * depth * taper);
        position.push(p.x, p.y, p.z); uv.push(k / around, t);
        if (j && k) {
          const b = j * (around + 1) + k, a = b - around - 1;
          indices.push(a - 1, b - 1, a, a, b - 1, b);
        }
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(position, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const result = mesh(parent, geometry, material); result.userData.ownsGeometry = true;
    if (highlight) {
      for (const sideOffset of [-.32, .24]) {
        const strand = frames.filter((_, j) => j > 1 && j < sections - 1 && j % 2 === 0).map(frame => frame.center.clone().addScaledVector(frame.side, sideOffset * width * frame.taper).addScaledVector(frame.raised, depth * frame.taper * .94).toArray());
        tube(parent, sideOffset < 0 ? hairDark : hairLight, strand, .0028, 12, 4);
      }
    }
    return result;
  }

  // A gently slouched seated torso, with a white inner top visible through the
  // open jacket. The rear garment is complete for the back-facing view.
  ellipsoid(body, trouser, [0, .465, -.025], [.238, .137, .204]);
  const puffer = id === 0 || id === 3;
  loft(body, coat, [[.50, .14, .105, -.06], [.54, .223, .15, -.075], [.65, .255, .165, -.085], [.78, .252, .16, -.10], [.91, .248, .156, -.105], [1.00, .226, .148, -.10], [1.05, .16, .11, -.075], [1.077, .09, .075, -.064]], 32, .92, puffer);
  const shirt = garmentPanel(body, id === 1 ? coat : lining, [[-.118,.562],[.112,.558],[.13,.932],[.088,1.037],[-.083,1.04],[-.133,.94]], .026, .019);
  // The lining sits behind the open down-jacket panels. Its previous front
  // plane intersected their rounded inner edges and caused zipper-side shards.
  shirt.position.z = puffer ? .015 : .063;
  for (const side of [-1, 1]) {
    if (id !== 1) {
      let paddedProfiles;
      if (puffer) {
        // Broad continuous padded lobes with shallow stitched depressions.
        // Their fully rounded front replaces the hard-edged extruded panels.
        paddedProfiles = [
          [.548,.067,.024,.072,side*.134], [.579,.105,.065,.073,side*.14],
          [.613,.112,.086,.073,side*.146], [.647,.107,.072,.073,side*.146],
          [.691,.117,.089,.074,side*.146], [.748,.111,.075,.074,side*.144],
          [.795,.118,.092,.075,side*.142], [.85,.109,.077,.075,side*.142],
          [.901,.113,.088,.072,side*.141], [.953,.098,.068,.068,side*.144],
          [1.005,.068,.044,.055,side*.127], [1.027,.028,.015,.051,side*.112]
        ];
        // Subdivide the padding profile with a smooth cubic, so there are no
        // hard polygon corners between each shallow quilted depression.
        const smooth=[];
        for(let row=0;row<paddedProfiles.length-1;row++) {
          const a=paddedProfiles[Math.max(0,row-1)],b=paddedProfiles[row],c=paddedProfiles[row+1],d=paddedProfiles[Math.min(paddedProfiles.length-1,row+2)];
          for(let sample=0;sample<4;sample++) {
            const t=sample/4,tt=t*t,ttt=tt*t;
            smooth.push(b.map((value,k)=>k===0?value+(c[k]-value)*t:.5*((2*value)+(-a[k]+c[k])*t+(2*a[k]-5*value+4*c[k]-d[k])*tt+(-a[k]+3*value-3*c[k]+d[k])*ttt)));
          }
        }
        smooth.push(paddedProfiles.at(-1));
        loft(body,coat,smooth,36,.91);
      } else {
        const panel = garmentPanel(body, coat, [[side*.035,.565],[side*.208,.538],[side*.251,.659],[side*.238,.939],[side*.153,1.043],[side*.085,.99]], .024, .037);
        panel.position.z = .072;
      }
      // Zipper teeth and a loose, curved opening catch the key light.
      if (puffer) {
        const zip=paddedProfiles.slice(1,-1).map(([y,rx,rz,z,x])=>[x-side*rx*Math.pow(.89,.91),y,z+rz*Math.pow(Math.sqrt(1-.89*.89),.91)+.003]);
        tube(body,seam,zip,.0036,30,5);
        for(const n of [3,5,7]) {
          const [y,rx,rz,z,x]=paddedProfiles[n],stitch=[];
          for(let k=0;k<=12;k++) {
            const a=-1.02+k/12*2.04,s=Math.sin(a);
            stitch.push([x+Math.sign(s)*Math.pow(Math.abs(s),.91)*rx,y,z+Math.pow(Math.cos(a),.91)*rz+.003]);
          }
          tube(body,seam,stitch,.0015,20,4);
        }
      } else {
        tube(body,id===2?metal:seam,[[side*.033,.565,.136],[side*.052,.71,.145],[side*.067,.84,.144],[side*.086,.978,.127]],.0065,16,5);
        tube(body, seam, [[side*.196,.595,.131],[side*.156,.679,.155],[side*.168,.737,.148]], .004);
        tube(body, lining, [[side*.099,.965,.13],[side*.132,.918,.15],[side*.178,.863,.145]], .0035);
      }
    }
    // Fabric wrinkles on the inner shirt, back and side, shallow enough to read
    // as cloth rather than ornament.
    tube(body, id === 1 ? r.mat('#dae2ee', .88) : r.mat('#e2ddd8',.88), [[side*.031,.626,puffer?.061:.112],[side*.085,.642,puffer?.066:.12],[side*.122,.625,puffer?.060:.113]], .0035, 12);
    tube(body, seam, [[side*.17,.675,-.222],[side*.215,.72,-.19],[side*.248,.77,-.12]], .004, 12);
  }

  // Hood folds and collar, with a deeper neck opening.
  const hoodMat = id === 1 ? lining : id === 4 ? lining : coat;
  ellipsoid(body, hoodMat, [0,1.015,-.16],[.184,.112,.117]);
  tube(body, id===0?lining:hoodMat, [[-.144,1.028,.00],[-.108,1.055,.081],[0,1.045,.113],[.108,1.055,.081],[.144,1.028,.00]], id===0?.043:.024, 26, 9);
  if (id === 0) {
    for (let n=0;n<34;n++) {
      const a=n/33*Math.PI, x=Math.cos(a)*.15, y=1.032+Math.sin(a)*.035, z=.078+Math.sin(a)*.057;
      ellipsoid(body,lining,[x,y,z],[.022+(n%3)*.004,.029,.025]);
    }
  } else if (id === 1 || id === 4) {
    for (const side of [-1,1]) {
      tube(body,id===1?lining:white,[[side*.071,1.026,.12],[side*.077,.916,.128],[side*.082,.875,.133]],.005,12);
      segment(body,id===1?r.mat('#1b529e'):metal,[side*.082,.872,.133],[side*.084,.85,.133],.007);
    }
    if(id===1) {
      tube(body,lining,[[-.191,.593,.128],[0,.574,.16],[.191,.593,.128]],.025,22,7);
      tube(body,r.mat('#8faacc'),[[-.109,.67,.124],[0,.637,.139],[.105,.67,.124]],.004,16);
      const logo=garmentPanel(body,lining,[[.08,.869],[.132,.879],[.108,.928]],.003,.002); logo.position.z=.126;
    }
  }
  const pull=ellipsoid(body,metal,[.041,.643,.161],[.009,.018,.004]);pull.rotation.z=.23;

  const arms=[];
  for(const side of [-1,1]) {
    const arm=new T.Group();arm.name=side<0?'left-arm':'right-arm';arm.position.set(side*.218,.997,-.063);body.add(arm);
    const shoulder=[0,0,0], elbow=[side*.229,-.173,.012], wrist=[side*.383,-.445,.202];
    // The sleeve begins under the collar inside the torso, not on an exposed
    // cut at the shoulder. A hidden end cap closes the garment completely.
    const sleeveCurve=new T.CatmullRomCurve3([new T.Vector3(-side*.102,.022,-.012),vector(shoulder),new T.Vector3(side*.122,-.053,-.001),vector(elbow),new T.Vector3(side*.332,-.33,.117),vector(wrist)]);
    const sleeveSections=28,sleeveAround=18,sleeveFrames=sleeveCurve.computeFrenetFrames(sleeveSections,false);
    const sleeveRadius=t=>(.091-.020*t+.026*Math.sin(Math.PI*t))*(id===0||id===3?1-.022*Math.cos(t*Math.PI*8):1);
    const sleevePositions=[],sleeveUV=[],sleeveIndices=[];
    for(let j=0;j<=sleeveSections;j++) {
      const t=j/sleeveSections,c=sleeveCurve.getPointAt(t),radius=sleeveRadius(t);
      for(let n=0;n<=sleeveAround;n++) {
        const angle=n/sleeveAround*Math.PI*2;
        const point=c.clone().addScaledVector(sleeveFrames.normals[j],Math.cos(angle)*radius).addScaledVector(sleeveFrames.binormals[j],Math.sin(angle)*radius*1.075);
        sleevePositions.push(point.x,point.y,point.z);sleeveUV.push(n/sleeveAround,t);
        if(j&&n){const b=j*(sleeveAround+1)+n,a=b-sleeveAround-1;sleeveIndices.push(a-1,a,b-1,a,b,b-1);}
      }
    }
    const capIndex=sleevePositions.length/3,capCenter=sleeveCurve.getPointAt(0);
    sleevePositions.push(capCenter.x,capCenter.y,capCenter.z);sleeveUV.push(.5,0);
    for(let n=0;n<sleeveAround;n++)sleeveIndices.push(capIndex,n+1,n);
    const sleeveGeometry=new T.BufferGeometry();sleeveGeometry.setAttribute('position',new T.Float32BufferAttribute(sleevePositions,3));sleeveGeometry.setAttribute('uv',new T.Float32BufferAttribute(sleeveUV,2));sleeveGeometry.setIndex(sleeveIndices);sleeveGeometry.computeVertexNormals();
    const continuousSleeve=mesh(arm,sleeveGeometry,coat);continuousSleeve.userData.ownsGeometry=true;
    if(id===0||id===3) {
      // Broad baffles interrupt only the sleeve silhouette; inset stitch lines
      // follow the same curved section.
      for(let n=0;n<4;n++) {
        const t=(n+.6)/4;
        const crossRadius=sleeveRadius(t)+.0008;
        const frame=Math.round(t*sleeveSections),axisX=sleeveFrames.normals[frame],axisZ=sleeveFrames.binormals[frame];
        const c=sleeveCurve.getPointAt(t);
        const points=[];
        for(let k=0;k<=12;k++) {
          const a=k/12*Math.PI*2;
          points.push(c.clone().addScaledVector(axisX,Math.cos(a)*crossRadius).addScaledVector(axisZ,Math.sin(a)*crossRadius*1.075).toArray());
        }
        tube(arm,seam,points,.0022,20,4);
      }
    } else {
      tube(arm,id===2?lining:seam,[[side*.024,.071,-.01],[side*.168,-.075,.05],[side*.26,-.241,.114]],id===2?.008:.004,16);
      tube(arm,seam,[[side*.229,-.165,.114],[side*.264,-.199,.131],[side*.302,-.283,.161]],.0038,13);
    }
    const cuffA=vector(wrist).add(new T.Vector3(-side*.008,.027,-.015)).toArray();
    const cuffB=vector(wrist).add(new T.Vector3(side*.016,-.024,.018)).toArray();
    segment(arm,id===0?lining:id===1?lining:coat,cuffA,cuffB,.079,.077);
    for(let n=0;n<4;n++) tube(arm,id===0?lining:seam,[[side*(.341+n*.014),-.432,.247],[side*(.349+n*.014),-.475,.268]],.0025,6,4);
    const handMat=id===0?r.mat('#2d2b32',.94):skin;
    const hand=ellipsoid(arm,handMat,[side*.394,-.498,.268],[.067,.069,.042],[.24,0,side*.19]);
    for(let finger=0;finger<4;finger++) {
      const x=side*(.351+finger*.022),length=[.059,.077,.073,.055][finger];
      tube(arm,handMat,[[x,-.506,.293],[x+side*.005,-.543,.307],[x+side*.013,-.543-length*.56,.295]],id===0?.013:.0105,9,6);
      if(id!==0) ellipsoid(arm,r.mat('#f4ceba',.84),[x+side*.012,-.539-length*.55,.301],[.005,.010,.0025],[0,0,side*.1]);
    }
    tube(arm,handMat,[[side*.341,-.485,.27],[side*.321,-.522,.291],[side*.332,-.547,.298]],id===0?.019:.014,10,7);
    arms.push(arm);
  }

  const legs=[];
  for(const side of [-1,1]) {
    const leg=new T.Group();leg.name=side<0?'left-leg':'right-leg';body.add(leg);
    const bent=id===2||id===4;
    const hip=[side*.121,.495,-.015],knee=[side*(bent?.196:.169),bent?.711:.626,.431],ankle=[side*(bent?.24:.186),.452,.846];
    const bare=id===1||id===3;
    segment(leg,trouser,hip,bare?vector(hip).lerp(vector(knee),id===3?.48:.70).toArray():knee,.114,.104);
    if(bare) {
      segment(leg,skin,vector(hip).lerp(vector(knee),.40).toArray(),knee,id===3?.080:.091,.083);
      ellipsoid(leg,skin,knee,[.089,.082,.086]);
      segment(leg,skin,knee,ankle,id===3?.062:.069,.067);
      const sockStart=vector(ankle).lerp(vector(knee),id===3?.42:.31).toArray();
      segment(leg,white,sockStart,ankle,.068,.072);
      for(let n=0;n<2;n++) {
        const point=vector(sockStart).lerp(vector(ankle),.08+n*.08);
        const torus=r.geo(`sock-ring-${id}`,()=>new T.TorusGeometry(.066,.004,5,24));
        const ring=mesh(leg, id===3?torus:torus,id===3?r.mat('#d8b4f0'):r.mat('#dfdfde'),point.toArray());
        ring.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),vector(knee).sub(vector(ankle)).normalize());
      }
      tube(leg,id===1?lining:seam,[[side*.096,.562,.263],[side*.165,.557,.317],[side*.235,.589,.285]],.003,12);
    } else {
      segment(leg,trouser,knee,ankle,.083,.087);
      for(let n=0;n<3;n++) {
        const y=.49+n*.048,z=.803-n*.051;
        tube(leg,r.mat('#45434a',.91),[[side*.17,y-.006,z+.035],[side*.238,y,z+.051],[side*.291,y+.016,z+.018]],.0032,10);
      }
      segment(leg,trouser,vector(ankle).add(new T.Vector3(0,.027,-.023)).toArray(),vector(ankle).add(new T.Vector3(0,-.014,.016)).toArray(),.082,.079);
      if(id===2) tube(leg,lining,[[side*.219,.565,.201],[side*.268,.706,.419],[side*.306,.623,.565],[side*.304,.47,.811]],.007,24,5);
      if(id===0) segment(leg,lining,[side*.18,.477,.811],[side*.187,.438,.868],.081,.079);
    }
    // A shaped sneaker, sole, toe bumper, heel tab and laced tongue.
    const footwear=new T.Group();footwear.position.set(ankle[0],.335,.918);footwear.rotation.y=side*-.11;leg.add(footwear);
    const outsole=loft(footwear,rubber,[[-.040,.045,.103,.021],[-.031,.106,.195,.052],[-.010,.108,.199,.052],[.001,.103,.191,.052]],28,.91);
    loft(footwear,white,[[-.010,.104,.193,.05],[.014,.108,.195,.05],[.031,.102,.187,.05]],28,.91);
    loft(footwear,shoe,[[.025,.088,.173,.05],[.045,.100,.181,.05],[.081,.095,.171,.035],[.108,.085,.144,.014],[.133,.067,.099,-.02],[.146,.049,.053,-.044]],28,.92);
    ellipsoid(footwear,id===2?eyeDark:white,[0,.131,-.051],[.055,.008,.054]);
    ellipsoid(footwear,shoe,[0,.142,-.033],[.039,.014,.07],[.13,0,0]);
    ellipsoid(footwear,id===0?shoe:white,[0,.080,.176],[.086,.027,.039]);
    for(const edge of [-1,1]) {
      tube(footwear,id===2?eyeDark:white,[[edge*.079,.058,-.081],[edge*.088,.062,.005],[edge*.082,.075,.113]],.007,12);
      tube(footwear,id===0?eyeDark:white,[[edge*.048,.123,-.032],[edge*.058,.113,.03],[edge*.046,.096,.094]],.0035,12);
      for(let n=0;n<4;n++) ellipsoid(footwear,id===0?metal:white,[edge*.040,.124-n*.007,-.017+n*.027],[.008,.003,.008]);
    }
    for(let n=0;n<4;n++) {
      const z=-.016+n*.027,y=.133-n*.007;
      tube(footwear,id===0?eyeDark:white,[[-.041,y,z],[0,y+.006,z+.016],[.041,y-.002,z+.007]],.0045,8,5);
    }
    tube(footwear,id===0?eyeDark:white,[[0,.138,.008],[-.039,.153,-.024],[-.044,.151,.009],[0,.138,.008],[.042,.153,-.004],[.033,.149,.032],[0,.138,.008]],.004,20,5);
    for(let n=0;n<5;n++) tube(footwear,id===0?r.mat('#702b25'):r.mat('#99b2b3'),[[-.079,-.033,-.047+n*.044],[0,-.037,-.035+n*.044],[.079,-.033,-.047+n*.044]],.003,8,4);
    legs.push(leg);
  }

  ellipsoid(body,skin,[0,1.078,-.053],[.079,.113,.077]);
  const head=new T.Group();head.name='sculpted-reference-head';head.position.set(0,1.318,-.045);body.add(head);
  const headGeometry=r.geo(`head-${id}`,()=>{
    const geometry=new T.SphereGeometry(1,40,28);
    const p=geometry.attributes.position;
    for(let n=0;n<p.count;n++) {
      const x=p.getX(n),y=p.getY(n),z=p.getZ(n);
      const jaw=1-.19*Math.max(0,-y);
      const px=x*.233*jaw,py=y*.272;
      let pz=z*.208;
      if(z>0) {
        const cheek=.009*Math.exp(-Math.pow((Math.abs(px)-.122)/.075,2)-Math.pow((py+.052)/.098,2));
        const nose=.024*Math.exp(-Math.pow(px/.036,2)-Math.pow((py+.039)/.061,2));
        pz+=cheek+nose;
      }
      p.setXYZ(n,px,py,pz);
    }
    geometry.computeVertexNormals();return geometry;
  });
  mesh(head,headGeometry,skin);
  for(const side of [-1,1]) {
    ellipsoid(head,skin,[side*.229,-.026,-.013],[.045,.063,.035],[0,0,side*.16]);
    ellipsoid(head,r.mat('#d58c77',.87),[side*.247,-.024,.011],[.019,.037,.012],[0,side*.2,side*.2]);
    tube(head,skin,[[side*.246,.009,.026],[side*.265,-.015,.023],[side*.247,-.051,.025]],.0075,10,6);
  }

  // Each facial cap is a curved continuation of the head surface, with modeled
  // cheeks and nose relief. The additional UV set gives a soft skin transition.
  const faceGeometry=r.geo(`face-cap-${id}`,()=>{
    const positions=[],uv=[],uv1=[],index=[];
    const [sourceX,sourceY,sourceW,sourceH]=FACE_RECTS[id];
    const segments=48,rings=16;
    for(let j=0;j<=rings;j++) {
      const radius=j/rings;
      for(let n=0;n<=segments;n++) {
        const a=n/segments*Math.PI*2,nx=Math.cos(a)*radius,ny=Math.sin(a)*radius;
        const y=ny*.239-.013,x=nx*.221*(1-.12*Math.max(0,-ny));
        const jaw=1-.19*Math.max(0,-y/.272);
        const z=.208*Math.sqrt(Math.max(.003,1-(x/(.233*jaw))**2-(y/.272)**2))
          +.009*Math.exp(-Math.pow((Math.abs(x)-.122)/.075,2)-Math.pow((y+.052)/.098,2))
          +.024*Math.exp(-Math.pow(x/.036,2)-Math.pow((y+.039)/.061,2))+.0025;
        positions.push(x,y,z);
        uv.push((sourceX+(nx*.5+.5)*sourceW)/2172,1-(sourceY+(1-(ny*.5+.5))*sourceH)/724);
        uv1.push(nx*.5+.5,ny*.5+.5);
        if(j&&n) {const b=j*(segments+1)+n,a=b-segments-1;index.push(a-1,b-1,a,a,b-1,b);}
      }
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('uv1',new T.Float32BufferAttribute(uv1,2));geometry.setIndex(index);geometry.computeVertexNormals();return geometry;
  });
  const portrait=mesh(head,faceGeometry,r.face(id));portrait.name='reference-expression-on-curved-face';portrait.renderOrder=1;

  // The hair cap is trimmed above the eyebrows at the front and descends behind
  // the ears. All styles have complete rear geometry when turning away.
  const hairCap=r.geo(`hair-cap-${id}`,()=>{
    const positions=[],uv=[],indices=[],segments=40,rings=15;
    for(let j=0;j<=rings;j++) for(let n=0;n<=segments;n++) {
      const angle=n/segments*Math.PI*2;
      const frontness=(Math.cos(angle)+1)/2;
      const end=1.86-.68*frontness;
      const phi=.001+j/rings*end;
      const sine=Math.sin(phi),cosine=Math.cos(phi);
      positions.push(Math.sin(angle)*sine*.245,cosine*.273+.025,Math.cos(angle)*sine*.223-.019);
      uv.push(n/segments,j/rings);
      if(j&&n){const b=j*(segments+1)+n,a=b-segments-1;indices.push(a-1,b-1,a,a,b-1,b);}
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
  });
  mesh(head,hairCap,hair);

  if(id===0) {
    // Combed hair sweeps up into a braided, off-centre bun. Loose temple locks
    // frame the face; the fringe stays clear of the atlas eyes.
    for(let n=0;n<8;n++) {
      const x=-.217+n*.061;
      lock(head,[[x*.36,.282,-.084],[x*.68,.267,.073],[x,.205,.155],[x*.98,.103+(n%3)*.019,.192]],.041,.023,hair,n%2===0);
    }
    for(const side of [-1,1]) lock(head,[[side*.207,.184,.064],[side*.239,.088,.06],[side*.232,-.067,.047],[side*.202,-.161,.036]],.036,.025);
    ellipsoid(head,hair,[-.095,.317,-.072],[.119,.12,.104]);
    for(let n=0;n<8;n++) {
      const a=n/8*Math.PI*2,rr=.089;
      lock(head,[[-.095+Math.cos(a)*rr,.30+Math.sin(a)*rr,-.098],[-.095+Math.cos(a+.6)*.104,.335+Math.sin(a+.6)*.098,-.009],[-.095+Math.cos(a+1.6)*.06,.358+Math.sin(a+1.6)*.056,-.016]],.03,.024,hair,n%2===0);
    }
    tube(head,hairDark,[[-.19,.28,-.051],[-.1,.258,.029],[-.003,.286,-.043]],.013,18,6);
  } else if(id===3) {
    // A high side ponytail with long overlapping S-curves gives a different
    // silhouette from the bun girl's tightly gathered hairstyle.
    for(let n=0;n<7;n++) {
      const x=-.207+n*.064;
      lock(head,[[.085,.273,-.036],[x*.42,.28,.091],[x,.207,.172],[x*.99,.076+(n%2)*.026,.167]],.05,.025,hair,n%2===0);
    }
    const tailRoot=[-.113,.286,-.169];
    ellipsoid(head,hair,tailRoot,[.104,.093,.086]);
    for(let n=0;n<7;n++) {
      const shift=(n-3)*.031;
      lock(head,[[tailRoot[0]+shift,.302,-.166],[-.269+shift,.243,-.237],[-.282+shift,.049,-.24],[-.238+shift,-.10,-.205],[-.282+shift,-.259,-.198],[-.242+shift,-.382,-.171]],.038,.028,hair,n%2===0);
    }
    for(const side of [-1,1]) {
      lock(head,[[side*.204,.182,.113],[side*.239,.031,.093],[side*.207,-.10,.101],[side*.236,-.239,.104],[side*.214,-.304,.127]],.039,.025);
    }
    for(let n=0;n<10;n++) {
      const a=n/10*Math.PI*2;
      ellipsoid(head,r.mat(n%2?'#c28cf3':'#a466df',.56),[-.139+Math.cos(a)*.068,.285+Math.sin(a)*.061,-.124],[.022,.026,.02]);
    }
  } else {
    const blonde=id===2;
    if (blonde) {
      const curls = [
        [[-.184,.16,-.03],[-.232,.249,.038],[-.137,.315,.125],[-.106,.226,.191],[-.196,.134,.181]],
        [[-.114,.243,-.132],[-.179,.349,-.015],[-.073,.35,.121],[-.013,.269,.172],[-.065,.186,.197]],
        [[-.021,.265,-.16],[.028,.357,-.046],[.12,.333,.063],[.145,.228,.169],[.073,.183,.206]],
        [[.092,.244,-.11],[.182,.298,-.003],[.241,.188,.085],[.201,.108,.145]],
        [[-.091,.249,.149],[-.03,.294,.188],[.046,.217,.204],[.033,.135,.213]]
      ];
      curls.forEach((points,n)=>lock(head,points,n===4?.044:.065,.037,hair,true));
    } else {
      // Interleaved diagonal quiffs, with different roots, heights and tips,
      // follow the reference's side-swept hair rather than repeated comb rows.
      const sweep = [
        [[-.208,.149,-.071],[-.255,.259,.014],[-.142,.318,.135],[-.035,.234,.208]],
        [[-.17,.206,-.126],[-.202,.347,-.006],[-.064,.338,.129],[.075,.207,.204]],
        [[-.091,.238,-.16],[-.104,.373,-.022],[.06,.333,.109],[.18,.209,.164]],
        [[.004,.248,-.178],[.031,.355,-.04],[.153,.313,.065],[.239,.168,.082]],
        [[.103,.219,-.14],[.186,.301,-.084],[.255,.191,.015],[.227,.086,.046]],
        [[-.16,.19,.101],[-.114,.258,.194],[-.025,.213,.228],[-.087,.126,.216]],
        [[-.054,.252,.134],[.027,.263,.198],[.112,.202,.199],[.083,.127,.203]]
      ];
      sweep.forEach((points,n)=>{
        const tousled=points.map((p,j)=>[p[0]+(id===4?Math.sin(n*2.1+j)*.012:0),p[1]+(id===4&&j===1?.018:0),p[2]]);
        lock(head,tousled,n<5?.065:.043,n<5?.033:.027,hair,n%2===0);
      });
    }
    for(const side of [-1,1]) {
      for(let n=0;n<4;n++) {
        lock(head,[[side*.167,.203-n*.034,-.087],[side*.224,.173-n*.043,-.016],[side*.239,.067-n*.041,.021]],.033,.021,hair,n%2===0);
      }
    }
    for(let n=0;n<6;n++) {
      const x=(n-2.5)*.064;
      lock(head,[[x,.208,-.125],[x+.029,.124,-.208],[x+.012,.003,-.213],[x,-.068,-.192]],.043,.022,hair,n%2===0);
    }
  }

  // The reference has black sunglasses; actual temples and a shallow sculpted
  // rim make the side silhouette readable without covering the source lenses.
  if(id===2) {
    for(const side of [-1,1]) {
      tube(head,eyeDark,[[side*.180,.025,.142],[side*.236,.029,.072],[side*.25,.012,-.018]],.010,14,7);
    }
  }
  body.userData.referenceFace = { asset: 'assets/riders-atlas-v2.png', rectangle: FACE_RECTS[id], projection: 'curved head mesh', sourceView: 'three-quarter' };
  body.userData.modelDetail = 'closed sculpted head, swept hair locks, garment seams, articulated seated limbs, fingers, laced sneakers';
  return { body, head, arms, legs };
}

export function disposeDetailedHumanResources(T) {
  const cache=resourceSets.get(T);if(!cache)return;
  cache.atlas.dispose();cache.faceMask.dispose();
  for(const geometry of cache.geometries.values())geometry.dispose();
  for(const material of cache.materials.values())material.dispose();
  resourceSets.delete(T);
}
