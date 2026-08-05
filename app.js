/**
 * 🧲 Magnet Simulator PRO 2.0 - Advanced Interactive Canvas Physics Engine
 */

// Sound Engine using Web Audio API
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.lastSnapTime = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playSnap() {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastSnapTime < 120) return;
    this.lastSnapTime = now;

    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {}
  }

  playClink() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  }

  playCrack() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();
    } catch (e) {}
  }
}

const sounds = new SoundEngine();

// Simulation State
const state = {
  entities: [],
  ironFilings: [],
  selectedEntity: null,
  isDragging: false,
  isRotating: false,
  dragOffset: { x: 0, y: 0 },
  mousePos: { x: 0, y: 0 },
  dragVelocity: { x: 0, y: 0 },
  
  // Settings
  paused: false,
  globalStrength: 3.0, // Increased default global strength from 1.5 to 3.0
  damping: 0.06,
  simSpeed: 1.0,
  filingsCount: 800,
  
  // Overlays
  showFieldLines: true,
  showFilings: true,
  showVectorGrid: false,
  showHeatmap: false,
  showForces: true,

  // Stats
  fps: 60,
  lastFrameTime: performance.now(),
  frameCount: 0
};

let nextEntityId = 1;

/**
 * Magnet Entity Class
 */
class MagnetEntity {
  constructor(type, x, y, angle = 0, strength = 1.0, width = null, height = null) {
    this.id = nextEntityId++;
    this.type = type;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = 0;
    this.vy = 0;
    this.vAngle = 0;
    this.strength = strength;
    this.pinned = false;

    this.width = width || 130;
    this.height = height || 42;
    this.mass = 1.0;
    this.inertia = 400;

    this.initDimensions(width, height);
  }

  initDimensions(customW, customH) {
    if (this.type === 'bar') {
      this.width = customW || 130;
      this.height = customH || 42;
      this.mass = (this.width / 130) * 1.0;
      this.inertia = 400 * (this.width / 130);
    } else if (this.type === 'ushape') {
      this.width = customW || 120;
      this.height = customH || 90;
      this.mass = 1.3;
      this.inertia = 500;
    } else if (this.type === 'horseshoe') {
      this.width = customW || 110;
      this.height = customH || 110;
      this.mass = 1.4;
      this.inertia = 600;
    } else if (this.type === 'button') {
      this.width = customW || 48;
      this.height = customH || 48;
      this.mass = 0.5;
      this.inertia = 100;
    } else if (this.type === 'ring') {
      this.width = customW || 86;
      this.height = customH || 86;
      this.mass = 0.9;
      this.inertia = 300;
    } else if (this.type === 'compass') {
      this.width = 46;
      this.height = 46;
      this.mass = 0.15;
      this.inertia = 15;
      this.strength = 0.3;
    } else if (this.type === 'steel_ball') {
      this.width = 36;
      this.height = 36;
      this.mass = 0.7;
      this.inertia = 80;
      this.strength = 0;
    } else if (this.type === 'paperclip') {
      this.width = 42;
      this.height = 18;
      this.mass = 0.15;
      this.inertia = 20;
      this.strength = 0;
    } else if (this.type === 'nail') {
      this.width = 50;
      this.height = 14;
      this.mass = 0.3;
      this.inertia = 30;
      this.strength = 0;
    } else if (this.type === 'coin') {
      this.width = 34;
      this.height = 34;
      this.mass = 0.4;
      this.inertia = 50;
      this.strength = 0;
    } else if (this.type === 'key') {
      this.width = 52;
      this.height = 24;
      this.mass = 0.5;
      this.inertia = 60;
      this.strength = 0;
    } else if (this.type === 'wood') {
      this.width = 50;
      this.height = 36;
      this.mass = 0.6;
      this.inertia = 70;
      this.strength = 0;
    } else if (this.type === 'duck') {
      this.width = 44;
      this.height = 44;
      this.mass = 0.4;
      this.inertia = 50;
      this.strength = 0;
    } else if (this.type === 'eraser') {
      this.width = 48;
      this.height = 24;
      this.mass = 0.35;
      this.inertia = 40;
      this.strength = 0;
    } else if (this.type === 'al_can') {
      this.width = 40;
      this.height = 56;
      this.mass = 0.5;
      this.inertia = 80;
      this.strength = 0;
    }
  }

  isFerromagnetic() {
    return ['steel_ball', 'paperclip', 'nail', 'coin', 'key'].includes(this.type);
  }

  isNonMagnetic() {
    return ['wood', 'duck', 'eraser', 'al_can'].includes(this.type);
  }

  getPoles() {
    const poles = [];
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const s = this.strength * state.globalStrength;

    if (this.type === 'bar') {
      const halfL = this.width * 0.42;
      poles.push({
        x: this.x + halfL * cos,
        y: this.y + halfL * sin,
        q: 1,
        strength: s,
        magnetId: this.id
      });
      poles.push({
        x: this.x - halfL * cos,
        y: this.y - halfL * sin,
        q: -1,
        strength: s,
        magnetId: this.id
      });
    } else if (this.type === 'ushape') {
      const tipX = this.width * 0.42;
      const tipY = this.height * 0.35;
      poles.push({
        x: this.x + tipX * cos + tipY * sin,
        y: this.y + tipX * sin - tipY * cos,
        q: 1,
        strength: s * 1.8,
        magnetId: this.id
      });
      poles.push({
        x: this.x + tipX * cos - tipY * sin,
        y: this.y + tipX * sin + tipY * cos,
        q: -1,
        strength: s * 1.8,
        magnetId: this.id
      });
    } else if (this.type === 'horseshoe') {
      const tipX = this.width * 0.38;
      const tipY = this.height * 0.35;
      poles.push({
        x: this.x + tipX * cos + tipY * sin,
        y: this.y + tipX * sin - tipY * cos,
        q: 1,
        strength: s * 1.8,
        magnetId: this.id
      });
      poles.push({
        x: this.x + tipX * cos - tipY * sin,
        y: this.y + tipX * sin + tipY * cos,
        q: -1,
        strength: s * 1.8,
        magnetId: this.id
      });
    } else if (this.type === 'button') {
      const r = this.width * 0.35;
      poles.push({
        x: this.x + r * cos,
        y: this.y + r * sin,
        q: 1,
        strength: s,
        magnetId: this.id
      });
      poles.push({
        x: this.x - r * cos,
        y: this.y - r * sin,
        q: -1,
        strength: s,
        magnetId: this.id
      });
    } else if (this.type === 'ring') {
      const r = this.width * 0.32;
      poles.push({
        x: this.x - r * sin,
        y: this.y + r * cos,
        q: 1,
        strength: s,
        magnetId: this.id
      });
      poles.push({
        x: this.x + r * sin,
        y: this.y - r * cos,
        q: -1,
        strength: s,
        magnetId: this.id
      });
    } else if (this.type === 'compass') {
      const halfL = this.width * 0.35;
      poles.push({
        x: this.x + halfL * cos,
        y: this.y + halfL * sin,
        q: 1,
        strength: s,
        magnetId: this.id
      });
      poles.push({
        x: this.x - halfL * cos,
        y: this.y - halfL * sin,
        q: -1,
        strength: s,
        magnetId: this.id
      });
    }

    return poles;
  }

