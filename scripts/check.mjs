import { readFileSync, readdirSync } from 'node:fs';
import { Script } from 'node:vm';
for(const name of readdirSync('public').filter(n=>n.endsWith('.html'))){
  const source=readFileSync('public/'+name,'utf8');
  for(const match of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new Script(match[1],{filename:name});
  if(source.includes('script.google.com') || source.includes('authPassword'))throw new Error('Legacy endpoint or credentials found: '+name);
}
console.log('All page scripts parse; no legacy Apps Script endpoints.');
