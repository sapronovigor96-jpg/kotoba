/* ---------- профили и синхронизация (веб-версия) ---------- */
const PROFILES={igor:{name:"igor",title:"Игорь",sekiro:true},masha:{name:"masha",title:"Маша",sekiro:false}};
const AUTHKEY="kotoba-auth";
const SYNC=(()=>{
  let auth=null, timer=null, busy=false, again=false, status="";
  const setStatus=t=>{ status=t; ["sync-st","sync-st2"].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=t; }); };
  async function rpc(fn,body){
    const r=await fetch(`${SUPA.url}/rest/v1/rpc/${fn}`,{method:"POST",headers:{"apikey":SUPA.key,"Content-Type":"application/json"},body:JSON.stringify(body)});
    const txt=await r.text(); let j=null; try{ j=JSON.parse(txt); }catch(e){}
    if(!r.ok) throw new Error((j&&j.message)||txt||("HTTP "+r.status));
    return j;
  }
  // слияние двух копий прогресса: по каждой карточке берём более свежую
  function merge(a,b){
    if(!a||!a.cards) return b; if(!b||!b.cards) return a;
    const out=JSON.parse(JSON.stringify(b));
    for(const id in a.cards){ const x=a.cards[id], y=out.cards[id]; if(!y||(x.last||0)>(y.last||0)) out.cards[id]=x; }
    const seen=new Set(out.log.map(l=>l.t+"|"+l.id)); for(const l of a.log||[]) if(!seen.has(l.t+"|"+l.id)) out.log.push(l);
    out.log.sort((p,q)=>p.t-q.t);
    out.lessons=Object.assign({},a.lessons||{},out.lessons||{});
    const fr=new Set((out.custom||[]).map(c=>c.front)); out.custom=(out.custom||[]).concat((a.custom||[]).filter(c=>!fr.has(c.front)));
    if((a._settingsAt||0)>(out._settingsAt||0)){ out.settings=a.settings; out._settingsAt=a._settingsAt; }
    if((a._lyricsAt||0)>(out._lyricsAt||0)){ out.lyrics=a.lyrics; out._lyricsAt=a._lyricsAt; }
    return out;
  }
  async function pull(){
    const r=await rpc("kotoba_login",{p_name:auth.name,p_pin:auth.pin});
    const server=r&&r.data&&r.data.cards?r.data:null;
    S=merge(S,server)||S; normalize(); try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){}
    return server;
  }
  async function flush(){
    if(!auth) return; if(busy){ again=true; return; } busy=true;
    try{ setStatus("сохраняю…"); await rpc("kotoba_save",{p_name:auth.name,p_pin:auth.pin,p_data:S}); setStatus("сохранено"); }
    catch(e){ setStatus(navigator.onLine===false?"нет сети, сохраню позже":"не сохранилось, попробую ещё"); clearTimeout(timer); timer=setTimeout(flush,15000); }
    finally{ busy=false; if(again){ again=false; push(); } }
  }
  function push(){ if(!auth) return; clearTimeout(timer); timer=setTimeout(flush,1200); }
  function loginScreen(msg){
    document.querySelector(".wrap").hidden=true;
    let box=document.getElementById("login"); if(!box){ box=document.createElement("div"); box.id="login"; document.body.appendChild(box); }
    const last=(()=>{ try{ return JSON.parse(localStorage.getItem(AUTHKEY)||"null"); }catch(e){ return null; } })();
    box.innerHTML=`<div class="login-in"><div class="brand">言葉散歩 <small>Котоба Сампо</small></div><h1>Кто учится?</h1>
      <div class="who">${Object.values(PROFILES).map(p=>`<button class="ghost who-b" data-p="${p.name}" aria-pressed="${last&&last.name===p.name}">${p.title}</button>`).join("")}</div>
      <label class="pinl" for="pin">PIN-код, от 4 цифр</label>
      <input id="pin" type="password" inputmode="numeric" autocomplete="current-password" minlength="4" placeholder="••••">
      <p class="muted">При первом входе PIN запоминается. Потом он нужен на каждом новом телефоне или компьютере.</p>
      <button class="primary" id="go-in">Войти</button><p id="login-msg" class="miss">${msg||""}</p></div>`;
    let pick=last&&last.name;
    box.querySelectorAll(".who-b").forEach(b=>b.onclick=()=>{ pick=b.dataset.p; box.querySelectorAll(".who-b").forEach(x=>x.setAttribute("aria-pressed",x===b)); document.getElementById("pin").focus(); });
    const go_=async()=>{ const pin=document.getElementById("pin").value.trim(), m=document.getElementById("login-msg");
      if(!pick){ m.textContent="Выбери профиль."; return; } if(pin.length<4){ m.textContent="PIN должен быть не короче 4 цифр."; return; }
      m.textContent=""; document.getElementById("go-in").disabled=true;
      try{ await enter({name:pick,pin}); }catch(e){ document.getElementById("go-in").disabled=false;
        m.textContent=/wrong pin/.test(e.message)?"PIN не подходит.":/Failed to fetch|NetworkError/i.test(e.message)?"Нет связи с сервером. Проверь интернет.":"Не получилось войти: "+e.message; } };
    document.getElementById("go-in").onclick=go_;
    document.getElementById("pin").onkeydown=e=>{ if(e.key==="Enter") go_(); };
  }
  async function enter(a){
    applyProfile(PROFILES[a.name]); KEY="kotoba-sanpo-v2-"+a.name; load();
    auth=a;
    try{ await pull(); }catch(e){ auth=null; throw e; }
    try{ localStorage.setItem(AUTHKEY,JSON.stringify(a)); }catch(e){}
    document.getElementById("login")?.remove(); document.querySelector(".wrap").hidden=false;
    started? go("home") : startOnce(); const ws=document.getElementById("who-st"); if(ws) ws.textContent=PROFILES[a.name].title;
    push();
  }
  let started=false;
  function startOnce(){ started=true; startApp(true); }
  async function boot(){
    let a=null; try{ a=JSON.parse(localStorage.getItem(AUTHKEY)||"null"); }catch(e){}
    if(!a){ loginScreen(); return; }
    // сразу показываем локальную копию, потом подтягиваем сервер
    applyProfile(PROFILES[a.name]); KEY="kotoba-sanpo-v2-"+a.name; load(); auth=a; startOnce(); const ws=document.getElementById("who-st"); if(ws) ws.textContent=PROFILES[a.name].title;
    try{ await pull(); setStatus("синхронизировано"); if(!sess&&!L) go(curView); }
    catch(e){ if(/wrong pin/.test(e.message)){ auth=null; try{ localStorage.removeItem(AUTHKEY); }catch(_){} loginScreen("PIN изменился, войди заново."); } else setStatus("нет сети, работаю офлайн"); }
  }
  document.addEventListener("visibilitychange",async()=>{
    if(!auth) return;
    if(document.visibilityState==="hidden"){ clearTimeout(timer); flush(); return; }
    try{ await pull(); setStatus("синхронизировано"); if(!sess&&!L) go(curView); }catch(e){}
  });
  function logout(){ flush(); auth=null; try{ localStorage.removeItem(AUTHKEY); }catch(e){} loginScreen(); }
  return {boot,push,logout,who:()=>auth&&PROFILES[auth.name],status:()=>status};
})();
