(function(){
'use strict';
const svg=document.querySelector('#art'),seed=document.querySelector('#seed'),showGrid=document.querySelector('#showGrid');
const DEFAULT={gridX:8,gridY:8,gridScale:.82,gridRotation:0,sourceX:.5,sourceY:.5,sourceSize:.18,sourceRings:7,sourceDots:16,swing:0,jitter:0,scaleJitter:0,gateSegments:10,gatePhase:0,waveFreq:7,waveDepth:.08,wavePhase:0};
const voiceDefs=[
  {name:'RINGS',color:'gold',pulses:4,phase:0,size:34,rings:4},
  {name:'ORBITS',color:'azure',pulses:5,phase:2,size:28,satellites:6,orbitPhase:0},
  {name:'DOTS',color:'green',pulses:9,phase:6,size:18},
  {name:'CROSSES',color:'gold',pulses:7,phase:5,size:18},
  {name:'CURVES',color:'azure',pulses:3,phase:8,size:20,span:3,bend:.35}
];
const host=document.querySelector('#voices');
function voiceUI(v,i){
 const specific=v.name==='RINGS'
   ? `<label>RINGS <output data-vout="${i}:rings"></output><input data-v="${i}:rings" type="range" min="1" max="10" step="1" value="${v.rings}"></label>`
   : v.name==='ORBITS'
   ? `<label>SIZE <output data-vout="${i}:size"></output><input data-v="${i}:size" type="range" min="4" max="90" step="1" value="${v.size}"></label><label>SATELLITES <output data-vout="${i}:satellites"></output><input data-v="${i}:satellites" type="range" min="0" max="16" step="1" value="${v.satellites}"></label><label>ORBIT PHASE <output data-vout="${i}:orbitPhase"></output><input data-v="${i}:orbitPhase" type="range" min="0" max="360" step="1" value="${v.orbitPhase}"></label>`
   : v.name==='CURVES'
   ? `<label>SPAN <output data-vout="${i}:span"></output><input data-v="${i}:span" type="range" min="1" max="12" step="1" value="${v.span}"></label><label>BEND <output data-vout="${i}:bend"></output><input data-v="${i}:bend" type="range" min="0" max="1" step=".01" value="${v.bend}"></label>`
   : `<label>SIZE <output data-vout="${i}:size"></output><input data-v="${i}:size" type="range" min="4" max="90" step="1" value="${v.size}"></label>`;
 const ringSize=v.name==='RINGS'
   ? `<label>SIZE <output data-vout="${i}:size"></output><input data-v="${i}:size" type="range" min="4" max="90" step="1" value="${v.size}"></label>`
   : '';
 return `<div class="voice"><div class="voice-head"><span class="voice-name">${v.name}</span><i class="voice-dot"></i></div><div class="two"><label>PULSES <output data-vout="${i}:pulses"></output><input data-v="${i}:pulses" type="range" min="0" max="64" step="1" value="${v.pulses}"></label><label>OFFSET <output data-vout="${i}:phase"></output><input data-v="${i}:phase" type="range" min="0" max="63" step="1" value="${v.phase}"></label></div><div class="two">${ringSize}${specific}</div></div>`;
}
host.innerHTML=voiceDefs.map(voiceUI).join('');

function read(){
 const p={};
 document.querySelectorAll('[data-p]').forEach(x=>p[x.dataset.p]=Number(x.value));
 p.seed=seed.value||'0887';p.showGrid=showGrid.checked;p.voices=voiceDefs.map((base,i)=>{
   const v={...base};
   document.querySelectorAll(`[data-v^="${i}:"]`).forEach(x=>v[x.dataset.v.split(':')[1]]=Number(x.value));
   return v;
 });
 return p;
}
function syncLimits(p){
 const steps=p.gridX*p.gridY;
 document.querySelector('#readout').textContent=`${p.gridX}×${p.gridY} / ${steps} STEPS`;
 document.querySelectorAll('[data-v$=":pulses"]').forEach(x=>{x.max=steps;if(+x.value>steps)x.value=steps});
 document.querySelectorAll('[data-v$=":phase"]').forEach(x=>{x.max=Math.max(0,steps-1);if(+x.value>=steps)x.value=Math.max(0,steps-1)});
}
function labels(){
 document.querySelectorAll('[data-p]').forEach(x=>{const o=document.querySelector(`[data-out="${x.dataset.p}"]`);if(o)o.value=x.value});
 document.querySelectorAll('[data-v]').forEach(x=>{const o=document.querySelector(`[data-vout="${x.dataset.v}"]`);if(o)o.value=x.value});
}
function draw(overrides=null){
 let p=read();syncLimits(p);p=read();labels();
 if(overrides)Object.assign(p,overrides);
 OSAUv2.draw(svg,p);
 document.dispatchEvent(new CustomEvent('osau:drawn'));
}
window.OSAULab={read,draw,svg};
function reset(){
 document.querySelectorAll('[data-p]').forEach(x=>{if(DEFAULT[x.dataset.p]!=null)x.value=DEFAULT[x.dataset.p]});
 voiceDefs.forEach((v,i)=>document.querySelectorAll(`[data-v^="${i}:"]`).forEach(x=>x.value=v[x.dataset.v.split(':')[1]]));
 seed.value='0887';showGrid.checked=true;draw();
}
document.addEventListener('input',e=>{if(e.target.matches('[data-p],[data-v],#seed,#showGrid'))draw()});
document.querySelector('#random').onclick=()=>{seed.value=String(Math.floor(Math.random()*10000)).padStart(4,'0');draw()};
document.querySelector('#reset').onclick=reset;
draw();
})();

