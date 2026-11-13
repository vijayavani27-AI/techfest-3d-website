/* =========================================================
   TECHFEST 3D — scroll-driven Three.js experience
   ========================================================= */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/* ---------- Utils ---------- */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const isMobile = () => innerWidth < 768;

const SPACING = 26; // distance between worlds along -Z
const sections = $$(".sec");
const N = sections.length;
const panels = sections.map((s) => s.querySelector(".panel"));
const dots = $$(".dots button");
const navLinks = $$(".nav__links a");
const heroTitle = $("#heroTitle");
const progressBar = $("#progressBar");

/* =========================================================
   CONTENT for the pop-up cards
   ========================================================= */
const INFO = {
  core: {
    tag: "IIT Bombay", title: "Techfest",
    body: "Asia's largest science and technology festival brings students, researchers, innovators and industry leaders together for a few unforgettable days of competitions, workshops, lectures, exhibitions and night shows.",
    list: ["Competitions", "Workshops", "Lectures", "Exhibitions", "Night shows"],
  },
  compete: {
    tag: "01 · Compete", title: "Competitions",
    body: "From combat robots to all-night hackathons, the competitions are where ideas are tested under pressure.",
    list: ["Robowars: combat robotics", "Hackathons and coding sprints", "Drone and aeromodelling challenges", "Ideation and business-plan contests"],
  },
  build: {
    tag: "02 · Build", title: "Workshops",
    body: "Hands-on, project-based sessions run by industry experts. You walk in curious and walk out with something you built.",
    list: ["AI / Machine Learning", "Ethical Hacking and Cyber Security", "IoT and Embedded Systems", "Quantum Computing basics"],
  },
  listen: {
    tag: "03 · Listen", title: "Lectures",
    body: "Talks and conversations with the people pushing the frontiers of science, space, business and technology.",
    list: ["Scientists and researchers", "Astronauts and space explorers", "Founders and industry leaders", "Panel discussions and live Q&A"],
  },
  explore: {
    tag: "04 · Explore", title: "Exhibitions",
    body: "A walk-through showcase of breakthrough technology from labs, startups and organisations around the world. Click any floating card in the 3D carousel to learn more.",
    list: ["Humanoid and service robots", "Space and defence hardware", "Health-tech and clean energy", "AR / VR experiences"],
  },
  launch: {
    tag: "05 · Launch", title: "Join Techfest",
    body: "Registrations, passes and event details are on the official Techfest website.",
    list: ["Register for competitions", "Book workshop seats", "Get updates on lectures and shows"],
    link: { href: "https://techfest.org", text: "Open techfest.org ↗" },
  },
};
const EXHIBITS = [
  ["AI &", "ROBOTICS", "#a78bfa", "Humanoids, robot dogs and AI assistants that see, talk and learn."],
  ["SPACE", "TECH", "#22d3ee", "Rovers, satellites and the hardware taking humanity further out."],
  ["DEFENCE", "SYSTEMS", "#f472b6", "Next-gen drones, radar and protective technology."],
  ["HEALTH", "TECH", "#34d399", "Smart prosthetics, bio-sensors and AI diagnostics."],
  ["CLEAN", "ENERGY", "#facc15", "Solar, hydrogen and storage tech for a greener planet."],
  ["FUTURE", "MOBILITY", "#60a5fa", "Electric vehicles, hyperloop concepts and autonomous cars."],
  ["QUANTUM", "COMPUTING", "#c084fc", "Qubits, cryogenics and the next era of computing."],
  ["AR / VR", "WORLDS", "#fb7185", "Immersive headsets and mixed-reality playgrounds."],
];
EXHIBITS.forEach(([a, b, , desc], i) => {
  INFO["ex" + i] = { tag: `Exhibit 0${i + 1}`, title: `${a} ${b}`.replace("& ", "& "), body: desc, list: [] };
});

/* =========================================================
   MODAL
   ========================================================= */
