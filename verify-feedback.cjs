const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {createCanvas,Image}=require('C:/Users/STEAM-PC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const html=fs.readFileSync('index.html','utf8');
const all=[];
function node(tag='div'){const el={tagName:tag.toUpperCase(),dataset:{},style:{},value:'',checked:false,disabled:false,children:[],listeners:{},classList:{toggle(){}},append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children},setAttribute(){},addEventListener(k,f){this.listeners[k]=f},after(){},remove(){},click(){},showModal(){this.open=true},close(){this.open=false},play(){return Promise.resolve()},getContext(){return createCanvas(100,100).getContext('2d')}};all.push(el);return el}
const ids=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],node()]));
const fields=[...html.matchAll(/<(input|textarea|select)[^>]*data-key="([^"]+)"([^>]*)>/g)].map(m=>{const el=node(m[1]);el.dataset.key=m[2];el.tracked=m[3].includes('data-track');return el});
function qs(s){if(s.startsWith('#')&&s.includes(' h2'))return {textContent:'기본 정보'};if(s.startsWith('#'))return ids.get(s.slice(1));return null}
function qsa(s){if(s==='[data-key]')return fields;if(s==='[data-track]')return fields.filter(f=>f.tracked);if(s.includes('[data-material]'))return all.filter(n=>n.dataset.material&&(!s.includes(':checked')||n.checked));if(s.includes('[data-stage]'))return all.filter(n=>n.dataset.stage&&(!s.includes(':checked')||n.checked));return []}
const ctx=vm.createContext({console,Date,Image,Uint8Array,Blob,URL,atob,structuredClone,setTimeout,clearTimeout,Option:function(t,v){this.value=v},localStorage:{getItem(){return null},setItem(){}},document:{body:{},querySelector:qs,querySelectorAll:qsa,createElement:node,createTextNode:s=>s,addEventListener(){},fonts:{ready:Promise.resolve()}},window:{addEventListener(){},scrollTo(){}},navigator:{},alert(){},confirm(){return true}});
vm.runInContext(fs.readFileSync('curriculum.js','utf8')+'\n'+fs.readFileSync('app.js','utf8'),ctx);
(async()=>{await new Promise(r=>setTimeout(r,10));assert.equal(ctx.document.body.inert,false);assert.equal(ids.get('materialsChecklist').children.length,10);assert.equal(ids.get('photoGrid').children.length,4);
assert.equal(ids.get('progressLabel').textContent,'0% 작성');
vm.runInContext("state.fields.name='작성자';state.fields.goal='탐구 목표';state.materials=['Gears'];state.fields.enjoyment='5';state.fields.understanding='3';state.fields.participation='4';hydrate()",ctx);
assert.notEqual(ids.get('progressBar').style.width,'0%');
assert.equal(ids.get('ratingText-enjoyment').textContent,'5 / 5점 · 매우 그래요');
assert.equal(vm.runInContext('normalize(JSON.parse(JSON.stringify(state))).fields.enjoyment',ctx),'5');
ids.get('resetData').onclick();
assert.equal(ids.get('ratingText-enjoyment').textContent,'아직 선택하지 않았어요.');
for(const key of ['understanding','participation'])assert.equal(ids.get('ratingText-'+key).textContent,'아직 선택하지 않았어요.');
vm.runInContext("switchPage('satisfaction')",ctx);assert.equal(ids.get('pageCounter').textContent,'6 / 6');
assert.equal(ids.get('progressLabel').textContent,'0% 작성');
assert.equal(ids.get('progressBar').style.width,'0%');
assert.equal(ids.get('sideProgress').style.width,'0%');
assert(vm.runInContext('Boolean(state.fields.date)',ctx));
vm.runInContext('state=normalize(JSON.parse(JSON.stringify(state)));hydrate()',ctx);
assert.equal(ids.get('progressBar').style.width,'0%');
console.log('PASS: fresh journal and reset both show 0%, including restored state; default date retained');

vm.runInContext("state.photos=[null,null,{src:'data:image/jpeg;base64,YQ==',caption:'세 번째'},null]",ctx);assert.equal(vm.runInContext('nextPhotoSlot()',ctx),0);assert.equal(vm.runInContext('normalize(JSON.parse(JSON.stringify(state))).photos[2].caption',ctx),'세 번째');
vm.runInContext("state.materials=['Color Sensor','Gears'];state.attachments=[{name:'code.py',data:'data:application/octet-stream;base64,cHJpbnQoMSk=',image:false,size:8}]",ctx);assert.equal(vm.runInContext('normalize(JSON.parse(JSON.stringify(state))).attachments[0].name',ctx),'code.py');
ctx.document.createElement=tag=>tag==='canvas'?createCanvas(1,1):node(tag);
vm.runInContext(fs.readFileSync('jpeg.js','utf8'),ctx);
assert.equal(vm.runInContext("jpegFilename({date:'2026-09-10',name:'홍길동'})",ctx),'2026-09-10_홍길동.jpg');
const sample=createCanvas(400,300);sample.getContext('2d').fillStyle='#8ac7e8';sample.getContext('2d').fillRect(0,0,400,300);ctx.samplePhoto=sample.toDataURL('image/jpeg');
vm.runInContext("state=emptyState();state.fields={name:'홍길동',date:'2026-09-10',level:'STEAM-L2',group:'S/P 3Gr',course:'스마트차량 (운송수단)',topic:'센서로 멈추는 자동차',goal:'거리를 측정하여 안전하게 멈추는 자동차를 만들어요.',process:'1. 센서와 모터를 연결했습니다.\\n2. 조건문을 사용해 코딩했습니다.',observation:'장애물 10cm 앞에서 자동차가 멈추었습니다.',learning:'거리 센서와 조건문을 사용해 자동차의 움직임을 제어할 수 있습니다.',interpretation:'예상대로 장애물을 감지했습니다.',improvement:'속도를 줄여 더 정확하게 멈추도록 수정했습니다.'};state.materials=['Distance Sensor','SMART Hub'];state.photos=[{src:samplePhoto,caption:'센서를 연결한 모습'},null,{src:samplePhoto,caption:'자동차를 실험하는 모습'}];state.attachments=[{name:'code.py',data:'data:application/octet-stream;base64,YQ==',size:1,image:false}]",ctx);
const canvas=await vm.runInContext('journalCanvas(state)',ctx);assert.equal(canvas.width,1200);assert(canvas.height>2000);fs.mkdirSync('.checks',{recursive:true});fs.writeFileSync('.checks/feedback-sample.jpg',canvas.toBuffer('image/jpeg'));console.log('PASS: app startup, 10 material checkboxes, 4 photo slots, attachment round-trip, JPEG filename and full report rendering '+canvas.width+'x'+canvas.height);
})().catch(e=>{console.error(e);process.exitCode=1});