  getOBBVertices() {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const hw = this.width / 2;
    const hh = this.height / 2;

    return [
      { x: this.x + hw * cos - hh * sin, y: this.y + hw * sin + hh * cos },
      { x: this.x - hw * cos - hh * sin, y: this.y - hw * sin + hh * cos },
      { x: this.x - hw * cos + hh * sin, y: this.y - hw * sin - hh * cos },
      { x: this.x + hw * cos + hh * sin, y: this.y + hw * sin - hh * cos }
    ];
  }

  flipPoles() {
    this.angle += Math.PI;
    sounds.playSnap();
  }
}

/**
 * Iron Filing Particle Class
 */
class IronFiling {
  constructor(w, h) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.angle = Math.random() * Math.PI * 2;
    this.len = 5 + Math.random() * 5;
  }
}

// Polyfill for CanvasRenderingContext2D.prototype.roundRect (兼容老旧浏览器/班级电脑)
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    if (typeof radii === 'number') radii = [radii, radii, radii, radii];
    if (!Array.isArray(radii)) radii = [0, 0, 0, 0];
    let r0 = radii[0] || 0;
    let r1 = radii[1] !== undefined ? radii[1] : r0;
    let r2 = radii[2] !== undefined ? radii[2] : r0;
    let r3 = radii[3] !== undefined ? radii[3] : r1;

    this.moveTo(x + r0, y);
    this.lineTo(x + w - r1, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r1);
    this.lineTo(x + w, y + h - r2);
    this.quadraticCurveTo(x + w, y + h, x + w - r2, y + h);
    this.lineTo(x + r3, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r3);
    this.lineTo(x, y + r0);
    this.quadraticCurveTo(x, y, x + r0, y);
    this.closePath();
    return this;
  };
}

// Canvas & Context Setup
const canvas = document.getElementById('sim-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

function resizeCanvas() {
  if (!canvas || !canvas.parentElement) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width > 0 ? rect.width : window.innerWidth - 320;
  canvas.height = rect.height > 0 ? rect.height : (window.innerHeight - 80);
  initIronFilings();
}

window.addEventListener('resize', resizeCanvas);

function initIronFilings() {
  state.ironFilings = [];
  for (let i = 0; i < state.filingsCount; i++) {
    state.ironFilings.push(new IronFiling(canvas.width, canvas.height));
  }
}

function computeMagneticField(x, y, excludeMagnetId = null) {
  let Bx = 0;
  let By = 0;
  const Km = 850000; // Increased base magnetic constant Km from 350000 to 850000!

  for (const entity of state.entities) {
    if (entity.id === excludeMagnetId) continue;
    const poles = entity.getPoles();

    for (const p of poles) {
      const dx = x - p.x;
      const dy = y - p.y;
      const rSq = dx * dx + dy * dy + 350;
      const r = Math.sqrt(rSq);
      const r3 = rSq * r;

      const mag = Km * p.q * p.strength / r3;
      Bx += dx * mag;
      By += dy * mag;
    }
  }

  return { Bx, By, mag: Math.sqrt(Bx * Bx + By * By) };
}

/**
 * Physics Engine Step
 */
function updatePhysics(dt) {
  if (state.paused) return;

  const subSteps = 6;
  const subDt = (dt * state.simSpeed) / subSteps;

  for (let step = 0; step < subSteps; step++) {
    for (const entity of state.entities) {
      if (entity.pinned || (state.isDragging && state.selectedEntity === entity)) {
        if (!state.isRotating && state.selectedEntity === entity) {
        } else {
          entity.vx = 0;
          entity.vy = 0;
        }
        continue;
      }

      let Fx = 0;
      let Fy = 0;
      let Torque = 0;

      if (entity.isNonMagnetic()) {
        Fx = 0;
        Fy = 0;
        Torque = 0;
      } else if (entity.isFerromagnetic()) {
        const B = computeMagneticField(entity.x, entity.y, entity.id);
        const eps = 4;
        const B_px = computeMagneticField(entity.x + eps, entity.y, entity.id).mag;
        const B_nx = computeMagneticField(entity.x - eps, entity.y, entity.id).mag;
        const B_py = computeMagneticField(entity.x, entity.y + eps, entity.id).mag;
        const B_ny = computeMagneticField(entity.x, entity.y - eps, entity.id).mag;

        let gradX = (B_px - B_nx) / (2 * eps);
        let gradY = (B_py - B_ny) / (2 * eps);

        const maxGrad = 120; // Increased maxGrad cap for stronger pull
        const gradMag = Math.hypot(gradX, gradY);
        if (gradMag > maxGrad) {
          gradX = (gradX / gradMag) * maxGrad;
          gradY = (gradY / gradMag) * maxGrad;
        }

        const steelFactor = 35.0; // Increased steel factor from 15.0 to 35.0!
        Fx += gradX * Math.min(1200, B.mag) * steelFactor;
        Fy += gradY * Math.min(1200, B.mag) * steelFactor;

        if (B.mag > 10) {
          const bAngle = Math.atan2(B.By, B.Bx);
          let diff = (bAngle - entity.angle) % Math.PI;
          if (diff < -Math.PI/2) diff += Math.PI;
          if (diff > Math.PI/2) diff -= Math.PI;
          Torque += diff * 180;
        }
      } else {
        const poles = entity.getPoles();

        for (const p of poles) {
          const B = computeMagneticField(p.x, p.y, entity.id);
          
          const forceScale = 1.4; // Increased force scale from 0.85 to 1.4!
          const poleFx = p.q * B.Bx * forceScale;
          const poleFy = p.q * B.By * forceScale;

          Fx += poleFx;
          Fy += poleFy;

          const rx = p.x - entity.x;
          const ry = p.y - entity.y;
          Torque += (rx * poleFy - ry * poleFx);
        }
      }

      const ax = Fx / entity.mass;
      const ay = Fy / entity.mass;
      const alpha = Torque / entity.inertia;

      entity.vx += ax * subDt;
      entity.vy += ay * subDt;
      entity.vAngle += alpha * subDt;

      const damp = Math.pow(1 - state.damping, subDt * 60);
      entity.vx *= damp;
      entity.vy *= damp;
      entity.vAngle *= damp;

      entity.x += entity.vx * subDt;
      entity.y += entity.vy * subDt;
      entity.angle += entity.vAngle * subDt;

      const margin = entity.width / 2;
      if (entity.x < margin) { entity.x = margin; entity.vx *= -0.4; }
      if (entity.x > canvas.width - margin) { entity.x = canvas.width - margin; entity.vx *= -0.4; }
      if (entity.y < margin) { entity.y = margin; entity.vy *= -0.4; }
      if (entity.y > canvas.height - margin) { entity.y = canvas.height - margin; entity.vy *= -0.4; }
    }

    handleSATCollisions();
  }
}

/**
 * SAT OBB Collision Solver & Anti-Twitch Rest Clamp
 */
function handleSATCollisions() {
  for (let i = 0; i < state.entities.length; i++) {
    for (let j = i + 1; j < state.entities.length; j++) {
      const a = state.entities[i];
      const b = state.entities[j];

      resolveOBBCollision(a, b);
    }
  }
}

function resolveOBBCollision(a, b) {
  const vertsA = a.getOBBVertices();
  const vertsB = b.getOBBVertices();

  const axes = [
    { x: Math.cos(a.angle), y: Math.sin(a.angle) },
    { x: -Math.sin(a.angle), y: Math.cos(a.angle) },
    { x: Math.cos(b.angle), y: Math.sin(b.angle) },
    { x: -Math.sin(b.angle), y: Math.cos(b.angle) }
  ];

  let minOverlap = Infinity;
  let smallestAxis = null;

  for (const axis of axes) {
    const projA = projectVertices(vertsA, axis);
    const projB = projectVertices(vertsB, axis);

    const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
    if (overlap <= 0) return;

    if (overlap < minOverlap) {
      minOverlap = overlap;
      smallestAxis = axis;
    }
  }

  if (smallestAxis && minOverlap > 0) {
    let dVector = { x: b.x - a.x, y: b.y - a.y };
    if (dVector.x * smallestAxis.x + dVector.y * smallestAxis.y < 0) {
      smallestAxis.x = -smallestAxis.x;
      smallestAxis.y = -smallestAxis.y;
    }

    const aIsDragged = (state.isDragging && state.selectedEntity === a);
    const bIsDragged = (state.isDragging && state.selectedEntity === b);

    const aMovable = !a.pinned && !aIsDragged;
    const bMovable = !b.pinned && !bIsDragged;

    if (aMovable && bMovable) {
      a.x -= smallestAxis.x * minOverlap * 0.5;
      a.y -= smallestAxis.y * minOverlap * 0.5;
      b.x += smallestAxis.x * minOverlap * 0.5;
      b.y += smallestAxis.y * minOverlap * 0.5;
    } else if (bMovable) {
      b.x += smallestAxis.x * minOverlap;
      b.y += smallestAxis.y * minOverlap;
    } else if (aMovable) {
      a.x -= smallestAxis.x * minOverlap;
      a.y -= smallestAxis.y * minOverlap;
    }

    if (a.isFerromagnetic() && aMovable) {
      a.vx *= 0.1;
      a.vy *= 0.1;
      a.vAngle *= 0.05;
      if (Math.hypot(a.vx, a.vy) < 1.5) { a.vx = 0; a.vy = 0; a.vAngle = 0; }
    } else if (aMovable) {
      a.vx *= 0.6;
      a.vy *= 0.6;
      a.vAngle *= 0.4;
    }

    if (b.isFerromagnetic() && bMovable) {
      b.vx *= 0.1;
      b.vy *= 0.1;
      b.vAngle *= 0.05;
      if (Math.hypot(b.vx, b.vy) < 1.5) { b.vx = 0; b.vy = 0; b.vAngle = 0; }
    } else if (bMovable) {
      b.vx *= 0.6;
      b.vy *= 0.6;
      b.vAngle *= 0.4;
    }
  }
}

function projectVertices(verts, axis) {
  let min = Infinity;
  let max = -Infinity;
  for (const v of verts) {
    const proj = v.x * axis.x + v.y * axis.y;
    if (proj < min) min = proj;
    if (proj > max) max = proj;
  }
  return { min, max };
}

function breakEntity(magnet) {
  if (!magnet || (magnet.type !== 'bar' && magnet.type !== 'button')) return;
  if (magnet.width < 45) return;

  sounds.playCrack();

  const halfW = magnet.width / 2;
  const cos = Math.cos(magnet.angle);
  const sin = Math.sin(magnet.angle);

  state.entities = state.entities.filter(e => e !== magnet);

  const posX_A = magnet.x - (halfW / 2) * cos;
  const posY_A = magnet.y - (halfW / 2) * sin;
  const pieceA = new MagnetEntity(magnet.type, posX_A, posY_A, magnet.angle, magnet.strength, halfW, magnet.height);
  pieceA.vx = magnet.vx - sin * 20 - cos * 30;
  pieceA.vy = magnet.vy + cos * 20 - sin * 30;

  const posX_B = magnet.x + (halfW / 2) * cos;
  const posY_B = magnet.y + (halfW / 2) * sin;
  const pieceB = new MagnetEntity(magnet.type, posX_B, posY_B, magnet.angle, magnet.strength, halfW, magnet.height);
  pieceB.vx = magnet.vx + sin * 20 + cos * 30;
  pieceB.vy = magnet.vy - cos * 20 + sin * 30;

  state.entities.push(pieceA, pieceB);
  state.selectedEntity = pieceA;
  updateInspector();
}

/**
 * Render Loop
 */
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackgroundGrid();

  if (state.showHeatmap) {
    drawHeatmap();
  }

  if (state.showVectorGrid) {
    drawVectorGrid();
  }

  if (state.showFieldLines) {
    drawFieldLines();
  }

  if (state.showFilings) {
    drawIronFilings();
  }

  for (const entity of state.entities) {
    drawEntity(entity);
    if (!entity.isFerromagnetic() && !entity.isNonMagnetic()) {
      drawMagnetAttachedCount(entity);
    }
  }

  if (currentPreset === 'ruler_race') {
    drawRulerRaceUI();
  }

  if (state.showForces) {
    drawForceVectors();
  }

  if (state.selectedEntity) {
    drawSelectionOverlay(state.selectedEntity);
  }

  updateHUD();
}

