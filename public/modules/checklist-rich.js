// Text-only Delta subset shared by the server validator and the browser renderer.
export function cleanRich(value){
 if(!value||!Array.isArray(value.ops)||value.ops.length>2500)throw new Error('Invalid formatted guidance.');
 let size=0;const ops=value.ops.map(op=>{
  if(!op||typeof op.insert!=='string'||Object.keys(op).some(k=>!['insert','attributes'].includes(k)))throw new Error('Only text and supported formatting can be saved.');
  size+=op.insert.length;const a=op.attributes||{},attributes={};
  if(typeof a!=='object'||Array.isArray(a))throw new Error('Invalid text formatting.');
  for(const [k,v] of Object.entries(a)){
   if(['bold','italic','underline','strike','blockquote'].includes(k)&&v===true)attributes[k]=true;
   else if(k==='header'&&[1,2,3].includes(v))attributes[k]=v;
   else if(k==='list'&&['ordered','bullet'].includes(v))attributes[k]=v;
   else if(k==='align'&&['center','right','justify'].includes(v))attributes[k]=v;
   else if(k==='indent'&&Number.isInteger(v)&&v>=1&&v<=8)attributes[k]=v;
   else if(['color','background'].includes(k)&&typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v))attributes[k]=v;
   else if(k==='link'&&typeof v==='string'&&v.length<=1000&&/^(https?:\/\/|mailto:)[^\s<>]+$/i.test(v))attributes[k]=v;
   else throw new Error('Unsupported formatting or unsafe link. Use https:// links.');
  }
  return Object.keys(attributes).length?{insert:op.insert,attributes}:{insert:op.insert};
 });if(size>18000)throw new Error('Guidance must be under 18,000 characters.');return {ops};
}
export function renderGuidance(target,definition){
 target.replaceChildren();target.classList.toggle('formatted-guide',!!definition.rich);
 if(!definition.rich){target.textContent=definition.text||'';return;}
 let rich;try{rich=cleanRich(definition.rich);}catch{target.textContent=definition.text||'';return;}
 let runs=[],list=null,listType='';
 function line(a={}){let el;
  if(a.list){if(!list||listType!==a.list){list=document.createElement(a.list==='ordered'?'ol':'ul');listType=a.list;target.append(list);}el=document.createElement('li');list.append(el);}
  else{list=null;listType='';el=document.createElement(a.header?'h'+a.header:a.blockquote?'blockquote':'p');target.append(el);}
  if(a.align)el.style.textAlign=a.align;if(a.indent)el.style.marginLeft=Math.min(a.indent,4)*1.1+'em';
  for(const {t,a:attr} of runs){let n=document.createTextNode(t);for(const [key,tag] of [['bold','strong'],['italic','em'],['underline','u'],['strike','s']])if(attr[key]){const wrap=document.createElement(tag);wrap.append(n);n=wrap;}
   if(attr.color||attr.background){const span=document.createElement('span');if(attr.color)span.style.color=attr.color;if(attr.background)span.style.backgroundColor=attr.background;span.append(n);n=span;}
   if(attr.link){const link=document.createElement('a');link.href=attr.link;link.rel='noopener noreferrer';link.target='_blank';link.append(n);n=link;}el.append(n);
  }if(!runs.length)el.append(document.createElement('br'));runs=[];
 }
 for(const op of rich.ops){const a=op.attributes||{},parts=op.insert.split('\n');parts.forEach((part,i)=>{if(part)runs.push({t:part,a});if(i<parts.length-1)line(a);});}if(runs.length)line();
}
