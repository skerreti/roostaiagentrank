import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('public');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
http.createServer((req,res)=>{
  let p=req.url==='/'?'/index.html':req.url;
  const file=path.join(root,p);
  fs.readFile(file,(e,b)=>{
    if(e){res.writeHead(404);return res.end('Not found')};
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(b);
  });
}).listen(8888,()=>console.log('http://localhost:8888'));
