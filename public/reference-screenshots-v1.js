(function (root) {
  'use strict';
  const prefix = '/assets/games/reference-screenshots-v1/';
  const shot = (file, alt, crop) => ({src: prefix + file + '.jpg', alt, width:1179, height:2556, crop});
  const card = [.097, .144, .807, .805];
  const items = [
    {id:111,key:'sky-raid',title:'像素空战',images:[shot('sky-raid','用户提供的像素空战原始截图',[0,0,1,1])]},
    {id:112,key:'harvest-lane',title:'农场收获',images:[shot('harvest-lane','用户提供的农场收获原始截图',card)]},
    {id:113,key:'island-sling',title:'弹射冒险',images:[shot('island-sling','用户提供的弹射关卡原始截图',card),shot('island-sling-characters','用户提供的弹射角色原始截图',card)]},
    {id:114,key:'pocket-city',title:'城市建造',images:[shot('pocket-city','用户提供的城市建造原始截图',[.134,.145,.807,.805])]},
    {id:115,key:'gem-blocks',title:'宝石方块',images:[shot('gem-blocks','用户提供的宝石方块原始截图',card)]},
    {id:116,key:'dice-voyage',title:'骰子棋盘',images:[shot('dice-voyage','用户提供的骰子棋盘原始截图',[.136,.145,.807,.805])]},
    {id:117,key:'cloud-solitaire',title:'纸牌接龙',images:[shot('cloud-solitaire','用户提供的纸牌接龙原始截图',card)]},
    {id:118,key:'buddy-flip',title:'角色图鉴',images:[shot('buddy-flip','用户提供的角色图鉴原始截图',card)]}
  ];
  const copy = value => JSON.parse(JSON.stringify(value));
  const get = key => {const item=items.find(item=>item.key===key||item.id===Number(key));return item?copy(item):null;};
  function applyFrame(frame,key,index=0,options={}) {
    const item=get(key);if(!item)throw new Error('Unknown screenshot reference');
    const selected=Math.max(0,Math.min(item.images.length-1,Number(index)||0)), image=item.images[selected];
    const [x,y,w,h]=options.full?[0,0,1,1]:image.crop;
    frame.dispose?.();
    frame.className='reference-shot'+(options.full?' is-full':'');
    frame.dataset.referenceKey=item.key;frame.dataset.imageIndex=String(selected);
    frame.style.aspectRatio=String(image.width*w/(image.height*h));
    const crop=root.document.createElement('div'),img=root.document.createElement('img');
    crop.className='reference-shot__crop';img.className='reference-shot__image';
    img.src=image.src;img.alt=image.alt;img.draggable=false;img.decoding='async';
    img.style.width=(100/w)+'%';img.style.height='auto';img.style.maxWidth='none';
    img.style.left=(-100*x/w)+'%';img.style.top=(-100*y/h)+'%';
    crop.append(img);frame.replaceChildren(crop);
    const layout=()=>{
      const width=frame.clientWidth,height=frame.clientHeight,ratio=image.width*w/(image.height*h);
      if(!width||!height)return;
      const cropWidth=options.fit==='cover'?Math.max(width,height*ratio):Math.min(width,height*ratio);
      crop.style.width=cropWidth+'px';crop.style.height=(cropWidth/ratio)+'px';
    };
    let observer;if(root.ResizeObserver){observer=new root.ResizeObserver(layout);observer.observe(frame);}
    img.onload=layout;
    img.onerror=()=>{frame.dataset.loadError='true';img.alt='原图加载失败，请刷新页面或查看完整截图';};
    frame.dispose=()=>{observer?.disconnect();img.onload=null;img.onerror=null;};
    delete frame.dataset.loadError;layout();return frame;
  }
  function createFrame(key,index=0,options={}) {return applyFrame(root.document.createElement('div'),key,index,options);}
  root.AirvanaScreenshotReferences=Object.freeze({version:'1.0.0',list:()=>copy(items),get,createFrame,applyFrame});
  if(!root.customElements||!root.HTMLElement)return;
  class ReferenceShot extends root.HTMLElement {
    static get observedAttributes(){return ['game-key','compact','hide-controls'];}
    connectedCallback(){this.render();}
    attributeChangedCallback(){if(this.isConnected)this.render();}
    disconnectedCallback(){this.frame?.dispose?.();}
    render(){
      this.frame?.dispose?.();
      const item=get(this.getAttribute('game-key'));this.replaceChildren();if(!item)return;
      const compact=this.hasAttribute('compact');this.classList.toggle('is-compact',compact);
      this.frame=createFrame(item.key,0,{fit:'cover'});this.append(this.frame);if(compact||this.hasAttribute('hide-controls'))return;
      const controls=root.document.createElement('div');controls.className='reference-shot-controls';
      for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])controls.addEventListener(type,event=>event.stopPropagation());
      const note=root.document.createElement('span');note.textContent='原图展示 · 静态';controls.append(note);
      const original=root.document.createElement('a');original.href='/reference-screenshots.html?game='+item.key+'&full=1';original.textContent='完整截图';controls.append(original);
      const play=root.document.createElement('a');play.href='/reference-arcade.html?game='+item.key;play.textContent='上一版互动';play.setAttribute('aria-label','试玩上一版原创互动，非截图复刻');controls.append(play);
      if(item.images.length>1){
        let index=0;const next=root.document.createElement('button');next.type='button';next.textContent='切换图片 1/2';
        next.onclick=e=>{e.stopPropagation();index=(index+1)%item.images.length;applyFrame(this.frame,item.key,index,{fit:'cover'});next.textContent='切换图片 '+(index+1)+'/'+item.images.length;};
        controls.append(next);
      }
      this.append(controls);
    }
  }
  if(!root.customElements.get('airvana-reference-shot'))root.customElements.define('airvana-reference-shot',ReferenceShot);
})(typeof window!=='undefined'?window:globalThis);
