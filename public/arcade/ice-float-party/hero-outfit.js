/** Red-jacket heroine outfit, seated on the reference float. +Z is forward. */
const sets = new WeakMap();
const TAU = Math.PI * 2;

function resources(T) {
  if (sets.has(T)) return sets.get(T);
  const geometries = new Map(), materials = new Map();
  const r = {
    geo(key, make) { if (!geometries.has(key)) geometries.set(key, make());return geometries.get(key); },
    mat(key, options) { if (!materials.has(key)) materials.set(key, new T.MeshPhysicalMaterial(options));return materials.get(key); }
  };
  sets.set(T, r);return r;
}

export function createHeroOutfit(T) {
  const r = resources(T), body = new T.Group();body.name = 'hero-tailored-outfit';
  const red = r.mat('red-shell', {color:'#d82d38',roughness:.61,sheen:.30,sheenColor:new T.Color('#a62f39'),sheenRoughness:.75,clearcoat:.015});
  const darkRed = r.mat('red-stitch', {color:'#a9232e',roughness:.76});
  const redTrim = r.mat('red-binding', {color:'#c02732',roughness:.66});
  const knit = r.mat('ivory-knit', {color:'#f2e8d9',roughness:.94});
  const fur = r.mat('cream-fur', {color:'#fff4e4',roughness:1,sheen:.38,sheenColor:new T.Color('#fffcf3'),sheenRoughness:1});
  const furShade = r.mat('cream-fur-shade', {color:'#e6d7c4',roughness:1});
  const trouser = r.mat('black-denim', {color:'#262630',roughness:.90});
  const trouserSeam = r.mat('denim-stitch', {color:'#38353e',roughness:.93});
  const glove = r.mat('black-glove', {color:'#25242c',roughness:.76});
  const gloveSeam = r.mat('glove-stitch', {color:'#3b3841',roughness:.92});
  const shoeRed = r.mat('red-suede', {color:'#ce3039',roughness:.82,sheen:.2,sheenColor:new T.Color('#e0474e')});
  const shoeLeather = r.mat('red-shoe-leather', {color:'#db4347',roughness:.57});
  const white = r.mat('warm-shoe-white', {color:'#f6efe5',roughness:.76});
  const soleMat = r.mat('rubber-sole', {color:'#aa5449',roughness:.98});
  const soleInset = r.mat('rubber-tread', {color:'#88453e',roughness:.95});
  const blackLace = r.mat('black-lace', {color:'#28242b',roughness:.93});
  const metal = r.mat('gunmetal', {color:'#9c9e9c',roughness:.42,metalness:.56});
  const skin = r.mat('neck-skin', {color:'#f1b491',roughness:.84});
  const sphere = r.geo('sphere', () => new T.SphereGeometry(1,24,16));
  const tuftGeo = r.geo('tuft', () => new T.IcosahedronGeometry(1,1));
  const box = r.geo('box', () => new T.BoxGeometry(1,1,1));
  const vector = p => new T.Vector3(...p);
  function mesh(parent, geometry, material, position, scale, own = false) {
    const object = new T.Mesh(geometry,material);
    if(position)object.position.set(...position);if(scale)object.scale.set(...scale);
    object.castShadow=true;object.receiveShadow=true;
    if(own)object.userData.ownsGeometry=true;
    parent.add(object);return object;
  }
  const ball = (parent,material,position,scale) => mesh(parent,sphere,material,position,scale);
  function tube(parent,material,points,radius=.0035,segments=24,sides=6) {
    const path=new T.CatmullRomCurve3(points.map(vector));
    return mesh(parent,new T.TubeGeometry(path,segments,radius,sides,false),material,null,null,true);
  }
  function geometryFrom(position,index,uv) {
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));
    if(uv)geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    geometry.setIndex(index);geometry.computeVertexNormals();return geometry;
  }
  function closeNormalSeam(geometry,stride,rings) {
    const normal=geometry.attributes.normal,a=new T.Vector3(),b=new T.Vector3();
    for(let j=0;j<rings;j++){const first=j*stride,last=first+stride-1;a.fromBufferAttribute(normal,first);b.fromBufferAttribute(normal,last);a.add(b).normalize();normal.setXYZ(first,a.x,a.y,a.z);normal.setXYZ(last,a.x,a.y,a.z);}
  }
  function profileSample(profiles,t) {
    const x=t*(profiles.length-1),i=Math.min(profiles.length-2,Math.floor(x)),f=x-i;
    return profiles[i].map((value,k)=>T.MathUtils.lerp(value,profiles[i+1][k],f));
  }
  // Elliptical swept cloth: one continuous surface through each joint. Fine
  // compression folds deform that surface instead of stacking separate pads.
  function sweep(parent,material,points,profiles,{segments=38,sides=24,folds=0,padding=0}={}) {
    const path=new T.CatmullRomCurve3(points.map(vector)),positions=[],uv=[],indices=[];
    const side=new T.Vector3(),up=new T.Vector3(),axis=new T.Vector3(1,0,0);
    for(let j=0;j<=segments;j++){
      const t=j/segments,center=path.getPoint(t),tangent=path.getTangent(t).normalize();
      side.copy(axis).addScaledVector(tangent,-axis.dot(tangent)).normalize();up.crossVectors(tangent,side).normalize();
      const [rx,ry]=profileSample(profiles,t);
      for(let n=0;n<=sides;n++){
        const a=n/sides*TAU;
        let compression=1+folds*Math.sin(t*TAU*4.15+a*.43)*Math.exp(-Math.pow((t-.54)/.27,2))*.52;
        if(padding){
          const seamA=.36+.025*Math.cos(a),seamB=.74-.033*Math.sin(a);
          compression+=padding*Math.sin(Math.PI*t)-.055*Math.exp(-Math.pow((t-seamA)/.027,2))-.063*Math.exp(-Math.pow((t-seamB)/.024,2));
        }
        const p=center.clone().addScaledVector(side,Math.cos(a)*rx*compression).addScaledVector(up,Math.sin(a)*ry*compression);
        positions.push(p.x,p.y,p.z);uv.push(n/sides,t);
        if(j&&n){const b=j*(sides+1)+n,c=b-sides-1;indices.push(c-1,c,b-1,c,b,b-1);}
      }
    }
    // Rounded ends are closed, so bending never exposes hollow sleeves/legs.
    for(const [j,reverse] of [[0,true],[segments,false]]){
      const center=path.getPoint(j/segments),c=positions.length/3;positions.push(center.x,center.y,center.z);uv.push(.5,j/segments);
      for(let n=0;n<sides;n++){const a=j*(sides+1)+n;if(reverse)indices.push(c,a+1,a);else indices.push(c,a,a+1);}
    }
    const geometry=geometryFrom(positions,indices,uv);closeNormalSeam(geometry,sides+1,segments+1);
    return mesh(parent,geometry,material,null,null,true);
  }
  function loft(parent,material,profiles,{segments=30,sides=40,power=1}={}) {
    const position=[],uv=[],index=[];
    for(let j=0;j<=segments;j++){
      const [y,rx,rz,z=0,x=0]=profileSample(profiles,j/segments);
      for(let n=0;n<=sides;n++){
        const a=n/sides*TAU,s=Math.sin(a),c=Math.cos(a);
        position.push(x+Math.sign(s)*Math.pow(Math.abs(s),power)*rx,y,z+Math.sign(c)*Math.pow(Math.abs(c),power)*rz);uv.push(n/sides,j/segments);
        if(j&&n){const b=j*(sides+1)+n,a0=b-sides-1;index.push(a0-1,a0,b-1,a0,b,b-1);}
      }
    }
    // Cap with fans; all sole and collar cross-sections are genuinely closed.
    for(const [j,reverse]of [[0,true],[segments,false]]){
      const [y,,,z=0,x=0]=profileSample(profiles,j/segments),c=position.length/3;position.push(x,y,z);uv.push(.5,.5);
      for(let n=0;n<sides;n++){const a=j*(sides+1)+n;if(reverse)index.push(c,a+1,a);else index.push(c,a,a+1);}
    }
    const geometry=geometryFrom(position,index,uv);closeNormalSeam(geometry,sides+1,segments+1);
    return mesh(parent,geometry,material,null,null,true);
  }

  ball(body,trouser,[0,.475,-.045],[.235,.128,.20]);
  // Slightly reclined sweater under a single open-front coat shell.
  loft(body,knit,[[.535,.16,.10,-.035],[.62,.192,.123,-.06],[.80,.194,.132,-.073],[.975,.182,.113,-.095],[1.065,.092,.075,-.108]],{segments:24,sides:36,power:.95});
  for(let n=-5;n<=5;n++){
    const x=n*.015;
    tube(body,furShade,[[x,.985,-.001],[x,1.026,-.020],[x,1.063,-.035]],.0016,9,4);
  }
  ball(body,skin,[0,1.089,-.112],[.075,.093,.074]);

  const coatProfiles=[
    [.53,.197,.126,-.055,.49],[.60,.252,.167,-.07,.44],[.70,.262,.184,-.087,.40],
    [.82,.251,.177,-.105,.40],[.94,.258,.166,-.122,.39],[1.015,.240,.139,-.124,.40],[1.075,.127,.092,-.11,.48]
  ];
  const coatPoint=(t,angle,inside=false)=>{
    const[y,rx,rz,z]=profileSample(coatProfiles,t);
    // Gentle diagonal fullness follows the seated waist and lowered shoulders.
    const fold=1+.018*Math.sin(t*TAU*2.7+angle*1.8)*Math.sin(Math.PI*t);
    const seamA=.305+.025*Math.sin(angle)+.012*Math.sin(angle*2);
    const seamB=.655-.032*Math.cos(angle)+.016*Math.sin(angle*2);
    const fullness=(.013+.018*Math.exp(-Math.pow((t-.19)/.19,2))+.018*Math.exp(-Math.pow((t-.51)/.23,2))+.014*Math.exp(-Math.pow((t-.85)/.15,2)))*Math.pow(Math.sin(Math.PI*t),.45);
    // Two irregular shallow stitched depressions remain part of one closed
    // shell; their broad adjoining lofts read as filled fabric rather than pads.
    const compressed=.014*Math.exp(-Math.pow((t-seamA)/.023,2))+.012*Math.exp(-Math.pow((t-seamB)/.027,2));
    const padded=fullness-compressed;
    const thickness=inside?.018:0;
    return [Math.sin(angle)*(rx+padded*.78-thickness)*fold,y,z+Math.cos(angle)*(rz+padded-thickness)*fold];
  };
  {
    const position=[],index=[],uv=[],rows=64,around=56,stride=around+1,layerSize=(rows+1)*stride;
    for(let layer=0;layer<2;layer++)for(let j=0;j<=rows;j++){
      const t=j/rows,beta=profileSample(coatProfiles,t)[4];
      for(let n=0;n<=around;n++){
        const a=beta+n/around*(TAU-2*beta);position.push(...coatPoint(t,a,!!layer));uv.push(n/around,t);
        if(j&&n){const b=layer*layerSize+j*stride+n,c=b-stride;if(!layer)index.push(c-1,c,b-1,c,b,b-1);else index.push(c-1,b-1,c,c,b-1,b);}
      }
    }
    // Bind all four open boundaries back into the lining with real thickness.
    for(let j=0;j<rows;j++)for(const n of[0,around]){
      const a=j*stride+n,b=a+stride,c=a+layerSize,d=b+layerSize;
      if(n===0)index.push(a,b,c,b,d,c);else index.push(a,c,b,b,c,d);
    }
    for(const j of[0,rows])for(let n=0;n<around;n++){
      const a=j*stride+n,b=a+1,c=a+layerSize,d=c+1;
      if(j===0)index.push(a,c,b,b,c,d);else index.push(a,b,c,b,d,c);
    }
    mesh(body,geometryFrom(position,index,uv),red,null,null,true);
  }
  const zipperPaths=[];
  for(const side of[-1,1]){
    const points=[];
    for(let n=0;n<=28;n++){
      const t=.025+n/28*.86,beta=profileSample(coatProfiles,t)[4],a=side>0?beta:TAU-beta;
      const p=coatPoint(t,a);p[0]+=side*.002;p[2]+=.004;points.push(p);
    }
    tube(body,redTrim,points,.008,36,7);zipperPaths.push(points);
    for(let n=0;n<20;n++){
      const t=.035+n/19*.82,beta=profileSample(coatProfiles,t)[4],a=side>0?beta:TAU-beta,p=coatPoint(t,a);
      p[0]+=side*.008;p[2]+=.009;
      const tooth=mesh(body,box,metal,p,[.008,.008,.005]);tooth.rotation.z=-side*.16;
    }
    // Pockets follow the coat surface in a shallow diagonal welt.
    const pocket=[];
    for(let n=0;n<=10;n++){
      const t=.20+n*.027,a=side>0?.73+n*.012:TAU-(.73+n*.012),p=coatPoint(t,a);p[2]+=.004;pocket.push(p);
    }
    tube(body,darkRed,pocket,.005,20,6);
    const welt=pocket.map(p=>[p[0]+side*.012,p[1],p[2]-.004]);tube(body,redTrim,welt,.008,20,7);
  }
  const pull=ball(body,metal,[.113,.762,.094],[.010,.020,.004]);pull.rotation.z=-.15;
  const hem=[],hemBeta=profileSample(coatProfiles,.075)[4];
  for(let n=0;n<=48;n++){
    const a=hemBeta+n/48*(TAU-hemBeta*2),p=coatPoint(.075,a);
    p[0]+=Math.sin(a)*.004;p[2]+=Math.cos(a)*.004;hem.push(p);
  }
  tube(body,darkRed,hem,.003,48,5);

  // Curled micro-tufts sit on a continuous fur backing, not a row of beads.
  function furTrim(parent,points,radius,count,seed=0){
    const path=new T.CatmullRomCurve3(points.map(vector));
    mesh(parent,new T.TubeGeometry(path,40,radius,10,false),fur,null,null,true);
    for(let n=0;n<count;n++){
      const t=(n+.5)/count,p=path.getPoint(t),tangent=path.getTangent(t).normalize();
      const sideways=new T.Vector3().crossVectors(tangent,new T.Vector3(0,0,1)).normalize();
      if(sideways.lengthSq()<.1)sideways.set(1,0,0);
      const normal=new T.Vector3().crossVectors(tangent,sideways).normalize();
      const angle=n*2.399963+seed;
      p.addScaledVector(sideways,Math.cos(angle)*radius*.86).addScaledVector(normal,Math.sin(angle)*radius*.86);
      const length=.012+.004*Math.sin(n*7.1+seed);
      const tuft=mesh(parent,tuftGeo,n%7===0?furShade:fur,p.toArray(),[.008,length,.007]);
      tuft.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),sideways.multiplyScalar(Math.cos(angle)).addScaledVector(normal,Math.sin(angle)).normalize());
    }
  }
  furTrim(body,[[-.121,.932,.057],[-.166,1.017,-.009],[-.138,1.085,-.13],[0,1.101,-.191],[.129,1.078,-.14],[.170,1.019,-.025],[.127,.948,.049]],.033,82,.4);
  const headAnchor=new T.Group();headAnchor.name='hero-head-anchor';headAnchor.position.set(.006,1.252,-.113);headAnchor.rotation.z=-.035;body.add(headAnchor);

  const arms=[];
  const armPoses=[
    {shoulder:[-.222,1.004,-.104],elbow:[-.502,.650,-.058],wrist:[-.672,.546,.082],hand:[-.704,.482,.150]},
    {shoulder:[.224,.984,-.122],elbow:[.477,.778,-.066],wrist:[.691,.550,.035],hand:[.714,.483,.103]}
  ];
  for(let index=0;index<2;index++){
    const side=index?1:-1,pose=armPoses[index],arm=new T.Group();arm.name=side<0?'hero-left-arm':'hero-right-arm';arm.position.set(...pose.shoulder);body.add(arm);
    const local=p=>p.map((v,i)=>v-pose.shoulder[i]);
    // Begin inside the coat, then swell over the shoulder: the closed end must
    // never sit on top of the shoulder as an exposed flat sleeve cap.
    const sleeveStart=[side*.176,.946-index*.016,-.120];
    const shoulderRound=[side*.263,.935-index*.016,-.110];
    sweep(arm,red,[local(sleeveStart),local(shoulderRound),local(pose.elbow),local(pose.wrist)],[[.067,.070],[.122,.117],[.114,.103],[.080,.073]],{segments:44,sides:24,folds:.05,padding:.075});
    const cuffCenter=vector(local(pose.wrist)),cuffAxis=vector(pose.wrist).sub(vector(pose.elbow)).normalize();
    const cuff=new T.Group();cuff.position.copy(cuffCenter);cuff.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),cuffAxis);arm.add(cuff);
    loft(cuff,redTrim,[[-.030,.080,.074,0],[.009,.080,.074,0],[.027,.071,.066,0]],{segments:5,sides:24});
    const hand=new T.Group();hand.position.set(...local(pose.hand));hand.rotation.set(.20,side*.11,side*-.07);arm.add(hand);
    ball(hand,glove,[0,.006,0],[.073,.036,.083]);
    // Four individually curved fingers lie naturally over the upper float.
    for(let finger=0;finger<4;finger++){
      const x=(finger-1.5)*.029,len=[.070,.091,.094,.078][finger];
      sweep(hand,glove,[[x,.002,.043],[x*.98,-.006,.078],[x*.93,-.022,.050+len],[x*.90,-.032,.059+len]],[[.015,.015],[.016,.015],[.014,.014],[.010,.012]],{segments:12,sides:10});
    }
    sweep(hand,glove,[[side*-.055,.008,-.012],[side*-.085,-.009,.015],[side*-.085,-.021,.049]],[[.022,.021],[.020,.02],[.015,.016]],{segments:12,sides:10});
    tube(hand,gloveSeam,[[-.042,.037,-.030],[0,.040,-.012],[.039,.036,.008]],.0024,14,5);
    arms.push(arm);
  }

  const legs=[];
  const legPoses=[
    {hip:[-.092,.502,.012],knee:[-.160,.620,.452],ankle:[-.225,.412,.868],yaw:-.075,pitch:-.13},
    {hip:[.092,.497,.017],knee:[.169,.652,.390],ankle:[.244,.417,.810],yaw:.055,pitch:-.17}
  ];
  for(let index=0;index<2;index++){
    const side=index?1:-1,p=legPoses[index],leg=new T.Group();leg.name=side<0?'hero-left-leg':'hero-right-leg';leg.position.set(...p.hip);body.add(leg);
    const local=point=>point.map((v,i)=>v-p.hip[i]);
    sweep(leg,trouser,[local(p.hip),local([p.hip[0]*1.30,.564,.233]),local(p.knee),local([p.ankle[0]*.97,.479,p.ankle[2]-.12]),local(p.ankle)],[[.112,.106],[.114,.104],[.105,.105],[.084,.083],[.074,.073]],{segments:44,sides:24,folds:.058});
    const seam=[local([p.hip[0]+side*.082,.511,.052]),local([p.knee[0]+side*.094,p.knee[1]+.026,p.knee[2]]),local([p.ankle[0]+side*.065,p.ankle[1]+.018,p.ankle[2]])];
    tube(leg,trouserSeam,seam,.0027,26,5);
    const shoe=new T.Group();shoe.name='red-laced-sneaker';shoe.position.set(...local([p.ankle[0],.348,p.ankle[2]+.054]));shoe.rotation.set(p.pitch,p.yaw,side*.022);leg.add(shoe);
    loft(shoe,soleMat,[[-.026,.065,.139,.044],[-.020,.101,.179,.045],[.001,.106,.185,.044],[.013,.104,.183,.044]],{segments:8,sides:36,power:.89});
    loft(shoe,white,[[.009,.106,.185,.044],[.022,.108,.186,.045],[.037,.102,.181,.044]],{segments:5,sides:36,power:.91});
    loft(shoe,shoeRed,[[.031,.099,.177,.042],[.052,.103,.177,.036],[.083,.095,.155,.022],[.115,.080,.121,.001],[.145,.067,.087,-.022],[.157,.058,.055,-.041]],{segments:18,sides:40,power:.95});
    // Rounded toe guard and inset padded tongue; seams follow their contours.
    ball(shoe,shoeLeather,[0,.072,.174],[.086,.030,.035]);
    const tongue=ball(shoe,shoeRed,[0,.142,.055],[.044,.009,.112]);tongue.rotation.x=.35;
    const laceRows=[{y:.167,z:.020},{y:.155,z:.053},{y:.143,z:.086},{y:.130,z:.119}];
    for(const edge of[-1,1]){
      tube(shoe,white,[[edge*.091,.048,-.058],[edge*.100,.044,.050],[edge*.083,.055,.166]],.005,20,6);
      tube(shoe,darkRed,[[edge*.074,.085,-.080],[edge*.090,.075,.001],[edge*.070,.084,.096]],.0025,18,5);
      for(const row of laceRows)ball(shoe,metal,[edge*.038,row.y-.002,row.z],[.006,.0025,.006]);
    }
    for(let n=0;n<4;n++){
      const {y,z}=laceRows[n];
      tube(shoe,blackLace,[[-.039,y,z],[0,y+.004,z+.013],[.039,y-.001,z+.004]],.0034,10,6);
      tube(shoe,blackLace,[[.039,y,z],[-.008,y+.003,z+.013],[-.039,y-.001,z+.007]],.0032,10,6);
    }
    tube(shoe,blackLace,[[0,.177,.014],[-.035,.193,.004],[-.037,.189,.031],[0,.177,.014],[.039,.194,.035],[.034,.186,.056],[0,.177,.014]],.0036,28,6);
    for(let n=0;n<6;n++){
      const z=-.068+n*.045;
      const tread=mesh(shoe,box,soleInset,[0,-.025,z],[.145,.006,.012]);tread.rotation.y=n%2?.1:-.1;
    }
    // Soft cuff encircles the ankle and rests above the tongue.
    const cuff=[];
    for(let n=0;n<=32;n++){const a=n/32*TAU;cuff.push([Math.sin(a)*.069,.167,-.039+Math.cos(a)*.071]);}
    furTrim(shoe,cuff,.014,40,index+1);
    legs.push(leg);
  }
  body.userData.outfit='continuous tailored down coat, relaxed asymmetrical seated pose, fitted gloves, sculpted laced sneakers';
  return {body,headAnchor,arms,legs,mergeScopes:[]};
}
