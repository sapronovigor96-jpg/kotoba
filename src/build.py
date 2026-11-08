
b=open('shell2.html').read()
for k,f in [('__DATA__','data.json'),('__STROKES__','strokes.json'),('__LESSONS__','lessons.js'),('__CORE__','core.js'),('__WRITER__','writer.js'),('__PHRASES__','phrases.js'),('__GLOSS__','gloss.js'),('__SONGS__','songs.js'),('__KUROMOJI__','kuromoji.patched.js'),('__SYNC__','empty.js'),('__MAIN__','main.js')]:
    b=b.replace(k,open(f).read())
open('kotoba.html','w').write(b)
open('/mnt/project-files/japanese/app/kotoba-sanpo.html','w').write('<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'+b+'</body></html>')
