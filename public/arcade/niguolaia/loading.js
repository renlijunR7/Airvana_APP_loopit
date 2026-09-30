const UI_BOOT_IMAGES = [
 'ui/Main_Money_Bg-110x38.png','ui/HeroSkill_Bg.png','ui/build-site-original.png',
 'ui/wave_bg_current.png','ui/wave_bg_next.png','ui/Battle_Begin.png',
 'ui/Battle_Quicken1.png','ui/speed_01.png','ui/Battle_Circle.png',
 'ui/Battle_TowerBuilding_icon1.png','ui/Battle_TowerBuilding_icon2.png',
 'ui/Battle_TowerBuilding_icon3.png','ui/Battle_TowerBuilding_icon4.png',
 'ui/Battle_UseMoney_Bg.png','tutorial/dialog-panel.png','tutorial/name-bar.png',
 'tutorial/tap-light.png','tutorial/tap-ring.png',
];

async function decodeImage(img) {
 if(!img.complete) await new Promise((resolve,reject)=>{
  const cleanup=()=>{img.removeEventListener('load',loaded);img.removeEventListener('error',failed);};
  const loaded=()=>{cleanup();resolve();};
  const failed=()=>{cleanup();reject(new Error(`Image failed to load: ${img.src}`));};
  img.addEventListener('load',loaded,{once:true});
  img.addEventListener('error',failed,{once:true});
 });
 if(!img.naturalWidth) throw new Error(`Image failed to load: ${img.src}`);
 await img.decode();
}

export class LoadingScreen {
 constructor(root){
  this.root=root;
  this.element=root.querySelector('#loading');
  this.label=root.querySelector('#loading-progress');
  this.status=root.querySelector('#loading-status');
  this.retry=root.querySelector('#loading-retry');
  this.progress=0;
  this.failed=false;
  this.siblings=[...root.children].filter(node=>node!==this.element).map(node=>[node,node.inert]);
  for(const [node] of this.siblings) node.inert=true;
  this.retry.onclick=()=>location.reload();
 }
 setProgress(fraction){
  if(this.failed)return;
  this.progress=Math.max(this.progress,Math.min(1,Math.max(0,fraction)));
  const percent=this.progress===1?'100.0':Math.min(99.9,this.progress*100).toFixed(1);
  this.label.textContent=`${percent}%`;
  this.label.setAttribute('aria-valuenow',percent);
 }
 async loadUI(onProgress){
  const coverImages=[...this.element.querySelectorAll('img')];
  const coverReady=Promise.all(coverImages.map(decodeImage)).then(()=>{this.visibleSince=performance.now();});
  const images=new Map([...this.root.querySelectorAll('img')].map(img=>[img.src,img]));
  for(const path of UI_BOOT_IMAGES){
   const url=new URL('assets/'+path,document.baseURI).href;
   if(!images.has(url)){const img=new Image();img.src=url;images.set(url,img);}
  }
  let loaded=0;
  await Promise.all([coverReady,...[...images.values()].map(async img=>{
   await decodeImage(img);
   onProgress(++loaded/images.size);
  })]);
 }
 async complete(){
  this.setProgress(1);
  // Allow the cover to be seen on a warm cache; the displayed progress stays real.
  const remaining=1200-(performance.now()-this.visibleSince);
  if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
 }
 hide(){
  for(const [node,inert] of this.siblings)node.inert=inert;
  this.element.hidden=true;
  this.root.setAttribute('aria-busy','false');
 }
 fail(error){
  this.failed=true;
  this.element.dataset.failed='true';
  this.status.textContent='素材加载失败，请重试';
  this.retry.hidden=false;
  console.error('Game startup failed:',error);
 }
}
