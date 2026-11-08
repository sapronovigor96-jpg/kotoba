/* ---------- данные ---------- */
const KANA={}, ALLWORDS=[];
DATA.forEach(n=>{ if(n.kind==="kana") KANA[n.front]=n; else ALLWORDS.push(n); });
// профиль: в веб-версии задаётся при входе; без Sekiro для Маши
let PROFILE={name:"igor",title:"Игорь",sekiro:true};
let WORDS0=ALLWORDS.slice();
function applyProfile(p){ PROFILE=p; WORDS0=ALLWORDS.filter(w=>p.sekiro||!w.sekiro); }
const sek=()=>PROFILE.sekiro;
const noSek=s=>sek()?s:s.filter(x=>!/Sekiro/.test(x));
const LESSON_OF={}; LESSONS.forEach(l=>{ if(l.kana) [...l.kana].forEach(k=>LESSON_OF[k]=l.id); });
const SMALL={"ゃ":"ya","ゅ":"yu","ょ":"yo","っ":"(пауза)","ー":"(долгота)"};

/* ---------- хранилище ---------- */
let KEY="kotoba-sanpo-v2";
const DEFAULTS={newPerDay:10,maxReviews:80,retention:0.9,sessionMin:20,audio:true,writing:true};
let S;
function fresh(){ return {cards:{},log:[],custom:[],lessons:{},settings:{}}; }
function normalize(){ S.cards=S.cards||{}; S.log=S.log||[]; S.custom=S.custom||[]; S.lessons=S.lessons||{}; S.settings=Object.assign({},DEFAULTS,S.settings||{}); }
function load(){ try{ S=JSON.parse(localStorage.getItem(KEY)); }catch(e){ S=null; } if(!S) S=fresh(); normalize(); }
let saveOk=true;
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); saveOk=true; }catch(e){ saveOk=false; } if(typeof SYNC!=="undefined") SYNC.push(); }
function st(id){ return S.cards[id]||{state:"new"}; }
function dayStart(t){ const d=new Date(t-4*3600000); d.setHours(0,0,0,0); return d.getTime()+4*3600000; }
const words=()=>WORDS0.concat(S.custom.map(c=>Object.assign({group:"mine",custom:true},c)));
const wordBy=f=>words().find(w=>w.front===f);

/* ---------- карточки и план ---------- */
function noteFor(id){ const [t,f]=[id.slice(0,id.indexOf(":")),id.slice(id.indexOf(":")+1)]; return {type:t, n: t[0]==="k"?KANA[f]:wordBy(f)}; }
function candidates(){
  // новые карточки, которые уже можно показывать (после урока и первого успешного повторения)
  const out=[];
  for(const w of words()){
    const r=st("wr:"+w.front);
    if(r.state==="new" && w.custom) out.push("wr:"+w.front);
    if(r.state==="review" && r.s>=3 && st("wp:"+w.front).state==="new") out.push("wp:"+w.front);
  }
  return out;
}
function newToday(){ const ds=dayStart(Date.now()); return new Set(S.log.filter(l=>l.t>=ds&&l.first&&!l.lesson).map(l=>l.id)).size; }
function plan(now=Date.now()){
  const due=Object.keys(S.cards).filter(id=>{const x=S.cards[id]; return x.state==="review"&&x.due<=now && noteFor(id).n && (S.settings.writing||!id.startsWith("kw:"));});
  const R=id=>retr((now-S.cards[id].last)/DAY,S.cards[id].s);
  due.sort((a,b)=>R(a)-R(b));
  const slots = due.length>S.settings.maxReviews ? 0 : Math.max(0,S.settings.newPerDay-newToday());
  return {due, dueShown:due.slice(0,S.settings.maxReviews), news:candidates().slice(0,slots)};
}
function lastStudy(){ return S.log.length? S.log[S.log.length-1].t : 0; }
function nextLesson(){ return LESSONS.find(l=>!S.lessons[l.id]); }
function introduce(id,g){
  const now=Date.now(); if(S.cards[id]) return;
  S.cards[id]={state:"review",s:W[g-1],d:clampD(W[4]-(g-3)*W[5]),last:now,due:dayStart(now)+DAY,reps:1,lapses:0};
  S.log.push({t:now,id,g,first:1,lesson:1});
}
function gradeCard(id,g){
  const now=Date.now(), x=st(id), first=x.state==="new";
  const nx=fsrsNext(first?null:x,g,now);
  let iv= g===1 ? 1 : ivlFor(nx.s,S.settings.retention);
  if(first) iv=Math.min(iv,1);
  S.cards[id]={state:"review",s:nx.s,d:nx.d,last:now,due:dayStart(now)+iv*DAY,reps:(x.reps||0)+1,lapses:(x.lapses||0)+(g===1&&!first?1:0)};
  S.log.push({t:now,id,g,first:first?1:undefined});
  if(S.log.length>20000) S.log=S.log.slice(-20000);
  save();
}

/* ---------- порядок черт (KanjiVG) ---------- */
function strokeSVG(k,cls="strokes"){
  const p=STROKES[k]; if(!p) return `<div class="kana big" lang="ja">${esc(k)}</div>`;
  return `<svg class="${cls}" viewBox="0 0 109 109" aria-label="Порядок черт ${esc(k)}" role="img">
   <g class="guide">${p.map(d=>`<path d="${d}"/>`).join("")}</g>
   <g class="anim">${p.map(d=>`<path d="${d}"/>`).join("")}</g></svg>`;
}
const reduce=()=>{ try{ return matchMedia("(prefers-reduced-motion: reduce)").matches; }catch(e){ return false; } };
function animate(svg){
  if(!svg) return; const ps=[...svg.querySelectorAll(".anim path")];
  svg._run=(svg._run||0)+1; const run=svg._run;
  ps.forEach(p=>{ const L=p.getTotalLength(); p.style.transition="none"; p.style.strokeDasharray=L; p.style.strokeDashoffset=reduce()?0:L; });
  if(reduce()) return;
  let t=250;
  ps.forEach(p=>{ const L=p.getTotalLength(), dur=Math.max(350,L*9);
    setTimeout(()=>{ if(svg._run!==run) return; p.style.transition=`stroke-dashoffset ${dur}ms ease-in-out`; p.style.strokeDashoffset=0; },t);
    t+=dur+180; });
}

