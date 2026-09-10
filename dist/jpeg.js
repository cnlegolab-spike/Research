'use strict';
function jpegFilename(fields){return ((fields.date||today())+'_'+(fields.name||'이름없음')).replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').trim()+'.jpg'}
async function journalCanvas(data){
 const W=1200,M=64,content=W-2*M,measure=document.createElement('canvas').getContext('2d'),commands=[];
 let y=60;
 const font=(size,bold=false)=>(bold?'700 ':'400 ')+size+'px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
 function rect(x,top,w,h,color){commands.push(c=>{c.fillStyle=color;c.fillRect(x,top,w,h)})}
 function lines(text,width,size,bold=false){measure.font=font(size,bold);const rows=[];for(const paragraph of String(text||'—').split('\n')){let line='';for(const char of paragraph){if(line&&measure.measureText(line+char).width>width){rows.push(line);line=char}else line+=char}rows.push(line)}return rows}
 function textAt(text,x,top,width,size=25,color='#172b43',bold=false){const rows=lines(text,width,size,bold),height=rows.length*Math.ceil(size*1.55);commands.push(c=>{c.font=font(size,bold);c.fillStyle=color;c.textBaseline='top';rows.forEach((line,i)=>c.fillText(line,x,top+i*Math.ceil(size*1.55)))});return height}
 function field(label,value){y+=textAt(label,M,y,content,23,'#0b6fb3',true)+6;y+=textAt(value,M,y,content,26)+25}
 function section(title){y+=16;rect(M,y,content,52,'#e7f2fa');textAt(title,M+18,y+9,content-36,26,'#0a5687',true);y+=78}
 async function getImage(src){const img=new Image();img.src=src;await img.decode();return img}
 function photo(img,x,top,w,h){const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,scale=Math.min(w/iw,h/ih);rect(x,top,w,h,'#f0f4f8');commands.push(c=>c.drawImage(img,x+(w-iw*scale)/2,top+(h-ih*scale)/2,iw*scale,ih*scale))}
 rect(0,0,W,14,'#0b6fb3');
 y+=textAt('레고에듀케이션 청라스마트러닝센터',M,y,content,23,'#0b6fb3',true)+14;
 y+=textAt('일일탐구일지',M,y,content,46,'#152a42',true)+18;
 const f=data.fields;
 y+=textAt([f.date,f.name,f.grade,f.team].filter(Boolean).join('  ·  '),M,y,content,26)+10;
 section('01  기본 정보');field('교육과정',[f.level,f.group,f.course].filter(Boolean).join(' / '));field('오늘의 탐구 주제',f.topic);
 section('02  오늘의 탐구');field('활동 단계',data.stages.join(' · '));field('오늘의 목표',f.goal);field('예상과 이유',f.prediction);field('준비물',(data.materials||[]).join(' · '));
 section('03  과정과 결과');field('활동 과정',f.process);field('관찰 및 측정 결과',f.observation);
 const rows=data.measurements.filter(r=>r.condition||r.value||r.note);
 if(rows.length){field('측정 기록',rows.map((r,i)=>(i+1)+'. '+[r.condition,r.value,r.note].filter(Boolean).join(' / ')).join('\n'))}
 section('04  학습내용 정리');field('결과 해석',f.interpretation);field('문제점과 개선',f.improvement);field('오늘 배운 내용',f.learning);
 if(f.attachmentNotes)field('첨부 자료 설명 / 설계·코드 링크',f.attachmentNotes);
 for(const a of data.attachments||[]){field(a.image?'첨부 그림':'첨부 파일',a.name);if(a.image){const img=await getImage(a.preview||a.data),height=Math.min(700,content*(img.naturalHeight||img.height)/(img.naturalWidth||img.width));photo(img,M,y,content,height);y+=height+30}}
 section('05  나의 학습 모습');const gap=24,cw=(content-gap)/2,ph=360;
 for(let row=0;row<2;row++){let rowHeight=ph+24;for(let col=0;col<2;col++){const index=row*2+col,p=data.photos[index],x=M+col*(cw+gap);if(p){const img=await getImage(p.src);photo(img,x,y,cw,ph)}else{rect(x,y,cw,ph,'#f0f4f8');textAt((index+1)+'번째 사진',x+20,y+ph/2-20,cw-40,24,'#687d90')}const height=textAt(p?.caption||'',x,y+ph+12,cw,23);rowHeight=Math.max(rowHeight,ph+12+height+24)}y+=rowHeight}
 section('06  수업 만족도');
 for(const [key,title] of [["enjoyment","수업이 재미있었나요?"],["understanding","오늘 배운 내용을 이해했나요?"],["participation","스스로 참여하고 노력했나요?"]]){const rating=/^[1-5]$/.test(f[key]||'')?Number(f[key]):0;field(title,rating?'★'.repeat(rating)+'☆'.repeat(5-rating)+'  '+rating+' / 5점 · '+['전혀 그렇지 않아요','별로 그렇지 않아요','보통이에요','그런 편이에요','매우 그래요'][rating-1]:'미선택')}
 y+=24;rect(M,y,content,2,'#cbd8e3');y+=24;y+=textAt('STEAM · 오늘의 발견이 내일의 배움으로',M,y,content,21,'#52677d');y+=50;
 if(y>30000)throw Error('내용이 너무 길어 한 장의 JPEG로 저장하기 어렵습니다. 내용을 줄여 다시 저장해 주세요.');
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=Math.ceil(y);const c=canvas.getContext('2d');if(!c)throw Error('이미지를 만들 수 없습니다.');c.fillStyle='#ffffff';c.fillRect(0,0,W,canvas.height);for(const draw of commands)draw(c);return canvas;
}
$('#printApp').onclick=async()=>{
 if(photoBusy||attachmentBusy){alert('사진과 파일 첨부가 끝난 뒤 저장해 주세요.');return}
 if(!state.fields.name?.trim()||!state.fields.date){alert('파일 이름에 사용할 이름과 날짜를 먼저 입력해 주세요.');switchPage('cover');return}
 const button=$('#printApp'),snapshot=structuredClone(state),filename=jpegFilename(snapshot.fields);let handle=null;
 button.disabled=true;closeCamera();
 try{
 if(window.showSaveFilePicker){try{handle=await window.showSaveFilePicker({suggestedName:filename,startIn:'desktop',types:[{description:'JPEG 이미지',accept:{'image/jpeg':['.jpg']}}]})}catch(e){if(e.name==='AbortError')return;if(!['SecurityError','NotAllowedError','TypeError'].includes(e.name))throw e}}
 button.textContent='JPEG 만드는 중…';await document.fonts.ready;const canvas=await journalCanvas(snapshot);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('JPEG 변환에 실패했습니다.')),'image/jpeg',0.92));
 if(handle){const writer=await handle.createWritable();try{await writer.write(blob);await writer.close()}catch(e){await writer.abort().catch(()=>{});throw e}$('#saveState').textContent=filename+' 저장 완료'}else{downloadBlob(blob,filename);$('#saveState').textContent='JPEG 다운로드 요청됨';alert('JPEG 다운로드를 시작했습니다. 바탕화면에 저장하려면 브라우저의 다운로드 저장 위치를 바탕화면으로 선택해 주세요.')}
 }catch(e){if(e.name!=='AbortError')alert('JPEG 저장 실패: '+e.message)}finally{button.disabled=false;button.textContent='JPEG 저장'}
};