const modal = $("#modal");
let lastFocus = null;
function openModal(key) {
  const d = INFO[key];
  if (!d) return;
  lastFocus = document.activeElement;
  $("#modalTag").textContent = d.tag;
  $("#modalTitle").textContent = d.title;
  $("#modalBody").textContent = d.body;
  const list = $("#modalList");
  list.innerHTML = "";
  d.list.forEach((t) => { const li = document.createElement("li"); li.textContent = t; list.appendChild(li); });
  list.hidden = !d.list.length;
  const link = $("#modalLink");
  if (d.link) { link.hidden = false; link.href = d.link.href; link.textContent = d.link.text; } else link.hidden = true;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  setTimeout(() => $("#modalClose").focus(), 50);
}
function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (lastFocus) lastFocus.focus({ preventScroll: true });
}
$$("[data-close]", modal).forEach((el) => el.addEventListener("click", closeModal));
addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal(); });
$$("[data-open]").forEach((b) => b.addEventListener("click", () => openModal(b.dataset.open)));
dots.forEach((d, i) => d.addEventListener("click", () => sections[i].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" })));

/* =========================================================
   SCROLL + POINTER STATE
   ========================================================= */
const state = { target: 0, current: 0, prev: 0, speed: 0, bank: 0, mx: 0, my: 0, smx: 0, smy: 0, intro: 0, ready: false, active: -1 };
function readScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  state.target = max > 0 ? clamp(scrollY / max, 0, 1) * (N - 1) : 0;
}
addEventListener("scroll", readScroll, { passive: true });
readScroll();
state.current = state.prev = state.target;

const pointer = new THREE.Vector2(10, 10);
let pointerMoved = false;
const cursor = $("#cursor");
const tooltip = $("#tooltip");
addEventListener("pointermove", (e) => {
  state.mx = (e.clientX / innerWidth) * 2 - 1;
  state.my = -((e.clientY / innerHeight) * 2 - 1);
  if (e.pointerType === "mouse") { pointer.set(state.mx, state.my); pointerMoved = true; }
  if (finePointer) {
    cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    tooltip.style.left = e.clientX + "px";
    tooltip.style.top = e.clientY + "px";
  }
});
document.addEventListener("pointerover", (e) => {
  if (e.target.closest && e.target.closest("a, button")) document.body.classList.add("is-pointing");
});
document.addEventListener("pointerout", (e) => {
  if (e.target.closest && e.target.closest("a, button") && !hoveredMesh) document.body.classList.remove("is-pointing");
});

/* =========================================================
   HTML UI driven by scroll (3D panel transitions)
   ========================================================= */
function updateUI(t) {
  const active = clamp(Math.round(t), 0, N - 1);
  if (active !== state.active) {
    state.active = active;
    sections.forEach((s, i) => s.classList.toggle("is-active", i === active));
    dots.forEach((d, i) => d.setAttribute("aria-current", i === active ? "true" : "false"));
    navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + sections[active].id));
  }
  panels.forEach((p, i) => {
    const d = t - i, ad = Math.abs(d);
    if (ad > 1.3) { p.style.opacity = "0"; return; }
    p.style.opacity = clamp(1 - ad * 1.4, 0, 1).toFixed(3);
    if (reduceMotion) return;
    const dir = sections[i].dataset.side === "right" ? -1 : 1;
    p.style.transform = `perspective(1200px) translate3d(0, ${(d * -60).toFixed(1)}px, ${(-ad * 260).toFixed(1)}px) rotateY(${(d * dir * 32).toFixed(2)}deg) rotateX(${(d * -10).toFixed(2)}deg)`;
  });
  progressBar.style.width = (t / (N - 1)) * 100 + "%";
  heroTitle.style.setProperty("--rx", (state.smy * 10).toFixed(2) + "deg");
  heroTitle.style.setProperty("--ry", (state.smx * -14).toFixed(2) + "deg");
}

/* =========================================================
   LOADER
   ========================================================= */
const loadPct = $("#loadPct");
let shownPct = 0, realPct = 0;
const pctTimer = setInterval(() => {
  shownPct = Math.min(realPct, shownPct + 3);
  loadPct.textContent = Math.round(shownPct);
}, 30);
function setProgress(p) { realPct = Math.max(realPct, p); }
setProgress(25);

function markReady() {
  setProgress(100);
  const wait = setInterval(() => {
    if (shownPct >= 100) {
      clearInterval(wait); clearInterval(pctTimer);
      document.body.classList.add("is-ready");
      state.ready = true;
    }
  }, 40);
}

