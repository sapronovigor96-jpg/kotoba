import os, shutil, json, sys
from PIL import Image, ImageDraw, ImageFont
OUT='/mnt/project-files/japanese/app/web/site'
cfg=json.load(open('supa.json'))
os.makedirs(OUT+'/dict',exist_ok=True)
b=open('shell2.html').read()
for k,f in [('__DATA__','data.json'),('__STROKES__','strokes.json'),('__LESSONS__','lessons.js'),('__CORE__','core.js'),('__WRITER__','writer.js'),('__PHRASES__','phrases.js'),('__GLOSS__','gloss.js'),('__SONGS__','songs.js'),('__SEKIRO__','sekiro.js'),('__KUROMOJI__','kuromoji.patched.js'),('__SYNC__','sync.js'),('__MAIN__','main.js')]:
    src=open(f).read()
    if k=='__SYNC__': src='const SUPA='+json.dumps(cfg)+';\n'+src
    b=b.replace(k,src)
head='''<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#2f4f86">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>'''
tail='''<script>if("serviceWorker" in navigator) addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));</script></body></html>'''
open(OUT+'/index.html','w').write(head+b+tail)
for f in os.listdir('dictw'): shutil.copy('dictw/'+f, OUT+'/dict/'+f)
json.dump({"name":"Котоба Сампо","short_name":"Котоба","lang":"ru","start_url":"./","scope":"./","display":"standalone","background_color":"#eef1ef","theme_color":"#2f4f86",
  "icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]},open(OUT+'/manifest.webmanifest','w'),ensure_ascii=False)
for s in (192,512):
    im=Image.new('RGB',(s,s),'#2f4f86'); d=ImageDraw.Draw(im)
    f=ImageFont.truetype('/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf',int(s*.56))
    d.text((s/2,s/2),'言',font=f,fill='#eef1ef',anchor='mm'); im.save(f'{OUT}/icon-{s}.png')
dicts=sorted(os.listdir('dictw'))
open(OUT+'/sw.js','w').write('''const V="kotoba-v1";
const SHELL=["./","index.html","manifest.webmanifest","icon-192.png"];
const DICT=%s.map(f=>"dict/"+f);
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
''' % json.dumps(dicts))
open(OUT+'/.nojekyll','w').write('')
print('ok', os.path.getsize(OUT+'/index.html'))