/**
 * 统计并绘制磁铁吸附的回形针/铁钉数量徽章
 */
function drawMagnetAttachedCount(magnet) {
  let count = 0;
  for (const other of state.entities) {
    if (other !== magnet && (other.isFerromagnetic() || other.type === 'steel_ball')) {
      const dist = Math.hypot(other.x - magnet.x, other.y - magnet.y);
      if (dist < Math.max(magnet.width, magnet.height) * 0.75 + 20) {
        count++;
      }
    }
  }

  ctx.save();
  ctx.translate(magnet.x, magnet.y - magnet.height / 2 - 20);
  ctx.fillStyle = count > 0 ? 'rgba(16, 185, 129, 0.95)' : 'rgba(30, 41, 59, 0.8)';
  ctx.strokeStyle = count > 0 ? '#10b981' : '#64748b';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.roundRect(-42, -11, 84, 22, 11);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`📎 已吸: ${count}个`, 0, 0);

  ctx.restore();
}

/**
 * 直尺推回形针赛跑 UI
 */
function drawRulerRaceUI() {
  const cx = canvas.width / 2;

  // 更新直尺位置
  if (rulerSpeed > 0) {
    rulerY -= rulerSpeed;
    if (rulerY < canvas.height / 2 - 30) {
      rulerY = canvas.height / 2 - 30;
      rulerSpeed = 0;
    }
  }

  ctx.save();
  // 绘制黄色木质直尺
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(cx - 320, rulerY, 640, 28);
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 320, rulerY, 640, 28);

  // 刻度线
  ctx.fillStyle = '#78350f';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  for (let i = -300; i <= 300; i += 10) {
    const markH = i % 50 === 0 ? 12 : 6;
    ctx.fillRect(cx + i, rulerY, 1.5, markH);
    if (i % 50 === 0) {
      ctx.fillText(`${(i + 300) / 10}`, cx + i, rulerY + 20);
    }
  }

  // 按钮：“📐 推动直尺向上靠近磁铁”
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.roundRect(cx - 110, canvas.height - 70, 220, 42, 21);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📏 推动直尺向上靠近磁铁', cx, canvas.height - 49);

  ctx.restore();
}