// v3 presentation + export tools
(function(){
 const fsButton=document.querySelector('#fullscreen');
 const stage=document.querySelector('.stage');
 const preset=document.querySelector('#exportPreset');
 const custom=document.querySelector('#customSize');
 const widthInput=document.querySelector('#exportWidth');
 const heightInput=document.querySelector('#exportHeight');

 function setFullscreenState(on){
   document.body.classList.toggle('art-fullscreen',on);
   fsButton.textContent=on?'EXIT FULLSCREEN':'FULLSCREEN';
   fsButton.setAttribute('aria-label',on?'Exit fullscreen':'Enter fullscreen');
 }
 fsButton.addEventListener('click',async()=>{
   const isFullscreen=document.body.classList.contains('art-fullscreen');
   if(isFullscreen){
     setFullscreenState(false);
     if(document.fullscreenElement && document.exitFullscreen){
       try{ await document.exitFullscreen(); }catch(e){}
     }
     return;
   }

   setFullscreenState(true);
   try{
     if(stage.requestFullscreen) await stage.requestFullscreen();
   }catch(e){
     // CSS fullscreen remains available when browser fullscreen is blocked.
   }
 });
 document.addEventListener('fullscreenchange',()=>{
   setFullscreenState(Boolean(document.fullscreenElement));
 });
 document.addEventListener('keydown',e=>{
   if(e.key==='Escape' && document.body.classList.contains('art-fullscreen')){
     setFullscreenState(false);
     if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
   }
 });

 preset.addEventListener('change',()=>{custom.hidden=preset.value!=='custom'});

 function exportSize(){
   if(preset.value==='custom'){
     return [
       Math.max(64,Math.min(8192,Number(widthInput.value)||1920)),
       Math.max(64,Math.min(8192,Number(heightInput.value)||1080))
     ];
   }
   return preset.value.split('x').map(Number);
 }

 document.querySelector('#exportPng').addEventListener('click',()=>{
   const [w,h]=exportSize();
   const source=document.querySelector('#art');
   const clone=source.cloneNode(true);

   // Grid is a Lab aid, never part of a finished export.
   const first=clone.firstElementChild;
   if(first) first.remove();

   // Keep geometry undistorted. Expand/crop the design field to the requested aspect.
   const designW=1200, designH=800, designAspect=designW/designH, outAspect=w/h;
   let vbW=designW,vbH=designH,vbX=0,vbY=0;
   if(outAspect>designAspect){
     vbW=designH*outAspect; vbX=(designW-vbW)/2;
   }else{
     vbH=designW/outAspect; vbY=(designH-vbH)/2;
   }
   clone.setAttribute('viewBox',`${vbX} ${vbY} ${vbW} ${vbH}`);
   clone.setAttribute('width',w); clone.setAttribute('height',h);
   clone.setAttribute('xmlns','http://www.w3.org/2000/svg');

   const bg=document.createElementNS('http://www.w3.org/2000/svg','rect');
   bg.setAttribute('x',vbX);bg.setAttribute('y',vbY);bg.setAttribute('width',vbW);bg.setAttribute('height',vbH);bg.setAttribute('fill','#030403');
   clone.insertBefore(bg,clone.firstChild);

   const data=new XMLSerializer().serializeToString(clone);
   const blob=new Blob([data],{type:'image/svg+xml;charset=utf-8'});
   const url=URL.createObjectURL(blob);
   const img=new Image();
   img.onload=()=>{
     const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
     const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,w,h);
     URL.revokeObjectURL(url);
     canvas.toBlob(png=>{
       const a=document.createElement('a');
       a.href=URL.createObjectURL(png);
       a.download=`oscillosaurus-${seed.value||'pattern'}-${w}x${h}.png`;
       document.body.appendChild(a);a.click();a.remove();
       setTimeout(()=>URL.revokeObjectURL(a.href),1000);
     },'image/png');
   };
   img.src=url;
 });
})();


