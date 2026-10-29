"""Behavioural tests for one-time overviews, fades, manual replay and rapid navigation."""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 page=b.new_page(locale='zh-TW')
 page.goto('http://127.0.0.1:8000');page.wait_for_load_state('networkidle');page.wait_for_timeout(1100)
 result=page.evaluate('''async()=>{
   __app.renderer.setAnimationLoop(null);
   await __app.flow.narrator.stop();
   const {Narrator}=await import('./js/narrator.js');
   const {I18N}=await import('./js/util.js');
   const RealAudio=window.Audio,events=[],volumes=[];
   let overlap=false,unsafeSourceChange=false;
   class FakeAudio extends EventTarget {
     constructor(){super();this.paused=true;this.ended=false;this.currentTime=0;this._volume=.92;}
     set src(value){if(!this.paused)unsafeSourceChange=true;this._src=value;this.currentTime=0;}
     get src(){return this._src;}
     set volume(value){this._volume=value;volumes.push({value,time:performance.now()});}
     get volume(){return this._volume;}
     play(){if(!this.paused)overlap=true;this.paused=false;events.push({type:'play',src:this.src,time:performance.now()});this.dispatchEvent(new Event('playing'));return Promise.resolve();}
     pause(){if(!this.paused){this.paused=true;events.push({type:'pause',src:this.src,time:performance.now()});this.dispatchEvent(new Event('pause'));}}
   }
   window.Audio=FakeAudio;
   const root=document.createElement('div');document.body.append(root);
   const n=new Narrator(root,()=>{});n.gainUnavailable=true;n.enabled=true;n.unlock();
   const assert=(condition,message)=>{if(!condition)throw new Error(message);};
   for(const key of ['taiwan','kaohsiung','campus']) {
     await n.setScene(key);
     const first=events.filter(x=>x.type==='play'&&x.src.split('/').pop().split('?')[0]===key+'-zh.mp3').length;
     assert(first===1,key+' first automatic play');
     await n.setScene('taiwan-breakfast');
     await n.setScene(key);
     assert(n.audio.paused,key+' must stay quiet when returning');
     assert(events.filter(x=>x.type==='play'&&x.src.split('/').pop().split('?')[0]===key+'-zh.mp3').length===first,key+' repeated automatically');
     await n.play(true);
     assert(!n.audio.paused,key+' manual replay');
     await n.stop();
   }
   await n.setScene('kaohsiung-transit');
   const start=events.length;
   const a=n.setScene('taiwan-free');
   await new Promise(r=>setTimeout(r,55));
   assert(n.audio.volume>0&&n.audio.volume<.92,'Volume must fall gradually');
   const second=n.setScene('taiwan-tech');
   await new Promise(r=>setTimeout(r,45));
   const last=n.setScene('kaohsiung-cijin');
   await Promise.all([a,second,last]);
   const recent=events.slice(start),plays=recent.filter(x=>x.type==='play');
   assert(plays.length===1&&plays[0].src.includes('kaohsiung-cijin'),'Only the latest destination may play');
   assert(recent.findIndex(x=>x.type==='pause')<recent.findIndex(x=>x.type==='play'),'Old audio pauses before new audio starts');
   await n.setScene(null);assert(n.audio.paused,'Leaving narration must fade and stop');
   assert(!overlap&&!unsafeSourceChange,'Narration must never overlap or replace a playing source');
   assert(volumes.some(x=>x.value>0&&x.value<.8),'An actual amplitude fade is required');
   window.Audio=RealAudio;root.remove();
   return {overview_reentry_quiet:3,manual_replay:true,fade:true,latest_request_only:true,no_overlap:true,play_events:events.filter(x=>x.type==='play').length};
 }''')
 print(result)
 b.close()
