/*
===============================================================================
 OSCILLOSAURUS — WEBSITE VISUAL PLAYER
 Production wrapper for Visual Engine v7.15 — seeded composition build 4.6.

 HTML contract (kept intentionally small):
   <svg data-osc-seed="OSAU-HOME-887"></svg>

 Optional attributes:
   data-osc-motion="false"   Draw the artwork but do not animate it.
   data-osc-preset="site"    Reserved for future preset selection.

 The full Visual Engine lab remains the authoring tool. This file is the
 lightweight website player: it supplies the production preset, draws the
 deterministic composition and attaches slow CSS-driven motion.
===============================================================================
*/

(function(){
'use strict';

if(!window.OSAUv2){
  console.warn('Oscillosaurus visual player: visual-engine.js is missing.');
  return;
}

const STYLE_ID='osau-visual-player-styles';
const REDUCED=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let playerSerial=0;

const STATIC_PRESET={
  gridX:8,
  gridY:8,
  gridScale:.86,
  gridRotation:0,
  sourceX:.72,
  sourceY:.16,
  sourceSize:.18,
  sourceRings:7,
  sourceDots:16,
  swing:.10,
  jitter:.05,
  scaleJitter:.04,
  gateSegments:10,
  gatePhase:0,
  waveFreq:7,
  waveDepth:.08,
  wavePhase:0,
  showGrid:false,
  voices:[
    {name:'RINGS',color:'gold',pulses:4,phase:0,size:34,rings:4},
    {name:'ORBITS',color:'azure',pulses:5,phase:2,size:28,satellites:6,orbitPhase:0},
    {name:'DOTS',color:'green',pulses:9,phase:6,size:18},
    {name:'CROSSES',color:'gold',pulses:7,phase:5,size:18},
    {name:'CURVES',color:'azure',pulses:3,phase:8,size:20,span:3,bend:.35}
  ]
};

// Calm production motion. The lab remains the place to author/tune these.
const MOTION_PRESET={
  playhead:{enabled:true,destination:'orbitPhase',duration:96,direction:'forward'},
  lfos:[
    {enabled:true,shape:'sine',destination:'gridRotation',duration:132,depth:4,phase:18},
    {enabled:true,shape:'sine',destination:'sourceX',duration:156,depth:2.8,phase:96},
    {enabled:false,shape:'sine',destination:'scaleJitter',duration:178,depth:8,phase:210}
  ]
};

const TARGETS={
  orbitPhase:{kind:'orbit',mode:'rotate'},
  gridRotation:{kind:'master',mode:'rotate'},
  gatePhase:{kind:'char',mode:'rotate'},
  wavePhase:{kind:'char',mode:'waveRotate'},
  gridScale:{kind:'master',mode:'scale'},
  sourceX:{kind:'source',mode:'translateX'},
  sourceY:{kind:'source',mode:'translateY'},
  sourceSize:{kind:'source',mode:'scale'},
  ringsSize:{kind:'ringssize',mode:'scale'},
  orbitsSize:{kind:'orbitssize',mode:'scale'},
  dotsSize:{kind:'dotssize',mode:'scale'},
  crossesSize:{kind:'crossessize',mode:'scale'},
  scaleJitter:{kind:'scalejitter',mode:'scaleJitter'},
  swing:{kind:'swing',mode:'swing'},
  jitter:{kind:'jitter',mode:'jitter'}
};

function ensureStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    @keyframes osau-player-turn{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    .osau-player-playhead{
      transform-box:view-box;
      animation-name:osau-player-turn;
      animation-duration:var(--osau-duration,96s);
      animation-delay:var(--osau-delay,0s);
      animation-timing-function:linear;
      animation-iteration-count:infinite;
    }
    .osau-player-reverse{animation-direction:reverse}
    .osau-player-lfo{
      transform-box:view-box;
      animation-name:var(--osau-lfo-name);
      animation-duration:var(--osau-duration,120s);
      animation-delay:var(--osau-delay,0s);
      animation-timing-function:linear;
      animation-iteration-count:infinite;
    }
    .osau-player-paused .osau-player-playhead,
    .osau-player-paused .osau-player-lfo{animation-play-state:paused}
  `;
  document.head.appendChild(style);
}

function mod1(v){return((v%1)+1)%1}
function hash32(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function seeded01(seed,index){let x=(seed+Math.imul(index+1,0x9E3779B9))>>>0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;return(x>>>0)/4294967295}
function seedUnit(seed,label){return seeded01(hash32(`${seed}|layout|${label}`),0)}
function lerp(a,b,t){return a+(b-a)*t}

function cloneStatic(seed){
  const key=String(seed||'OSAU-887');
  const steps=STATIC_PRESET.gridX*STATIC_PRESET.gridY;

  // The website seed now changes composition as well as colour/character.
  // Bounds are intentionally conservative: every page is distinct, but all
  // compositions still live inside the same Oscillosaurus visual grammar.
  const p={
    ...STATIC_PRESET,
    seed:key,
    gridScale:lerp(.72,.92,seedUnit(key,'gridScale')),
    gridRotation:lerp(-7,7,seedUnit(key,'gridRotation')),
    sourceX:lerp(.18,.82,seedUnit(key,'sourceX')),
    sourceY:lerp(.16,.84,seedUnit(key,'sourceY')),
    sourceSize:lerp(.12,.24,seedUnit(key,'sourceSize')),
    voices:STATIC_PRESET.voices.map((v,index)=>({
      ...v,
      // Preserve the Euclidean pulse count. The seed only changes where that
      // ordered sequence begins on the shared 8×8 master grid.
      phase:(v.phase+Math.floor(seedUnit(key,`voice:${v.name}:offset`)*steps))%steps
    }))
  };

  return p;
}

function selectorFor(source,dest,n=0){
  const suffix=source==='playhead'?'playhead':`lfo${n}`;
  if(dest==='orbitPhase')return `[data-orbit-${suffix}]`;
  if(dest==='gridRotation'||dest==='gridScale')return `[data-master-${suffix}]`;
  if(dest==='gatePhase')return `[data-char-${suffix}][data-char-type="gated"]`;
  if(dest==='wavePhase')return `[data-char-${suffix}][data-char-type="wavy"]`;
  if(dest==='sourceX'||dest==='sourceY'||dest==='sourceSize')return `[data-source-${suffix}]`;
  if(dest==='ringsSize')return `[data-ringssize-${suffix}]`;
  if(dest==='orbitsSize')return `[data-orbitssize-${suffix}]`;
  if(dest==='dotsSize')return `[data-dotssize-${suffix}]`;
  if(dest==='crossesSize')return `[data-crossessize-${suffix}]`;
  if(dest==='scaleJitter')return `[data-scalejitter-${suffix}]`;
  if(dest==='swing')return `[data-swing-${suffix}]`;
  if(dest==='jitter')return `[data-jitter-${suffix}]`;
  return '';
}

function centreFor(node,kind){
  const cx=Number(node.getAttribute(`data-${kind}-cx`))||600;
  const cy=Number(node.getAttribute(`data-${kind}-cy`))||400;
  return `${cx}px ${cy}px`;
}

function waveformPoints(shape,seedKey,steps=8){
  const points=[];
  const add=(pct,value)=>points.push([String(pct),value]);
  if(shape==='triangle'){
    add('0',0);add('25',1);add('50',0);add('75',-1);add('100',0);
  }else if(shape==='sawUp'){
    add('0',-1);add('100',1);
  }else if(shape==='sawDown'){
    add('0',1);add('100',-1);
  }else if(shape==='square'){
    add('0',1);add('49.999',1);add('50',-1);add('99.999',-1);add('100',1);
  }else if(shape==='sampleHold'){
    const seed=hash32(seedKey),eps=Math.min(.001,50/steps/1000);
    for(let i=0;i<steps;i++){
      const start=i/steps*100,end=(i+1)/steps*100,value=seeded01(seed,i)*2-1;
      add(start.toFixed(5),value);
      if(i<steps-1)add((end-eps).toFixed(5),value);
      else{add('99.999',value);add('100',seeded01(seed,0)*2-1)}
    }
  }else{
    const samples=64;
    for(let i=0;i<=samples;i++)add((i/samples*100).toFixed(4),Math.sin(i/samples*Math.PI*2));
  }
  return points;
}

class OscVisualPlayer{
  constructor(svg){
    this.svg=svg;
    this.id=++playerSerial;
    this.seed=svg.dataset.oscSeed||`OSAU-${this.id}`;
    this.motion=!REDUCED&&svg.dataset.oscMotion!=='false'&&svg.classList.contains('gen-field');
    this.styles=[];
    this.observer=null;
  }

  mount(){
    this.svg.setAttribute('viewBox','0 0 1200 800');
    this.svg.setAttribute('preserveAspectRatio','xMidYMid slice');
    this.svg.setAttribute('aria-hidden','true');
    this.svg.setAttribute('focusable','false');
    window.OSAUv2.draw(this.svg,cloneStatic(this.seed));
    if(this.motion)this.applyMotion();
    this.observeVisibility();
  }

  addStyle(css){
    const style=document.createElement('style');
    style.dataset.osauPlayer=String(this.id);
    style.textContent=css;
    document.head.appendChild(style);
    this.styles.push(style);
  }

  applyMotion(){
    this.applyPlayhead(MOTION_PRESET.playhead);
    MOTION_PRESET.lfos.forEach((lfo,index)=>{
      if(lfo.enabled)this.applyLfo({...lfo,n:index+1});
    });
  }

  applyPlayhead(cfg){
    if(!cfg||!cfg.enabled)return;
    const sel=selectorFor('playhead',cfg.destination);
    if(!sel)return;
    const kind=(TARGETS[cfg.destination]||TARGETS.orbitPhase).kind;
    this.svg.querySelectorAll(sel).forEach(node=>{
      let duration=cfg.duration,reverse=cfg.direction==='reverse';
      if(cfg.destination==='wavePhase'){
        const freq=Math.max(1,Number(node.getAttribute('data-char-freq'))||1);
        duration*=freq;reverse=!reverse;
      }
      node.style.transformOrigin=centreFor(node,kind);
      node.style.setProperty('--osau-duration',`${duration}s`);
      node.classList.add('osau-player-playhead');
      if(reverse)node.classList.add('osau-player-reverse');
    });
  }

  transformFor(cfg,value,node){
    const target=TARGETS[cfg.destination]||TARGETS.orbitPhase;
    const depth=Number(cfg.depth)||0;
    if(target.mode==='rotate')return `rotate(${(value*depth).toFixed(6)}deg)`;
    if(target.mode==='waveRotate'){
      const freq=Math.max(1,Number(node?.getAttribute('data-char-freq'))||1);
      return `rotate(${(-value*depth/freq).toFixed(6)}deg)`;
    }
    if(target.mode==='scale')return `scale(${Math.max(.01,1+value*(depth/100)).toFixed(6)})`;
    if(target.mode==='translateX')return `translate(${(value*(depth/100)*960).toFixed(3)}px,0px)`;
    if(target.mode==='translateY')return `translate(0px,${(value*(depth/100)*620).toFixed(3)}px)`;
    if(target.mode==='scaleJitter'){
      const rand=Number(node?.getAttribute('data-scalejitter-rand'))||0;
      const amp=rand*(depth/100)*.55;
      return `scale(${Math.max(.01,1+value*amp).toFixed(6)})`;
    }
    if(target.mode==='swing'){
      const dir=Number(node?.getAttribute('data-swing-dir'))||1;
      const unit=Number(node?.getAttribute('data-swing-unit'))||0;
      return `translate(${(value*dir*unit*(depth/100)).toFixed(4)}px,0px)`;
    }
    if(target.mode==='jitter'){
      const rx=Number(node?.getAttribute('data-jitter-rand-x'))||0;
      const ry=Number(node?.getAttribute('data-jitter-rand-y'))||0;
      const ux=Number(node?.getAttribute('data-jitter-unit-x'))||0;
      const uy=Number(node?.getAttribute('data-jitter-unit-y'))||0;
      return `translate(${(value*rx*ux*(depth/100)).toFixed(4)}px,${(value*ry*uy*(depth/100)).toFixed(4)}px)`;
    }
    return 'none';
  }

  applyLfo(cfg){
    const sel=selectorFor('lfo',cfg.destination,cfg.n);
    if(!sel)return;
    const nodes=[...this.svg.querySelectorAll(sel)];
    if(!nodes.length)return;
    const target=TARGETS[cfg.destination]||TARGETS.orbitPhase;
    const points=waveformPoints(cfg.shape,`${this.seed}:LFO${cfg.n}:${cfg.shape}`,cfg.steps||8);

    nodes.forEach((node,index)=>{
      const name=`osau-p${this.id}-lfo${cfg.n}-${cfg.destination}-${index}`;
      const frames=points.map(([pct,value])=>`${pct}%{transform:${this.transformFor(cfg,value,node)}}`);
      this.addStyle(`@keyframes ${name}{${frames.join('')}}`);
      const phase=mod1((Number(cfg.phase)||0)/360);
      node.style.transformOrigin=centreFor(node,target.kind);
      node.style.setProperty('--osau-duration',`${cfg.duration}s`);
      node.style.setProperty('--osau-delay',`${-(phase*cfg.duration)}s`);
      node.style.setProperty('--osau-lfo-name',name);
      node.style.animationDelay=`${-(phase*cfg.duration)}s`;
      node.classList.add('osau-player-lfo');
    });
  }

  observeVisibility(){
    if(!('IntersectionObserver'in window))return;
    this.observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>this.svg.classList.toggle('osau-player-paused',!entry.isIntersecting));
    },{threshold:0});
    this.observer.observe(this.svg);
  }
}

function init(){
  ensureStyles();
  document.querySelectorAll('svg[data-osc-seed]').forEach(svg=>{
    const player=new OscVisualPlayer(svg);
    player.mount();
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

window.OscGenerative={init,Player:OscVisualPlayer,staticPreset:STATIC_PRESET,motionPreset:MOTION_PRESET,deriveStatic:cloneStatic};
})();