/* ---------- навигация ---------- */
const VIEWS=["home","lessons","kana","progress","options","phrases","songs"];
let L=null, sess=null, prevView="home", curView="home";
function go(v){
  if(v!==curView){ prevView=curView; curView=v; }
  if(sess && v!=="session") sess=null;
  if(L && v!=="lesson") L=null;
  document.querySelectorAll("[data-view]").forEach(el=>el.hidden=el.dataset.view!==v);
  document.querySelectorAll("nav button").forEach(b=>b.setAttribute("aria-current",b.dataset.go===v?"page":"false"));
  ({home:renderHome,lessons:renderLessons,kana:renderKana,progress:renderProgress,options:renderOptions,phrases:renderPhrases,songs:renderSongs})[v]?.();
  if(VIEWS.includes(v)){ try{ history.replaceState(null,"",v==="home"?location.pathname:"#"+v); }catch(e){} }
  window.scrollTo(0,0);
}

/* ---------- главная ---------- */
function renderHome(){
  const p=plan(), gap=lastStudy()?(Date.now()-lastStudy())/DAY:0, nl=nextLesson();
  const rev=p.dueShown.length+p.news.length, mins=Math.max(1,Math.round(rev*10/60));
  const lessonToday=Object.values(S.lessons).some(t=>t.done>=dayStart(Date.now()));
  const started=Object.keys(S.lessons).length>0;
  let back="";
  if(lastStudy() && gap>=2.5) back=`<p class="note">Тебя не было ${Math.floor(gap)} ${plural(Math.floor(gap),"день","дня","дней")}. Это нормально: память не обнулилась. Начни с повторения, а урок подождёт.${p.due.length>p.dueShown.length?` Накопилось ${p.due.length}, сегодня покажу ${p.dueShown.length} самых подзабытых, остальные подтянутся постепенно.`:""}</p>`;
  const lessonBlock = nl ? `<section class="lesson-next">
      <p class="eyebrow">${started?"Следующий урок":"Начни отсюда"} · ${LESSONS.indexOf(nl)+1} из ${LESSONS.length}</p>
      <h2 class="lt">${esc(nl.title)}</h2>
      ${nl.kana?`<p class="kana-row" lang="ja">${[...nl.kana].join(" ")}</p>`:`<p class="sub">${WORDS0.length} слов${sek()?", включая слова из Sekiro":""}</p>`}
      <p class="muted">Объяснение, знакомство с каждым знаком, порядок черт и озвучка, потом лёгкая проверка. Около ${nl.min} минут.</p>
      ${lessonToday?`<p class="muted">Сегодня урок уже был. По плану следующий завтра: сон помогает запомнить. Но решать тебе.</p>`:""}
      <button class="${rev&&!lessonToday?"ghost":"primary"}" id="go-lesson">${lessonToday?"Всё равно начать":"Начать урок"}</button>
    </section>` : `<section class="lesson-next"><p class="eyebrow">Уроки</p><h2 class="lt">Хирагана пройдена целиком</h2><p class="muted">Дальше по плану катакана и урок 1 Нечаевой. Их добавим в следующей версии. А пока повторения и свои слова в «Справочнике».</p></section>`;
  $("#home").innerHTML=`
    <p class="eyebrow">${new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"})}</p>
    ${!started?`<h1>Начнём с хираганы</h1><p class="sub">Сначала объясню, покажу и дам потрогать каждый знак. Проверки появятся только после этого, и они ни на что не влияют, кроме расписания повторений.</p>`:
      rev?`<h1>Повторение: ${rev} ${plural(rev,"карточка","карточки","карточек")}</h1><p class="sub">Только то, что ты уже прошёл. Примерно ${mins} мин.</p><button class="primary" id="go-review">Повторить</button>`
      :`<h1>Повторять сегодня нечего</h1><p class="sub">${forecastLine()}</p>`}
    ${back}
    ${lessonBlock}
    <section class="panel fun"><p class="eyebrow">Для удовольствия</p>${sek()?`<h2>Фразы из Sekiro и песни</h2><p lang="ja" class="fun-jp">眠れ、永遠に</p><p class="muted">«Спи вечно» и ещё две фразы с озвучкой и разбором по словам. А ещё раздел песен: вставь текст любимой песни, и приложение разберёт его по словам со звуком.</p><div class="row"><button class="ghost" id="go-ph">Фразы из Sekiro</button><button class="ghost" id="go-sg">Песни</button></div>`:`<h2>Песни</h2><p class="muted">Вставь текст любимой японской песни, и приложение подпишет чтения, разберёт строки по словам и озвучит их по слогам. Можно открыть уже сейчас.</p><div class="row"><button class="ghost" id="go-sg">Песни</button></div>`}</section>
    ${started?offline():""}`;
  $("#go-lesson")?.addEventListener("click",()=>startLesson(nl.id));
  $("#go-review")?.addEventListener("click",startSession);
  $("#go-ph")?.addEventListener("click",()=>go("phrases")); $("#go-sg").onclick=()=>go("songs");
}
function offline(){
  const l=[...LESSONS].reverse().find(x=>S.lessons[x.id]);
  if(!l||!l.extra) return "";
  return `<section class="panel quiet"><h2>Вне приложения, по плану</h2><ul class="tasks">${noSek(l.extra).map(e=>`<li>${esc(e)}</li>`).join("")}<li>Если время есть, Нечаева: 10 минут фонетики, без спешки.</li></ul></section>`;
}
function forecastLine(){
  const t2=dayStart(Date.now())+2*DAY;
  const n=Object.values(S.cards).filter(c=>c.state==="review"&&c.due<=t2).length;
  return n?`Завтра будет около ${n}.`:"Можно пройти урок или просто отдохнуть.";
}

