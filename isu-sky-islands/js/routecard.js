import { t, I18N } from './util.js';
import { BRIDGES, ISLANDS, LIFE_CARDS, UI, META } from './content.js';
import { programJourney } from './logic.js';
import { PROGRAM_PROFILES } from './program-profiles.js';

const W = 1080, H = 1920;
let logoImg;
const loadLogo = () => logoImg || (logoImg = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = 'assets/isu-wordmark.png'; }));

function wrap(ctx, text, maxW) {
  const lines = [];
  const words = I18N.lang === 'zh' ? [...text] : text.split(/(\s+)/);
  let line = '';
  for (const w of words) {
    const test = line + w;
    if (ctx.measureText(test).width > maxW && line.trim()) { lines.push(line.trim()); line = w.trimStart(); } else line = test;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function drawRouteCard(canvas, state) {
  await document.fonts?.ready;
  const logo = await loadLogo();
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const zh = I18N.lang === 'zh';
  const F = (w, s) => `${w} ${s}px ${zh ? "'Noto Sans TC'" : "'Work Sans', 'Noto Sans TC'"}, sans-serif`;
  const FB = (w, s) => `${w} ${s}px ${zh ? "'Noto Sans TC'" : "'Inter', 'Noto Sans TC'"}, sans-serif`;
  const island = ISLANDS.find((i) => i.id === state.flag.islandId);
  const program = island.programs.find((p) => p.id === state.flag.programId);
  const bridge = BRIDGES[state.bridge];
  const life = LIFE_CARDS.find((l) => l.id === state.life);
  const career = island;

  // background
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2B2A78'); g.addColorStop(0.42, '#5B63C4'); g.addColorStop(0.72, '#C9C3EE'); g.addColorStop(1, '#F7DCC4');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const glow = (x, y, r, c) => { const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  glow(880, 360, 420, 'rgba(255,197,58,0.35)');
  glow(160, 1300, 520, 'rgba(255,255,255,0.35)');
  glow(W / 2, 760, 460, island.color + '66');

  // header
  if (logo) ctx.drawImage(logo, 72, 74, 301 * 0.95, 83 * 0.95);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = F(700, 26);
  ctx.textAlign = 'right';
  ctx.fillText(t(UI.title).toUpperCase(), W - 72, 112);
  ctx.font = FB(500, 22);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText(t(UI.routeTitle), W - 72, 146);
  ctx.textAlign = 'left';

  // name / headline
  ctx.fillStyle = '#FFFFFF';
  ctx.font = F(zh ? 900 : 800, 84);
  const name = state.name?.trim() || (zh ? '我的未來路線' : 'My route to Taiwan');
  wrap(ctx, name, W - 144).slice(0, 2).forEach((l, i) => ctx.fillText(l, 72, 300 + i * 92));

  // flight route: home → Kaohsiung → island
  const ry = 470;
  const pts = [[150, ry + 80], [W / 2, ry - 10], [W - 150, ry + 80]];
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5; ctx.setLineDash([2, 16]); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.quadraticCurveTo(W * 0.28, ry - 60, ...pts[1]); ctx.quadraticCurveTo(W * 0.72, ry - 60, ...pts[2]); ctx.stroke();
  ctx.setLineDash([]);
  const node = (x, y, c, label, sub) => {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = F(800, 34); ctx.fillText(label, x, y + 70);
    ctx.font = FB(500, 21); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText(sub, x, y + 102);
    ctx.textAlign = 'left';
  };
  node(...pts[0], '#FFFFFF', state.homeLabel, t(UI.routeFrom).toUpperCase());
  node(...pts[1], '#FFC53A', t(UI.khh), t(UI.guanyin));
  node(...pts[2], island.color, t(island.name), t(UI.future).toUpperCase());

  // main island card
  let y = 700;
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  rr(ctx, 60, y, W - 120, 470, 40); ctx.fill();
  ctx.fillStyle = island.color; rr(ctx, 60, y, 18, 470, 9); ctx.fill();
  ctx.fillStyle = '#36348E'; ctx.font = FB(700, 22);
  ctx.fillText(t(UI.program).toUpperCase(), 110, y + 66);
  ctx.fillStyle = '#23215F'; ctx.font = F(zh ? 900 : 800, zh ? 54 : 48);
  const pl = wrap(ctx, t(program.name), W - 220).slice(0, 2);
  pl.forEach((l, i) => ctx.fillText(l, 110, y + 136 + i * 62));
  let yy = y + 136 + pl.length * 62 + 8;
  ctx.fillStyle = '#545454'; ctx.font = FB(400, 26);
  const fl = wrap(ctx, t(program.focus), W - 220).slice(0, 1);
  fl.forEach((l, i) => ctx.fillText(l, 110, yy + i * 38));
  yy += fl.length * 38 + 30;
  // campus + language tags
  ctx.font = FB(600, 22);
  let tx = 110;
  for (const tag of [program.campus === 'medical' ? t(UI.medicalCampus) : t(UI.mainCampus), `${t(UI.taughtIn)} ${program.lang === 'en' ? t(UI.langEn) : t(UI.langZh)}`]) {
    const tw = ctx.measureText(tag).width + 36;
    ctx.fillStyle = 'rgba(54,52,142,0.08)'; rr(ctx, tx, yy, tw, 44, 22); ctx.fill();
    ctx.fillStyle = '#36348E'; ctx.fillText(tag, tx + 18, yy + 30);
    tx += tw + 12;
  }
  yy += 66;
  // bridge chip
  ctx.font = FB(700, 26);
  const bt = `${t(bridge.name)} · ${t(bridge.tag)}`;
  const bw = ctx.measureText(bt).width + 64;
  ctx.fillStyle = bridge.color; rr(ctx, 110, yy, Math.min(bw, W - 220), 56, 28); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText(bt, 142, yy + 37);

  // future & life cards
  y = 1196;
  const cardW = (W - 120 - 24) / 2;
  const mini = (x, label, title, color) => {
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; rr(ctx, x, y, cardW, 190, 32); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + 46, y + 52, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#36348E'; ctx.font = FB(700, 20); ctx.fillText(label.toUpperCase(), x + 70, y + 59);
    ctx.fillStyle = '#23215F'; ctx.font = F(800, 32);
    wrap(ctx, title, cardW - 64).slice(0, 2).forEach((l, i) => ctx.fillText(l, x + 34, y + 112 + i * 42));
  };
  mini(60, t(UI.future), t(PROGRAM_PROFILES[program.id].future), career.color);
  mini(60 + cardW + 24, t(UI.life), t(life.title), '#FFC53A');

  // timeline
  y = 1430;
  ctx.fillStyle = '#23215F'; ctx.font = FB(700, 22);
  ctx.fillText(t(UI.timeline).toUpperCase(), 72, y);
  const steps = programJourney(program, state.bridge).map(s => t(s.title));
  const sx0 = 96, sx1 = W - 96;
  const sy = y + 60;
  ctx.strokeStyle = '#36348E'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx0, sy); ctx.lineTo(sx1, sy); ctx.stroke();
  steps.forEach((s, i) => {
    const x = sx0 + ((sx1 - sx0) * i) / (steps.length - 1);
    ctx.fillStyle = i === steps.length - 1 ? '#FFC53A' : '#fff';
    ctx.beginPath(); ctx.arc(x, sy, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#36348E'; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = '#23215F'; ctx.font = FB(600, 22); ctx.textAlign = 'center';
    wrap(ctx, s, 190).slice(0, 2).forEach((l, j) => ctx.fillText(l, x, sy + 52 + j * 28));
    ctx.textAlign = 'left';
  });

  // footer with QR
  y = 1600;
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; rr(ctx, 60, y, W - 120, 250, 36); ctx.fill();
  const qr = window.qrcode ? window.qrcode(0, 'M') : null;
  if (qr) {
    qr.addData(META.site); qr.make();
    const n = qr.getModuleCount(), size = 190, cell = size / n;
    ctx.fillStyle = '#23215F';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(W - 90 - size + c * cell, y + 30 + r * cell, Math.ceil(cell), Math.ceil(cell));
  }
  ctx.fillStyle = '#23215F'; ctx.font = F(800, 34);
  ctx.fillText(t(UI.school), 100, y + 78);
  ctx.fillStyle = '#36348E'; ctx.font = FB(600, 26);
  ctx.fillText('international.isu.edu.tw', 100, y + 124);
  ctx.fillStyle = '#545454'; ctx.font = FB(400, 21);
  wrap(ctx, `${t(UI.apply)}：${t(bridge.deadline)}`, W - 440).slice(0, 2).forEach((l, i) => ctx.fillText(l, 100, y + 168 + i * 30));
  ctx.fillStyle = 'rgba(35,33,95,0.55)'; ctx.font = FB(400, 18);
  ctx.fillText(t(UI.footer), 72, H - 24);
  return canvas;
}

export async function exportRouteCard(canvas, filename) {
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: t(UI.routeTitle), text: META.site }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  return 'downloaded';
}
