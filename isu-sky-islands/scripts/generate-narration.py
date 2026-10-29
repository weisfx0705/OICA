#!/usr/bin/env python3
"""Run with with-gemini-key. Never display provider exceptions or credentials."""
import concurrent.futures, json, pathlib, subprocess, sys, tempfile, time
ROOT = pathlib.Path(__file__).resolve().parents[1]
HELPER = pathlib.Path.home() / '.codex/skills/gemini-tts/scripts/gemini_tts.py'
MODEL = 'gemini-3.1-flash-tts-preview'
VOICE = 'Charon'
STYLES = {
 'zh': 'Read the transcript exactly. Use the same mature male narrator throughout. Low, resonant baritone register; calm, grounded, warm documentary delivery. Consistent timbre and vocal weight across all clips. Natural Taiwan Mandarin and Taiwanese pronunciation. Moderate conversational pace, short sentence pauses. No advertising cadence, theatrical suspense, falsetto or exaggerated rasp. Do not add, translate, or paraphrase words.',
 'en': 'Read the transcript exactly. Use the same mature male narrator throughout. Low, resonant baritone register; calm, grounded, warm documentary delivery. Consistent timbre and vocal weight across all clips, including the Mandarin version. Clear international English, moderate conversational pace and short sentence pauses. No advertising cadence, theatrical suspense, falsetto or exaggerated rasp. Pronounce I-Shou as ee-show. Do not add, translate, or paraphrase words.'}

def main():
 result = subprocess.run(['node', '--input-type=module', '-e', "import {NARRATION} from './js/narration-scripts.js'; process.stdout.write(JSON.stringify(NARRATION));"], cwd=ROOT, capture_output=True, text=True, check=True)
 scripts = json.loads(result.stdout)
 outdir = ROOT / 'assets/narration'; outdir.mkdir(exist_ok=True)
 previous = json.loads((outdir / 'manifest.json').read_text()) if (outdir / 'manifest.json').exists() else {}
 manifest = {'model': MODEL, 'voice': VOICE, 'aiGenerated': True, 'styles': STYLES, 'clips': {}}
 def generate(job):
  key, lang, text = job
  dst = outdir / f'{key}-{lang}.mp3'
  cached = previous.get('clips', {}).get(key, {}).get(lang, {})
  if dst.exists() and cached.get('ready') and cached.get('transcript') == text and previous.get('model') == MODEL and previous.get('voice') == VOICE and previous.get('styles') == STYLES: return key, lang, True
  for attempt in range(3):
   with tempfile.TemporaryDirectory(prefix='isu-voice-') as td:
    wav = pathlib.Path(td) / 'clip.wav'
    run = subprocess.run([sys.executable, str(HELPER), 'single', '--text', text, '--out', str(wav), '--model', MODEL, '--voice', VOICE, '--style', STYLES[lang]], capture_output=True, timeout=180)
    if run.returncode == 0 and wav.exists():
     temporary_mp3 = pathlib.Path(td) / 'encoded.mp3'
     encoded = subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(wav), '-af', 'highpass=f=75,loudnorm=I=-18:TP=-2:LRA=7', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '64k', str(temporary_mp3)], capture_output=True)
     if encoded.returncode == 0:
      dst.write_bytes(temporary_mp3.read_bytes())
      print(f'Ready: {key} / {lang}', flush=True)
      return key, lang, True
    print(f'Retry {attempt + 1}: {key} / {lang} (provider details suppressed)', flush=True)
   time.sleep(3 * (attempt + 1))
  return key, lang, False
 jobs = [(k,l,v[l]) for k,v in scripts.items() for l in ['zh','en']]
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  for key, lang, ok in pool.map(generate, jobs):
   manifest['clips'].setdefault(key, {})[lang] = {'file': f'assets/narration/{key}-{lang}.mp3', 'ready': ok, 'transcript': scripts[key][lang]}
 (outdir / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
 failures = sum(not clip['ready'] for item in manifest['clips'].values() for clip in item.values())
 print(json.dumps({'clips': len(jobs), 'failed': failures}), flush=True)
 return 1 if failures else 0
if __name__ == '__main__':
 try: raise SystemExit(main())
 except Exception as exc:
  print('Narration generation stopped: ' + type(exc).__name__ + ' (details suppressed)', flush=True)
  raise SystemExit(1)