/* ---------- уроки ---------- */
function introFor(l){ return sek()? l.intro : l.intro.replace(/<p>[^<]*Sekiro[\s\S]*?<\/p>/g,""); }
function renderLessons(){
  $("#lessons").innerHTML=`<h1>Уроки</h1><p class="sub">Неделя 1 из плана: вся хирагана и первые слова. Удобный темп — один урок в день. Пройденные уроки можно открыть снова и перечитать.</p>
  <ol class="llist">${LESSONS.map((l,i)=>{ const done=S.lessons[l.id]; const isNext=nextLesson()===l;
    return `<li class="${done?"done":""}${isNext?" next":""}"><div><p class="eyebrow">День ${i+1}${done?" · пройден":isNext?" · следующий":""}</p><h2>${esc(l.title)}</h2>${l.kana?`<p class="kana-row sm" lang="ja">${[...l.kana].join(" ")}</p>`:""}</div>
      <div class="row"><button class="ghost" data-read="${l.id}">Теория</button><button class="${isNext?"primary":"ghost"}" data-start="${l.id}">${done?"Пройти ещё раз":"Начать"}</button></div></li>`;}).join("")}</ol>
  <div id="theory"></div>`;
  document.querySelectorAll("[data-start]").forEach(b=>b.onclick=()=>startLesson(b.dataset.start));
  document.querySelectorAll("[data-read]").forEach(b=>b.onclick=()=>{ const l=LESSONS.find(x=>x.id===b.dataset.read);
    $("#theory").innerHTML=`<section class="panel theory"><h2>${esc(l.title)}</h2>${introFor(l)}</section>`; $("#theory").scrollIntoView({behavior:"smooth"}); });
}
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function chunks(a,n){ const r=[]; for(let i=0;i<a.length;i+=n) r.push(a.slice(i,i+n)); return r; }
function startLesson(id){
  const l=LESSONS.find(x=>x.id===id); const steps=[{t:"intro"}];
  if(l.kana){
    for(const ch of chunks([...l.kana],5)){ ch.forEach(k=>steps.push({t:"meet",k})); steps.push({t:"quiz",items:ch}); if(S.settings.writing) steps.push({t:"write",items:ch}); }
    if(l.pairs) steps.push({t:"pairs"});
    steps.push({t:"final"});
  } else {
    const ws=WORDS0;
    for(const ch of chunks(ws,7)){ ch.forEach(w=>steps.push({t:"meetw",w})); steps.push({t:"quizw",items:ch}); }
    steps.push({t:"finalw"});
  }
  steps.push({t:"done"});
  L={l,steps,i:0,errors:0,kw:{}};
  go("lesson"); renderStep();
}
function lhead(){ const pct=Math.round(L.i/(L.steps.length-1)*100);
  return `<div class="lhead"><button class="link" id="l-exit">← выйти</button><span>${esc(L.l.title)}</span></div><div class="lbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`; }