/* =========================================================
   THREE.JS SCENE
   ========================================================= */
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $("#webgl"), antialias: true, powerPreference: "high-performance" });
} catch (err) {
  console.warn("WebGL unavailable, showing 2D fallback.", err);
  document.body.classList.add("no-webgl");
}

let scene, camera, composer = null, objects = [], stars, streaks, hoveredMesh = null;
const raycaster = new THREE.Raycaster();
const PALETTE = ["#090317", "#1a0624", "#03141f", "#0d0a26", "#170918", "#07031c"].map((c) => new THREE.Color(c));
const bg = new THREE.Color();

/* ---------- helpers ---------- */
function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.25, "rgba(255,255,255,.75)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let GLOW;
function makePoints(count, fill, size, { fog = true, color = 0xffffff, opacity = 1 } = {}) {
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const v = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < count; i++) { fill(i, v, c); v.toArray(pos, i * 3); c.toArray(col, i * 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({
    size, map: GLOW, vertexColors: true, color, transparent: true, opacity,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog,
  });
  return new THREE.Points(g, m);
}
function hitSphere(r, key, parent) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ visible: false }));
  m.userData.key = key; parent.add(m);
  return m;
}

/* ---------- 0 · Innovation Core ---------- */
function makeCore() {
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1, 4);
  const base = geo.attributes.position.array.slice();
  const innerMat = new THREE.MeshStandardMaterial({ color: 0x3b1a7a, emissive: 0x7c3aed, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.25, flatShading: true });
  const inner = new THREE.Mesh(geo, innerMat);
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 1), new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.45 }));
  group.add(inner, shell);
  const rings = [0xa78bfa, 0x22d3ee, 0xf472b6].map((col, k) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(2.1 + k * 0.34, 0.012, 8, 220), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 }));
    r.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    r.userData.s = (k + 1) * 0.12 * (k % 2 ? -1 : 1);
    group.add(r);
    return r;
  });
  const dust = makePoints(isMobile() ? 500 : 900, (i, v, c) => {
    v.randomDirection().multiplyScalar(2.4 + Math.random() * 1.6);
    c.setHSL(lerp(0.5, 0.85, Math.random()), 0.9, 0.7);
  }, 0.07);
  group.add(dust);
  const o = {
    group, targets: [hitSphere(1.9, "core", group)], hover: 0,
    update(local, time) {
      const p = geo.attributes.position;
      const amp = 0.07 * (1 + this.hover * 2.5);
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
        const d = 1 + amp * Math.sin(x * 4 + time * 1.6) * Math.sin(y * 4 + time * 1.3) * Math.sin(z * 4 + time);
        p.setXYZ(i, x * d, y * d, z * d);
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
      group.rotation.y += 0.003;
      group.rotation.x = Math.sin(time * 0.2) * 0.2;
      shell.rotation.x = time * 0.12; shell.rotation.z = time * 0.07;
      rings.forEach((r) => { r.rotation.z += r.userData.s * 0.02; r.rotation.x += r.userData.s * 0.006; });
      const out = Math.max(0, local);
      shell.scale.setScalar(1 + out * 1.4 + this.hover * 0.1);
      dust.scale.setScalar(1 + out * 2.5);
      dust.rotation.y = -time * 0.05;
      innerMat.emissiveIntensity = 0.9 + this.hover * 1.4;
    },
  };
  return o;
}

/* ---------- 1 · Competitions: chrome torus knot ---------- */
function makeKnot() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xf472b6, metalness: 0.9, roughness: 0.16, emissive: 0x9d174d, emissiveIntensity: 0.35 });
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.0, 0.3, 240, 36), mat);
  const wire = new THREE.Mesh(new THREE.TorusKnotGeometry(1.0, 0.44, 120, 10), new THREE.MeshBasicMaterial({ color: 0xfbcfe8, wireframe: true, transparent: true, opacity: 0.07 }));
  const sparks = makePoints(260, (i, v, c) => {
    v.randomDirection().multiplyScalar(2 + Math.random() * 1.3);
    c.setHSL(lerp(0.85, 0.95, Math.random()), 0.9, 0.7);
  }, 0.08);
  group.add(knot, wire, sparks);
  return {
    group, targets: [hitSphere(1.8, "compete", group)], hover: 0,
    update(local, time) {
      knot.rotation.x = time * 0.35 + local * 2.5;
      knot.rotation.y = time * 0.25;
      knot.position.y = Math.sin(time * 1.2) * 0.12;
      wire.rotation.copy(knot.rotation); wire.position.copy(knot.position);
      const s = 1 + this.hover * 0.12;
      knot.scale.setScalar(s);
      wire.scale.setScalar(s * (1 + Math.sin(time * 2) * 0.03));
      mat.emissiveIntensity = 0.35 + this.hover * 1.1;
      sparks.rotation.y = time * 0.2;
      sparks.scale.setScalar(1 + this.hover * 0.3);
    },
  };
}

