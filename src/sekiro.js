/* ---------- иероглифы с экрана Sekiro (только профиль с Sekiro) ---------- */
const SK=[
 {jp:"危",kana:"き",ru:"опасность",where:"Красный знак над врагом перед атакой, которую нельзя отбить блоком.",
  tip:"Увидел 危 — сразу смотри на движение врага. Удар понизу (подсечка) — прыгай. Выпад вперёд (тычок) — Микири: рывок навстречу. Захват — уходи рывком в сторону или назад. Отдельно от этого: 危ない (あぶない) — «опасно!»",key:true},
 {jp:"死",kana:"し",ru:"смерть",where:"Огромный знак на экране, когда Волк погибает.",tip:"Тот же знак в 死ぬ (しぬ, умирать). После него решаешь: воскреснуть (回生) или умереть по-настоящему.",key:true},
 {jp:"忍殺",kana:"にんさつ",ru:"убийство синоби, добивание",where:"Надпись при смертельном ударе по боссу или сильному врагу.",tip:"忍 — синоби, скрытность; 殺 — убивать. По-японски можно прочитать и しのびごろし.",key:true},
 {jp:"回生",kana:"かいせい",ru:"воскрешение",where:"Появляется, когда Волк встаёт после смерти.",tip:"回 — круг, возврат; 生 — жизнь. Буквально «возвращённая жизнь».",key:true},
 {jp:"冥助",kana:"めいじょ",ru:"незримая помощь (Unseen Aid)",where:"Пишется после смерти, если сен и опыт не потерялись.",tip:"冥 — потусторонний, тёмный; 助 — помощь. Чем сильнее 竜咳 (драконья хворь), тем реже срабатывает.",key:true},
 {jp:"竜咳",kana:"りゅうがい",ru:"драконья хворь (Dragonrot)",where:"Болезнь у NPC, которая растёт от твоих воскрешений.",tip:"竜 — дракон; 咳 — кашель. Буквально «драконий кашель»."},
 {jp:"体幹",kana:"たいかん",ru:"стойка, равновесие (Posture)",where:"Жёлтая полоска над врагом и над тобой.",tip:"Когда шкала 体幹 врага полная, можно сделать 忍殺. Сбивай её отражениями ударов."},
 {jp:"弾き",kana:"はじき",ru:"отражение удара (Deflect)",where:"Блок в последний момент, со звонким звуком и искрами.",tip:"От глагола 弾く (はじく, отбивать, щёлкать)."},
 {jp:"見切り",kana:"みきり",ru:"Микири, контратака",where:"Приём против выпада (危 + тычок).",tip:"見 — смотреть; 切り — разрез. Буквально «разглядеть и разрезать»."},
 {jp:"鬼仏",kana:"きぶつ",ru:"статуя-чекпоинт (Sculptor's Idol)",where:"Место отдыха, телепорта и улучшений.",tip:"鬼 — демон, дух; 仏 — Будда. «Демонический Будда»."},
 {jp:"形代",kana:"かたしろ",ru:"эмблема духа (Spirit Emblem)",where:"Тратится на приёмы протеза и боевые искусства.",tip:"形 — форма; 代 — замена. В синтоизме так называют бумажную фигурку-заместителя."},
 {jp:"銭",kana:"ぜに",ru:"деньги, сен",where:"Валюта в магазинах.",tip:"Слово ぜに ты уже учил на седьмой день."},
 {jp:"傷瓢箪",kana:"きずびょうたん",ru:"лечебная тыква (Healing Gourd)",where:"Фляга, которая восстанавливает здоровье.",tip:"傷 — рана; 瓢箪 — тыква-горлянка. Буквально «тыква от ран»."},
 {jp:"忍義手",kana:"しのびぎしゅ",ru:"протез синоби",where:"Левая рука Волка с инструментами.",tip:"忍 — синоби; 義手 — протез руки (義 — замещающий, 手 — рука)."},
 {jp:"葦名",kana:"あしな",ru:"Асина: клан и край",where:"Названия локаций: 葦名城 — замок Асина.",tip:"葦 — тростник; 名 — имя. Слово あしな было на седьмой день."},
 {jp:"隻狼",kana:"せきろう",ru:"Однорукий волк, название игры",where:"Логотип игры.",tip:"隻 — один из пары; 狼 — волк."}
];
const skBy=f=>SK.find(x=>x.jp===f);
function skDetail(x){
  return `<div class="skchars">${[...x.jp].filter(c=>STROKES[c]).map(c=>`<div class="skc">${strokeSVG(c,"strokes small")}<small lang="ja">${c}</small></div>`).join("")}</div>`;
}
function renderSekiroKanji(box){
  const on=!!S.settings.sekiroKanji;
  box.innerHTML=`<section class="panel"><h2>Иероглифы на экране</h2>
    <p class="muted">Всё, что игра пишет крупно: 危 перед опасной атакой, 死 при смерти, 忍殺 при добивании и другое. Нажми на знак: порядок черт, чтение, где встречается и что делать.</p>
    <div class="skgrid">${SK.map((x,i)=>`<button class="skb${x.key?" key":""}" data-sk="${i}"><span lang="ja">${esc(x.jp)}</span><small>${esc(x.ru.split(",")[0])}</small></button>`).join("")}</div>
    <div id="skd"></div>
    <p class="row"><button class="${on?"ghost":"primary"}" id="sk-on" type="button">${on?"Убрать из повторений":"Учить в повторениях"}</button><span class="muted">${on?"Добавляются по 3 новых в день, сначала самые важные.":"Знаки будут приходить в повторения по 3 новых в день."}</span></p>
  </section>`;
  box.querySelectorAll("[data-sk]").forEach(b=>b.onclick=()=>{ const x=SK[+b.dataset.sk];
    $("#skd").innerHTML=`<div class="skdet"><div class="kana word" lang="ja">${esc(x.jp)}</div>
      <p class="ph-ru"><b>${esc(x.ru)}</b></p><p><b lang="ja">${esc(x.kana)}</b> <span class="muted">${esc(toRomaji(x.kana))}</span> ${canSpeak()?`<button class="link" id="sk-say">▶ Звук</button>`:""}</p>
      <p><span class="muted">Где:</span> ${esc(x.where)}</p><p class="mnem">${esc(x.tip)}</p>${skDetail(x)}
      <div class="row"><button class="link" id="sk-re">↻ Порядок черт</button><button class="link" id="sk-w">Попробовать написать</button></div><div id="sk-wbox"></div></div>`;
    const anim=()=>$("#skd").querySelectorAll("svg.strokes").forEach(animate); anim();
    $("#sk-re").onclick=anim; $("#sk-say")?.addEventListener("click",()=>speak(x.kana,0.8)); speak(x.kana,0.8);
    $("#sk-w").onclick=()=>{ const cs=[...x.jp].filter(c=>STROKES[c]); let i=0; const box2=$("#sk-wbox");
      const nextC=()=>{ if(i>=cs.length){ box2.insertAdjacentHTML("beforeend",`<p class="ok">Готово!</p>`); return; }
        const c=cs[i++]; const d=document.createElement("div"); box2.innerHTML=""; box2.appendChild(d); makeWriter(d,c,{guide:true,onDone:()=>setTimeout(nextC,900)}); };
      nextC(); };
    $("#skd").scrollIntoView({behavior:"smooth",block:"nearest"}); });
  $("#sk-on").onclick=()=>{ S.settings.sekiroKanji=!on; S._settingsAt=Date.now(); save(); renderSekiroKanji(box); };
}