function stepNext(){ L.i++; renderStep(); window.scrollTo(0,0); }
function renderStep(){
  const s=L.steps[L.i], el=$("#lesson");
  const bindExit=()=>{ $("#l-exit").onclick=()=>go("home"); };
  if(s.t==="intro"){
    el.innerHTML=`${lhead()}<article class="theory"><p class="eyebrow">Перед началом</p><h1>${esc(L.l.title)}</h1>${introFor(L.l)}</article><div class="row"><button class="primary" id="nx">Понятно, к знакам</button></div>`;
  } else if(s.t==="meet"){
    const n=KANA[s.k], base=n.note.match(/^(.)\s*\+\s*゛|^(.)\s*\+\s*゜/);
    el.innerHTML=`${lhead()}<div class="meet">
      <div class="meet-glyph">${strokeSVG(s.k)}<div class="row center"><button class="link" id="replay">↻ Порядок черт</button>${canSpeak()?`<button class="link" id="say">▶ Звук</button>`:""}</div></div>
      <div class="meet-info"><p class="reading"><b>${esc(n.romaji)}</b> <span class="muted">${esc(n.ru)}</span></p>
        <p class="mnem">${esc(n.note)}</p>
        <p class="muted">${(STROKES[s.k]||[]).length} ${plural((STROKES[s.k]||[]).length,"черта","черты","черт")}. Посмотри анимацию, потом обведи знак по контуру справа: каждая черта проверяется, порядок и направление важны. Если не выходит, нажми «Подсказка».</p></div>
      <div class="meet-pad" id="wbox"></div>
    </div><div class="row"><button class="primary" id="nx">Дальше</button></div>`;
    const svg=el.querySelector("svg.strokes"); animate(svg); makeWriter($("#wbox"),s.k,{guide:true});
    $("#replay").onclick=()=>animate(svg);
    $("#say")?.addEventListener("click",()=>speak(s.k));
    if(S.settings.audio) setTimeout(()=>speak(s.k),300);
  } else if(s.t==="meetw"){
    const w=s.w;
    el.innerHTML=`${lhead()}<div class="card"><div class="kana word" lang="ja">${esc(w.front)}</div>
      <p class="reading"><b>${esc(w.ru)}</b></p><p class="muted">${esc(w.romaji)}</p>
      <div class="breakdown" lang="ja">${[...w.front].map(c=>`<span><b>${esc(c)}</b><small>${esc(KANA[c]?.romaji||SMALL[c]||"")}</small></span>`).join("")}</div>
      ${w.note?`<p class="mnem">${esc(w.note)}</p>`:""}${canSpeak()?`<button class="link" id="say">▶ Произношение</button>`:""}</div>
      <div class="row"><button class="primary" id="nx">Дальше</button></div>`;
    $("#say")?.addEventListener("click",()=>speak(w.front)); if(S.settings.audio) setTimeout(()=>speak(w.front),300);
  } else if(s.t==="quiz"||s.t==="quizw"||s.t==="pairs"){
    if(!s.q){
      if(s.t==="quiz") s.q=shuffle(s.items.flatMap(k=>[{k,dir:"r"},{k,dir:"k"}]));
      else if(s.t==="quizw") s.q=shuffle(s.items.map(w=>({w})));
      else s.q=shuffle(L.l.pairs.flatMap(([a,b])=>[{k:a,dir:"k",only:[a,b]},{k:b,dir:"k",only:[a,b]}]));
      s.wrong=0; s.total=s.q.length;
    }
    if(!s.q.length){
      el.innerHTML=`${lhead()}<div class="pause"><h1>${s.wrong?"Готово":"Всё верно"}</h1><p class="sub">${s.wrong?`Пара ошибок была, и это хорошо: после ошибки правильный ответ запоминается крепче.`:`Эти знаки уже узнаются.`} Дальше ${L.steps[L.i+1].t==="final"||L.steps[L.i+1].t==="finalw"?"последний шаг урока":"новые знаки"}.</p></div><div class="row"><button class="primary" id="nx">Дальше</button></div>`;
    } else renderMC(s,el);
    if(s.t==="pairs" && s.q.length===s.total && !s.shown){
      s.shown=true;
      el.innerHTML=`${lhead()}<h1>Похожие знаки</h1><p class="sub">Посмотри на пары и найди, чем они отличаются. Потом короткая проверка.</p>
      <div class="pairs">${L.l.pairs.map(([a,b])=>`<div class="pair">${[a,b].map(k=>`<div><span class="kana mid" lang="ja">${k}</span><b>${esc(KANA[k].romaji)}</b><small>${esc(KANA[k].note)}</small></div>`).join("")}</div>`).join("")}</div>
      <div class="row"><button class="primary" id="pq">К проверке</button></div>`;
      $("#pq").onclick=()=>renderStep();
    }
  } else if(s.t==="write"){
    if(!s.q){ s.q=shuffle(s.items); s.n=s.q.length; }
    if(!s.q.length){ stepNext(); return; }
    const k=s.q[0], n=KANA[k];
    el.innerHTML=`${lhead()}<p class="eyebrow">Напиши по памяти · ${s.n-s.q.length+1} из ${s.n}</p>
      <div class="card"><div class="ru">${esc(n.romaji)} <span class="muted">${esc(n.ru)}</span></div><p class="ask">Напиши этот знак без образца. Каждая черта проверяется сразу.</p><div id="wbox"></div><div id="wres"></div></div>
      <div class="row" id="wrow"><button class="ghost" id="wskip">Не помню, показать</button></div>`;
    const finish=r=>{ L.kw[k]=gradeFromWriting(r); s.q.shift();
      $("#wres").innerHTML=`<div class="cmp">${strokeSVG(k,"strokes small")}</div><p class="mnem">${esc(n.note)}</p>`; animate($("#wres svg"));
      $("#wrow").innerHTML=`<button class="primary" id="wn">Дальше</button>`; $("#wn").focus(); $("#wn").onclick=()=>renderStep(); };
    makeWriter($("#wbox"),k,{guide:false,onDone:finish});
    $("#wskip").onclick=()=>finish({mistakes:3,hints:0,shown:1});
  } else if(s.t==="final"||s.t==="finalw"){
    if(!s.q){ s.q=shuffle(s.t==="final"?[...L.l.kana].map(k=>({k})):WORDS0.map(w=>({w}))); s.first={}; }
    if(!s.q.length){ // записываем первые оценки
      for(const id in s.first) introduce(id,s.first[id]);
      for(const k in L.kw) introduce("kw:"+k,L.kw[k]);
      S.lessons[L.l.id]={done:Date.now()}; save(); stepNext(); return;
    }
    if(s.t==="final") renderFinalKana(s,el); else renderMC(s,el,true);
  } else if(s.t==="done"){
    const ids=Object.keys(S.cards).length;
    el.innerHTML=`${lhead()}<div class="pause"><p class="eyebrow">Урок пройден</p><h1>${esc(L.l.title)}</h1>
      <p class="sub">${L.l.kana?`${[...L.l.kana].length} знаков`:`${WORDS0.length} слов`} теперь в повторениях. Первое повторение завтра, дальше интервалы будут расти сами.</p>
      <section class="panel quiet"><h2>Закрепи руками</h2><ul class="tasks">${noSek(L.l.extra||[]).map(e=>`<li>${esc(e)}</li>`).join("")}</ul></section>
      <div class="row"><button class="primary" id="home-btn">На главную</button></div></div>`;
    $("#home-btn").onclick=()=>go("home");
  }
  if($("#l-exit")) bindExit();
  $("#nx")?.addEventListener("click",stepNext);
}
function optionsFor(item){
  if(item.w){ const pool=shuffle(words().filter(x=>x.front!==item.w.front)).slice(0,3).map(x=>x.ru); return shuffle(pool.concat(item.w.ru)); }
  const met=new Set(L.steps.slice(0,L.i).filter(x=>x.t==="meet").map(x=>x.k));
  const learned=Object.keys(KANA).filter(k=>S.lessons[LESSON_OF[k]]||met.has(k));
  const pool=item.only? item.only.filter(k=>k!==item.k) : shuffle(learned.filter(k=>k!==item.k && KANA[k].romaji!==KANA[item.k].romaji)).slice(0,3);
  const ks=shuffle(pool.concat(item.k));
  return item.dir==="r"? ks.map(k=>KANA[k].romaji) : ks;
}
function renderMC(s,el,final=false){
  const item=s.q[0], opts=optionsFor(item);
  const right = item.w? item.w.ru : item.dir==="r"? KANA[item.k].romaji : item.k;
  const prompt = item.w? `<div class="kana word" lang="ja">${esc(item.w.front)}</div><p class="ask">Что значит это слово?</p>`
    : item.dir==="r"? `<div class="kana big" lang="ja">${esc(item.k)}</div><p class="ask">Как читается?</p>`
    : `<div class="ru">${esc(KANA[item.k].romaji)} <span class="muted">${esc(KANA[item.k].ru)}</span></div><p class="ask">Какой это знак?</p>`;
  el.innerHTML=`${lhead()}<p class="eyebrow">${final?"Последний шаг: проверь себя":"Лёгкая проверка"} · осталось ${s.q.length}</p><div class="card">${prompt}
    <div class="mc ${item.dir==="k"?"kana-opts":""}">${opts.map(o=>`<button class="opt" data-o="${esc(o)}" ${item.dir==="k"?'lang="ja"':""}>${esc(o)}</button>`).join("")}</div><div id="fb"></div></div>
    <div class="row" id="mchint"><button class="link" id="hint">Подсказка</button></div>
    <div class="row" id="mcnext" hidden><button class="primary" id="mcn">Дальше</button></div>`;
  $("#l-exit").onclick=()=>go("home");
  $("#hint").onclick=()=>{ s.hinted=true; const hn=item.w?item.w:KANA[item.k];
    $("#fb").innerHTML=`<p class="mnem">${item.w? "Звучит как: "+esc(hn.romaji)+(hn.note?" · "+esc(hn.note):"") : esc(hn.note)}</p>`; $("#mchint").hidden=true; };
  el.querySelectorAll(".opt").forEach(b=>b.onclick=()=>{ $("#mchint").hidden=true;
    const ok=b.dataset.o===right;
    el.querySelectorAll(".opt").forEach(x=>{ x.disabled=true; if(x.dataset.o===right) x.classList.add("right"); });
    if(!ok){ b.classList.add("wrong"); s.wrong++; }
    const id = item.w? "wr:"+item.w.front : null;
    if(final && id && !(id in s.first)) s.first[id]= ok?(s.hinted?2:3):1; s.hinted=false;
    const n = item.w? item.w : KANA[item.k];
    $("#fb").innerHTML = `<p class="${ok?"ok":"miss"}">${ok?"Верно":"Правильный ответ подсвечен"}</p>${!ok||item.w?`<p class="mnem">${esc(item.w? item.w.romaji+(item.w.note?" · "+item.w.note:"") : n.note)}</p>`:""}`;
    if(S.settings.audio) speak(item.w? item.w.front : item.k);
    s.q.shift(); if(!ok) s.q.splice(Math.min(s.q.length,2),0,item);
    $("#mcnext").hidden=false; $("#mcn").focus(); $("#mcn").onclick=()=>renderStep();
  });
}
function renderFinalKana(s,el){
  const item=s.q[0], n=KANA[item.k], id="k:"+item.k;
  el.innerHTML=`${lhead()}<p class="eyebrow">Последний шаг: напиши чтение сам · осталось ${s.q.length}</p>
   <div class="card"><div class="kana big" lang="ja">${esc(item.k)}</div><p class="ask">Как читается? Напиши латиницей.</p>${inputField("например ka")}<div id="answer"></div></div>
   <div class="row" id="controls"><button class="primary" id="check">Проверить</button><button class="ghost" id="hint">Подсказка</button><button class="link" id="idk">Не помню</button></div>`;
  $("#l-exit").onclick=()=>go("home");
  const inp=$("#ans"); inp.oninput=()=>$("#preview").textContent=toKana(inp.value,false); inp.focus();
  let hinted=false;
  $("#hint").onclick=()=>{ hinted=true; $("#answer").innerHTML=`<p class="mnem">${esc(n.note)}</p>`; $("#hint").remove(); inp.focus(); };
  const done=(ok)=>{
    if(!(id in s.first)) s.first[id]= ok?(hinted?2:3):1;
    inp.disabled=true;
    $("#answer").innerHTML=`<p class="${ok?"ok":"miss"}">${ok?"Верно":"Вот как:"}</p><div class="sol"><b>${esc(n.romaji)}</b> <span class="muted">${esc(n.ru)}</span></div>${ok?"":`<p class="mnem">${esc(n.note)}</p>`}`;
    if(S.settings.audio) speak(item.k);
    s.q.shift(); if(!ok) s.q.splice(Math.min(s.q.length,3),0,item);
    $("#controls").innerHTML=`<button class="primary" id="mcn">Дальше</button>`; $("#mcn").focus(); $("#mcn").onclick=()=>renderStep();
  };
  $("#check").onclick=()=>{ const v=inp.value.trim(); if(!v) return; done(isRightKana(item.k,v)); };
  inp.onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); $("#check")?.click(); } };
  $("#idk").onclick=()=>done(false);
}
function isRightKana(k,v){ return toKana(v)===k || v.toLowerCase()===KANA[k].romaji; }
function inputField(ph){ return `<label class="field"><span class="sr">Ответ</span><input id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${ph}"><span id="preview" class="preview" lang="ja"></span></label>`; }

