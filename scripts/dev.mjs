// Local adapter for the same Vercel handler. No authentication bypass or demo data.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import handler from '../api/reporting.js';
process.env.NODE_ENV='development';
const root=path.resolve('public');
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/reporting'){
    req.query=Object.fromEntries(url.searchParams);let body='';
    for await(const chunk of req){body+=chunk;if(body.length>20000){res.writeHead(413).end();return;}}
    try{req.body=body?JSON.parse(body):{};}catch{res.writeHead(400).end();return;}
    res.status=code=>{res.statusCode=code;return res;};res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
    return handler(req,res);
  }
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{const bytes=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript'})[path.extname(file)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end('Not found');}
}).listen(3000,()=>console.log('Reporting available at http://localhost:3000'));
