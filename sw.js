const V="kotoba-v1";
const SHELL=["./","index.html","manifest.webmanifest","icon-192.png"];
const DICT=["base.dat.gz.wasm", "cc.dat.gz.wasm", "check.dat.gz.wasm", "tid.dat.gz.wasm", "tid_map.dat.gz.wasm", "tid_pos.dat.gz.wasm", "unk.dat.gz.wasm", "unk_char.dat.gz.wasm", "unk_compat.dat.gz.wasm", "unk_invoke.dat.gz.wasm", "unk_map.dat.gz.wasm", "unk_pos.dat.gz.wasm"].map(f=>"dict/"+f);
self.addEventListener("install",e=>{ e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.origin!==location.origin) return;
  if(u.pathname.includes("/dict/")){ // словарь не меняется: сначала кэш
    e.respondWith(caches.open(V).then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(n=>{ if(n.ok) c.put(e.request,n.clone()); return n; })))); return; }
  // страница: сначала сеть, без сети из кэша
  e.respondWith(fetch(e.request).then(n=>{ if(n.ok){ const cl=n.clone(); caches.open(V).then(c=>c.put(e.request,cl)); } return n; }).catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))));
});