/* ---------- повторение ---------- */
function startSession(){
  const p=plan(); const r=p.dueShown.slice(), n=p.news.slice(), q=[];
  while(r.length||n.length){ for(let k=0;k<3&&r.length;k++) q.push({id:r.shift()}); if(n.length) q.push({id:n.shift()}); }
  sess={q,i:0,start:Date.now(),done:0,right:0,asked:false};
  go("session"); next();
}
function next(){
  if(!sess) return;
  if(sess.i>=sess.q.length) return endSession();
  if(!sess.asked && Date.now()-sess.start>S.settings.sessionMin*60000){
    sess.asked=true;
    $("#session").innerHTML=`<div class="pause"><h1>Прошло ${S.settings.sessionMin} минут</h1><p class="sub">Хорошее место, чтобы остановиться. Оставшиеся ${sess.q.length-sess.i} спокойно перейдут на завтра.</p>
      <div class="row"><button class="primary" id="stop">Закончить</button><button class="ghost" id="more">Ещё немного</button></div></div>`;
    $("#stop").onclick=endSession; $("#more").onclick=next; return;
  }
  sess.cur=sess.q[sess.i]; sess.revealed=false; renderReview();
}
function renderReview(){
  const item=sess.cur, {type,n}=noteFor(item.id), isNew=st(item.id).state==="new"&&!item.practice;
  const left=sess.q.length-sess.i;
  const label={k:"чтение знака",kw:"письмо",wr:"слово",wp:"слово по-японски"}[type];
  let prompt, field="", reveal=false;
  if(type==="k"){ prompt=`<div class="kana big" lang="ja">${esc(n.front)}</div><p class="ask">Как читается?</p>`; field=inputField("ромадзи, например ka"); }
  else if(type==="kw"){ prompt=`<div class="ru">${esc(n.romaji)} <span class="muted">${esc(n.ru)}</span></div><p class="ask">Напиши знак по памяти. Черты проверяются сразу.</p><div id="wbox"></div>`; reveal=true; }
  else if(type==="wr"){ prompt=`<div class="kana word" lang="ja">${esc(n.front)}</div><p class="ask">${isNew?"Новое слово: посмотри ответ и запомни.":"Что значит? Вспомни, потом открой."}</p>`; reveal=true; }
  else { prompt=`<div class="ru">${esc(n.ru)}</div><p class="ask">${isNew?"Новое упражнение: напиши слово по-японски (латиница превратится в кану)":"Напиши по-японски"}</p>`; field=inputField("например neko"); }
  $("#session").innerHTML=`<div class="meta"><span>${label}</span><span>${item.practice?"ещё раз · ":""}осталось ${left}</span></div>
    <div class="card">${prompt}${field}<div id="answer"></div></div>
    <div id="controls" class="row">${field?`<button class="primary" id="check">Проверить</button><button class="ghost" id="hint">Подсказка</button><button class="link" id="idk">Не помню</button>`:type==="kw"?`<button class="ghost" id="reveal">Не помню, показать</button>`:`<button class="primary" id="reveal">Показать ответ</button>`}</div>
    <p class="keys">Enter: проверить или принять · 1–4: оценка</p>`;
  sess.hinted=false; sess.wres=null;
  if(type==="kw") makeWriter($("#wbox"),n.front,{guide:false,onDone:r=>{ sess.wres=r; showAnswer(gradeFromWriting(r)>=2?true:false,""); }});
  const inp=$("#ans");
  if($("#hint")) $("#hint").onclick=()=>{ sess.hinted=true; $("#answer").innerHTML=`<p class="mnem">${esc(type==="k"?n.note:"Начинается на "+[...n.front][0]+(n.note?" · "+n.note:""))}</p>`; $("#hint").remove(); inp.focus(); };
  if(inp){ inp.oninput=()=>$("#preview").textContent=toKana(inp.value,false); inp.focus();
    $("#check").onclick=()=>{ const v=inp.value.trim(); if(!v) return;
      const ok = type==="k"? isRightKana(n.front,v) : (toKana(v)===n.front || v.toLowerCase()===n.romaji.toLowerCase());
      showAnswer(ok,v); };
    $("#idk").onclick=()=>showAnswer(false,"");
  } else $("#reveal").onclick=()=>{ if(type==="kw") sess.wres={mistakes:3,hints:0,shown:1}; showAnswer(type==="kw"?false:null,""); };
  if(type==="wr"&&isNew) showAnswer(null,"",true);
}
function showAnswer(ok,typed,preview=false){
  const item=sess.cur, {type,n}=noteFor(item.id);
  let sol;
  if(type==="k") sol=`<div class="sol"><b>${esc(n.romaji)}</b> <span class="muted">(${esc(n.ru)})</span></div>`;
  else if(type==="kw"){ const r=sess.wres||{mistakes:0,hints:0,shown:0}; sol=`<div class="cmp">${strokeSVG(n.front,"strokes small")}</div><p class="muted">Ошибок в чертах: ${r.mistakes}, подсказок: ${r.hints}${r.shown?", черт показано: "+r.shown:""}.</p>`; }
  else if(type==="wr") sol=`<div class="sol"><b>${esc(n.ru)}</b> <span class="muted">${esc(n.romaji)}</span></div>`;
  else sol=`<div class="sol"><span class="kana mid" lang="ja">${esc(n.front)}</span> <span class="muted">${esc(n.romaji)}</span></div>`;
  const verdict= type==="kw"? "" : ok===true?`<p class="ok">Верно${sess.hinted?" (с подсказкой)":""}</p>`: ok===false?`<p class="miss">${typed?`Твой ответ: ${esc(toKana(typed))}. `:""}Ничего страшного: после ошибки правильный ответ держится крепче.</p>`:"";
  $("#answer").innerHTML=`${verdict}${sol}${n.note && (ok!==true||type!=="k")?`<p class="mnem">${esc(n.note)}</p>`:""}${canSpeak()?`<button class="link" id="say">▶ Произношение</button>`:""}`;
  $("#say")?.addEventListener("click",()=>speak(n.front));
  if(type==="kw") animate($("#answer svg"));
  if(S.settings.audio) speak(n.front);
  if($("#ans")) $("#ans").disabled=true;
  sess.revealed=true;
  let sugg= ok===false?1:3; if(ok&&sess.hinted) sugg=2; if(type==="kw"&&sess.wres) sugg=gradeFromWriting(sess.wres);
  const x=st(item.id), now=Date.now();
  $("#controls").innerHTML=["Снова","Трудно","Хорошо","Легко"].map((l,k)=>{ const g=k+1;
    const iv = item.practice? (g===1?"ещё раз":"дальше") : g===1? "ещё раз сегодня" : x.state==="new"? "завтра" : fmtIvl(ivlFor(fsrsNext(x,g,now).s,S.settings.retention));
    return `<button class="grade g${g}${g===sugg?" sugg":""}" data-g="${g}"><span>${l}</span><small>${iv}</small></button>`; }).join("");
  sess.sugg=sugg;
  document.querySelectorAll(".grade").forEach(b=>b.onclick=()=>grade(+b.dataset.g));
}
function grade(g){
  const item=sess.cur;
  if(!item.practice){ gradeCard(item.id,g); sess.done++; if(g>1) sess.right++; }
  if(g===1 && (item.tries||0)<2) sess.q.splice(Math.min(sess.q.length,sess.i+4),0,{id:item.id,practice:true,tries:(item.tries||0)+1});
  sess.i++; next();
}
function endSession(){
  const s=sess; sess=null; if(!s) return go("home");
  const mins=Math.max(1,Math.round((Date.now()-s.start)/60000));
  $("#session").innerHTML=`<div class="pause"><p class="eyebrow">Готово</p><h1>На сегодня с повторением всё</h1>
    <dl class="sum"><div><dt>Карточек</dt><dd>${s.done}</dd></div><div><dt>Вспомнено сразу</dt><dd>${s.done?Math.round(s.right/s.done*100):0}%</dd></div><div><dt>Минут</dt><dd>${mins}</dd></div></dl>
    <p class="sub">${forecastLine()}${!saveOk?" <b>Браузер не дал сохранить прогресс. Сделай копию в настройках.</b>":""}</p>
    <div class="row"><button class="primary" id="home-btn">На главную</button></div></div>`;
  $("#home-btn").onclick=()=>go("home");
}
document.addEventListener("keydown",e=>{
  if(!sess||!sess.cur||document.querySelector('[data-view="session"]').hidden) return;
  if(e.target.tagName==="INPUT" && !e.target.disabled){ if(e.key==="Enter"){ e.preventDefault(); $("#check")?.click(); } return; }
  if(!sess.revealed){ if(noteFor(sess.cur.id).type==="kw") return; if(e.key==="Enter"||e.key===" "){ e.preventDefault(); $("#reveal")?.click(); } return; }
  if(["1","2","3","4"].includes(e.key)) grade(+e.key);
  else if(e.key==="Enter"){ e.preventDefault(); grade(sess.sugg||3); }
});

