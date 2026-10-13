window.OSAUv2=(function(){
'use strict';
const NS='http://www.w3.org/2000/svg';
const C={gold:'#BB8C11',azure:'#0A9EB0',green:'#127359',grid:'#26312d'};
const PALETTE=[C.gold,C.azure,C.green];

function birthColor(seed,identity){
  const r=rng(seed+'|colour|'+identity)();
  return PALETTE[Math.min(PALETTE.length-1,Math.floor(r*PALETTE.length))];
}

function hash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=hash(seed);return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function el(n,a={}){const x=document.createElementNS(NS,n);for(const[k,v]of Object.entries(a))x.setAttribute(k,v);return x}
function motionStack(node,kind,cx=600,cy=400,extra={}){
  const p=el('g',{[`data-${kind}-playhead`]:'1',[`data-${kind}-cx`]:cx,[`data-${kind}-cy`]:cy,...extra});
  const l1=el('g',{[`data-${kind}-lfo1`]:'1',[`data-${kind}-cx`]:cx,[`data-${kind}-cy`]:cy,...extra});
  const l2=el('g',{[`data-${kind}-lfo2`]:'1',[`data-${kind}-cx`]:cx,[`data-${kind}-cy`]:cy,...extra});
  const l3=el('g',{[`data-${kind}-lfo3`]:'1',[`data-${kind}-cx`]:cx,[`data-${kind}-cy`]:cy,...extra});
  l3.appendChild(node);l2.appendChild(l3);l1.appendChild(l2);p.appendChild(l1);
  return p;
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function euclid(steps,pulses){
  steps=Math.max(1,steps|0);pulses=clamp(pulses|0,0,steps);
  if(!pulses)return Array(steps).fill(0);
  const out=[];let bucket=0;
  for(let i=0;i<steps;i++){bucket+=pulses;if(bucket>=steps){bucket-=steps;out.push(1)}else out.push(0)}
  return out;
}
function rotate(a,n){if(!a.length)return a;n=((n%a.length)+a.length)%a.length;return a.slice(-n).concat(a.slice(0,-n))}
function wavy(cx,cy,r,freq,depth,phase=0){
  let d='';const N=120,ph=phase*Math.PI/180;
  for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,rr=r*(1+Math.sin(a*freq+ph)*depth),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;d+=(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)+' '}
  return d+'Z';
}
function ringType(seed, identity){
  const r=rng(seed+'|birth|'+identity)();
  // Deliberately rare and mutually exclusive.
  if(r<0.07)return 'gated';
  if(r<0.14)return 'wavy';
  return 'normal';
}
function circle(g,cx,cy,r,color,character,identity,p,opacity=.8,width=1.3){
  const type=ringType(p.seed,identity);
  const attrs={fill:'none',stroke:color,'stroke-width':width,opacity,'data-ring-type':type};
  let n;
  if(type==='gated'){
    const circumference=Math.PI*2*r;
    const segments=Math.max(2,p.gateSegments|0);
    const unit=circumference/segments;
    attrs['stroke-dasharray']=`${(unit*.62).toFixed(2)} ${(unit*.38).toFixed(2)}`;
    attrs['stroke-dashoffset']=(-circumference*(p.gatePhase/360)).toFixed(2);
    n=el('circle',{...attrs,cx,cy,r});
  }else if(type==='wavy'){
    n=el('path',{...attrs,d:wavy(cx,cy,r,p.waveFreq,p.waveDepth,p.wavePhase),
      'data-wave-cx':cx,'data-wave-cy':cy,'data-wave-freq':p.waveFreq});
  }else{
    n=el('circle',{...attrs,cx,cy,r});
  }
  if(type==='gated'||type==='wavy'){
    const extra={'data-char-type':type};
    if(type==='wavy')extra['data-char-freq']=p.waveFreq;
    g.appendChild(motionStack(n,'char',cx,cy,extra));
  }else{
    g.appendChild(n);
  }
  return n;
}
function gridPoints(p){
  const marginX=120,marginY=90,w=1200-marginX*2,h=800-marginY*2;
  const cx=600,cy=400,scale=p.gridScale,ang=p.gridRotation*Math.PI/180;
  const pts=[];
  for(let y=0;y<p.gridY;y++)for(let x=0;x<p.gridX;x++){
    let px=marginX+(p.gridX===1?0.5:x/(p.gridX-1))*w;
    let py=marginY+(p.gridY===1?0.5:y/(p.gridY-1))*h;
    px=cx+(px-cx)*scale;py=cy+(py-cy)*scale;
    const dx=px-cx,dy=py-cy;
    pts.push({x:cx+dx*Math.cos(ang)-dy*Math.sin(ang),y:cy+dx*Math.sin(ang)+dy*Math.cos(ang),ix:x,iy:y,index:pts.length});
  }
  return pts;
}
function voicePositions(points,v,p,r){
  const pat=rotate(euclid(points.length,Math.min(v.pulses,points.length)),v.phase);
  const cellX=(960/Math.max(1,p.gridX-1))*p.gridScale,cellY=(620/Math.max(1,p.gridY-1))*p.gridScale;
  return points.filter((_,i)=>pat[i]).map(pt=>{
    const swingDir=(pt.iy%2)?1:-1;
    const swingUnit=cellX*.32;
    const swing=swingDir*p.swing*swingUnit;

    // Preserve the exact static Jitter identity so modulation can inherit it
    // without consuming any extra random numbers.
    const jitterRandX=r()*2-1;
    const jitterRandY=r()*2-1;
    const jitterUnitX=cellX*.55;
    const jitterUnitY=cellY*.55;
    const jx=jitterRandX*p.jitter*jitterUnitX;
    const jy=jitterRandY*p.jitter*jitterUnitY;

    const scaleRand=r()*2-1;
    const s=1+scaleRand*p.scaleJitter*.55;
    return {
      ...pt,
      x:pt.x+swing+jx,
      y:pt.y+jy,
      s,
      scaleRand,
      swingDir,
      swingUnit,
      jitterRandX,
      jitterRandY,
      jitterUnitX,
      jitterUnitY
    };
  });
}
function draw(svg,p){
  svg.innerHTML='';const r=rng(p.seed),pts=gridPoints(p);
  const grid=el('g',{opacity:p.showGrid?.28:0,'data-grid-layer':'1'});
  if(p.showGrid){
    for(let y=0;y<p.gridY;y++){const row=pts.filter(q=>q.iy===y);grid.appendChild(el('polyline',{points:row.map(q=>`${q.x},${q.y}`).join(' '),fill:'none',stroke:C.grid,'stroke-width':1}))}
    for(let x=0;x<p.gridX;x++){const col=pts.filter(q=>q.ix===x);grid.appendChild(el('polyline',{points:col.map(q=>`${q.x},${q.y}`).join(' '),fill:'none',stroke:C.grid,'stroke-width':1}))}
    for(const q of pts)grid.appendChild(el('circle',{cx:q.x,cy:q.y,r:2,fill:'#5b6962'}));
  }
  svg.appendChild(motionStack(grid,'master',600,400));

  const sx=120+p.sourceX*960,sy=90+p.sourceY*620,base=Math.min(1200,800)*p.sourceSize;
  if(p.sourceSize>0){
    const source=el('g');
    for(let i=0;i<p.sourceRings;i++){const id=`source:ring:${i}`;circle(source,sx,sy,base*(.28+i*.11),birthColor(p.seed,id),null,id,p,.85,i===0?2:1);}
    for(let i=0;i<p.sourceDots;i++){const a=i/Math.max(1,p.sourceDots)*Math.PI*2,rr=base*1.08,id=`source:dot:${i}`;source.appendChild(el('circle',{cx:sx+Math.cos(a)*rr,cy:sy+Math.sin(a)*rr,r:2.4,fill:birthColor(p.seed,id),opacity:.8,'data-colour-birth':id}))}
    source.appendChild(el('circle',{cx:sx,cy:sy,r:base*.12,fill:birthColor(p.seed,'source:centre'),opacity:.9}));
    svg.appendChild(motionStack(source,'source',sx,sy));
  }

  const layers={};
  for(const v of p.voices){
    const g=el('g',{'data-voice':v.name});layers[v.name]=g;svg.appendChild(motionStack(g,'master',600,400));
    const vr=rng(p.seed+'|'+v.name),pos=voicePositions(pts,v,p,vr);
    pos.forEach((q,i)=>{
      const size=v.size*q.s;

      if(v.name==='CURVES')return;

      const kind=v.name.toLowerCase()+'size';
      const cell=el('g',{'data-cell-voice':v.name,'data-cell-index':q.index});

      // v7.10: Scale Jitter gets its own nested LFO stack. The per-cell random
      // coefficient is inherited from the same deterministic value used by
      // the static Scale Jitter calculation above.
      const sizeStack=motionStack(cell,kind,q.x,q.y);
      const scaleJitterStack=motionStack(
        sizeStack,
        'scalejitter',
        q.x,
        q.y,
        {'data-scalejitter-rand':q.scaleRand}
      );

      // v7.11: Swing modulation uses the same alternating row direction and
      // the same per-grid swing unit as the static voice-position engine.
      const swingStack=motionStack(
        scaleJitterStack,
        'swing',
        q.x,
        q.y,
        {
          'data-swing-dir':q.swingDir,
          'data-swing-unit':q.swingUnit
        }
      );

      // v7.12: each cell inherits its deterministic X/Y jitter vector.
      // The dedicated nested stack lets all three LFOs add jitter without
      // competing for the Swing/Scale Jitter/Size transforms underneath.
      const jitterStack=motionStack(
        swingStack,
        'jitter',
        q.x,
        q.y,
        {
          'data-jitter-id':`${v.name}-${q.index}`,
          'data-jitter-rand-x':q.jitterRandX,
          'data-jitter-rand-y':q.jitterRandY,
          'data-jitter-unit-x':q.jitterUnitX,
          'data-jitter-unit-y':q.jitterUnitY
        }
      );

      g.appendChild(jitterStack);

      if(v.name==='RINGS'){
        for(let k=0;k<v.rings;k++){
          const id=`${v.name}:cell:${q.index}:ring:${k}`;
          circle(cell,q.x,q.y,size*(.55+k*.14),birthColor(p.seed,id),null,id,p,.72,1.1);
        }
      }else if(v.name==='ORBITS'){
        const rid=`${v.name}:cell:${q.index}:ring:0`;
        circle(cell,q.x,q.y,size,birthColor(p.seed,rid),null,rid,p,.75,1.1);

        const sats=el('g',{'data-orbit-sats':'1','data-orbit-cx':q.x,'data-orbit-cy':q.y});
        for(let k=0;k<v.satellites;k++){
          const a=k/Math.max(1,v.satellites)*Math.PI*2+((v.orbitPhase||0)*Math.PI/180);
          const id=`${v.name}:cell:${q.index}:satellite:${k}`;
          sats.appendChild(el('circle',{
            cx:q.x+Math.cos(a)*size,
            cy:q.y+Math.sin(a)*size,
            r:3,
            fill:birthColor(p.seed,id),
            opacity:.8
          }));
        }

        cell.appendChild(motionStack(sats,'orbit',q.x,q.y));
      }else if(v.name==='DOTS'){
        const id=`${v.name}:cell:${q.index}`;
        cell.appendChild(el('circle',{
          cx:q.x,cy:q.y,r:Math.max(2,size*.16),
          fill:birthColor(p.seed,id),opacity:.85
        }));
      }else if(v.name==='CROSSES'){
        const z=size*.45,id=`${v.name}:cell:${q.index}`;
        cell.appendChild(el('path',{
          d:`M ${q.x-z} ${q.y}H ${q.x+z} M ${q.x} ${q.y-z}V ${q.y+z}`,
          fill:'none',stroke:birthColor(p.seed,id),'stroke-width':1.5,opacity:.8
        }));
      }
    });
  }

  const cv=p.voices.find(v=>v.name==='CURVES');
  if(cv){
    const cr=rng(p.seed+'|CURVES'),pos=voicePositions(pts,cv,p,cr),g=layers.CURVES;
    pos.forEach((a,i)=>{const b=pos[(i+Math.max(1,cv.span))%pos.length];if(!b||a===b)return;const dx=b.x-a.x,dy=b.y-a.y,nx=-dy,ny=dx,len=Math.max(1,Math.hypot(nx,ny)),bend=cv.bend*180*(i%2?1:-1);const mx=(a.x+b.x)/2+nx/len*bend,my=(a.y+b.y)/2+ny/len*bend;{const id=`CURVES:from:${a.index}:to:${b.index}`;g.appendChild(el('path',{d:`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`,fill:'none',stroke:birthColor(p.seed,id),'stroke-width':1.1,opacity:.55}))}});
  }
}
return{draw,euclid,colors:C};
})();