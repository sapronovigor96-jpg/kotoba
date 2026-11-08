/* ---------- песни ---------- */
const K2R=(()=>{ const m={}; for(const r in R2K){ const k=R2K[r]; if(!m[k]||r.length<m[k].length&&!["si","ti","tu","hu","zi","di","du"].includes(r)) m[k]=r; }
  Object.assign(m,{"し":"shi","ち":"chi","つ":"tsu","ふ":"fu","じ":"ji","ぢ":"ji","づ":"zu","を":"o","しゃ":"sha","しゅ":"shu","しょ":"sho","ちゃ":"cha","ちゅ":"chu","ちょ":"cho","じゃ":"ja","じゅ":"ju","じょ":"jo","ん":"n","ゃ":"ya","ゅ":"yu","ょ":"yo","ぁ":"a","ぃ":"i","ぅ":"u","ぇ":"e","ぉ":"o","ゎ":"wa"}); return m; })();
const kata2hira=s=>s.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
function toRomaji(str){
  const s=kata2hira(str); let out="", i=0;
  while(i<s.length){
    const c=s[i], two=s.substr(i,2);
    if(c==="っ"){ const nx=toRomaji(s[i+1]||""); out+=nx?nx[0]:""; i++; continue; }
    if(c==="ー"){ const v=out.match(/[aiueo]$/); out+=v?v[0]:"-"; i++; continue; }
    if(K2R[two]&&/[ゃゅょ]/.test(two[1])){ out+=K2R[two]; i+=2; continue; }
    if(K2R[c]){ out+=K2R[c]; i++; continue; }
    out+=c; i++;
  }
  return out;
}
const isKanaOnly=s=>/^[぀-ヿー、。！？\s!?…・「」]+$/.test(s);
const SONG={title:"真夜中のドア〜stay with me", kana:"まよなかのドア", artist:"松原みき (Мики Мацубара), 1979",
  about:"Японский сити-поп конца семидесятых. В 2020 году песня снова стала хитом по всему миру благодаря TikTok и YouTube.",
  words:[
    {jp:"真夜中",kana:"まよなか",ru:"полночь, глубокая ночь",note:"真 (ま) — «самый, истинный» + 夜中 (よなか) — «середина ночи». Все знаки ты уже знаешь или скоро пройдёшь: ま, よ, な, か."},
    {jp:"の",kana:"の",ru:"частица «чей, какой»",note:"Связывает два слова: 真夜中のドア = «дверь полуночи», «полуночная дверь». Самая частая частица в песнях."},
    {jp:"ドア",kana:"ドア",ru:"дверь",note:"Катакана: так пишут слова из английского (door). ド = звонкая と, ア = あ. Катакану пройдём на второй неделе."},
    {jp:"stay with me",kana:"ステイ・ウィズ・ミー",ru:"останься со мной",note:"Припев поют по-английски, но с японским произношением: «сутэи уизу ми:». Хороший пример, как японцы произносят английский."}],
  tips:["Сначала просто слушай песню несколько раз и лови знакомые слова: まよなか, の, ドア.","Найди текст с фуриганой или каной (например, на сайтах с текстами песен) и вставь его ниже: приложение разобьёт его на строки с латиницей и озвучкой.","Учи по одной строке: послушай в приложении по слогам, потом подпевай под запись. Это тот же шэдоуинг, только под музыку.","Незнакомые слова добавляй в «Справочник → Добавить своё слово», и они придут в повторения."]};