/* ---------- справочник ---------- */
const GRID=[["あいうえお","か き く け こ".replace(/ /g,""),"さしすせそ","たちつてと","なにぬねの","はひふへほ","まみむめも","や ゆ よ","らりるれろ","わ   を","ん    "],
            ["がぎぐげご","ざじずぜぞ","だぢづでど","ばびぶべぼ","ぱぴぷぺぽ"]];
function renderKana(){
  const cell=k=>{ if(k===" ") return `<span class="cell empty"></span>`; const x=st("k:"+k); const c=x.state==="new"?"n":x.s>=21?"m":"l";
    return `<button class="cell ${c}" data-k="${k}"><span lang="ja">${k}</span><small>${esc(KANA[k].romaji)}</small></button>`; };
  const grid=rows=>rows.map(r=>`<div class="grow">${[...r.padEnd(5," ")].map(cell).join("")}</div>`).join("");
  $("#kana").innerHTML=`<h1>Справочник</h1><p class="sub">Нажми на знак, чтобы увидеть порядок черт, мнемонику и услышать звук. Цвет: <span class="cell-l n">не пройден</span> <span class="cell-l l">учится</span> <span class="cell-l m">закреплён</span></p>
   <div class="row">${sek()?`<button class="ghost" id="k-ph">Фразы из Sekiro</button>`:""}<button class="ghost" id="k-sg">Песни</button></div>
   <div id="detail"></div>
   <section class="panel"><h2>Хирагана</h2><div class="kgrid">${grid(GRID[0])}</div></section>
   <section class="panel"><h2>Звонкие</h2><div class="kgrid">${grid(GRID[1])}</div></section>
   <section class="panel"><h2>Слова</h2><div class="wlist">${words().map(w=>`<div><span lang="ja">${esc(w.front)}</span><span>${esc(w.ru)}</span><small>${esc(w.romaji)}</small></div>`).join("")}</div></section>
   <section class="panel"><h2>Добавить своё слово</h2><p class="muted">Например, из урока Нечаевой${sek()?" или увиденное в Sekiro":""}. Оно придёт в повторениях с ответом при первом показе.</p>
    <form id="addf" class="form">
      <label>Слово (латиницей или каной)<input id="f-jp" required placeholder="tsuki"><span id="f-pv" class="preview" lang="ja"></span></label>
      <label>Перевод<input id="f-ru" required placeholder="луна"></label>
      <label>Заметка, необязательно<input id="f-note" placeholder="${sek()?"Sekiro: 月":"Нечаева, урок 2"}"></label>
      <div class="row"><button class="primary" type="submit">Добавить</button><span id="f-msg" class="muted"></span></div>
    </form></section>
   <p class="muted credit">Порядок черт: <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener">KanjiVG</a>, Ulrich Apel, CC BY-SA 3.0.</p>`;
  document.querySelectorAll(".cell[data-k]").forEach(b=>b.onclick=()=>{ const k=b.dataset.k, n=KANA[k];
    $("#detail").innerHTML=`<section class="panel detail"><div class="meet-glyph">${strokeSVG(k)}</div><div><p class="reading"><b>${esc(n.romaji)}</b> <span class="muted">${esc(n.ru)}</span></p><p class="mnem">${esc(n.note)}</p>
      <div class="row"><button class="link" id="d-re">↻ Порядок черт</button>${canSpeak()?`<button class="link" id="d-say">▶ Звук</button>`:""}<button class="link" id="d-x">Закрыть</button></div></div></section>`;
    const svg=$("#detail svg"); animate(svg); $("#d-re").onclick=()=>animate(svg); $("#d-say")?.addEventListener("click",()=>speak(k)); $("#d-x").onclick=()=>$("#detail").innerHTML="";
    speak(k); $("#detail").scrollIntoView({behavior:"smooth",block:"nearest"}); });
  $("#k-ph")?.addEventListener("click",()=>go("phrases")); $("#k-sg").onclick=()=>go("songs");
  const jp=$("#f-jp"); jp.oninput=()=>$("#f-pv").textContent=toKana(jp.value,false);
  $("#addf").onsubmit=e=>{ e.preventDefault(); const front=toKana(jp.value.trim()); if(!front) return;
    if(words().some(w=>w.front===front)){ $("#f-msg").textContent="Такое слово уже есть."; return; }
    S.custom.push({kind:"word",front,romaji:/[a-z]/i.test(jp.value)?jp.value.trim().toLowerCase():front,ru:$("#f-ru").value.trim(),note:$("#f-note").value.trim()});
    save(); renderKana(); $("#f-msg").textContent="Добавлено: "+front; };
}

