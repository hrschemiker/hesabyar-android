// Static server for the Android web assets, for browser testing (mirrors the WebView).
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','app','src','main','assets');
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.ttf':'font/ttf','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/'||p==='') p='/index.html';
  let f=path.join(ROOT,p.replace(/\.\.+/g,''));
  if(!f.startsWith(ROOT)){res.writeHead(403);return res.end();}
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);return res.end('404 '+p);} res.writeHead(200,{'Content-Type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache'}); res.end(d); });
}).listen(4611,'127.0.0.1',()=>console.log('HesabYar Android web preview on http://127.0.0.1:4611/'));