// v7.8 — shared transport, PLAYHEAD + 3 LFOs. CSS owns animation frames.
(function(){
  const play=document.querySelector('#motionPlay');
  const stop=document.querySelector('#motionStop');
  const status=document.querySelector('#motionStatus');
  let running=false,transportStart=performance.now();

  const playhead={
    enabled:document.querySelector('#continuousEnabled'),
    source:document.querySelector('#playheadSource'),
    destination:document.querySelector('#continuousDestination'),
    rate:document.querySelector('#continuousRate'),
    rateOut:document.querySelector('#continuousRateOut'),
    direction:document.querySelector('#continuousDirection'),
    duration:12,phaseOffset:0
  };

  const lfos=[1,2,3].map(n=>({
    n,
    enabled:document.querySelector(`#lfo${n}Enabled`),
    source:document.querySelector(`#lfo${n}Source`),
    shape:document.querySelector(`#lfo${n}Shape`),
    destination:document.querySelector(`#lfo${n}Destination`),
    stepsRow:document.querySelector(`#lfo${n}StepsRow`),
    steps:document.querySelector(`#lfo${n}Steps`),
    stepsOut:document.querySelector(`#lfo${n}StepsOut`),
    rate:document.querySelector(`#lfo${n}Rate`),
    rateOut:document.querySelector(`#lfo${n}RateOut`),
    depth:document.querySelector(`#lfo${n}Depth`),
    depthOut:document.querySelector(`#lfo${n}DepthOut`),
    phase:document.querySelector(`#lfo${n}Phase`),
    phaseOut:document.querySelector(`#lfo${n}PhaseOut`),
    duration:Number(document.querySelector(`#lfo${n}Rate`).value),
    phaseOffset:0,style:null
  }));
  playhead.duration=Number(playhead.rate.value);

  const targetConfig={
    orbitPhase:{kind:'orbit',mode:'rotate',max:180,step:1,unit:'°'},
    gridRotation:{kind:'master',mode:'rotate',max:180,step:1,unit:'°'},
    gatePhase:{kind:'char',mode:'rotate',max:180,step:1,unit:'°'},
    wavePhase:{kind:'char',mode:'waveRotate',max:180,step:1,unit:'°'},
    gridScale:{kind:'master',mode:'scale',max:100,step:1,unit:'%'},
    sourceX:{kind:'source',mode:'translateX',max:50,step:1,unit:'%'},
    sourceY:{kind:'source',mode:'translateY',max:50,step:1,unit:'%'},
    sourceSize:{kind:'source',mode:'scale',max:100,step:1,unit:'%'},
    ringsSize:{kind:'ringssize',mode:'scale',max:100,step:1,unit:'%'},
    orbitsSize:{kind:'orbitssize',mode:'scale',max:100,step:1,unit:'%'},
    dotsSize:{kind:'dotssize',mode:'scale',max:100,step:1,unit:'%'},
    crossesSize:{kind:'crossessize',mode:'scale',max:100,step:1,unit:'%'},
    scaleJitter:{kind:'scalejitter',mode:'scaleJitter',max:100,step:1,unit:'%'},
    swing:{kind:'swing',mode:'swing',max:100,step:1,unit:'%'},
    jitter:{kind:'jitter',mode:'jitter',max:100,step:1,unit:'%'}
  };

  function mod1(v){return ((v%1)+1)%1}
  function elapsed(now=performance.now()){return running?(now-transportStart)/1000:0}
  function sourcePhase(src,now=performance.now()){return mod1(src.phaseOffset+elapsed(now)/src.duration)}
  function preserveRate(src,newDuration){
    const now=performance.now(),p=sourcePhase(src,now);
    src.duration=newDuration;src.phaseOffset=mod1(p-elapsed(now)/newDuration);return p;
  }
  function hash32(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function seeded01(seed,index){let x=(seed+Math.imul(index+1,0x9E3779B9))>>>0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;return(x>>>0)/4294967295}

  function syncCollapse(){
    const playheadOff=!playhead.enabled.checked;
    playhead.source.classList.toggle('is-off',playheadOff);
    const playheadBody=document.querySelector('#playheadBody');
    if(playheadBody)playheadBody.hidden=playheadOff;

    lfos.forEach(l=>{
      const off=!l.enabled.checked;
      l.source.classList.toggle('is-off',off);
      const body=document.querySelector(`#lfo${l.n}Body`);
      if(body)body.hidden=off;
    });
  }

  function syncDepthControl(l){
    const cfg=targetConfig[l.destination.value]||targetConfig.orbitPhase;
    l.depth.max=cfg.max;
    l.depth.step=cfg.step;
    if(Number(l.depth.value)>cfg.max)l.depth.value=cfg.max;
    l.depthOut.value=`±${Number(l.depth.value)}${cfg.unit}`;
  }

  function updateReadouts(){
    playhead.rateOut.value=`${Number(playhead.rate.value)} s / cycle`;
    lfos.forEach(l=>{
      syncDepthControl(l);
      l.rateOut.value=`${Number(l.rate.value)} s / cycle`;
      l.phaseOut.value=`${Number(l.phase.value)}°`;
      l.stepsOut.value=String(Number(l.steps.value));
      l.stepsRow.hidden=l.shape.value!=='sampleHold';
    });
  }

  function ensureStyle(l){
    if(l.style)return;
    l.style=document.createElement('style');l.style.id=`v78-lfo${l.n}-keyframes`;document.head.appendChild(l.style);
  }

  function transformFor(l,value){
    const cfg=targetConfig[l.destination.value]||targetConfig.orbitPhase;
    const depth=Number(l.depth.value);

    if(cfg.mode==='rotate'){
      return `rotate(${(value*depth).toFixed(6)}deg)`;
    }

    if(cfg.mode==='waveRotate'){
      const freq=Math.max(1,Number(document.querySelector('[data-p="waveFreq"]')?.value)||1);
      return `rotate(${(-value*depth/freq).toFixed(6)}deg)`;
    }

    if(cfg.mode==='scale'){
      const s=Math.max(.01,1+value*(depth/100));
      return `scale(${s.toFixed(6)})`;
    }

    if(cfg.mode==='translateX'){
      const px=value*(depth/100)*960;
      return `translate(${px.toFixed(3)}px,0px)`;
    }

    if(cfg.mode==='translateY'){
      const px=value*(depth/100)*620;
      return `translate(0px,${px.toFixed(3)}px)`;
    }

    if(cfg.mode==='scaleJitter'){
      // Per-cell amplitude is supplied as a CSS custom property when the
      // adapter is bound. 100% depth reproduces the engine's ±0.55 scale
      // range, but the LFO oscillates around the current static state.
      return `scale(calc(1 + var(--v710-scalejitter-amp,0) * ${value.toFixed(6)}))`;
    }

    return 'none';
  }

  function waveformPoints(l){
    const shape=l.shape.value;
    const points=[];
    const add=(pct,value)=>points.push([String(pct),value]);

    if(shape==='sine'){
      const samples=64;
      for(let i=0;i<=samples;i++){
        add((i/samples*100).toFixed(4),Math.sin(i/samples*Math.PI*2));
      }
    }else if(shape==='triangle'){
      add('0',0);add('25',1);add('50',0);add('75',-1);add('100',0);
    }else if(shape==='sawUp'){
      add('0',-1);add('100',1);
    }else if(shape==='sawDown'){
      add('0',1);add('100',-1);
    }else if(shape==='square'){
      add('0',1);add('49.999',1);add('50',-1);add('99.999',-1);add('100',1);
    }else if(shape==='sampleHold'){
      const steps=Math.max(2,Number(l.steps.value));
      const seed=hash32((document.querySelector('#seed')?.value||'0887')+`:LFO${l.n}:S&H:${steps}`);
      const eps=Math.min(.001,50/steps/1000);

      for(let i=0;i<steps;i++){
        const start=i/steps*100;
        const end=(i+1)/steps*100;
        const value=seeded01(seed,i)*2-1;
        add(start.toFixed(5),value);

        if(i<steps-1){
          add((end-eps).toFixed(5),value);
        }else{
          add('99.999',value);
          add('100',seeded01(seed,0)*2-1);
        }
      }
    }

    return points;
  }

  function buildLfoKeyframes(l){
    ensureStyle(l);

    // Jitter needs a unique keyframe for each seeded X/Y cell vector.
    // applyLfo() builds those once it has the current stable SVG nodes.
    if(l.destination.value==='jitter'){
      l.style.textContent='';
      return;
    }

    const points=waveformPoints(l);
    const frames=[];
    const swingPos=[];
    const swingNeg=[];
    const isSwing=l.destination.value==='swing';

    let swingAmp=0;
    if(isSwing){
      const probe=window.OSAULab.svg.querySelector(`[data-swing-lfo${l.n}]`);
      const swingUnit=Number(probe?.getAttribute('data-swing-unit'))||0;
      swingAmp=swingUnit*(Number(l.depth.value)/100);
    }

    points.forEach(([pct,value])=>{
      if(isSwing){
        const px=value*swingAmp;
        swingPos.push(`${pct}%{transform:translate(${px.toFixed(4)}px,0px)}`);
        swingNeg.push(`${pct}%{transform:translate(${(-px).toFixed(4)}px,0px)}`);
      }else{
        frames.push(`${pct}%{transform:${transformFor(l,value)}}`);
      }
    });

    if(isSwing){
      l.style.textContent=
        `@keyframes v711-lfo${l.n}-swing-pos{${swingPos.join('')}}`+
        `@keyframes v711-lfo${l.n}-swing-neg{${swingNeg.join('')}}`;
    }else{
      l.style.textContent=`@keyframes v78-lfo${l.n}-wave{${frames.join('')}}`;
    }
  }

  function buildJitterKeyframes(l,nodes){
    ensureStyle(l);
    const points=waveformPoints(l);
    const depth=Number(l.depth.value)/100;
    const rules=[];

    nodes.forEach((node,index)=>{
      const rx=Number(node.getAttribute('data-jitter-rand-x'))||0;
      const ry=Number(node.getAttribute('data-jitter-rand-y'))||0;
      const ux=Number(node.getAttribute('data-jitter-unit-x'))||0;
      const uy=Number(node.getAttribute('data-jitter-unit-y'))||0;
      const dx=rx*ux*depth;
      const dy=ry*uy*depth;

      const rawId=node.getAttribute('data-jitter-id')||`cell-${index}`;
      const safeId=rawId.replace(/[^a-zA-Z0-9_-]/g,'_');
      const name=`v712-lfo${l.n}-jitter-${safeId}-${index}`;

      node.dataset.jitterAnimation=name;

      const frames=points.map(([pct,value])=>{
        const x=value*dx;
        const y=value*dy;
        return `${pct}%{transform:translate(${x.toFixed(4)}px,${y.toFixed(4)}px)}`;
      });

      rules.push(`@keyframes ${name}{${frames.join('')}}`);
    });

    l.style.textContent=rules.join('');
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

  function kindFor(dest){
    return (targetConfig[dest]||targetConfig.orbitPhase).kind;
  }

  function centreFor(node,kind){
    const cx=Number(node.getAttribute(`data-${kind}-cx`))||600,cy=Number(node.getAttribute(`data-${kind}-cy`))||400;
    return `${cx}px ${cy}px`;
  }

  function clearAllMotion(){
    const svg=window.OSAULab.svg;
    svg.querySelectorAll('.v78-playhead-rotate,.v78-lfo').forEach(node=>{
      node.classList.remove('v78-playhead-rotate','v78-reverse','v78-lfo');
      node.style.removeProperty('--v78-duration');node.style.removeProperty('--v78-delay');node.style.removeProperty('--v78-lfo-name');
      node.style.removeProperty('--v710-scalejitter-amp');
      delete node.dataset.jitterAnimation;
      node.style.removeProperty('animation-delay');node.style.removeProperty('transform-origin');
    });
  }

  function applyPlayhead(){
    if(!running||!playhead.enabled.checked)return 0;
    const d=playhead.destination.value,kind=kindFor(d),nodes=[...window.OSAULab.svg.querySelectorAll(selectorFor('playhead',d))];
    const p=sourcePhase(playhead),reverse=playhead.direction.value==='reverse';
    nodes.forEach(node=>{
      let duration=playhead.duration,phase=p,rev=reverse;
      if(d==='wavePhase'){const freq=Math.max(1,Number(node.getAttribute('data-char-freq'))||1);duration*=freq;phase=mod1(p/freq);rev=!reverse}
      node.style.transformOrigin=centreFor(node,kind);node.style.setProperty('--v78-duration',`${duration}s`);node.style.setProperty('--v78-delay',`${-(phase*duration)}s`);node.style.animationDelay=`${-(phase*duration)}s`;
      node.classList.add('v78-playhead-rotate');if(rev)node.classList.add('v78-reverse');
    });
    return nodes.length;
  }

  function applyLfo(l){
    if(!running||!l.enabled.checked)return 0;
    buildLfoKeyframes(l);
    const d=l.destination.value,kind=kindFor(d),nodes=[...window.OSAULab.svg.querySelectorAll(selectorFor('lfo',d,l.n))];

    if(d==='jitter'){
      buildJitterKeyframes(l,nodes);
    }

    const effective=mod1(sourcePhase(l)+Number(l.phase.value)/360);
    nodes.forEach(node=>{
      let duration=l.duration,phase=effective;

      if(d==='scaleJitter'){
        const rand=Number(node.getAttribute('data-scalejitter-rand'))||0;
        const amp=rand*(Number(l.depth.value)/100)*0.55;
        node.style.setProperty('--v710-scalejitter-amp',amp.toFixed(8));
      }else{
        node.style.removeProperty('--v710-scalejitter-amp');
      }

      node.style.transformOrigin=centreFor(node,kind);
      node.style.setProperty('--v78-duration',`${duration}s`);
      node.style.setProperty('--v78-delay',`${-(phase*duration)}s`);

      if(d==='swing'){
        const dir=Number(node.getAttribute('data-swing-dir'))||1;
        node.style.setProperty('--v78-lfo-name',`v711-lfo${l.n}-swing-${dir>=0?'pos':'neg'}`);
      }else if(d==='jitter'){
        node.style.setProperty('--v78-lfo-name',node.dataset.jitterAnimation);
      }else{
        node.style.setProperty('--v78-lfo-name',`v78-lfo${l.n}-wave`);
      }

      node.style.animationDelay=`${-(phase*duration)}s`;
      node.classList.add('v78-lfo');
    });
    return nodes.length;
  }

  function updateStatus(counts=[]){
    if(!running){status.textContent='STOPPED';return}
    const bits=[];if(playhead.enabled.checked)bits.push(`PLAYHEAD ${counts[0]||0}`);
    lfos.forEach((l,i)=>{if(l.enabled.checked)bits.push(`LFO ${l.n} ${counts[i+1]||0}`)});
    status.textContent=bits.length?`PLAYING · ${bits.join(' + ')}`:'PLAYING · NO SOURCES ENABLED';
  }
  function applyAll(){clearAllMotion();const counts=[applyPlayhead(),...lfos.map(applyLfo)];updateStatus(counts)}
  function startTransport(){
    if(running)return;running=true;transportStart=performance.now();playhead.duration=Number(playhead.rate.value);playhead.phaseOffset=0;lfos.forEach(l=>{l.duration=Number(l.rate.value);l.phaseOffset=0});window.OSAULab.draw();
  }
  function stopTransport(){if(!running)return;running=false;clearAllMotion();updateStatus();window.OSAULab.draw()}

  play.addEventListener('click',startTransport);stop.addEventListener('click',stopTransport);
  playhead.enabled.addEventListener('change',()=>{syncCollapse();if(running)applyAll()});
  playhead.rate.addEventListener('input',()=>{preserveRate(playhead,Number(playhead.rate.value));updateReadouts();if(running)applyAll()});
  playhead.destination.addEventListener('change',()=>{if(running)applyAll()});playhead.direction.addEventListener('change',()=>{if(running)applyAll()});

  lfos.forEach(l=>{
    l.enabled.addEventListener('change',()=>{syncCollapse();if(running)applyAll()});
    l.rate.addEventListener('input',()=>{preserveRate(l,Number(l.rate.value));updateReadouts();if(running)applyAll()});
    l.shape.addEventListener('change',()=>{updateReadouts();buildLfoKeyframes(l);if(running)applyAll()});
    l.destination.addEventListener('change',()=>{
      updateReadouts();
      buildLfoKeyframes(l);
      if(running)applyAll();
    });
    l.steps.addEventListener('input',()=>{updateReadouts();buildLfoKeyframes(l);if(running)applyAll()});
    l.depth.addEventListener('input',()=>{updateReadouts();buildLfoKeyframes(l);if(running)applyAll()});
    l.phase.addEventListener('input',()=>{updateReadouts();if(running)applyAll()});
  });

  document.addEventListener('osau:drawn',()=>{if(running)applyAll()});
  updateReadouts();syncCollapse();lfos.forEach(buildLfoKeyframes);updateStatus();
})();
