/* ---------- фразы из Sekiro ---------- */
const PHRASES=[
 {jp:"眠れ、永遠に", kana:"ねむれ、えいえんに", romaji:"nemure, eien ni", ru:"Спи вечно",
  say:"нэмурэ, э:эн ни",
  tip:"えい читается как одно долгое «э:», а ん перед に звучит как «н». Ударения как в русском нет: все слоги ровные, а «у» в нэмурэ почти проглатывается.",
  words:[
   {jp:"眠れ",kana:"ねむれ",romaji:"nemure",ru:"спи! (приказ)",note:"Повелительная форма глагола 眠る (nemuru, спать). Конец -re делает из глагола команду."},
   {jp:"永遠",kana:"えいえん",romaji:"eien",ru:"вечность",note:"えい = долгое «э:». Всё слово: «э:эн»."},
   {jp:"に",kana:"に",romaji:"ni",ru:"в, на (здесь «навечно»)",note:"Частица места и времени. 永遠に = «в вечность», то есть навсегда."}]},
 {jp:"忍殺", kana:"にんさつ", romaji:"ninsatsu", ru:"Убийство синоби: надпись при добивании",
  say:"нинсацу",
  tip:"Надпись появляется на экране при смертельном ударе. Обычно её читают по-китайски: にんさつ. По-японски те же иероглифы можно прочитать しのびごろし (shinobi-goroshi), «убийство по-синобски».",
  words:[
   {jp:"忍",kana:"にん / しのび",romaji:"nin / shinobi",ru:"скрытность, синоби",note:"Тот же знак, что в слове しのび из урока 7."},
   {jp:"殺",kana:"さつ / ころす",romaji:"satsu / korosu",ru:"убивать",note:"В сложных словах ころし часто озвончается: しのび + ころし → しのびごろし."}]},
 {jp:"我が刃に迷いなし", kana:"わがやいばにまよいなし", romaji:"waga yaiba ni mayoi nashi", ru:"Мой клинок не знает сомнений",
  say:"вага яйба ни маёй наси",
  tip:"Книжный, торжественный стиль, как у самурая в фильме. В обычной речи сказали бы 私の刀に迷いはない.",
  words:[
   {jp:"我が",kana:"わが",romaji:"waga",ru:"мой, наш (книжное)",note:"Старинное «мой». わ из строки わ, が — звонкая か."},
   {jp:"刃",kana:"やいば",romaji:"yaiba",ru:"клинок, лезвие",note:"や + い + ば. Поэтичное слово для меча."},
   {jp:"に",kana:"に",romaji:"ni",ru:"в",note:"«В моём клинке…»"},
   {jp:"迷い",kana:"まよい",romaji:"mayoi",ru:"сомнение, колебание",note:"От глагола 迷う (mayou, сомневаться, блуждать)."},
   {jp:"なし",kana:"なし",romaji:"nashi",ru:"нет, отсутствует",note:"Книжная форма «нет». Современная: ない."}]}
];
function knownKana(){ const s=new Set(); for(const id in S.cards) if(id.startsWith("k:")) s.add(id.slice(2)); return s; }
function kanaSpans(str,known){ return [...str].map(c=>KANA[c]?`<span class="kc${known.has(c)?" known":""}"><b lang="ja">${c}</b><small>${esc(KANA[c].romaji)}</small></span>`:(c==="、"?`<span class="kc sep"><b lang="ja">、</b><small>пауза</small></span>`:c===" "||c==="/"?`<span class="kc sep"><b>/</b><small>или</small></span>`:"")).join(""); }
function renderPhrases(){
  const known=knownKana(), voiceNote = !canSpeak()? "Этот браузер не умеет озвучивать текст. Попробуй Chrome, Edge или Safari."
    : jaVoice? "" : `Японский голос в системе не найден, поэтому озвучка может звучать по-английски или молчать. Как добавить: на Android — Настройки → Синтез речи → Google → установить японский; на iPhone — Настройки → Универсальный доступ → Устное содержимое → Голоса → японский; на Windows — Параметры → Время и язык → Речь → добавить японский.`;
  $("#phrases").innerHTML=`<p><button class="link" id="ph-back">← назад</button></p><h1>Sekiro</h1><div id="skbox"></div><h2 class="ph-h">Фразы</h2>
   <p class="sub">Чтобы уже сейчас было что сказать. Слушай по слогам, потом медленно по словам, потом в обычном темпе и повторяй вслух вслед за голосом: это называется шэдоуинг. Знаки, которые ты уже прошёл, подсвечены.</p>
   ${voiceNote?`<p class="note">${voiceNote}</p>`:""}
   ${PHRASES.map((p,i)=>`<section class="panel phrase">
     <div class="ph-top"><div class="kana word" lang="ja">${esc(p.jp)}</div>
       <div class="row"><button class="ghost play" data-p="${i}" data-m="syl">▶ По слогам</button><button class="ghost play" data-p="${i}" data-m="slow">▶ Медленно</button><button class="ghost play" data-p="${i}" data-m="norm">▶ Обычно</button></div></div>
     <p class="ph-ru"><b>${esc(p.ru)}</b></p>
     <p class="ph-say">Звучит примерно: <b>${esc(p.say)}</b> <span class="muted">· ${esc(p.romaji)}</span></p>
     <div class="kanarow">${kanaSpans(p.kana,known)}</div>
     <p class="muted">${esc(p.tip)}</p>
     <h3>По словам</h3>
     <div class="wbd">${p.words.map((w,j)=>`<div class="wb"><button class="link play" data-w="${i}.${j}" aria-label="Послушать ${esc(w.kana)}">▶</button>
        <span class="wjp" lang="ja">${esc(w.jp)}</span><span><b lang="ja">${esc(w.kana)}</b> <span class="muted">${esc(w.romaji)}</span><br>${esc(w.ru)}<br><small class="muted">${esc(w.note)}</small></span></div>`).join("")}</div>
   </section>`).join("")}
   <p class="muted">Иероглифы пока учить не нужно: достаточно узнавать их в игре и знать, как фраза звучит. Каждый новый урок хираганы подсветит здесь ещё больше знаков.</p>`;
  renderSekiroKanji($("#skbox"));
  $("#ph-back").onclick=()=>history.length>1?go(prevView||"home"):go("home");
  document.querySelectorAll(".play").forEach(b=>b.onclick=()=>{
    if(b.dataset.p!==undefined){ const p=PHRASES[+b.dataset.p], m=b.dataset.m;
      if(m==="norm") speak(p.kana,1);
      else if(m==="slow") speakSeq(p.words.map(w=>w.kana.split(" / ")[0]),0.6,700);
      else speakSeq(morae(p.kana),0.7,350); }
    else { const [i,j]=b.dataset.w.split(".").map(Number); speak(PHRASES[i].words[j].kana.split(" / ")[0],0.7); } });
}