/* ---------- прогресс ---------- */
function renderProgress(){
  const now=Date.now(), ids=Object.keys(S.cards), rv=ids.map(i=>S.cards[i]);
  const kIds=ids.filter(i=>i.startsWith("k:")), mastered=kIds.filter(i=>S.cards[i].s>=21).length;
  const month=S.log.filter(l=>l.t>now-30*DAY&&!l.first); const ret=month.length?Math.round(month.filter(l=>l.g>1).length/month.length*100):null;
  const ds=dayStart(now), fc=[]; for(let k=0;k<7;k++){ const a=ds+k*DAY,b=a+DAY; fc.push(rv.filter(x=>k===0?x.due<b:x.due>=a&&x.due<b).length); }
  const mx=Math.max(5,...fc), days=["сегодня","завтра"].concat([2,3,4,5,6].map(k=>new Date(ds+k*DAY).toLocaleDateString("ru-RU",{weekday:"short"})));
  const wr=ids.filter(i=>i.startsWith("wr:")).length;
  $("#progress").innerHTML=`<h1>Прогресс</h1><p class="sub">Только то, что ты знаешь. Счётчика дней подряд нет специально: пропуск дня ничего не ломает.</p>
   <dl class="sum big"><div><dt>Уроков пройдено</dt><dd>${Object.keys(S.lessons).length}<small>/${LESSONS.length}</small></dd></div>
    <div><dt>Знаков изучено</dt><dd>${kIds.length}<small>/71</small></dd></div><div><dt>Закреплено (от 3 недель)</dt><dd>${mastered}</dd></div>
    <div><dt>Слов</dt><dd>${wr}</dd></div><div><dt>Вспоминаешь (30 дней)</dt><dd>${ret===null?"—":ret+"%"}</dd></div></dl>
   ${ret!==null?`<p class="muted">Цель около ${Math.round(S.settings.retention*100)}%. Ниже 80% стоит притормозить с новыми уроками.</p>`:""}
   <section class="panel"><h2>Повторения на неделю вперёд</h2><div class="bars" role="img" aria-label="Прогноз повторений на 7 дней">${fc.map((v,k)=>`<div class="bar"><span class="v">${v}</span><i style="height:${v/mx*100}%"></i><span class="d">${days[k]}</span></div>`).join("")}</div></section>`;
}

