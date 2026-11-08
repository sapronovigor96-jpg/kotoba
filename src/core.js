/* ---------- ромадзи → кана ---------- */
const R2K = (()=>{
  const m = {a:"あ",i:"い",u:"う",e:"え",o:"お"};
  const rows = {k:"かきくけこ",s:"さしすせそ",t:"たちつてと",n:"なにぬねの",h:"はひふへほ",m:"まみむめも",
    r:"らりるれろ",g:"がぎぐげご",z:"ざじずぜぞ",d:"だぢづでど",b:"ばびぶべぼ",p:"ぱぴぷぺぽ"};
  for (const c in rows) "aiueo".split("").forEach((v,j)=>m[c+v]=rows[c][j]);
  Object.assign(m,{ya:"や",yu:"ゆ",yo:"よ",wa:"わ",wo:"を",shi:"し",chi:"ち",tsu:"つ",fu:"ふ",ji:"じ",
    si:"し",ti:"ち",tu:"つ",hu:"ふ",zi:"じ",di:"ぢ",du:"づ","n'":"ん",
    "-":"ー"});
  const yo = {k:"き",s:"し",t:"ち",n:"に",h:"ひ",m:"み",r:"り",g:"ぎ",z:"じ",b:"び",p:"ぴ",d:"ぢ"};
  for (const c in yo) [["ya","ゃ"],["yu","ゅ"],["yo","ょ"]].forEach(([s,k])=>m[c+s]=yo[c]+k);
  [["sha","しゃ"],["shu","しゅ"],["sho","しょ"],["cha","ちゃ"],["chu","ちゅ"],["cho","ちょ"],
   ["ja","じゃ"],["ju","じゅ"],["jo","じょ"]].forEach(([a,b])=>m[a]=b);
  return m;
})();
function toKana(input, final=true){
  const s = input.toLowerCase().replace(/\s+/g,"");
  let out="", i=0;
  while (i<s.length){
    const c=s[i], nx=s[i+1];
    if (/[ぁ-んー]/.test(c)){ out+=c; i++; continue; }
    if (c===nx && c!=="n" && /[bcdfghjkmprstwz]/.test(c)){ out+="っ"; i++; continue; }
    if (c==="n" && nx==="n"){ out+="ん"; i+= /[aiueoy]/.test(s[i+2]||"") ? 1 : 2; continue; }
    let hit=false;
    for (const L of [3,2,1]){
      const chunk=s.substr(i,L);
      if (R2K[chunk] && !(chunk==="n")){ out+=R2K[chunk]; i+=L; hit=true; break; }
    }
    if (hit) continue;
    if (c==="n"){
      if (nx===undefined){ out+= final ? "ん" : "n"; i++; continue; }
      if (!/[aiueoy]/.test(nx)){ out+="ん"; i++; continue; }
    }
    out+=c; i++;
  }
  return out;
}

/* ---------- FSRS-4.5, параметры по умолчанию ---------- */
const W=[0.4872,1.4003,3.7145,13.8206,5.1618,1.2298,0.8975,0.031,1.6474,0.1367,1.0461,2.1072,0.0793,0.3246,1.587,0.2272,2.8755];
const DECAY=-0.5, FACTOR=19/81, DAY=86400000;
const clampD = d=>Math.min(10,Math.max(1,d));
const retr = (t,S)=>Math.pow(1+FACTOR*t/S,DECAY);
const ivlFor = (S,r)=>Math.min(36500,Math.max(1,Math.round(S/FACTOR*(Math.pow(r,1/DECAY)-1))));
function fsrsNext(c, g, now){
  // c: {state, s, d, last}; g: 1..4
  if (!c || c.state==="new"){
    return {s:W[g-1], d:clampD(W[4]-(g-3)*W[5])};
  }
  const t=Math.max(0,(now-c.last)/DAY), R=retr(t,c.s), D=c.d, S=c.s;
  const d0e=W[4]-(4-3)*W[5];
  const nd=clampD(W[7]*d0e+(1-W[7])*(D-W[6]*(g-3)));
  let ns;
  if (g===1) ns=Math.min(S, W[11]*Math.pow(D,-W[12])*(Math.pow(S+1,W[13])-1)*Math.exp(W[14]*(1-R)));
  else ns=S*(Math.exp(W[8])*(11-D)*Math.pow(S,-W[9])*(Math.exp(W[10]*(1-R))-1)*(g===2?W[15]:1)*(g===4?W[16]:1)+1);
  return {s:Math.max(0.1,ns), d:nd};
}

/* ---------- озвучка ---------- */
let jaVoice=null;
function pickVoice(){ try{ const v=speechSynthesis.getVoices(); jaVoice=v.find(x=>/^ja/i.test(x.lang))||null; }catch(e){} }
try{ speechSynthesis.onvoiceschanged=pickVoice; pickVoice(); }catch(e){}
function speak(text,rate=0.85){
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text); u.lang="ja-JP"; u.rate=rate; if(jaVoice) u.voice=jaVoice;
    speechSynthesis.speak(u);
  }catch(e){}
}
// очередь фраз с паузами: на многих голосах скорость почти не меняется, поэтому «медленно» = по частям
let seqRun=0;
function speakSeq(parts,rate=0.7,gap=450){
  try{ speechSynthesis.cancel(); }catch(e){ return; }
  const run=++seqRun; let i=0;
  const nxt=()=>{ if(run!==seqRun||i>=parts.length) return;
    const u=new SpeechSynthesisUtterance(parts[i++]); u.lang="ja-JP"; u.rate=rate; if(jaVoice) u.voice=jaVoice;
    let fired=false; const go=()=>{ if(fired) return; fired=true; setTimeout(nxt,gap); };
    u.onend=go; u.onerror=go; setTimeout(go, 1500+parts[i-1].length*600);
    speechSynthesis.speak(u); };
  nxt();
}
function morae(s){ const out=[]; for(const c of s.replace(/[、\s]/g,"")){ if(/[ゃゅょ]/.test(c)&&out.length) out[out.length-1]+=c; else out.push(c); } return out; }
const canSpeak=()=>{ try{ return "speechSynthesis" in window; }catch(e){ return false; } };

/* ---------- утилиты ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function fmtIvl(d){ if(d<1) return "сегодня"; if(d<30) return d+" д"; if(d<365) return Math.round(d/30)+" мес"; return (d/365).toFixed(1)+" г"; }
function plural(n,a,b,c){ const m=n%10,h=n%100; return (m===1&&h!==11)?a:(m>=2&&m<=4&&(h<10||h>=20))?b:c; }

