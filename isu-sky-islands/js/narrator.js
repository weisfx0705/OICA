import { el, t, I18N, storage } from './util.js';
import { NARRATION, NARRATION_VERSION } from './narration-scripts.js';
import { sound } from './audio.js';

export class Narrator {
  constructor(root, onLanguage) {
    this.root=root; this.onLanguage=onLanguage;
    this.enabled=storage.get('isu-narration',true);
    this.unlocked=false; this.request=0;
    this.overviewPlayed=new Set();
    this.overviewKeys=new Set(['taiwan','kaohsiung','campus','learning',...Object.keys(NARRATION).filter(k=>k.startsWith('island-'))]);
    this.audio=new Audio(); this.audio.preload='none'; this.audio.volume=0.92;
    this.audio.addEventListener('playing',()=>{
      if(this.playContext?.token!==this.request) return;
      this.failed=false;
      if(this.overviewKeys.has(this.loadedKey)) this.overviewPlayed.add(this.loadedKey+':'+this.loadedLang);
      sound.duck(true); this.update();
    });
    for(const event of ['pause','ended','error']) this.audio.addEventListener(event,()=>{
      sound.duck(false);
      if(event==='error' && this.loadedKey===this.key && this.loadedLang===this.lang) this.failed=true;
      this.update();
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();});
  }

  unlock() { this.unlocked=true; this.userPaused=false; }

  // Gain automation keeps the fade smooth even when 3D rendering is busy.
  ensureGain() {
    if(this.gainUnavailable)return;
    try {
      if(!this.gainNode) {
        const Context=window.AudioContext||window.webkitAudioContext;
        if(!Context){this.gainUnavailable=true;return;}
        this.audioContext=new Context();
        this.mediaSource=this.audioContext.createMediaElementSource(this.audio);
        this.gainNode=this.audioContext.createGain();
        this.gainNode.gain.value=0.92;
        this.mediaSource.connect(this.gainNode).connect(this.audioContext.destination);
        this.audio.volume=1;
      }
      if(this.audioContext.state==='suspended')this.audioContext.resume().catch(()=>{});
    } catch {
      this.audioContext?.close().catch(()=>{});
      this.audioContext=null;this.gainNode=null;this.gainUnavailable=true;
    }
  }

  restoreVolume() {
    if(this.gainNode) {
      const now=this.audioContext.currentTime;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(0.92,now);
    } else this.audio.volume=0.92;
  }

  // One audio element, a shared fade and request tokens prevent overlapping narration.
  fadeOut() {
    if(this.fadingPromise)return this.fadingPromise;
    if(this.audio.paused||this.audio.ended){this.audio.pause();sound.duck(false);return Promise.resolve();}
    const start=performance.now(),volume=this.audio.volume;
    this.fadingPromise=new Promise(resolve=>{
      const finish=()=>{
        this.audio.pause();this.restoreVolume();
        this.fadingPromise=null;sound.duck(false);resolve();this.update();
      };
      if(this.gainNode && this.audioContext.state==='running') {
        const now=this.audioContext.currentTime,gain=this.gainNode.gain;
        gain.cancelScheduledValues(now);gain.setValueAtTime(gain.value,now);
        gain.linearRampToValueAtTime(0,now+0.24);
        setTimeout(finish,240);
      } else {
        const step=()=>{
          const amount=Math.min(1,(performance.now()-start)/240);
          this.audio.volume=Math.max(0,volume*(1-amount));
          if(amount<1&&!this.audio.paused)setTimeout(step,16);else finish();
        };
        setTimeout(step,16);
      }
    });
    return this.fadingPromise;
  }

  setScene(key) {
    if(!NARRATION[key])key=null;
    if(this.key===key && this.lang===I18N.lang)return this.pending||Promise.resolve();
    const token=++this.request, lang=I18N.lang;
    this.key=key; this.lang=lang; this.failed=false;
    const alreadyPlayed=this.overviewKeys.has(key) && this.overviewPlayed.has(key+':'+lang);
    const autoplay=!!key && this.enabled && this.unlocked && !this.userPaused && !alreadyPlayed;
    this.transitioning=!this.audio.paused;
    this.draw();
    const commit=()=>{
      if(token!==this.request)return;
      this.transitioning=false;
      if(!key){this.loadedKey=null;this.loadedLang=null;this.update();return;}
      this.load(key,lang); this.audio.currentTime=0; this.update();
      if(autoplay)return this.startPlayback(token,key,lang);
    };
    // The first play stays inside the user gesture for mobile browsers.
    this.pending=(!this.audio.paused || this.fadingPromise) ? this.fadeOut().then(commit) : Promise.resolve(commit());
    return this.pending;
  }

  load(key,lang) {
    if(this.loadedKey===key && this.loadedLang===lang)return;
    this.audio.src=`assets/narration/${key}-${lang}.mp3?v=${NARRATION_VERSION}`;
    this.restoreVolume(); this.loadedKey=key; this.loadedLang=lang;
  }

  stop() {
    const token=++this.request;
    this.transitioning=false;
    return this.fadeOut().then(()=>{if(token===this.request)this.update();});
  }

  pause() { this.userPaused=true;return this.stop(); }

  play(replay=false) {
    if(!this.key)return Promise.resolve();
    window.speechSynthesis?.cancel();
    this.unlock();this.enabled=true;storage.set('isu-narration',true);
    const token=++this.request,key=this.key,lang=this.lang;
    const same=this.loadedKey===key && this.loadedLang===lang;
    const start=()=>{
      if(token!==this.request)return;
      this.transitioning=false;this.load(key,lang);
      if(replay || !same || this.audio.ended)this.audio.currentTime=0;
      this.restoreVolume();return this.startPlayback(token,key,lang);
    };
    if(!this.audio.paused && !replay && same && !this.fadingPromise)return Promise.resolve();
    this.transitioning=!this.audio.paused;this.update();
    this.pending=(!this.audio.paused || this.fadingPromise) ? this.fadeOut().then(start) : Promise.resolve(start());
    return this.pending;
  }