/* ---------- 2 · Workshops: self-assembling cube ---------- */
function makeCubes() {
  const group = new THREE.Group();
  const n = 4, total = n ** 3, gap = 0.44;
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.55, roughness: 0.22, emissive: 0x0891b2, emissiveIntensity: 0.25 });
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), mat, total);
  const grid = [], scatter = [], spin = [];
  const c = new THREE.Color();
  let i = 0;
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) {
    grid.push(new THREE.Vector3((x - 1.5) * gap, (y - 1.5) * gap, (z - 1.5) * gap));
    scatter.push(new THREE.Vector3().randomDirection().multiplyScalar(2.2 + Math.random() * 2.8));
    spin.push(new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    c.setHSL(lerp(0.52, 0.78, (x + y + z) / 9), 0.85, 0.6);
    inst.setColorAt(i++, c);
  }
  inst.instanceColor.needsUpdate = true;
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.1, 2.1, 2.1)), new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0 }));
  group.add(inst, frame);
  const dummy = new THREE.Object3D();
  return {
    group, targets: [hitSphere(1.8, "build", group)], hover: 0,
    update(local, time) {
      const a = 1 - smoothstep(0.08, 0.8, Math.abs(local)); // 1 = assembled
      const spread = 1 + this.hover * 0.4;
      const r = 1 - a;
      for (let k = 0; k < total; k++) {
        const s = scatter[k], g = grid[k];
        dummy.position.set(lerp(s.x, g.x * spread, a), lerp(s.y, g.y * spread, a), lerp(s.z, g.z * spread, a));
        dummy.rotation.set(spin[k].x * r + time * r * 0.4, spin[k].y * r, spin[k].z * r);
        dummy.updateMatrix();
        inst.setMatrixAt(k, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      frame.material.opacity = a * 0.55;
      frame.scale.setScalar(spread * (1 + Math.sin(time * 2) * 0.02));
      group.rotation.y = time * 0.3 + local * 1.2;
      group.rotation.x = 0.45;
      mat.emissiveIntensity = 0.25 + this.hover * 0.9;
    },
  };
}

/* ---------- 3 · Lectures: ringed planet ---------- */
function planetTexture() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512;
  const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 512);
  ["#1e1b4b", "#4c1d95", "#7c3aed", "#c026d3", "#f472b6", "#7c3aed", "#312e81", "#0e7490", "#22d3ee", "#1e1b4b"]
    .forEach((col, i, a) => gr.addColorStop(i / (a.length - 1), col));
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 380; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "10,4,30"},${Math.random() * 0.12})`;
    g.fillRect(Math.random() * 1024, Math.random() * 512, 120 + Math.random() * 500, 1 + Math.random() * 4);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function makePlanet() {
  const group = new THREE.Group();
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1.1, 64, 64), new THREE.MeshStandardMaterial({ map: planetTexture(), roughness: 0.75, metalness: 0.1, emissive: 0x1e1b4b, emissiveIntensity: 0.5 }));
  const atmoMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.14, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.28, 48, 48), atmoMat);
  const rings = new THREE.Group();
  rings.add(
    new THREE.Mesh(new THREE.RingGeometry(1.55, 2.5, 128), new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })),
    new THREE.Mesh(new THREE.RingGeometry(1.72, 1.79, 128), new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.8, side: THREE.DoubleSide })),
    new THREE.Mesh(new THREE.RingGeometry(2.2, 2.24, 128), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.7, side: THREE.DoubleSide })),
  );
  rings.rotation.set(Math.PI / 2.3, 0.25, 0);
  const moons = [[2.9, 0.6, 0.12, 0x22d3ee], [3.4, -0.4, 0.09, 0xf472b6], [3.9, 0.3, 0.15, 0xa78bfa]].map(([r, s, size, col], i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 24), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.6 }));
    m.userData = { r, s, tilt: (i - 1) * 0.35 };
    group.add(m);
    return m;
  });
  group.add(planet, atmo, rings);
  return {
    group, targets: [hitSphere(1.7, "listen", group)], hover: 0,
    update(local, time) {
      planet.rotation.y = time * 0.12;
      rings.rotation.z = time * 0.05;
      moons.forEach((m) => {
        const a = time * m.userData.s + m.userData.r;
        m.position.set(Math.cos(a) * m.userData.r, Math.sin(a) * m.userData.r * m.userData.tilt, Math.sin(a) * m.userData.r);
      });
      atmoMat.opacity = 0.14 + this.hover * 0.3;
      group.rotation.z = local * 0.4;
      const s = 1 + this.hover * 0.08;
      planet.scale.setScalar(s); atmo.scale.setScalar(s);
    },
  };
}

/* ---------- 4 · Exhibitions: floating card carousel ---------- */
function cardTexture([l1, l2, color], idx) {
  const W = 320, H = 400;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, W, H);
  gr.addColorStop(0, "#1a0d3a"); gr.addColorStop(1, "#05030f");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(255,255,255,.05)"; g.lineWidth = 1;
  for (let x = 0; x < W; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y < H; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.strokeStyle = color; g.lineWidth = 6; g.strokeRect(10, 10, W - 20, H - 20);
  g.beginPath(); g.arc(W / 2, 140, 62, 0, Math.PI * 2); g.lineWidth = 3; g.stroke();
  g.beginPath(); g.arc(W / 2, 140, 40, 0, Math.PI * 2); g.globalAlpha = 0.5; g.stroke(); g.globalAlpha = 1;
  g.fillStyle = color; g.beginPath(); g.arc(W / 2, 140, 16, 0, Math.PI * 2); g.fill();
  g.fillStyle = color; g.font = "500 18px 'JetBrains Mono', monospace"; g.textAlign = "center";
  g.fillText(`EXHIBIT 0${idx + 1}`, W / 2, 50);
  g.fillStyle = "#d9d3f5"; g.font = "800 34px Unbounded, sans-serif";
  g.fillText(l1, W / 2, 270); g.fillText(l2, W / 2, 315);
  g.fillStyle = color; g.font = "500 15px 'JetBrains Mono', monospace";
  g.fillText("CLICK TO EXPLORE", W / 2, 362);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function makeCarousel() {
  const group = new THREE.Group();
  const carousel = new THREE.Group();
  const R = 2.5;
  const cards = EXHIBITS.map((ex, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.31), new THREE.MeshBasicMaterial({ map: cardTexture(ex, i), side: THREE.DoubleSide }));
    const a = (i / EXHIBITS.length) * Math.PI * 2;
    m.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
    m.rotation.y = a;
    m.userData = { key: "ex" + i, h: 0 };
    carousel.add(m);
    return m;
  });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0x7c3aed, emissiveIntensity: 1.2, metalness: 0.6, roughness: 0.2, flatShading: true }));
  const gemWire = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true }));
  const floor = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.26, 128), new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  floor.rotation.x = Math.PI / 2; floor.position.y = -0.95;
  group.add(carousel, gem, gemWire, floor);
  group.rotation.x = 0.15;
  return {
    group, targets: cards, hover: 0,
    update(local, time) {
      carousel.rotation.y = time * 0.16 + local * 1.8;
      cards.forEach((c, i) => {
        c.position.y = Math.sin(time * 1.4 + i) * 0.12;
        c.userData.h = lerp(c.userData.h, hoveredMesh === c ? 1 : 0, 0.15);
        c.scale.setScalar(1 + c.userData.h * 0.2);
      });
      gem.rotation.y = time * 0.8; gem.rotation.x = time * 0.4;
      gemWire.rotation.y = -time * 0.5;
      gem.position.y = gemWire.position.y = Math.sin(time * 1.5) * 0.1;
    },
  };
}

/* ---------- 5 · Launch: portal tunnel ---------- */
function makePortal() {
  const group = new THREE.Group();
  const colors = [0xa78bfa, 0x22d3ee, 0xf472b6];
  const rings = Array.from({ length: 10 }, (_, k) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(2.6, k === 0 ? 0.06 : 0.035, 10, 180), new THREE.MeshBasicMaterial({ color: colors[k % 3], transparent: true, opacity: 1 - k * 0.08 }));
    r.position.z = -k * 1.9;
    group.add(r);
    return r;
  });
  const swirl = makePoints(isMobile() ? 900 : 1700, (i, v, c) => {
    const a = Math.random() * Math.PI * 2, rr = 1.9 + Math.random() * 1.4;
    v.set(Math.cos(a) * rr, Math.sin(a) * rr, -Math.random() * 18);
    c.setHSL(lerp(0.5, 0.9, Math.random()), 0.9, 0.7);
  }, 0.07);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xc4b5fd, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(7); glow.position.z = -17;
  const hit = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshBasicMaterial({ visible: false }));
  hit.userData.key = "launch";
  group.add(swirl, glow, hit);
  return {
    group, targets: [hit], hover: 0,
    update(local, time) {
      const near = 1 - smoothstep(0, 1, Math.abs(local));
      rings.forEach((r, k) => {
        r.rotation.z += (k % 2 ? -1 : 1) * (0.003 + near * 0.01 + this.hover * 0.02);
        r.scale.setScalar(1 + Math.sin(time * 2 - k * 0.6) * 0.04 * (1 + this.hover * 2));
      });
      swirl.rotation.z = time * 0.25 * (1 + this.hover * 1.5);
      glow.material.opacity = 0.55 + Math.sin(time * 3) * 0.2 + this.hover * 0.3;
    },
  };
}

/* ---------- Layout: where each world sits ---------- */
function layout() {
  const mob = isMobile();
  objects.forEach((o) => {
    const i = o.index;
    let x = 0, y = 0;
    if (i === 0) y = mob ? 1.1 : 0;
    else if (i < N - 1) {
      x = mob ? 0 : sections[i].dataset.side === "left" ? 2.6 : -2.6;
      y = mob ? 1.35 : 0;
    }
    o.holder.position.set(x, y, -i * SPACING);
    o.holder.scale.setScalar(mob ? 0.78 : i === 3 || i === 4 ? 0.88 : 1);
  });
}

/* ---------- Build everything ---------- */
function build3D() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  scene = new THREE.Scene();
  scene.background = bg.copy(PALETTE[0]);
  scene.fog = new THREE.FogExp2(PALETTE[0], 0.045);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 400);
  scene.add(camera);
  camera.add(new THREE.PointLight(0x22d3ee, 1.2, 0, 0));
  scene.add(new THREE.HemisphereLight(0xa78bfa, 0x0b0420, 0.8));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(5, 6, 8); scene.add(sun);

  GLOW = glowTexture();

  // starfield along the whole journey
  const depth = SPACING * (N - 1) + 140;
  stars = makePoints(isMobile() ? 2600 : 5200, (i, v, c) => {
    const a = Math.random() * Math.PI * 2, r = 7 + Math.random() * 70;
    v.set(Math.cos(a) * r, Math.sin(a) * r * 0.75, 40 - Math.random() * depth);
    c.setHSL(lerp(0.55, 0.85, Math.random()), 0.7, lerp(0.6, 0.95, Math.random()));
  }, 0.22, { fog: false });
  scene.add(stars);

  // warp streaks (show when scrolling fast)
  const S = 320, sp = new Float32Array(S * 6);
  for (let i = 0; i < S; i++) {
    const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 14, z = -Math.random() * 70;
    sp.set([Math.cos(a) * r, Math.sin(a) * r, z, Math.cos(a) * r, Math.sin(a) * r, z - 1.2], i * 6);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  streaks = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  scene.add(streaks);

  // the six worlds
  [makeCore, makeKnot, makeCubes, makePlanet, makeCarousel, makePortal].forEach((fn, i) => {
    const o = fn();
    o.index = i; o.isHover = false; o.spin = 0;
    o.holder = new THREE.Group();
    o.holder.add(o.group);
    scene.add(o.holder);
    objects.push(o);
  });
  layout();

  // bloom (desktop only, for performance)
  if (!isMobile()) {
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    composer.setSize(innerWidth, innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.75, 0.5, 0.42));
    composer.addPass(new OutputPass());
  }

  setupInteraction();
  addEventListener("resize", onResize);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (composer) composer.setSize(innerWidth, innerHeight);
  layout();
  readScroll();
}

/* ---------- Hover / click / drag ---------- */
function pick(ndc) {
  raycaster.setFromCamera(ndc, camera);
  const cands = [];
  objects.forEach((o) => { if (Math.abs(state.current - o.index) < 0.55) cands.push(...o.targets); });
  if (!cands.length) return null;
  const hit = raycaster.intersectObjects(cands, false)[0];
  return hit ? hit.object : null;
}
function setHover(m) {
  if (m === hoveredMesh) return;
  hoveredMesh = m;
  objects.forEach((o) => { o.isHover = !!m && o.targets.includes(m); });
  document.body.classList.toggle("is-pointing", !!m);
  if (m) { tooltip.textContent = `${INFO[m.userData.key].title} · click`; tooltip.classList.add("is-on"); }
  else tooltip.classList.remove("is-on");
}
let drag = null, dragMoved = false;
function setupInteraction() {
  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    drag = { x: e.clientX }; dragMoved = false;
  });
  addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 2) dragMoved = true;
    drag.x = e.clientX;
    const o = objects[clamp(Math.round(state.current), 0, N - 1)];
    o.spin += dx * 0.0016;
  });
  addEventListener("pointerup", () => { drag = null; });
  canvas.addEventListener("click", (e) => {
    if (dragMoved) { dragMoved = false; return; }
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    const m = pick(ndc);
    if (m) openModal(m.userData.key);
  });
}

/* =========================================================
   MAIN LOOP
   ========================================================= */
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  state.prev = state.current;
  state.current = reduceMotion ? state.target : lerp(state.current, state.target, 0.075);
  const vel = state.current - state.prev;
  state.speed = lerp(state.speed, Math.abs(vel), 0.2);
  state.bank = lerp(state.bank, vel, 0.08);
  state.smx = lerp(state.smx, state.mx, 0.05);
  state.smy = lerp(state.smy, state.my, 0.05);
  if (state.ready && state.intro < 1) state.intro = reduceMotion ? 1 : Math.min(1, state.intro + dt / 2.6);

  updateUI(state.current);
  if (renderer && scene) render3D(time);
  requestAnimationFrame(tick);
}

function render3D(time) {
  const ct = state.current;

  // camera flight
  const introOff = (1 - easeOutCubic(state.intro)) * 30;
  camera.position.set(state.smx * 0.7, state.smy * 0.45, -ct * SPACING + 7 + introOff);
  camera.lookAt(state.smx * 0.15, state.smy * 0.1, camera.position.z - 10);
  camera.rotateZ(clamp(state.bank * -6, -0.18, 0.18));

  // background / fog colour shifts between worlds
  const i0 = Math.floor(ct), i1 = Math.min(N - 1, i0 + 1);
  bg.copy(PALETTE[i0]).lerp(PALETTE[i1], ct - i0);
  scene.fog.color.copy(bg);

  // hover detection
  if (finePointer && (pointerMoved || state.speed > 0.0005)) {
    pointerMoved = false;
    setHover(pick(pointer));
  }

  // worlds
  objects.forEach((o) => {
    const local = ct - o.index;
    const visible = Math.abs(local) < 1.6;
    o.holder.visible = visible;
    o.hover = lerp(o.hover, o.isHover ? 1 : 0, 0.1);
    o.spin *= 0.94;
    o.holder.rotation.y += o.spin;
    if (visible) o.update(local, time);
  });

  // stars + warp streaks
  stars.rotation.z = time * 0.006;
  streaks.position.z = camera.position.z - 2;
  streaks.scale.z = 1 + state.speed * 260;
  streaks.material.opacity = clamp(state.speed * 22, 0, 0.75);

  if (composer) composer.render(); else renderer.render(scene, camera);
}

/* =========================================================
   BOOT
   ========================================================= */
async function boot() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load("800 34px Unbounded"),
        document.fonts.load("500 18px 'JetBrains Mono'"),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch (_) { /* fonts are optional */ }
  setProgress(60);
  if (renderer) {
    try {
      build3D();
      setProgress(85);
      render3D(0); // warm-up frame compiles shaders
    } catch (err) {
      console.error(err);
      document.body.classList.add("no-webgl");
      renderer = null;
    }
  }
  updateUI(state.current);
  requestAnimationFrame(tick);
  markReady();
}
boot();
