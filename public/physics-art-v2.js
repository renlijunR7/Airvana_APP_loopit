/* Local, lazy-loaded art only. Never changes simulation, score or campaign events. */
(function(root){
  'use strict';
  const BASE='/assets/games/physics-casual-v2/';
  const keys=['cloud-sling','candy-swing','happy-cup','spring-dig','fruit-drop'];
  const names=['sling-ball','target','candy','buddy','wood','glass','stone','star','cherry','apricot','orange','apple','blueberry','peach','melon','watermelon'];
  const cache=new Map(), listeners=new Set(), bounds=new Map();
  const rows=[[0,323],[330,594],[594,900],[900,1254]], cols=[[0,314],[314,633],[633,956],[956,1254]];
  function notify(){listeners.forEach(fn=>fn());}
  function resource(key){
    if(cache.has(key))return cache.get(key);
    const entry={image:null,status:'unavailable'};cache.set(key,entry);
    if(typeof root.Image!=='function')return entry;
    const img=new root.Image();entry.image=img;entry.status='loading';img.decoding='async';
    img.onload=()=>{entry.status='ready';if(key==='atlas')measure(img);notify();};
    img.onerror=()=>{entry.status='error';notify();};img.src=BASE+key+'.png';return entry;
  }
  function measure(img){
    // Measure transparent padding once. The original atlas is never rewritten.
    try{const canvas=root.document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0);const data=c.getImageData(0,0,canvas.width,canvas.height).data;
      names.forEach((name,i)=>{const col=cols[i%4],row=rows[Math.floor(i/4)],sx=Math.round(col[0]/1254*canvas.width),ex=Math.round(col[1]/1254*canvas.width),sy=Math.round(row[0]/1254*canvas.height),ey=Math.round(row[1]/1254*canvas.height);let l=ex,t=ey,r=sx,b=sy;
        for(let y=sy;y<ey;y++)for(let x=sx;x<ex;x++)if(data[(y*canvas.width+x)*4+3]>60){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
        if(r>=l&&b>=t)bounds.set(name,[l,t,r-l+1,b-t+1]);});
    }catch(_){/* Fixed atlas cells remain a deterministic no-readback fallback. */}
  }
  function background(c,key,x=0,y=0,w=360,h=560){
    if(!keys.includes(key))return false;const entry=resource(key);if(entry.status!=='ready')return false;
    c.drawImage(entry.image,x,y,w,h);return true;
  }
  function sprite(c,name,x,y,w,h,angle=0){
    const i=names.indexOf(name);if(i<0)return false;const entry=resource('atlas');if(entry.status!=='ready')return false;const img=entry.image;
    const col=cols[i%4],row=rows[Math.floor(i/4)];const b=bounds.get(name)||[col[0]/1254*img.naturalWidth,row[0]/1254*img.naturalHeight,(col[1]-col[0])/1254*img.naturalWidth,(row[1]-row[0])/1254*img.naturalHeight];
    let dw=w,dh=h;if(name!=='wood'&&name!=='glass'){const s=Math.min(w/b[2],h/b[3]);dw=b[2]*s;dh=b[3]*s;}
    c.save();c.translate(x,y);c.rotate(angle);c.drawImage(img,...b,-dw/2,-dh/2,dw,dh);c.restore();return true;
  }
  function preload(key){if(!keys.includes(key))return;resource(key);resource('atlas');}
  function line(c,points,color,width){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
  function poster(c,key){
    c.clearRect(0,0,360,560);c.fillStyle='#b5e8ed';c.fillRect(0,0,360,560);background(c,key);
    if(key==='cloud-sling'){
      sprite(c,'wood',268,339,105,19);sprite(c,'wood',235,387,87,17,Math.PI/2);sprite(c,'wood',303,387,87,17,Math.PI/2);sprite(c,'wood',268,434,123,20);sprite(c,'target',269,394,61,64);
      line(c,[[60,444],[65,357],[42,321]],'#744021',18);line(c,[[65,366],[88,321]],'#744021',15);line(c,[[60,441],[65,357],[43,322]],'#d58b3e',7);line(c,[[65,365],[87,322]],'#d58b3e',6);
      line(c,[[42,322],[95,326],[87,322]],'#543232',5);sprite(c,'sling-ball',95,309,103,108);
      for(let i=0;i<10;i++){const x=127+i*11,y=303-Math.sin(i/10*Math.PI)*45;c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fillStyle='#fff';c.fill();}
    }else if(key==='candy-swing'){
      line(c,[[85,130],[204,264],[283,145]],'#795532',6);line(c,[[85,130],[204,264],[283,145]],'#f9dfab',2);sprite(c,'candy',204,264,105,93,-.2);sprite(c,'buddy',166,416,130,130);[[-65,325],[72,360]].forEach(([dx,y])=>sprite(c,'star',180+dx,y,39,39));
    }else if(key==='happy-cup'){
      line(c,[[76,204],[173,204],[173,233]],'#7a4921',27);line(c,[[76,200],[173,200],[173,228]],'#eaba59',19);line(c,[[81,195],[170,195]],'#fff1ac',4);
      line(c,[[118,335],[213,376]],'#b87335',14);line(c,[[119,331],[213,372]],'#f0c783',6);
      c.fillStyle='#f7fcf8';c.strokeStyle='#468fa6';c.lineWidth=5;c.beginPath();c.roundRect(211,362,84,91,15);c.fill();c.stroke();c.fillStyle='#65d9ed';c.fillRect(219,413,68,30);line(c,[[233,396],[233,400]],'#334f61',4);line(c,[[270,396],[270,400]],'#334f61',4);
      for(let i=0;i<12;i++){const t=i/11;sprite(c,'glass',173+t*55,245+t*118,9,14,.2);}
    }else if(key==='spring-dig'){
      line(c,[[85,188],[135,246],[112,297],[241,363],[235,420]],'#6f431f',50);line(c,[[85,188],[135,246],[112,297],[241,363],[235,420]],'#a96b2d',34);
      for(let i=0;i<15;i++){const t=i/14;c.beginPath();c.arc(85+t*46,185+t*67,4,0,Math.PI*2);c.fillStyle='#62ddf5';c.fill();}sprite(c,'stone',230,263,79,64);sprite(c,'buddy',226,437,91,91);
    }else{
      const fruits=[['melon',176,389,130],['apple',98,382,73],['orange',263,379,77],['peach',245,306,91],['apricot',147,310,65],['blueberry',102,445,58],['cherry',282,444,50]];
      fruits.forEach(([n,x,y,s])=>sprite(c,n,x,y,s,s));sprite(c,'cherry',174,218,52,56);
    }
  }
  root.AirvanaPhysicsArt=Object.freeze({version:'2.0.0',keys:()=>keys.slice(),background,sprite,preload,poster,status:()=>Object.fromEntries([...cache].map(([key,v])=>[key,v.status]))});
  if(root.customElements&&root.HTMLElement&&!root.customElements.get('airvana-physics-poster')){
    class PhysicsPoster extends root.HTMLElement{
      static get observedAttributes(){return ['game-key'];}
      connectedCallback(){this.setAttribute('aria-hidden','true');this.draw=()=>this.render();listeners.add(this.draw);this.render();}
      attributeChangedCallback(){if(this.isConnected)this.render();}
      render(){const key=this.getAttribute('game-key');if(!keys.includes(key))return;if(!this.canvas){this.canvas=root.document.createElement('canvas');this.canvas.width=720;this.canvas.height=1120;this.canvas.style.cssText='width:100%;height:100%;display:block;object-fit:cover';this.append(this.canvas);}preload(key);const c=this.canvas.getContext('2d');c.setTransform(2,0,0,2,0,0);poster(c,key);}
      disconnectedCallback(){listeners.delete(this.draw);}
    }
    root.customElements.define('airvana-physics-poster',PhysicsPoster);
  }
})(typeof window!=='undefined'?window:globalThis);