/* ---------- настройки ---------- */
function renderOptions(){
  const s=S.settings;
  const who=typeof SYNC!=="undefined"&&SYNC.who();
  $("#options").innerHTML=`<h1>Настройки</h1>${who?`<section class="panel"><h2>Профиль: ${esc(who.title)}</h2><p class="muted">Прогресс сохраняется на сервере и одинаковый на всех устройствах. Сейчас: <span id="sync-st2">${esc(SYNC.status()||"—")}</span>.</p><button class="ghost" id="o-out" type="button">Сменить профиль</button></section>`:""}
  <section class="panel form">
    <label>Новых упражнений в повторениях за день (письмо знаков, слова по-японски) <input type="number" id="o-new" min="0" max="50" value="${s.newPerDay}"></label>
    <label>Максимум повторений за день <input type="number" id="o-max" min="10" max="500" value="${s.maxReviews}"></label>
    <label>Мягкая остановка через, минут <input type="number" id="o-min" min="5" max="120" value="${s.sessionMin}"></label>
    <label>Желаемое запоминание <select id="o-ret">${[0.85,0.88,0.9,0.92,0.95].map(v=>`<option value="${v}" ${v==s.retention?"selected":""}>${Math.round(v*100)}%${v===0.9?" (рекомендуется)":""}</option>`).join("")}</select></label>
    <label class="check"><input type="checkbox" id="o-audio" ${s.audio?"checked":""}> Произносить автоматически</label>
    <label class="check"><input type="checkbox" id="o-write" ${s.writing?"checked":""}> Тренировать письмо знаков по памяти</label>
    <p class="muted">${canSpeak()?(jaVoice?"Японский голос: "+esc(jaVoice.name):"Японский голос в системе не найден, озвучка может звучать странно. На Windows и Mac его можно добавить в языковых настройках."):"Этот браузер не умеет озвучивать текст."} <button class="link" id="o-test" type="button">Проверить: こんにちは</button></p>
    <div class="row"><button class="primary" id="o-save" type="button">Сохранить</button><span id="o-msg" class="muted"></span></div>
  </section>
  <section class="panel"><h2>Резервная копия</h2><p>Прогресс хранится только в этом браузере. Раз в неделю копируй его в заметку или файл.</p>
    <div class="row"><button class="ghost" id="o-exp" type="button">Показать копию</button><button class="ghost" id="o-imp" type="button">Восстановить из копии</button></div>
    <textarea id="o-txt" rows="6" hidden></textarea>
    <div class="row" id="o-improw" hidden><button class="primary" id="o-apply" type="button">Заменить прогресс этой копией</button></div>
    <p id="o-bmsg" class="muted"></p></section>`;
  $("#o-out")?.addEventListener("click",()=>SYNC.logout());
  $("#o-test").onclick=()=>speak("こんにちは");
  $("#o-save").onclick=()=>{ s.newPerDay=+$("#o-new").value||0; s.maxReviews=+$("#o-max").value||80; s.sessionMin=+$("#o-min").value||20; s.retention=+$("#o-ret").value; s.audio=$("#o-audio").checked; s.writing=$("#o-write").checked; S._settingsAt=Date.now(); save(); $("#o-msg").textContent="Сохранено"; };
  const txt=$("#o-txt");
  $("#o-exp").onclick=()=>{ txt.hidden=false; txt.value=JSON.stringify(S); txt.select(); try{ navigator.clipboard.writeText(txt.value).then(()=>$("#o-bmsg").textContent="Скопировано в буфер обмена.",()=>{}); }catch(e){} };
  $("#o-imp").onclick=()=>{ txt.hidden=false; txt.value=""; txt.placeholder="Вставь сюда текст копии"; $("#o-improw").hidden=false; };
  $("#o-apply").onclick=()=>{ try{ const d=JSON.parse(txt.value); if(!d.cards||!d.log) throw 0; S=d; normalize(); save(); $("#o-bmsg").textContent="Прогресс восстановлен."; }catch(e){ $("#o-bmsg").textContent="Это не похоже на копию из приложения: проверь, что текст вставлен целиком."; } };
}

/* ---------- старт ---------- */
function startApp(skipLoad){
  if(!skipLoad) load();
  try{ navigator.storage?.persist?.(); }catch(e){}
  document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>go(b.dataset.go));
  const h0=(location.hash||"").slice(1); go(VIEWS.includes(h0)&&!(h0==="phrases"&&!sek())?h0:"home");
}
if(typeof SYNC!=="undefined") SYNC.boot(); else startApp();
