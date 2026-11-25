// Landing-only native Galaxy background. No UI framework or network assets needed.
export const GALAXY_OPTIONS = Object.freeze({
  density: 1, glowIntensity: 0.3, flareIntensity: 1, starSpeed: 0.5,
  mouseRepulsion: true, clickWarp: true,
});

export function mountGalaxy(options = {}) {
  const settings = {...GALAXY_OPTIONS, ...options};
  const canvas = document.createElement('canvas');
  canvas.className = 'galaxy-background';
  canvas.setAttribute('aria-hidden','true');
  const ctx = canvas.getContext('2d', {alpha:true});
  if (!ctx) return () => {};
  document.body.prepend(canvas);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const pointer = {x:-9999,y:-9999};
  const warp = {x:0,y:0,age:10};
  let width=0,height=0,frame=0,last=0,time=0,stars=[];
  let seed=73513;
  const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const light = document.documentElement.dataset.galaxyTheme === 'light';
  const colors = light ? ['83,65,129','59,95,139','122,85,110'] : ['215,222,255','167,184,255','226,188,255','170,227,234'];
  function resize(){
    width=innerWidth;height=innerHeight;
    const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(2500000/(width*height)));
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    seed=73513;
    const count=Math.min(650,Math.max(90,Math.round(width*height/2900*settings.density)));
    stars=Array.from({length:count},()=>({
      x:random(),y:random(),depth:0.25+random()*0.75,radius:0.35+random()*1.15,
      phase:random()*Math.PI*2,color:colors[Math.floor(random()*colors.length)],
      flare:random()>0.93,dx:0,dy:0,
    }));
    render(0);
  }
  function render(dt){
    ctx.clearRect(0,0,width,height);
    const moving=!motion.matches;
    if(moving){time+=dt;warp.age+=dt;}
    const warpAmount=moving ? Math.exp(-warp.age*2.8)*70 : 0;
    for(const star of stars){
      let x=((star.x*width+Math.sin(time*0.025+star.phase)*12*star.depth)%width+width)%width;
      let y=((star.y*height+time*settings.starSpeed*5*star.depth)%height+height)%height;
      let pushX=0,pushY=0;
      const fromMouseX=x-pointer.x,fromMouseY=y-pointer.y;
      const distance=Math.hypot(fromMouseX,fromMouseY);
      if(moving && fine.matches && settings.mouseRepulsion && distance<155 && distance>0){
        const push=Math.pow(1-distance/155,2)*48;
        pushX=fromMouseX/distance*push;pushY=fromMouseY/distance*push;
      }
      const smooth=moving?1-Math.exp(-dt*7):1;
      star.dx+=(pushX-star.dx)*smooth;star.dy+=(pushY-star.dy)*smooth;
      x+=star.dx;y+=star.dy;
      const wx=x-warp.x,wy=y-warp.y,wd=Math.max(1,Math.hypot(wx,wy));
      x+=wx/wd*warpAmount*star.depth;y+=wy/wd*warpAmount*star.depth;
      const twinkle=moving?0.78+Math.sin(time*0.65+star.phase)*0.22:0.9;
      const alpha=(0.35+star.depth*0.6)*twinkle*(light?0.65:1);
      const radius=star.radius*(0.6+star.depth*0.6);
      if(star.flare || star.depth>0.85){
        const glow=ctx.createRadialGradient(x,y,0,x,y,radius*7);
        glow.addColorStop(0,`rgba(${star.color},${alpha*settings.glowIntensity})`);
        glow.addColorStop(1,`rgba(${star.color},0)`);
        ctx.fillStyle=glow;ctx.fillRect(x-radius*7,y-radius*7,radius*14,radius*14);
      }
      ctx.fillStyle=`rgba(${star.color},${alpha})`;
      ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
      if(star.flare){
        const reach=(3+star.depth*4)*settings.flareIntensity;
        ctx.strokeStyle=`rgba(${star.color},${alpha*0.38})`;
        ctx.lineWidth=0.6;
        ctx.beginPath();ctx.moveTo(x-reach,y);ctx.lineTo(x+reach,y);ctx.moveTo(x,y-reach);ctx.lineTo(x,y+reach);ctx.stroke();
      }
      if(warpAmount>0.4){
        ctx.strokeStyle=`rgba(${star.color},${alpha*Math.min(0.5,warpAmount/100)})`;
        ctx.lineWidth=radius*0.75;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+wx/wd*warpAmount*0.45,y+wy/wd*warpAmount*0.45);ctx.stroke();
      }
    }
  }
  function tick(now){
    frame=0;
    const dt=Math.min((now-last)/1000||0,0.04);last=now;
    render(dt);
    if(!document.hidden&&!motion.matches)frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;last=performance.now();
    if(motion.matches){pointer.x=pointer.y=-9999;warp.age=10;for(const star of stars){star.dx=star.dy=0;}}
    render(0);
    if(!document.hidden&&!motion.matches)frame=requestAnimationFrame(tick);
    canvas.dataset.animated=String(!motion.matches&&!document.hidden);
  }
  const move=e=>{if(e.pointerType==='mouse'){pointer.x=e.clientX;pointer.y=e.clientY;}};
  const leave=e=>{if(!e.relatedTarget)pointer.x=pointer.y=-9999;};
  const click=e=>{
    if(!settings.clickWarp||motion.matches||e.detail===0)return;
    warp.x=e.clientX;warp.y=e.clientY;warp.age=0;
    canvas.dataset.warp='true';
  };
  const blur=()=>{pointer.x=pointer.y=-9999;};
  resize();sync();
  document.addEventListener('pointermove',move,{passive:true});
  document.addEventListener('pointerout',leave,{passive:true});
  document.addEventListener('click',click,{passive:true});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('blur',blur);
  motion.addEventListener('change',sync);
  return()=>{
    cancelAnimationFrame(frame);canvas.remove();
    document.removeEventListener('pointermove',move);document.removeEventListener('pointerout',leave);
    document.removeEventListener('click',click);document.removeEventListener('visibilitychange',sync);
    window.removeEventListener('resize',resize);window.removeEventListener('blur',blur);
    motion.removeEventListener('change',sync);
  };
}
mountGalaxy();