  async startPlayback(token,key,lang) {
    this.ensureGain();this.restoreVolume();
    this.playContext={token,key,lang};
    try {await this.audio.play();}
    catch {if(token===this.request){this.failed=true;sound.duck(false);this.update();}}
  }

  // A small player that stays out of the way: one round play button with a progress ring,
  // everything else (language, replay, auto-play, transcript) folded into a popover.
  draw() {
    this.panel?.remove(); this.playButton=null; this.status=null; this.pop=null;
    if (!this.key) return;
    const zh = I18N.lang === 'zh';
    const wrap = document.createElement('span');
    wrap.innerHTML = '<svg class="voice-ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="track" cx="22" cy="22" r="19"/><circle class="bar" cx="22" cy="22" r="19" pathLength="100"/></svg>';
    const ring = wrap.firstChild;
    this.ringBar = ring.querySelector('.bar');
    this.playButton = el('button', { type: 'button', class: 'voice-play', onclick: () => this.isPlaying() ? this.pause() : this.play() },
      ring, el('span', { class: 'voice-glyph', 'aria-hidden': 'true' }));
    this.label = el('span', { class: 'voice-label' });
    const more = el('button', { type: 'button', class: 'voice-more', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-label': zh ? '旁白選項' : 'Narration options', onclick: (e) => { e.stopPropagation(); this.togglePop(); } }, el('i'), el('i'), el('i'));
    const languages = el('div', { class: 'voice-languages', role: 'group', 'aria-label': zh ? '旁白語言' : 'Narration language' }, ...['zh','en'].map(lang => el('button', { type: 'button', class: lang === I18N.lang ? 'on' : '', 'aria-pressed': String(lang === I18N.lang), onclick: () => { this.unlock(); if (lang !== I18N.lang) this.onLanguage(lang); else this.play(true); } }, lang === 'zh' ? '中文' : 'EN')));
    this.autoSwitch = el('button', { type: 'button', class: 'voice-switch', role: 'switch', onclick: () => this.setAuto(!this.enabled) }, el('i'));
    this.status = el('span', { class: 'voice-status', role: 'status' });
    this.pop = el('div', { class: 'voice-pop', hidden: true, onclick: (e) => e.stopPropagation() },
      el('div', { class: 'voice-pop-row' }, languages,
        el('button', { class: 'voice-replay', type: 'button', onclick: () => this.play(true) }, zh ? '↺ 從頭播放' : '↺ Replay')),
      el('label', { class: 'voice-pop-row voice-auto' }, el('span', {}, zh ? '進入新場景時自動播放' : 'Auto-play in new scenes'), this.autoSwitch),
      el('details', {}, el('summary', {}, zh ? '旁白逐字稿 · AI 語音' : 'Transcript · AI voice'), el('p', {}, t(NARRATION[this.key]))),
      this.status);
    this.panel = el('aside', { class: 'narration', 'aria-label': zh ? '語音導覽' : 'Audio guide' },
      el('div', { class: 'voice-bar' }, this.playButton, this.label, more), this.pop);
    this.moreButton = more;
    this.root.append(this.panel);
    if (!this.bound) {
      this.bound = true;
      this.audio.addEventListener('timeupdate', () => this.progress());
      this.audio.addEventListener('loadedmetadata', () => this.progress());
      document.addEventListener('click', () => this.togglePop(false));
    }
    this.progress();
    this.update();
  }

  togglePop(open = this.pop?.hidden) {
    if (!this.pop) return;
    this.pop.hidden = !open;
    this.moreButton?.setAttribute('aria-expanded', String(!!open));
    this.panel.classList.toggle('open', !!open);
  }

  setAuto(on) {
    this.enabled = on; storage.set('isu-narration', on);
    if (!on) this.pause();
    this.update();
  }

  progress() {
    if (!this.ringBar) return;
    const same = this.loadedKey === this.key && this.loadedLang === this.lang;
    const d = this.audio.duration;
    const f = same && d > 0 && isFinite(d) ? Math.min(1, this.audio.currentTime / d) : 0;
    this.ringBar.style.strokeDashoffset = String(100 - f * 100);
  }

  isPlaying() { return this.loadedKey===this.key && this.loadedLang===this.lang && !this.audio.paused && !this.transitioning && !this.fadingPromise; }

  update() {
    if (!this.playButton) return;
    const zh = I18N.lang === 'zh', playing = this.isPlaying();
    this.panel.classList.toggle('playing', playing);
    this.panel.classList.toggle('busy', !!this.transitioning);
    this.panel.classList.toggle('failed', !!this.failed);
    this.panel.classList.toggle('off', !this.enabled && !playing);
    const name = playing ? (zh ? '暫停旁白' : 'Pause guide') : (zh ? '播放旁白' : 'Play guide');
    this.playButton.setAttribute('aria-label', name);
    this.playButton.setAttribute('aria-pressed', String(playing));
    this.label.textContent = this.transitioning ? (zh ? '切換中…' : 'Switching…') : playing ? (zh ? '旁白播放中' : 'Now narrating') : (zh ? '語音導覽' : 'Audio guide');
    this.autoSwitch.setAttribute('aria-checked', String(!!this.enabled));
    this.status.textContent = this.failed ? (zh ? '音檔沒有載入，點播放重試，或閱讀逐字稿。' : 'Audio did not load. Tap play to retry, or read the transcript.') : '';
    this.progress();
  }
}