const LKEY="kotoba-lyrics-v1";
function loadLyrics(){ let d=S.lyrics; if(!d){ try{ d=JSON.parse(localStorage.getItem(LKEY)); }catch(e){} } d=d||{}; d.text=d.text||""; d.notes=d.notes||{}; d.gloss=d.gloss||{}; d.hidden=d.hidden||[]; return d; }
function saveLyrics(d){ S.lyrics=d; S._lyricsAt=Date.now(); save(); }
/* разборщик: kuromoji + словарь IPADIC, грузится один раз */
let tokP=null;
function getTokenizer(){
  if(!tokP) tokP=new Promise((res,rej)=>{ try{ (self.KUROMOJI_SUFFIX=".wasm", kuromoji.builder({dicPath:"dict/"})).build((e,t)=>e?rej(e):res(t)); }catch(e){ rej(e); } });
  return tokP;
}
const hasKanji=s=>/[一-鿿々]/.test(s);
const isLatin=s=>/^[\x00-\x7F’'“”\s]+$/.test(s);
function analyze(t,line){
  let ts=t.tokenize(line).filter(x=>x.pos!=="記号").map(x=>({surf:x.surface_form,read:kata2hira(x.reading&&x.reading!=="*"?x.reading:x.surface_form),pron:kata2hira(x.pronunciation&&x.pronunciation!=="*"?x.pronunciation:x.surface_form),base:x.basic_form==="*"?x.surface_form:x.basic_form,pos:x.pos,pos1:x.pos_detail_1}));
  for(let i=0;i<ts.length-1;i++) for(const [a,b,r,base] of MERGE){
    const x=ts[i], y=ts[i+1];
    if(x.surf===a&&(y.surf===b||y.base===b)){
      const read=r&&y.surf===b? r : x.read+y.read, pron=r&&y.surf===b? r : x.pron+y.pron;
      ts.splice(i,2,{surf:x.surf+y.surf,read,pron,base,pos:y.pos==="動詞"?"動詞":"名詞",pos1:""}); break; } }
  // группы: смысловое слово + прицепленные окончания
  const groups=[];
  for(const x of ts){
    const gram = x.pos==="助動詞" || (x.pos==="動詞"&&x.pos1==="非自立") || (x.pos==="動詞"&&x.pos1==="接尾") || (x.pos==="助詞"&&["接続助詞"].includes(x.pos1)&&groups.length&&["動詞","形容詞","助動詞"].includes(groups[groups.length-1].main.pos)) || (x.pos==="名詞"&&x.pos1==="接尾"&&groups.length);
    if(gram&&groups.length){ groups[groups.length-1].parts.push(x); }
    else groups.push({main:x,parts:[x]});
  }
  return groups;
}
function rubyHTML(surf,read){
  if(!hasKanji(surf)||surf===read) return esc(surf);
  let i=0; while(i<surf.length&&i<read.length&&surf[surf.length-1-i]===read[read.length-1-i]&&!hasKanji(surf[surf.length-1-i])) i++;
  const core=surf.slice(0,surf.length-i), rc=read.slice(0,read.length-i), tail=surf.slice(surf.length-i);
  return `<ruby>${esc(core)}<rt>${esc(rc)}</rt></ruby>${esc(tail)}`;
}
function meaningOf(x,d){ return d.gloss[x.base]||GLOSS[x.base]||GLOSS[x.surf]||(["助詞","助動詞"].includes(x.pos)||x.pos1==="非自立"||x.pos1==="接尾"?GRAM[x.base]||GRAM[x.surf]:"")||""; }
function renderSongs(){
  const d=loadLyrics(), known=knownKana(), s=SONG;
  const raw=d.text.split(/\n/).map(x=>x.trim()).filter(Boolean);
  const seen=new Map(); const items=[];
  raw.forEach(ln=>{ if(/^\[.*\]$/.test(ln)){ items.push({h:ln.slice(1,-1)}); return; }
    const clean=ln.replace(/\((?:[A-Za-z ,'’]+)\)/g,"").trim(); if(!clean||d.hidden.includes(clean)) return;
    if(seen.has(clean)){ seen.get(clean).n++; return; } const it={ln:clean,n:1}; seen.set(clean,it); items.push(it); });
  const lines=items.filter(x=>x.ln);
  $("#songs").innerHTML=`<p><button class="link" id="sg-back">← назад</button></p><h1>Песни</h1>
   <p class="sub">Учим песню по словам и строкам. Полный текст песни я в приложение не вкладываю: он защищён авторским правом. Ты вставляешь его сам, и он хранится только у тебя.</p>
   <section class="panel phrase"><p class="eyebrow">${esc(s.artist)}</p>
     <div class="ph-top"><div class="kana word" lang="ja">${esc(s.title)}</div>
     <div class="row"><button class="ghost" id="sg-syl">▶ По слогам</button><button class="ghost" id="sg-norm">▶ Обычно</button></div></div>
     <p class="ph-say">Звучит: <b>«маёнака но доа»</b> <span class="muted">· mayonaka no doa</span></p>
     <p class="muted">${esc(s.about)}</p>
     <details><summary>Слова из названия и как учить песню</summary>
     <div class="wbd">${s.words.map((w,j)=>`<div class="wb"><button class="link play" data-sw="${j}" aria-label="Послушать">▶</button><span class="wjp" lang="ja">${esc(w.jp)}</span><span><b lang="ja">${esc(w.kana)}</b> <span class="muted">${esc(toRomaji(w.kana))}</span><br>${esc(w.ru)}<br><small class="muted">${esc(w.note)}</small></span></div>`).join("")}</div>
     <ul class="tasks">${s.tips.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></details>
   </section>
   <section class="panel"><h2>Текст песни</h2>
     <p class="muted">Вставь текст как есть, с иероглифами: приложение само подпишет чтения, разобьёт строки на слова и объяснит их. Повторы припева покажутся один раз. Метки вроде [Chorus] станут заголовками.</p>
     <textarea id="ly-txt" rows="${lines.length?3:8}" placeholder="Вставь сюда текст песни" lang="ja">${esc(d.text)}</textarea>
     <div class="row"><button class="primary" id="ly-save" type="button">Разобрать</button>${raw.length?`<button class="link" id="ly-clear" type="button">Очистить</button>`:""}${d.hidden.length?`<button class="link" id="ly-unhide" type="button">Вернуть скрытые строки (${d.hidden.length})</button>`:""}</div>
     <p id="ly-status" class="muted"></p>
   </section>
   <div id="ly-out"></div>
   <p class="muted credit">Разбор текста: kuromoji.js и словарь IPADIC (Apache 2.0).</p>`;
  $("#sg-back").onclick=()=>go(prevView&&prevView!=="songs"?prevView:"home");
  $("#sg-syl").onclick=()=>speakSeq(morae(s.kana),0.7,350);
  $("#sg-norm").onclick=()=>speak("まよなかのドア",1);
  document.querySelectorAll("[data-sw]").forEach(b=>b.onclick=()=>speak(s.words[+b.dataset.sw].kana,0.8));
  $("#ly-save").onclick=()=>{ d.text=$("#ly-txt").value; saveLyrics(d); renderSongs(); };
  $("#ly-clear")?.addEventListener("click",()=>{ d.text=""; d.hidden=[]; saveLyrics(d); renderSongs(); });
  $("#ly-unhide")?.addEventListener("click",()=>{ d.hidden=[]; saveLyrics(d); renderSongs(); });
  if(!lines.length) return;
  $("#ly-status").textContent="Загружаю японский словарь (около 18 МБ, только в первый раз)…";
  const t0=setTimeout(()=>{ if($("#ly-status")) $("#ly-status").textContent+=" Это может занять до минуты на телефоне."; },6000);
  getTokenizer().then(t=>{ clearTimeout(t0); if(!$("#ly-status")) return; $("#ly-status").textContent=""; renderLyrics(t,items,d); })
   .catch(()=>{ clearTimeout(t0); $("#ly-status").textContent="Словарь не загрузился. Разбор работает в версии по ссылке (не в скачанном файле). Проверь интернет и обнови страницу."; });
}
function renderLyrics(t,items,d){
  const out=$("#ly-out"); const data=[];
  out.innerHTML=items.map((it,i)=>{
    if(it.h) return `<h3 class="lyh">${esc(it.h)}</h3>`;
    if(isLatin(it.ln)){ data[i]={en:true}; return `<div class="lyl en"><p class="lyjp">${esc(it.ln)}${it.n>1?` <span class="rep">×${it.n}</span>`:""}</p><p class="lyro">по-английски</p><div class="row"><button class="link" data-l="${i}" data-m="norm">▶ Послушать</button><button class="link" data-hide="${i}">скрыть</button></div></div>`; }
    const g=analyze(t,it.ln); const pron=g.map(x=>x.parts.map(p=>p.pron).join("")); data[i]={g,pron};
    return `<div class="lyl"><p class="lyjp" lang="ja">${g.map(x=>x.parts.map(p=>rubyHTML(p.surf,p.read)).join("")).join(" ")}${it.n>1?` <span class="rep">×${it.n}</span>`:""}</p>
      <p class="lyro">${esc(toRomaji(pron.join(" ")))}</p>
      <div class="row"><button class="link" data-l="${i}" data-m="syl">▶ По слогам</button><button class="link" data-l="${i}" data-m="slow">▶ По словам</button><button class="link" data-l="${i}" data-m="norm">▶ Обычно</button><button class="link" data-open="${i}">Разбор</button><button class="link" data-hide="${i}">скрыть</button></div>
      <div class="lybd" id="bd-${i}" hidden></div>
      <label class="lynote"><span class="sr">Перевод строки</span><input data-note="${i}" placeholder="мой перевод строки" value="${esc(d.notes[it.ln]||"")}"></label></div>`;
  }).join("");
  out.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>{ const i=+b.dataset.l, x=data[i], m=b.dataset.m;
    if(x.en){ try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(items[i].ln); u.lang="en-US"; speechSynthesis.speak(u); }catch(e){} return; }
    if(m==="norm") speak(x.pron.join(""),1); else if(m==="slow") speakSeq(x.pron,0.65,550); else speakSeq(morae(x.pron.join("")),0.7,300); });
  out.querySelectorAll("[data-hide]").forEach(b=>b.onclick=()=>{ d.hidden.push(items[+b.dataset.hide].ln); saveLyrics(d); renderSongs(); });
  out.querySelectorAll("[data-note]").forEach(inp=>inp.onchange=()=>{ d.notes[items[+inp.dataset.note].ln]=inp.value; saveLyrics(d); });
  out.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{ const i=+b.dataset.open, box=$("#bd-"+i);
    if(!box.hidden){ box.hidden=true; return; } box.hidden=false; renderBreakdown(box,data[i].g,d); });
}
function renderBreakdown(box,g,d){
  box.innerHTML=g.map((x,j)=>{ const m=x.main, word=x.parts.map(p=>p.surf).join(""), read=x.parts.map(p=>p.read).join(""), pron=x.parts.map(p=>p.pron).join("");
    const mean=meaningOf(m,d); const extra=x.parts.slice(1).map(p=>{ const gm=GRAM[p.base]||GRAM[p.surf]||meaningOf(p,d); return gm?`<li><b lang="ja">${esc(p.surf)}</b> — ${esc(gm)}</li>`:""; }).join("");
    return `<div class="wb"><button class="link play" data-pp="${esc(pron)}" aria-label="Послушать">▶</button>
      <span class="wjp" lang="ja">${rubyHTML(word,read)}</span>
      <span><b lang="ja">${esc(read)}</b> <span class="muted">${esc(toRomaji(pron))}</span>${m.base!==m.surf?` <span class="muted">· словарная форма ${esc(m.base)}</span>`:""}<br>
      ${mean?esc(mean):`<span class="muted">Нет в моём словаре.</span>`} <small class="muted">${esc(POS[m.pos]||"")}</small>
      ${extra?`<ul class="gram">${extra}</ul>`:""}
      <span class="row"><button class="link" data-own="${j}">${d.gloss[m.base]?"изменить перевод":mean?"свой перевод":"добавить перевод"}</button>${["名詞","動詞","形容詞","副詞"].includes(m.pos)?`<button class="link" data-srs="${j}">в повторения</button>`:""}</span></span></div>`; }).join("");
  box.querySelectorAll("[data-pp]").forEach(b=>b.onclick=()=>speak(b.dataset.pp,0.8));
  box.querySelectorAll("[data-own]").forEach(b=>b.onclick=()=>{ const m=g[+b.dataset.own].main;
    const f=document.createElement("span"); f.className="ownf"; f.innerHTML=`<input value="${esc(d.gloss[m.base]||meaningOf(m,d))}" aria-label="Перевод слова"><button class="link">сохранить</button>`;
    b.replaceWith(f); const inp=f.querySelector("input"); inp.focus(); f.querySelector("button").onclick=()=>{ d.gloss[m.base]=inp.value.trim(); saveLyrics(d); renderBreakdown(box,g,d); }; });
  box.querySelectorAll("[data-srs]").forEach(b=>b.onclick=()=>{ const x=g[+b.dataset.srs], m=x.main;
    const baseRead = m.base===m.surf? x.parts[0].read : (kata2hira(m.base)===m.base? m.base : x.parts[0].read);
    const front = hasKanji(m.base)? (m.base===m.surf? x.parts[0].read : baseRead) : m.base;
    if(words().some(w=>w.front===front)){ b.textContent="уже в повторениях"; return; }
    S.custom.push({kind:"word",front,romaji:toRomaji(front),ru:meaningOf(m,d)||"(без перевода)",note:hasKanji(m.base)?m.base:""}); save(); b.textContent="добавлено"; b.disabled=true; });
}
