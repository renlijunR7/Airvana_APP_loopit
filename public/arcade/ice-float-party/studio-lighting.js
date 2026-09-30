/** Small neutral studio environment, generated locally once per WebGL renderer. */
export function addStudioLighting(THREE, scene, renderer, shadows = false) {
  const room = new THREE.Scene();
  room.add(new THREE.Mesh(new THREE.BoxGeometry(16, 16, 16), new THREE.MeshBasicMaterial({color:0xc8d5e3,side:THREE.BackSide})));
  for (const [x,y,z,sx,sy,color] of [[-5,5,3,4,5,0xfff3dc],[5,3,-3,3,6,0xc9e9ff],[0,7,0,6,6,0xffffff]]) {
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(sx,sy),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
    panel.position.set(x,y,z);panel.lookAt(0,0,0);room.add(panel);
  }
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(room,.06,.1,30);
  scene.environment=environment.texture;
  room.traverse(item=>{if(item.isMesh){item.geometry.dispose();item.material.dispose();}});
  pmrem.dispose();
  const ambient=new THREE.HemisphereLight(0xf7f7ff,0x51728f,.65);
  const key=new THREE.DirectionalLight(0xfff1df,2.1);
  key.position.set(-450,700,1000);
  const fill=new THREE.DirectionalLight(0xbddeff,.45);fill.position.set(500,220,600);
  const rim=new THREE.DirectionalLight(0xffffff,1.1);rim.position.set(100,420,-600);
  scene.add(ambient,key,fill,rim);
  if(shadows){
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    key.castShadow=true;key.shadow.mapSize.set(2048,2048);
    Object.assign(key.shadow.camera,{left:-740,right:740,top:850,bottom:-850,near:1,far:3200});
    key.shadow.camera.updateProjectionMatrix();key.shadow.bias=-.00005;key.shadow.normalBias=.35;
  }
  return {environment,key,dispose:()=>environment.dispose()};
}
