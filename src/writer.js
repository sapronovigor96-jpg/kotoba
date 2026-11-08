/* ---------- письмо с проверкой черт ---------- */
function resample(pts,n){
  const d=[0]; for(let i=1;i<pts.length;i++) d.push(d[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  const L=d[d.length-1], out=[];
  if(L===0) return Array(n).fill(pts[0]);
  let j=0;
  for(let i=0;i<n;i++){ const t=L*i/(n-1); while(j<d.length-2&&d[j+1]<t) j++;
    const seg=d[j+1]-d[j]||1, a=(t-d[j])/seg; out.push([pts[j][0]+(pts[j+1][0]-pts[j][0])*a, pts[j][1]+(pts[j+1][1]-pts[j][1])*a]); }
  return out;
}
const plen=pts=>pts.reduce((s,p,i)=>i?s+Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]):0,0);
const meanDist=(a,b)=>a.reduce((s,p,i)=>s+Math.hypot(p[0]-b[i][0],p[1]-b[i][1]),0)/a.length;
const N_PTS=24;
function gradeFromWriting(r){ return (r.shown>0||r.mistakes>=3)?1:(r.mistakes>0||r.hints>0)?2:3; }

function makeWriter(box,k,opts={}){
  const paths=STROKES[k]||[], N=paths.length, guide=!!opts.guide;
  box.innerHTML=`<div class="pad"><svg class="wsvg" viewBox="0 0 109 109" aria-label="Поле для письма: ${esc(k)}">
    <g class="refp">${paths.map(d=>`<path d="${d}"/>`).join("")}</g>
    ${guide?`<g class="guide">${paths.map(d=>`<path d="${d}"/>`).join("")}</g>`:""}
    <g class="hintg"></g><g class="donep"></g><polyline class="live" points=""/></svg></div>
    <p class="wmsg" aria-live="polite"></p>
    <div class="row center"><button class="link" type="button" data-w="hint">Подсказка</button><button class="link" type="button" data-w="reset">Начать заново</button></div>`;
  const svg=box.querySelector("svg"), live=svg.querySelector(".live"), done=svg.querySelector(".donep"), hg=svg.querySelector(".hintg"), msg=box.querySelector(".wmsg");
  const ref=[...svg.querySelectorAll(".refp path")].map(p=>{ const L=p.getTotalLength(); const pts=[]; for(let i=0;i<N_PTS;i++){ const q=p.getPointAtLength(L*i/(N_PTS-1)); pts.push([q.x,q.y]); } return {pts,L}; });
  let idx, misses, hintLvl, res, pts=null, finished, gen=0, reported=false;
  const say=t=>msg.textContent=t;
  function reset(){ gen++; box.querySelector('[data-w="hint"]').hidden=false; box.querySelector('[data-w="reset"]').textContent='Начать заново'; idx=0; misses=0; hintLvl=0; res={mistakes:0,hints:0,shown:0}; finished=false; done.innerHTML=""; hg.innerHTML=""; live.setAttribute("points","");
    say(guide?`Обведи по контуру. Черта 1 из ${N}.`:`Напиши по памяти. Черт: ${N}.`); }
  function addDone(i,cls){ const p=document.createElementNS("http://www.w3.org/2000/svg","path"); p.setAttribute("d",paths[i]); p.setAttribute("class",cls); done.appendChild(p); }
  function advance(){ idx++; misses=0; hintLvl=0; hg.innerHTML="";
    if(idx>=N){ finished=true; const r=res; box.querySelector('[data-w="hint"]').hidden=true; box.querySelector('[data-w="reset"]').textContent='Написать ещё раз';
      say(r.mistakes===0&&r.hints===0&&r.shown===0?`Отлично: все ${N} ${plural(N,"черта","черты","черт")} верно.`:`Готово. Ошибок: ${r.mistakes}, подсказок: ${r.hints}.`);
      if(!reported&&opts.onDone){ reported=true; opts.onDone(r); } }
    else if(!guide) say(`Черта ${idx+1} из ${N}.`); else say(`Черта ${idx+1} из ${N}.`); }
  function compare(u){
    const U=resample(u,N_PTS), tol=(guide?15:21)*(ref[idx].L<22?1.25:1);
    const R=ref[idx].pts, d=meanDist(U,R), dr=meanDist(U,R.slice().reverse());
    if(d<tol) return {ok:true};
    if(dr<tol) return {why:"reverse"};
    for(let j=idx+1;j<N;j++) if(meanDist(U,ref[j].pts)<tol) return {why:"order",j};
    return {why:"shape"};
  }
  function showHint(){
    if(finished) return; res.hints++; hintLvl++;
    const s=ref[idx].pts[0];
    if(hintLvl===1){ hg.innerHTML=`<circle class="hdot" cx="${s[0]}" cy="${s[1]}" r="5"/>`; say(`Черта ${idx+1} начинается в мигающей точке.`); }
    else { hg.innerHTML=`<circle class="hdot" cx="${s[0]}" cy="${s[1]}" r="5"/><path class="hpath" d="${paths[idx]}"/>`;
      const hp=hg.querySelector(".hpath"), L=hp.getTotalLength(); hp.style.strokeDasharray=L; hp.style.strokeDashoffset=L;
      requestAnimationFrame(()=>{ hp.style.transition="stroke-dashoffset 900ms ease-in-out"; hp.style.strokeDashoffset=0; });
      say(`Черта ${idx+1} идёт вот так. Повтори её.`); }
  }
  function fail(why,j){
    res.mistakes++; misses++;
    live.classList.add("bad"); setTimeout(()=>{ live.classList.remove("bad"); live.setAttribute("points",""); },550);
    if(misses>=3){ misses=-99; addDone(idx,"shown"); res.shown++; say(`Показал черту ${idx+1}, идём дальше.`); const g=gen; setTimeout(()=>{ if(g===gen) advance(); },600); return; }
    if(why==="reverse"){ say(`Эту черту пишут в другую сторону.`); hintLvl=0; showHint(); res.hints--; }
    else if(why==="order") say(`Это черта ${j+1}, а сейчас нужна ${idx+1}. Черты пишутся сверху вниз и слева направо.`);
    else say(`Не похоже на черту ${idx+1}. Попробуй ещё раз${misses===2?" или возьми подсказку":""}.`);
  }
  const pos=e=>{ const r=svg.getBoundingClientRect(); return [(e.clientX-r.left)/r.width*109,(e.clientY-r.top)/r.height*109]; };
  svg.addEventListener("pointerdown",e=>{ if(finished) return; e.preventDefault(); pts=[pos(e)]; svg.setPointerCapture(e.pointerId); live.setAttribute("points",pts.map(p=>p.join(",")).join(" ")); });
  svg.addEventListener("pointermove",e=>{ if(!pts) return; pts.push(pos(e)); live.setAttribute("points",pts.map(p=>p.map(v=>v.toFixed(1)).join(",")).join(" ")); });
  const up=()=>{ if(!pts) return; const u=pts; pts=null;
    if(plen(u)<3 && ref[idx].L>12){ live.setAttribute("points",""); return; }
    if(u.length<2) u.push([u[0][0]+.1,u[0][1]+.1]);
    const r=compare(u);
    if(r.ok){ live.setAttribute("points",""); addDone(idx,"ok"); advance(); } else fail(r.why,r.j); };
  svg.addEventListener("pointerup",up); svg.addEventListener("pointercancel",up);
  box.querySelector('[data-w="hint"]').onclick=showHint;
  box.querySelector('[data-w="reset"]').onclick=reset;
  reset();
  return {result:()=>res, finished:()=>finished};
}
