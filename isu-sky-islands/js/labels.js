import * as THREE from 'three';
import { el } from './util.js';

// HTML labels pinned to 3D positions. Cheap: one transform write per visible label per frame.
export class Labels {
  constructor(root) {
    this.root = root;
    this.items = new Map();
    this.v = new THREE.Vector3();
    this.n = new THREE.Vector3();
    this.camDir = new THREE.Vector3();
  }

  // target: Object3D or Vector3. opts.facing: Vector3 normal (world) → hide when it faces away.
  add(id, target, node, opts = {}) {
    this.remove(id);
    node.classList.add('hotspot');
    this.root.append(node);
    const item = { id, target, node, opts, visible: true, x: -1e4, y: -1e4 };
    this.items.set(id, item);
    return node;
  }

  hotspot(id, target, text, onClick, opts = {}) {
    const node = el(onClick ? 'button' : 'div', { class: 'hotspot' + (opts.className ? ' ' + opts.className : ''), type: onClick ? 'button' : null, 'aria-label': opts.aria || text },
      el('span', { class: 'bubble' }, opts.small ? el('small', {}, opts.small) : null, opts.compactText ? el('span', { class: 'pin-full' }, text) : text, opts.compactText ? el('span', { class: 'pin-compact' }, opts.compactText) : null),
      opts.noStem ? null : el('span', { class: 'stem' }),
      opts.noStem ? null : el('span', { class: 'pulse' }),
    );
    if (onClick) node.addEventListener('click', (e) => { e.stopPropagation(); onClick(node); });
    return this.add(id, target, node, opts);
  }

  setText(id, text) {
    const it = this.items.get(id);
    if (!it) return;
    const b = it.node.querySelector('.bubble');
    const small = b.querySelector('small');
    b.textContent = text;
    if (small) b.prepend(small);
  }

  remove(id) {
    const it = this.items.get(id);
    if (it) { it.node.remove(); this.items.delete(id); }
  }

  clear(prefix = '') {
    for (const id of [...this.items.keys()]) if (id.startsWith(prefix)) this.remove(id);
  }

  setHidden(id, hidden) {
    const it = this.items.get(id);
    if (it) it.forceHidden = hidden;
  }

  update(camera, w, h) {
    camera.getWorldDirection(this.camDir);
    for (const it of this.items.values()) {
      const t = it.target;
      if (t.isObject3D) t.getWorldPosition(this.v); else this.v.copy(t);
      if (it.opts.offsetY) this.v.y += it.opts.offsetY;
      let show = !it.forceHidden;
      if (show && it.opts.facing) {
        this.n.copy(it.opts.facing());
        const toCam = camera.position.clone().sub(this.v).normalize();
        if (this.n.dot(toCam) < 0.15) show = false;
      }
      this.v.project(camera);
      if (this.v.z > 1 || this.v.z < -1) show = false;
      const x = (this.v.x * 0.5 + 0.5) * w;
      const y = (-this.v.y * 0.5 + 0.5) * h;
      if (show && (x < -80 || x > w + 80 || y < -80 || y > h + 80)) show = false;
      if (show !== it.visible) {
        it.visible = show; it.node.classList.toggle('hide', !show);
        it.node.setAttribute('aria-hidden', String(!show));
        if (it.node.tagName === 'BUTTON') it.node.tabIndex = show ? 0 : -1;
      }
      if (show && (Math.abs(x - it.x) > 0.3 || Math.abs(y - it.y) > 0.3)) {
        it.x = x; it.y = y;
        it.node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      }
    }
  }
}
