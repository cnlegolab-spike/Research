'use strict';
(() => {
 const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
 const selector = 'textarea, input:not([type]), input[type="text"], input[type="search"]';
 const wired = new WeakSet();
 let active = null;
 function finish(session, message) {
  if (active !== session) return;
  active = null;
  session.button.textContent = '🎤 음성 입력';
  session.button.setAttribute('aria-pressed', 'false');
  session.status.textContent = message || '음성 입력을 마쳤어요.';
 }
 function cancel(message = '음성 입력을 멈췄어요.') {
  if (!active) return;
  const session = active;
  finish(session, message);
  session.recognition.abort();
 }
 function attach(field) {
  if (wired.has(field) || field.readOnly || field.disabled || field.closest('#cover, .measurements')) return;
  wired.add(field);
  const controls = document.createElement('span');
  controls.className = 'voice-controls no-print';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'voice-button';
  button.textContent = '🎤 음성 입력';
  button.setAttribute('aria-pressed', 'false');
  const status = document.createElement('span');
  status.className = 'voice-status';
  status.setAttribute('role', 'status');
  controls.append(button, status);
  field.after(controls);
  button.addEventListener('click', event => {
   event.preventDefault();
   if (active?.field === field) {
    active.recognition.stop();
    button.disabled = true;
    status.textContent = '입력을 마무리하고 있어요…';
    return;
   }
   cancel();
   if (!Speech) {
    status.textContent = '이 브라우저는 음성 입력을 지원하지 않아요. Chrome 또는 Edge에서 열어 주세요.';
    return;
   }
   const recognition = new Speech();
   recognition.lang = 'ko-KR';
   recognition.continuous = true;
   recognition.interimResults = true;
   const session = {recognition, field, button, status, start: field.selectionStart ?? field.value.length, end: field.selectionEnd ?? field.value.length, handled: new Set()};
   active = session;
   button.textContent = '■ 음성 입력 중지';
   button.setAttribute('aria-pressed', 'true');
   status.textContent = '마이크 연결 중…';
   recognition.onstart = () => {if (active === session) status.textContent = '한국어로 말씀해 주세요.';};
   recognition.onresult = event => {
    if (active !== session || !field.isConnected) return;
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
     const result = event.results[i];
     if (!result.isFinal) {interim += result[0].transcript; continue;}
     if (session.handled.has(i)) continue;
     session.handled.add(i);
     let spoken = result[0].transcript.trim();
     if (!spoken) continue;
     const before = field.value.slice(0, session.start), after = field.value.slice(session.end);
     if (before && !/\s$/.test(before)) spoken = ' ' + spoken;
     const max = field.maxLength >= 0 ? field.maxLength : Infinity;
     spoken = spoken.slice(0, Math.max(0, max - before.length - after.length));
     field.value = before + spoken + after;
     session.start = session.end = before.length + spoken.length;
     field.setSelectionRange(session.start, session.end);
     field.dispatchEvent(new Event('input', {bubbles: true}));
    }
    status.textContent = interim ? '듣는 중: ' + interim : '입력했어요. 이어서 말씀해 주세요.';
   };
   recognition.onerror = event => {
    const messages = {'not-allowed':'마이크 권한을 허용한 뒤 다시 눌러 주세요.', 'service-not-allowed':'브라우저에서 음성 인식 서비스를 사용할 수 없어요. Chrome 또는 Edge에서 시도해 주세요.', 'audio-capture':'마이크를 찾을 수 없어요. 마이크 연결을 확인해 주세요.', 'network':'음성 인식 연결에 실패했어요. 인터넷 연결을 확인해 주세요.', 'no-speech':'목소리가 들리지 않았어요. 다시 눌러 말씀해 주세요.'};
    finish(session, messages[event.error] || '음성 입력이 중단됐어요. 다시 시도해 주세요.');
    button.disabled = false;
   };
   recognition.onend = () => {finish(session);button.disabled = false;};
   try {recognition.start();} catch {finish(session, '마이크를 시작하지 못했어요. 다시 시도해 주세요.');}
  });
  field.addEventListener('beforeinput', () => {if (active?.field === field) cancel('직접 입력으로 전환했어요.');});
  field.addEventListener('pointerdown', () => {if (active?.field === field) cancel();});
 }
 function scan() {
  if (active && !active.field.isConnected) cancel();
  document.querySelectorAll(selector).forEach(attach);
 }
 scan();
 new MutationObserver(scan).observe(document.querySelector('.sheet'), {childList: true, subtree: true});
 document.addEventListener('click', event => {
  if (event.target.closest('[data-target], [data-next], #resetData, #printApp, .slot-camera')) cancel();
 }, true);
 document.querySelector('#importData').addEventListener('change', () => cancel(), true);
 document.addEventListener('visibilitychange', () => {if (document.hidden) cancel();});
 window.addEventListener('pagehide', () => cancel());
})();