function drawBackgroundGrid() {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 40;

  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHeatmap() {
  ctx.save();
  const step = 25;
  for (let x = 0; x < canvas.width; x += step) {
    for (let y = 0; y < canvas.height; y += step) {
      const B = computeMagneticField(x + step/2, y + step/2);
      const intensity = Math.min(1.0, B.mag / 1200);
      if (intensity > 0.02) {
        ctx.fillStyle = `rgba(0, 210, 255, ${intensity * 0.4})`;
        ctx.fillRect(x, y, step, step);
      }
    }
  }
  ctx.restore();
}

function drawVectorGrid() {
  ctx.save();
  const spacing = 45;
  for (let x = spacing / 2; x < canvas.width; x += spacing) {
    for (let y = spacing / 2; y < canvas.height; y += spacing) {
      const B = computeMagneticField(x, y);
      if (B.mag < 0.1) continue;

      const angle = Math.atan2(B.By, B.Bx);
      const len = Math.min(18, 4 + Math.log(1 + B.mag * 0.1) * 3);
      const alpha = Math.min(0.85, 0.15 + B.mag / 600);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = `rgba(0, 210, 255, ${alpha})`;
      ctx.fillStyle = `rgba(0, 210, 255, ${alpha})`;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(-len/2, 0);
      ctx.lineTo(len/2, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(len/2, 0);
      ctx.lineTo(len/2 - 4, -3);
      ctx.lineTo(len/2 - 4, 3);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }
  ctx.restore();
}

function drawFieldLines() {
  ctx.save();

  const northPoles = [];
  for (const entity of state.entities) {
    const poles = entity.getPoles();
    for (const p of poles) {
      if (p.q > 0) northPoles.push(p);
    }
  }

  ctx.lineWidth = 1.6;

  for (const p of northPoles) {
    const numLines = 14;
    for (let i = 0; i < numLines; i++) {
      const theta = (i / numLines) * Math.PI * 2;
      let currX = p.x + Math.cos(theta) * 12;
      let currY = p.y + Math.sin(theta) * 12;

      ctx.beginPath();
      ctx.moveTo(currX, currY);

      let stepCount = 0;
      const maxSteps = 120;
      const stepSize = 8;

      while (stepCount < maxSteps) {
        if (currX < 0 || currX > canvas.width || currY < 0 || currY > canvas.height) break;

        const B = computeMagneticField(currX, currY);
        if (B.mag < 0.01) break;

        const dx = (B.Bx / B.mag) * stepSize;
        const dy = (B.By / B.mag) * stepSize;

        currX += dx;
        currY += dy;
        ctx.lineTo(currX, currY);

        let reachedSouth = false;
        for (const entity of state.entities) {
          const poles = entity.getPoles();
          for (const sp of poles) {
            if (sp.q < 0) {
              const dist = Math.hypot(currX - sp.x, currY - sp.y);
              if (dist < 14) { reachedSouth = true; break; }
            }
          }
          if (reachedSouth) break;
        }

        if (reachedSouth) break;
        stepCount++;
      }

      ctx.strokeStyle = `rgba(0, 210, 255, 0.4)`;
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawIronFilings() {
  ctx.save();
  ctx.fillStyle = 'rgba(220, 235, 255, 0.5)';
  ctx.strokeStyle = 'rgba(190, 220, 255, 0.6)';
  ctx.lineWidth = 1.2;

  for (const filing of state.ironFilings) {
    const B = computeMagneticField(filing.x, filing.y);
    if (B.mag > 0.05) {
      const targetAngle = Math.atan2(B.By, B.Bx);
      let diff = targetAngle - filing.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      filing.angle += diff * 0.2;

      filing.x += (B.Bx / B.mag) * 0.08 * Math.min(3, B.mag * 0.01);
      filing.y += (B.By / B.mag) * 0.08 * Math.min(3, B.mag * 0.01);

      if (filing.x < 0) filing.x = canvas.width;
      if (filing.x > canvas.width) filing.x = 0;
      if (filing.y < 0) filing.y = canvas.height;
      if (filing.y > canvas.height) filing.y = 0;
    }

    ctx.save();
    ctx.translate(filing.x, filing.y);
    ctx.rotate(filing.angle);
    ctx.beginPath();
    ctx.moveTo(-filing.len / 2, 0);
    ctx.lineTo(filing.len / 2, 0);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawEntity(entity) {
  ctx.save();
  ctx.translate(entity.x, entity.y);
  ctx.rotate(entity.angle);

  if (entity.type === 'bar') {
    drawBarMagnet(entity);
  } else if (entity.type === 'ushape') {
    drawUShapeMagnet(entity);
  } else if (entity.type === 'horseshoe') {
    drawHorseshoeMagnet(entity);
  } else if (entity.type === 'button') {
    drawButtonMagnet(entity);
  } else if (entity.type === 'ring') {
    drawRingMagnet(entity);
  } else if (entity.type === 'compass') {
    drawCompass(entity);
  } else if (entity.type === 'steel_ball') {
    drawSteelBall(entity);
  } else if (entity.type === 'paperclip') {
    drawPaperclip(entity);
  } else if (entity.type === 'nail') {
    drawNail(entity);
  } else if (entity.type === 'coin') {
    drawCoin(entity);
  } else if (entity.type === 'key') {
    drawKey(entity);
  } else if (entity.type === 'wood') {
    drawWood(entity);
  } else if (entity.type === 'duck') {
    drawDuck(entity);
  } else if (entity.type === 'eraser') {
    drawEraser(entity);
  } else if (entity.type === 'al_can') {
    drawAlCan(entity);
  }

  if (entity.pinned) {
    ctx.fillStyle = '#f59e0b';
    ctx.font = '14px sans-serif';
    ctx.fillText('📌', -7, -entity.height / 2 - 8);
  }

  ctx.restore();
}

function drawBarMagnet(e) {
  const w = e.width;
  const h = e.height;
  const r = 4;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.roundRect(-w/2, -h/2, w/2, h, [r, 0, 0, r]);
  ctx.fill();

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.roundRect(0, -h/2, w/2, h, [0, r, r, 0]);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -h/2);
  ctx.lineTo(0, h/2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(10, Math.min(16, h * 0.45))}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', -w/4, 0);
  ctx.fillText('N', w/4, 0);
}

function drawUShapeMagnet(e) {
  const w = e.width;
  const h = e.height;
  const armT = 24;
  const backW = w * 0.35;
  const r = 4;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.roundRect(-w/2, -h/2, backW, h, [r, 0, 0, r]);
  ctx.fill();

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.roundRect(-w/2 + backW, -h/2, w - backW, armT, [0, r, r, 0]);
  ctx.fill();

  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.roundRect(-w/2 + backW, h/2 - armT, w - backW, armT, [0, r, r, 0]);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w/2 + backW, -h/2);
  ctx.lineTo(-w/2 + backW, -h/2 + armT);
  ctx.moveTo(-w/2 + backW, h/2 - armT);
  ctx.lineTo(-w/2 + backW, h/2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', w/2 - 16, -h/2 + armT / 2);
  ctx.fillText('S', w/2 - 16, h/2 - armT / 2);
}

function drawHorseshoeMagnet(e) {
  const w = e.width;
  const h = e.height;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 14;

  const rOuter = h * 0.46;
  const rInner = h * 0.22;
  const archCenterX = -w * 0.1;

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(archCenterX, 0, rOuter, -Math.PI, 0);
  ctx.lineTo(w/2, 0);
  ctx.lineTo(w/2, -(rOuter - rInner));
  ctx.lineTo(archCenterX + rInner, -(rOuter - rInner));
  ctx.arc(archCenterX, 0, rInner, 0, -Math.PI, true);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(archCenterX, 0, rOuter, Math.PI, 0, true);
  ctx.lineTo(w/2, 0);
  ctx.lineTo(w/2, (rOuter - rInner));
  ctx.lineTo(archCenterX + rInner, (rOuter - rInner));
  ctx.arc(archCenterX, 0, rInner, 0, Math.PI);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(w/2 - 14, -rOuter, 14, rOuter - rInner);
  ctx.fillRect(w/2 - 14, rInner, 14, rOuter - rInner);

  ctx.shadowColor = 'transparent';

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', w/2 - 7, -rOuter + (rOuter - rInner)/2);
  ctx.fillText('S', w/2 - 7, rInner + (rOuter - rInner)/2);
}

function drawButtonMagnet(e) {
  const r = e.width / 2;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;

  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fill();

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', -r*0.4, 0);
  ctx.fillText('N', r*0.4, 0);
}

function drawRingMagnet(e) {
  const rOuter = e.width / 2;
  const rInner = rOuter * 0.5;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 12;

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(0, 0, rOuter, -Math.PI, 0);
  ctx.arc(0, 0, rInner, 0, -Math.PI, true);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(0, 0, rOuter, 0, Math.PI);
  ctx.arc(0, 0, rInner, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', 0, - (rOuter + rInner)/2);
  ctx.fillText('S', 0, (rOuter + rInner)/2);
}

function drawCompass(e) {
  const r = e.width / 2;

  ctx.fillStyle = 'rgba(18, 26, 44, 0.85)';
  ctx.strokeStyle = '#00d2ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(r * 0.7, 0);
  ctx.lineTo(0, -4);
  ctx.lineTo(0, 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, 0);
  ctx.lineTo(0, -4);
  ctx.lineTo(0, 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawSteelBall(e) {
  const r = e.width / 2;
  const grad = ctx.createRadialGradient(-r*0.3, -r*0.3, r*0.1, 0, 0, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.4, '#94a3b8');
  grad.addColorStop(1, '#334155');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawPaperclip(e) {
  const w = e.width;
  const h = e.height;

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(-w/4, 0, h/2 - 2, Math.PI/2, -Math.PI/2);
  ctx.lineTo(w/4, -h/2 + 2);
  ctx.arc(w/4, 0, h/2 - 2, -Math.PI/2, Math.PI/2);
  ctx.lineTo(-w/6, h/2 - 2);
  ctx.stroke();
}

function drawNail(e) {
  const w = e.width;
  const h = e.height;

  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-w/2, -h/2, 4, h);

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-w/2 + 4, -3, w - 12, 6);

  ctx.beginPath();
  ctx.moveTo(w/2 - 8, -3);
  ctx.lineTo(w/2, 0);
  ctx.lineTo(w/2 - 8, 3);
  ctx.closePath();
  ctx.fill();
}

function drawCoin(e) {
  const r = e.width / 2;
  const grad = ctx.createRadialGradient(-r*0.3, -r*0.3, r*0.1, 0, 0, r);
  grad.addColorStop(0, '#fef08a');
  grad.addColorStop(0.5, '#eab308');
  grad.addColorStop(1, '#a16207');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#713f12';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('¥1', 0, 0);
}

function drawKey(e) {
  const w = e.width;

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(-w/2 + 10, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b0f19';
  ctx.beginPath();
  ctx.arc(-w/2 + 10, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-w/2 + 18, -2.5, w - 24, 5);
  ctx.fillRect(w/2 - 14, 2.5, 4, 5);
  ctx.fillRect(w/2 - 8, 2.5, 4, 7);
}

function drawWood(e) {
  const w = e.width;
  const h = e.height;

  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.roundRect(-w/2, -h/2, w, h, 4);
  ctx.fill();

  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-w/2 + 6, -h/4);
  ctx.lineTo(w/2 - 6, -h/4);
  ctx.moveTo(-w/2 + 10, h/4);
  ctx.lineTo(w/2 - 10, h/4);
  ctx.stroke();
}

function drawDuck(e) {
  const r = e.width / 2;

  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(0, 4, r * 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.3, r * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(-r * 0.7, -r * 0.3, r * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-r * 0.4, -r * 0.45, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawEraser(e) {
  const w = e.width;
  const h = e.height;

  ctx.fillStyle = '#f472b6';
  ctx.beginPath();
  ctx.roundRect(-w/2, -h/2, w*0.6, h, [4, 0, 0, 4]);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(-w/2 + w*0.6, -h/2, w*0.4, h, [0, 4, 4, 0]);
  ctx.fill();

  ctx.fillStyle = '#475569';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('橡皮', -w/2 + w*0.8, 0);
}

function drawAlCan(e) {
  const w = e.width;
  const h = e.height;

  const grad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
  grad.addColorStop(0, '#94a3b8');
  grad.addColorStop(0.3, '#f1f5f9');
  grad.addColorStop(0.7, '#e2e8f0');
  grad.addColorStop(1, '#64748b');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-w/2, -h/2, w, h, 6);
  ctx.fill();

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-w/2, -h/4, w, h/2);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('铝可乐', 0, 0);
}

function drawForceVectors() {
  ctx.save();
  for (const entity of state.entities) {
    if (entity.pinned) continue;
    const forceMag = Math.hypot(entity.vx, entity.vy);
    if (forceMag < 0.2) continue;

    ctx.save();
    ctx.translate(entity.x, entity.y);
    const angle = Math.atan2(entity.vy, entity.vx);
    ctx.rotate(angle);

    const arrowLen = Math.min(50, 15 + forceMag * 0.3);
    ctx.strokeStyle = '#10b981';
    ctx.fillStyle = '#10b981';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(arrowLen, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(arrowLen, 0);
    ctx.lineTo(arrowLen - 6, -4);
    ctx.lineTo(arrowLen - 6, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
  ctx.restore();
}

function drawSelectionOverlay(entity) {
  if (!entity) return;
  ctx.save();
  ctx.translate(entity.x, entity.y);
  ctx.rotate(entity.angle);

  const w = entity.width + 16;
  const h = entity.height + 16;

  ctx.strokeStyle = '#00d2ff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(-w/2, -h/2, w, h);
  ctx.setLineDash([]);

  const handleX = entity.width / 2 + 24;
  ctx.fillStyle = '#00d2ff';
  ctx.shadowColor = '#00d2ff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(handleX, 0, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(entity.width / 2 + 8, 0);
  ctx.lineTo(handleX, 0);
  ctx.stroke();

  ctx.restore();
}

function updateHUD() {
  document.getElementById('hud-magnet-count').textContent = state.entities.length;
  
  let poleCount = 0;
  for (const e of state.entities) {
    poleCount += e.getPoles().length;
  }
  document.getElementById('hud-pole-count').textContent = poleCount;

  const now = performance.now();
  state.frameCount++;
  if (now - state.lastFrameTime >= 500) {
    state.fps = Math.round((state.frameCount * 1000) / (now - state.lastFrameTime));
    document.getElementById('hud-fps').textContent = state.fps;
    state.frameCount = 0;
    state.lastFrameTime = now;
  }
}

function setupInteractions() {
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    state.mousePos = { x: mx, y: my };

    // 直尺赛跑推直尺按钮点击
    if (currentPreset === 'ruler_race') {
      const cx = canvas.width / 2;
      if (Math.abs(mx - cx) < 110 && Math.abs(my - (canvas.height - 49)) < 21) {
        sounds.playClink();
        rulerSpeed = 1.2;
        showToast('🚀 推动直尺向上！注意看哪个回形针最先被磁铁吸飞上去！');
        return;
      }
    }

    if (state.selectedEntity) {
      const eObj = state.selectedEntity;
      const cos = Math.cos(eObj.angle);
      const sin = Math.sin(eObj.angle);
      const handleX = eObj.x + (eObj.width / 2 + 24) * cos;
      const handleY = eObj.y + (eObj.width / 2 + 24) * sin;

      if (Math.hypot(mx - handleX, my - handleY) < 16) {
        state.isRotating = true;
        return;
      }
    }

    let hitEntity = null;
    for (let i = state.entities.length - 1; i >= 0; i--) {
      const ent = state.entities[i];
      const dx = mx - ent.x;
      const dy = my - ent.y;
      const dist = Math.hypot(dx, dy);

      if (dist < ent.width / 2 + 8) {
        hitEntity = ent;
        break;
      }
    }

    if (hitEntity) {
      state.selectedEntity = hitEntity;
      state.isDragging = true;
      state.dragOffset = { x: mx - hitEntity.x, y: my - hitEntity.y };
      updateInspector();
    } else {
      state.selectedEntity = null;
      hideInspector();
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    state.dragVelocity = {
      x: mx - state.mousePos.x,
      y: my - state.mousePos.y
    };
    state.mousePos = { x: mx, y: my };

    if (state.isRotating && state.selectedEntity) {
      const dx = mx - state.selectedEntity.x;
      const dy = my - state.selectedEntity.y;
      state.selectedEntity.angle = Math.atan2(dy, dx);
    } else if (state.isDragging && state.selectedEntity) {
      state.selectedEntity.x = mx - state.dragOffset.x;
      state.selectedEntity.y = my - state.dragOffset.y;
      state.selectedEntity.vx = state.dragVelocity.x * 10;
      state.selectedEntity.vy = state.dragVelocity.y * 10;
    }
  });

  window.addEventListener('mouseup', () => {
    if (state.isDragging && state.selectedEntity) {
      state.selectedEntity.vx = state.dragVelocity.x * 20;
      state.selectedEntity.vy = state.dragVelocity.y * 20;
    }
    state.isDragging = false;
    state.isRotating = false;
  });

  canvas.addEventListener('dblclick', (e) => {
    if (state.selectedEntity && !state.selectedEntity.isFerromagnetic() && !state.selectedEntity.isNonMagnetic()) {
      state.selectedEntity.flipPoles();
    }
  });
}

/**
 * Inspector Bar UI Management
 */
const inspectorBar = document.getElementById('inspector-bar');
const inspectStrengthGroup = document.getElementById('inspect-strength-group');
const inspectStrength = document.getElementById('inspect-strength');
const inspectStrengthVal = document.getElementById('inspect-strength-val');
const inspectPin = document.getElementById('inspect-pin');
const inspectBtnFlip = document.getElementById('inspect-btn-flip');
const inspectBtnDrop = document.getElementById('inspect-btn-drop');
const inspectBtnHeat = document.getElementById('inspect-btn-heat');

function updateInspector() {
  const e = state.selectedEntity;
  if (!e) {
    hideInspector();
    return;
  }

  inspectorBar.classList.remove('hidden');
  document.getElementById('inspector-name').textContent = `${getItemName(e.type)} #${e.id}`;
  inspectStrength.value = e.strength;
  inspectStrengthVal.textContent = `${e.strength.toFixed(1)}x`;
  inspectPin.checked = e.pinned;

  if (e.isNonMagnetic() || e.isFerromagnetic()) {
    inspectStrengthGroup.style.display = 'none';
    inspectBtnFlip.style.display = 'none';
    if (inspectBtnDrop) inspectBtnDrop.style.display = 'none';
    if (inspectBtnHeat) inspectBtnHeat.style.display = 'none';
    inspectBtnBreak.style.display = 'none';
  } else {
    inspectStrengthGroup.style.display = 'flex';
    inspectBtnFlip.style.display = 'inline-flex';
    if (inspectBtnDrop) inspectBtnDrop.style.display = 'inline-flex';
    if (inspectBtnHeat) inspectBtnHeat.style.display = 'inline-flex';
    if (e.type === 'bar' || e.type === 'button') {
      inspectBtnBreak.style.display = 'inline-flex';
    } else {
      inspectBtnBreak.style.display = 'none';
    }
  }
}

function hideInspector() {
  inspectorBar.classList.add('hidden');
}

function getItemName(type) {
  const names = {
    'bar': '条形磁铁',
    'ushape': 'U型磁铁',
    'horseshoe': '马蹄形磁铁',
    'button': '纽扣磁铁',
    'ring': '环形磁铁',
    'compass': '指南针',
    'steel_ball': '钢球',
    'paperclip': '📎 回形针(铁)',
    'nail': '📌 铁钉(铁)',
    'coin': '🪙 铁质硬币',
    'key': '🔑 铁钥匙',
    'wood': '🪵 木块(非磁性)',
    'duck': '🦆 塑料鸭(非磁性)',
    'eraser': '✏️ 橡皮擦(非磁性)',
    'al_can': '🥤 铝易拉罐(非磁性)'
  };
  return names[type] || '物品';
}

inspectStrength.addEventListener('input', (evt) => {
  if (state.selectedEntity) {
    state.selectedEntity.strength = parseFloat(evt.target.value);
    inspectStrengthVal.textContent = `${state.selectedEntity.strength.toFixed(1)}x`;
  }
});

inspectPin.addEventListener('change', (evt) => {
  if (state.selectedEntity) {
    state.selectedEntity.pinned = evt.target.checked;
  }
});

inspectBtnFlip.addEventListener('click', () => {
  if (state.selectedEntity && !state.selectedEntity.isFerromagnetic() && !state.selectedEntity.isNonMagnetic()) {
    state.selectedEntity.flipPoles();
  }
});

if (inspectBtnDrop) {
  inspectBtnDrop.addEventListener('click', () => {
    if (state.selectedEntity && !state.selectedEntity.isFerromagnetic() && !state.selectedEntity.isNonMagnetic()) {
      dropEntity(state.selectedEntity);
    }
  });
}

if (inspectBtnHeat) {
  inspectBtnHeat.addEventListener('click', () => {
    if (state.selectedEntity && !state.selectedEntity.isFerromagnetic() && !state.selectedEntity.isNonMagnetic()) {
      heatEntity(state.selectedEntity);
    }
  });
}

inspectBtnBreak.addEventListener('click', () => {
  if (state.selectedEntity) {
    breakEntity(state.selectedEntity);
  }
});

inspectBtnDelete.addEventListener('click', () => {
  if (state.selectedEntity) {
    state.entities = state.entities.filter(ent => ent !== state.selectedEntity);
    state.selectedEntity = null;
    hideInspector();
  }
});

/**
 * 跌落损伤磁铁物理逻辑
 */
function dropEntity(entity) {
  if (!entity) return;
  sounds.playCrack();
  entity.strength = Math.max(0.1, entity.strength * 0.65);
  entity.vx += (Math.random() - 0.5) * 200;
  entity.vy += 150; // 向下撞击
  updateInspector();

  showToast(`💥 磁铁跌落受到震动！磁力削弱至 ${entity.strength.toFixed(1)}x ！再次测试吸引回形针数量会减少！`);
}

/**
 * 高温火烧消磁物理逻辑
 */
function heatEntity(entity) {
  if (!entity) return;
  sounds.playCrack();
  entity.strength = 0.05; // 居里点急剧消磁
  entity.isHeated = true;
  updateInspector();

  showToast(`🔥 高温火烧（居里点消磁）！磁性分子排列被打乱，磁力几乎消失 (${entity.strength.toFixed(2)}x)！`);
}

/**
 * 摔断磁铁逻辑
 */
function breakEntity(entity) {
  if (!entity || (entity.type !== 'bar' && entity.type !== 'button')) return;
  sounds.playCrack();

  const idx = state.entities.indexOf(entity);
  if (idx !== -1) state.entities.splice(idx, 1);

  const cos = Math.cos(entity.angle);
  const sin = Math.sin(entity.angle);
  const halfW = entity.width / 2;
  const offset = halfW / 2;

  const leftX = entity.x - offset * cos;
  const leftY = entity.y - offset * sin;
  const rightX = entity.x + offset * cos;
  const rightY = entity.y + offset * sin;

  const m1 = new MagnetEntity('bar', leftX, leftY, entity.angle, entity.strength, halfW - 4, entity.height);
  const m2 = new MagnetEntity('bar', rightX, rightY, entity.angle, entity.strength, halfW - 4, entity.height);

  m1.vx = -cos * 40 - sin * 10;
  m1.vy = -sin * 40 + cos * 10;
  m2.vx = cos * 40 + sin * 10;
  m2.vy = sin * 40 - cos * 10;

  state.entities.push(m1, m2);
  state.selectedEntity = m1;
  updateInspector();

  showToast('🔨 磁铁折断成两半！每半块重新自动形成了独立的 N极 与 S极！');
}

let toastTimeout = null;
function showToast(msg) {
  let toast = document.getElementById('sim-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sim-toast';
    toast.style.position = 'absolute';
    toast.style.top = '75px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(15, 23, 42, 0.9)';
    toast.style.color = '#fbbf24';
    toast.style.border = '2px solid #fbbf24';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '24px';
    toast.style.fontWeight = 'bold';
    toast.style.fontSize = '14px';
    toast.style.zIndex = '1000';
    toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
    toast.style.pointerEvents = 'none';
    document.querySelector('.viewport-container').appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.style.display = 'none';
  }, 4000);
}

/**
 * UI Panel Controls Setup
 */
function setupUIControls() {
  document.getElementById('spawn-bar').addEventListener('click', () => spawnEntity('bar'));
  document.getElementById('spawn-ushape').addEventListener('click', () => spawnEntity('ushape'));
  document.getElementById('spawn-horseshoe').addEventListener('click', () => spawnEntity('horseshoe'));
  document.getElementById('spawn-button').addEventListener('click', () => spawnEntity('button'));
  document.getElementById('spawn-ring').addEventListener('click', () => spawnEntity('ring'));
  document.getElementById('spawn-compass').addEventListener('click', () => spawnEntity('compass'));

  document.getElementById('spawn-paperclip').addEventListener('click', () => spawnEntity('paperclip'));
  document.getElementById('spawn-nail').addEventListener('click', () => spawnEntity('nail'));
  document.getElementById('spawn-coin').addEventListener('click', () => spawnEntity('coin'));
  document.getElementById('spawn-key').addEventListener('click', () => spawnEntity('key'));
  document.getElementById('spawn-wood').addEventListener('click', () => spawnEntity('wood'));
  document.getElementById('spawn-duck').addEventListener('click', () => spawnEntity('duck'));
  document.getElementById('spawn-eraser').addEventListener('click', () => spawnEntity('eraser'));
  document.getElementById('spawn-alcan').addEventListener('click', () => spawnEntity('al_can'));

  document.getElementById('toggle-fieldlines').addEventListener('change', (e) => state.showFieldLines = e.target.checked);
  document.getElementById('toggle-filings').addEventListener('change', (e) => state.showFilings = e.target.checked);
  document.getElementById('toggle-vectorgrid').addEventListener('change', (e) => state.showVectorGrid = e.target.checked);
  document.getElementById('toggle-heatmap').addEventListener('change', (e) => state.showHeatmap = e.target.checked);
  document.getElementById('toggle-forces').addEventListener('change', (e) => state.showForces = e.target.checked);
  document.getElementById('toggle-sound').addEventListener('change', (e) => sounds.enabled = e.target.checked);

  document.getElementById('slider-strength').addEventListener('input', (e) => {
    state.globalStrength = parseFloat(e.target.value);
    document.getElementById('val-strength').textContent = `${state.globalStrength.toFixed(1)}x`;
  });
  document.getElementById('slider-damping').addEventListener('input', (e) => {
    state.damping = parseFloat(e.target.value);
    document.getElementById('val-damping').textContent = state.damping.toFixed(2);
  });
  document.getElementById('slider-speed').addEventListener('input', (e) => {
    state.simSpeed = parseFloat(e.target.value);
    document.getElementById('val-speed').textContent = `${state.simSpeed.toFixed(1)}x`;
  });
  document.getElementById('slider-filings-count').addEventListener('input', (e) => {
    state.filingsCount = parseInt(e.target.value);
    document.getElementById('val-filings-count').textContent = state.filingsCount;
    initIronFilings();
  });

  const btnPause = document.getElementById('btn-pause');
  btnPause.addEventListener('click', () => {
    state.paused = !state.paused;
    btnPause.querySelector('.text').textContent = state.paused ? '继续' : '暂停';
    btnPause.querySelector('.icon').textContent = state.paused ? '▶️' : '⏸️';
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    state.entities = [];
    state.selectedEntity = null;
    hideInspector();
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    const preset = document.getElementById('preset-select').value;
    loadPreset(preset);
  });

  document.getElementById('preset-select').addEventListener('change', (e) => {
    loadPreset(e.target.value);
  });
}

function spawnEntity(type) {
  const cx = canvas.width / 2 + (Math.random() - 0.5) * 100;
  const cy = canvas.height / 2 + (Math.random() - 0.5) * 100;
  const entity = new MagnetEntity(type, cx, cy);
  state.entities.push(entity);
  state.selectedEntity = entity;
  updateInspector();
  sounds.playClink();
}

function spawnCompassGrid() {
  const cols = 7;
  const rows = 5;
  const startX = canvas.width / 2 - (cols * 50) / 2;
  const startY = canvas.height / 2 - (rows * 50) / 2;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const compass = new MagnetEntity('compass', startX + c * 50, startY + r * 50);
      state.entities.push(compass);
    }
  }
}

let currentPreset = 'kids_test';
let rulerY = 0; // 直尺 Y 坐标
let rulerSpeed = 0;

function loadPreset(preset) {
  currentPreset = preset;
  state.entities = [];
  state.selectedEntity = null;
  hideInspector();

  // 确保画布尺寸正确
  if (!canvas.width || canvas.width < 100) {
    resizeCanvas();
  }

  const w = canvas.width > 100 ? canvas.width : (window.innerWidth > 400 ? window.innerWidth - 340 : 600);
  const h = canvas.height > 100 ? canvas.height : (window.innerHeight > 200 ? window.innerHeight - 100 : 500);
  const cx = Math.max(150, w / 2);
  const cy = Math.max(150, h / 2);

  if (preset === 'kids_test') {
    const magnet = new MagnetEntity('bar', cx, cy, 0, 2.5);
    magnet.pinned = true;
    state.entities.push(magnet);

    state.entities.push(new MagnetEntity('paperclip', cx - 180, cy - 60));
    state.entities.push(new MagnetEntity('nail', cx - 200, cy));
    state.entities.push(new MagnetEntity('coin', cx - 170, cy + 60));
    state.entities.push(new MagnetEntity('key', cx - 220, cy + 30));

    state.entities.push(new MagnetEntity('wood', cx + 180, cy - 60));
    state.entities.push(new MagnetEntity('duck', cx + 200, cy));
    state.entities.push(new MagnetEntity('eraser', cx + 170, cy + 60));
    state.entities.push(new MagnetEntity('al_can', cx + 220, cy - 20));

    state.selectedEntity = magnet;
    updateInspector();
    showToast('🧪 一年级实验 1：磁铁只能吸引铁制品（回形针、铁钉、硬币、钥匙），不能吸引木头、橡皮、塑料和铝！');
  } else if (preset === 'attract') {
    const m1 = new MagnetEntity('bar', cx - 160, cy, 0, 2.5);
    const m2 = new MagnetEntity('bar', cx + 160, cy, 0, 2.5);
    state.entities.push(m1, m2);
    showToast('🧲 一年级实验 2：异极相吸（红极 N 与 蓝极 S 靠近会强烈吸引粘在一起）！');
  } else if (preset === 'repel') {
    const m1 = new MagnetEntity('bar', cx - 160, cy, 0, 2.5);
    const m2 = new MagnetEntity('bar', cx + 160, cy, Math.PI, 2.5);
    state.entities.push(m1, m2);
    showToast('🚫 一年级实验 3：同极相斥（红极 N 与 红极 N 靠近会互相推开推走）！');
  } else if (preset === 'compare_strength') {
    // 磁力强弱比拼 (吸回形针数量)
    const m1 = new MagnetEntity('bar', cx - 220, cy - 100, 0, 3.5); // 强
    const m2 = new MagnetEntity('bar', cx, cy - 100, 0, 1.5);       // 中
    const m3 = new MagnetEntity('bar', cx + 220, cy - 100, 0, 0.4); // 弱
    m1.pinned = true; m2.pinned = true; m3.pinned = true;
    m1.label = '强磁铁 (3.5x)';
    m2.label = '中磁铁 (1.5x)';
    m3.label = '弱磁铁 (0.4x)';
    state.entities.push(m1, m2, m3);

    // 下方散落大量回形针
    for (let i = 0; i < 24; i++) {
      const px = cx + (Math.random() - 0.5) * 600;
      const py = cy + 40 + (Math.random() - 0.5) * 80;
      state.entities.push(new MagnetEntity('paperclip', px, py));
    }
    showToast('📊 一年级实验 4：比较磁力强弱！磁力越强，吸起的回形针数量越多！观察三块磁铁吸的数量！');
  } else if (preset === 'heat_drop_damage') {
    // 跌落与火烧对磁力的破坏
    const m1 = new MagnetEntity('bar', cx - 220, cy - 80, 0, 3.0); // 完好
    const m2 = new MagnetEntity('bar', cx, cy - 80, 0, 1.0);       // 跌落过
    const m3 = new MagnetEntity('bar', cx + 220, cy - 80, 0, 0.08); // 火烧过
    m1.pinned = true; m2.pinned = true; m3.pinned = true;
    m2.isDropped = true;
    m3.isHeated = true;

    state.entities.push(m1, m2, m3);

    // 前方放置回形针
    for (let i = 0; i < 18; i++) {
      const px = cx + (Math.random() - 0.5) * 580;
      const py = cy + 50 + (Math.random() - 0.5) * 60;
      state.entities.push(new MagnetEntity('paperclip', px, py));
    }
    showToast('🔥💥 一年级实验 5：跌落和火烧会破坏磁铁磁力！被跌落撞击或火烧加热后，吸回形针数量大大减少！');
  } else if (preset === 'ruler_race') {
    // 直尺推回形针赛跑 (磁力作用距离大比拼)
    const m1 = new MagnetEntity('bar', cx - 220, cy - 140, Math.PI/2, 4.0); // 强磁铁
    const m2 = new MagnetEntity('bar', cx, cy - 140, Math.PI/2, 1.8);       // 中磁铁
    const m3 = new MagnetEntity('bar', cx + 220, cy - 140, Math.PI/2, 0.4); // 弱磁铁
    m1.pinned = true; m2.pinned = true; m3.pinned = true;
    state.entities.push(m1, m2, m3);

    rulerY = cy + 180;
    rulerSpeed = 0;

    // 3个回形针放在直尺上方
    const pc1 = new MagnetEntity('paperclip', cx - 220, rulerY - 15);
    const pc2 = new MagnetEntity('paperclip', cx, rulerY - 15);
    const pc3 = new MagnetEntity('paperclip', cx + 220, rulerY - 15);
    state.entities.push(pc1, pc2, pc3);

    showToast('📏 一年级实验 6：直尺推回形针赛跑！点击【推动直尺向上】，看看哪块磁铁在最远的地方最先吸走回形针！');
  } else if (preset === 'break_demo') {
    const mainBar = new MagnetEntity('bar', cx, cy, 0, 2.0, 160, 46);
    state.entities.push(mainBar);
    state.selectedEntity = mainBar;
    updateInspector();
  } else if (preset === 'quad') {
    const r = 120;
    const m1 = new MagnetEntity('bar', cx, cy - r, 0);
    const m2 = new MagnetEntity('bar', cx + r, cy, Math.PI / 2);
    const m3 = new MagnetEntity('bar', cx, cy + r, Math.PI);
    const m4 = new MagnetEntity('bar', cx - r, cy, -Math.PI / 2);
    state.entities.push(m1, m2, m3, m4);
  } else if (preset === 'iron_filings') {
    state.showFilings = true;
    state.showFieldLines = true;
    document.getElementById('toggle-filings').checked = true;
    document.getElementById('toggle-fieldlines').checked = true;

    const horseshoe = new MagnetEntity('horseshoe', cx - 120, cy, 0);
    const bar = new MagnetEntity('bar', cx + 140, cy, Math.PI / 4);
    state.entities.push(horseshoe, bar);
  } else if (preset === 'compass_grid') {
    state.showFieldLines = false;
    document.getElementById('toggle-fieldlines').checked = false;

    const centerMagnet = new MagnetEntity('bar', cx, cy, 0, 2.0);
    centerMagnet.pinned = true;
    state.entities.push(centerMagnet);
    spawnCompassGrid();
  }
}

let lastTime = performance.now();

function loop(currentTime) {
  const dt = Math.min(0.05, (currentTime - lastTime) / 1000);
  lastTime = currentTime;

  updatePhysics(dt);
  render();

  requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  setupInteractions();
  setupUIControls();

  // 延迟 100ms 重新计算 Canvas 真实尺寸与加载预设，防止弹性布局计算滞后
  setTimeout(() => {
    resizeCanvas();
    if (state.entities.length === 0) {
      loadPreset('kids_test');
    }
  }, 100);

  requestAnimationFrame(loop);
});
