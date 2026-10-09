// Despiece 3D de la notebook (three.js). Modelo propio armado en código, sin marcas ni logos.
// Unidades: centímetros. Se dibuja solo cuando cambia el scroll o el tamaño (sin bucle de animación).
// Se carga bajo demanda desde components/teardown.tsx; si no hay WebGL, queda el despiece en CSS.
import {
  ACESFilmicToneMapping, AmbientLight, BoxGeometry, CanvasTexture, CatmullRomCurve3, CylinderGeometry,
  DirectionalLight, DoubleSide, ExtrudeGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial,
  MeshStandardMaterial, Object3D, PerspectiveCamera, PlaneGeometry, PMREMGenerator, Quaternion, Scene, Shape, SRGBColorSpace,
  TubeGeometry, Vector3, WebGLRenderer, type Material, type BufferGeometry,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type Teardown3D = {
  /** p: avance del recorrido (0 cerrada → abierta → 1 desarmada) */
  set(p: number): void;
  /** Posición en píxeles (dentro del canvas) de un ancla: ssd, fan, port, keys, screen */
  anchor(name: string): { x: number; y: number };
  /** Bordes horizontales del modelo en píxeles (para ubicar las columnas de etiquetas) */
  extent(): { left: number; right: number };
  resize(): void;
  dispose(): void;
};

const W = 30.4, D = 21.2;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Fases del recorrido: F1 cerrada (giro lento) · F2 se abre la tapa y se despega la cubierta inferior · F3 despiece completo */
export const phases = (p: number) => ({ turn: smooth(clamp(p / .18)), f2: smooth(clamp((p - .18) / .3)), f3: smooth(clamp((p - .48) / .37)) });
export const faseOf = (p: number) => (p < .18 ? 1 : p < .48 ? 2 : 3);

function roundedRect(w: number, d: number, r: number) {
  const s = new Shape(), x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function screenTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 680;
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, 1024, 680);
  bg.addColorStop(0, '#3d8bff'); bg.addColorStop(.55, '#5e5ce6'); bg.addColorStop(1, '#c06bf5');
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 680);
  const glow = g.createRadialGradient(180, 60, 10, 180, 60, 520); glow.addColorStop(0, 'rgba(255,255,255,.35)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow; g.fillRect(0, 0, 1024, 680);
  const rr = (x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, 1024, 34);
  g.fillStyle = 'rgba(251,251,253,.96)'; rr(250, 150, 524, 360, 22);
  g.fillStyle = '#ececf1'; rr(250, 150, 524, 44, 22); g.fillRect(250, 172, 524, 22);
  [['#ff5f57', 280], ['#febc2e', 304], ['#28c840', 328]].forEach(([col, x]) => { g.fillStyle = col as string; g.beginPath(); g.arc(x as number, 172, 7, 0, 7); g.fill(); });
  g.fillStyle = '#1d1d1f'; rr(300, 240, 210, 26, 8);
  g.fillStyle = '#c7c7cc'; rr(300, 292, 380, 16, 8); rr(300, 326, 300, 16, 8); rr(300, 360, 340, 16, 8);
  g.fillStyle = '#0071e3'; rr(300, 420, 150, 40, 20);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function boardTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 180;
  const g = c.getContext('2d')!;
  g.fillStyle = '#123f33'; g.fillRect(0, 0, 512, 180);
  g.strokeStyle = 'rgba(120,200,160,.28)'; g.lineWidth = 2;
  for (let i = 0; i < 26; i++) { const y = 10 + i * 6.4; g.beginPath(); g.moveTo(20 + (i * 37) % 120, y); g.lineTo(260 + (i * 53) % 220, y); g.stroke(); }
  g.fillStyle = 'rgba(230,200,120,.55)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(30 + (i * 97) % 460, 15 + (i * 41) % 150, 2.2, 0, 7); g.fill(); }
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
  return t;
}

function contactShadow() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d')!, r = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  r.addColorStop(0, 'rgba(0,0,0,.7)'); r.addColorStop(.6, 'rgba(0,0,0,.25)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return new CanvasTexture(c);
}

export function mount(canvas: HTMLCanvasElement): Teardown3D {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environment = env; scene.environmentIntensity = .75;
  scene.add(new AmbientLight(0xffffff, .25));
  const key = new DirectionalLight(0xffffff, 1.6); key.position.set(-18, 30, 22); scene.add(key);
  const rim = new DirectionalLight(0x9fb4ff, 1.4); rim.position.set(14, 12, -28); scene.add(rim);

  const camera = new PerspectiveCamera(26, 1, 1, 400);
  const disposables: { dispose(): void }[] = [env, pmrem];
  const geo = <T extends BufferGeometry>(g: T) => { disposables.push(g); return g; };
  const mat = <T extends Material>(m: T) => { disposables.push(m); return m; };

  // Materiales
  const alu = mat(new MeshPhysicalMaterial({ color: 0x8b8e95, metalness: 1, roughness: .32, clearcoat: .25, clearcoatRoughness: .4 }));
  const aluIn = mat(new MeshStandardMaterial({ color: 0x6f7279, metalness: .9, roughness: .5 }));
  const dark = mat(new MeshStandardMaterial({ color: 0x1b1c1f, metalness: .2, roughness: .55 }));
  const keyMat = mat(new MeshStandardMaterial({ color: 0x121315, metalness: .1, roughness: .6 }));
  const pad = mat(new MeshPhysicalMaterial({ color: 0x7c7f86, metalness: .7, roughness: .2, clearcoat: .6 }));
  const glass = mat(new MeshPhysicalMaterial({ color: 0x050506, metalness: .2, roughness: .12, clearcoat: 1 }));
  const silver = mat(new MeshStandardMaterial({ color: 0xc9cbd0, metalness: 1, roughness: .25 }));
  const copper = mat(new MeshStandardMaterial({ color: 0xc27a45, metalness: 1, roughness: .3 }));
  const cell = mat(new MeshStandardMaterial({ color: 0x2b2c30, metalness: .3, roughness: .62 }));
  const label = mat(new MeshStandardMaterial({ color: 0x55585f, metalness: .2, roughness: .7 }));
  const ram = mat(new MeshStandardMaterial({ color: 0x1d5a44, metalness: .1, roughness: .55 }));
  const ssdLabel = mat(new MeshStandardMaterial({ color: 0x2a6fd8, metalness: .1, roughness: .5 }));
  const fanMat = mat(new MeshStandardMaterial({ color: 0x2b2c31, metalness: .4, roughness: .45 }));
  const boardMap = boardTexture(), scrMap = screenTexture(), shadowMap = contactShadow();
  disposables.push(boardMap, scrMap, shadowMap);
  const pcb = mat(new MeshStandardMaterial({ map: boardMap, metalness: .1, roughness: .55 }));
  const screen = mat(new MeshBasicMaterial({ map: scrMap, toneMapped: false }));
  const shadowMat = mat(new MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, opacity: .9 }));

  const add = (parent: Object3D, g: BufferGeometry, m: Material, x: number, y: number, z: number) => { const o = new Mesh(g, m); o.position.set(x, y, z); parent.add(o); return o; };
  const model = new Group(); scene.add(model);

  // Sombra de apoyo
  const sh = add(model, geo(new PlaneGeometry(W * 1.5, D * 1.6)), shadowMat, 0, -.02, 0); sh.rotation.x = -Math.PI / 2;

  // Base: piso, paredes con esquinas redondeadas, interior y postes de tornillos
  const base = new Group(); model.add(base);
  add(base, geo(new RoundedBoxGeometry(W, .24, D, 4, .1)), alu, 0, .12, 0);
  const wall = geo(new ExtrudeGeometry(Object.assign(roundedRect(W, D, 1.1), { holes: [roundedRect(W - .5, D - .5, .85)] }), { depth: .9, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 3, curveSegments: 10 }));
  wall.rotateX(-Math.PI / 2); add(base, wall, alu, 0, .05, 0);
  add(base, geo(new BoxGeometry(W - .7, .02, D - .7)), aluIn, 0, .25, 0);
  const boss = geo(new CylinderGeometry(.28, .3, .35, 16));
  [[-13.6, -9], [13.6, -9], [-13.6, 9], [13.6, 9], [0, -9.2], [-6, 0], [6, 0], [0, 9.2]].forEach(([x, z]) => add(base, boss, silver, x, .42, z));

  // Batería (dos celdas) y disco M.2 al costado
  const batt = new Group(); model.add(batt);
  const cellG = geo(new RoundedBoxGeometry(9.6, .5, 6.4, 2, .12));
  [-6.8, 3.4].forEach(x => add(batt, cellG, cell, x, .52, 4.6));
  add(batt, geo(new BoxGeometry(4.6, .01, 2.2)), label, -6.8, .78, 4.6);
  const ssd = new Group(); model.add(ssd);
  add(ssd, geo(new BoxGeometry(2.2, .08, 8)), dark, 0, 0, 0);
  add(ssd, geo(new BoxGeometry(1.7, .012, 4.2)), ssdLabel, 0, .05, -.6);
  add(ssd, geo(new BoxGeometry(1.6, .1, 1.4)), keyMat, 0, .07, 2.6);
  const ssdHome = new Vector3(11.4, .5, 4.2);

  // Placa: circuito, procesador, memorias, chips y conector de carga
  const board = new Group(); model.add(board);
  add(board, geo(new RoundedBoxGeometry(26.6, .14, 8.6, 2, .1)), pcb, 0, .48, -5.4);
  add(board, geo(new BoxGeometry(3.2, .2, 3.2)), silver, 1.6, .65, -5.4);
  const ramG = geo(new BoxGeometry(6.4, .1, 2.4)), chipG = geo(new BoxGeometry(1.1, .1, .8));
  [-3.6, 4.4].forEach(x => { add(board, ramG, ram, x, .6, -2.6); [-2.4, -.8, .8, 2.4].forEach(dx => add(board, chipG, keyMat, x + dx, .68, -2.6)); });
  [[-1.6, -8.6], [5.6, -8.6], [11.8, -2.6], [-11.8, -2.6]].forEach(([x, z]) => add(board, geo(new BoxGeometry(1.4, .12, 1)), keyMat, x, .6, z));
  const choke = geo(new BoxGeometry(.72, .46, .72)), capG = geo(new CylinderGeometry(.24, .24, .42, 16));
  [4.3, 5.2, 6.1].forEach(x => add(board, choke, fanMat, x, .73, -5));
  [4.3, 5.2, 6.1].forEach(x => add(board, capG, silver, x, .71, -6.3));
  [-.6, .3].forEach(x => add(board, capG, silver, x, .71, -7.6));
  const port = add(board, geo(new BoxGeometry(.6, .38, 1.1)), silver, 13.3, .66, -6.6);

  // Refrigeración: ventilador, caño de calor de cobre y aletas
  const cool = new Group(); model.add(cool);
  const fanC = new Vector3(-9, .78, -5.8), fanR = new Vector3(9.5, .78, -5.8);
  const shell = geo(new CylinderGeometry(2.6, 2.6, .5, 48, 1, true)), floorG = geo(new CylinderGeometry(2.62, 2.62, .04, 48)), hubG = geo(new CylinderGeometry(.75, .75, .52, 24));
  const bladeG = geo(new BoxGeometry(1.75, .04, .55));
  const m4 = new Matrix4(), q = new Quaternion(), up = new Vector3(0, 1, 0), tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), .35);
  const fan = (c: Vector3) => {
    add(cool, shell, fanMat, c.x, c.y, c.z); add(cool, floorG, fanMat, c.x, c.y - .24, c.z); add(cool, hubG, silver, c.x, c.y, c.z);
    const blades = new InstancedMesh(bladeG, fanMat, 11); cool.add(blades);
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * Math.PI * 2;
      q.setFromAxisAngle(up, a).multiply(tilt);
      m4.compose(new Vector3(c.x + Math.cos(a) * 1.65, c.y, c.z - Math.sin(a) * 1.65), q, new Vector3(1, 1, 1));
      blades.setMatrixAt(i, m4);
    }
  };
  fan(fanC); fan(fanR);
  const pipeL = new CatmullRomCurve3([new Vector3(1.6, .82, -5.4), new Vector3(-2.5, .86, -7.4), new Vector3(-6.4, .86, -9.2), new Vector3(-9.2, .86, -9.6)]);
  const pipeR = new CatmullRomCurve3([new Vector3(1.6, .82, -5.4), new Vector3(4.8, .86, -7.9), new Vector3(7.6, .86, -9.3), new Vector3(9.8, .86, -9.6)]);
  add(cool, geo(new TubeGeometry(pipeL, 48, .2, 12)), copper, 0, 0, 0);
  add(cool, geo(new TubeGeometry(pipeR, 48, .2, 12)), copper, 0, 0, 0);
  add(cool, geo(new BoxGeometry(3.4, .08, 3.4)), copper, 1.6, .79, -5.4);
  const finG = geo(new BoxGeometry(.06, .55, 1.5));
  for (let i = 0; i < 18; i++) { add(cool, finG, silver, -11.4 + i * .3, .72, -9.7); add(cool, finG, silver, 7.2 + i * .3, .72, -9.7); }

  // Tapa superior: aluminio, teclado (teclas instanciadas) y trackpad. La bisagra va en el borde de atrás
  const deck = new Group(); model.add(deck);
  add(deck, geo(new RoundedBoxGeometry(W, .3, D, 4, .14)), alu, 0, .15, 0);
  add(deck, geo(new BoxGeometry(27, .02, 10.6)), dark, 0, .305, -3.4);
  const keyG = geo(new RoundedBoxGeometry(1.55, .14, 1.45, 2, .14));
  const slots: [number, number, number][] = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 14; c++) {
    if (r === 5 && c >= 4 && c <= 9) { if (c === 4) slots.push([-12.35 + 6.5 * 1.9, -7.9 + r * 1.78, 6.05]); continue; }
    slots.push([-12.35 + c * 1.9, -7.9 + r * 1.78, 1]);
  }
  const keys = new InstancedMesh(keyG, keyMat, slots.length); deck.add(keys);
  // La fila de arriba (teclas de función) es más baja
  slots.forEach(([x, z, sx], i) => { const fn = z < -7; m4.compose(new Vector3(x, .38, fn ? z + .25 : z), new Quaternion(), new Vector3(sx, 1, fn ? .62 : 1)); keys.setMatrixAt(i, m4); });
  add(deck, geo(new RoundedBoxGeometry(12.4, .04, 7.4, 2, .02)), pad, 0, .31, 6.2);
  const hingeG = geo(new CylinderGeometry(.34, .34, 3.4, 24));
  [-8.6, 8.6].forEach(x => { const hg = add(deck, hingeG, silver, x, .05, -10.3); hg.rotation.z = Math.PI / 2; });

  // Pantalla (tapa): dorso de aluminio sin logo y, del lado de adentro, el vidrio con la pantalla encendida
  const lidPivot = new Group(); model.add(lidPivot);
  const lid = new Group(); lidPivot.add(lid);
  add(lid, geo(new RoundedBoxGeometry(W, .36, D - .3, 4, .14)), alu, 0, .18, 10.4);
  add(lid, geo(new BoxGeometry(W - .5, .02, D - .8)), glass, 0, -.01, 10.4);
  const scr = add(lid, geo(new PlaneGeometry(W - 1.7, D - 2.6)), screen, 0, -.025, 10.6); scr.rotation.x = Math.PI / 2;
  (scr.material as Material).side = DoubleSide;
  const hingeBlock = geo(new RoundedBoxGeometry(3.4, .4, 1.1, 2, .12));
  [-8.6, 8.6].forEach(x => add(lid, hingeBlock, silver, x, .05, .55));

  // Tornillos que se sueltan
  const screwG = geo(new CylinderGeometry(.22, .22, .5, 12));
  const screws = [[-13.6, -9], [13.6, -9], [-13.6, 9], [13.6, 9], [-6, 0], [6, 0]].map(([x, z]) => { const s = add(model, screwG, silver, x, .7, z); return { s, x, z }; });

  // Anclas para las etiquetas (en coordenadas de cada pieza)
  const anchors: Record<string, [Object3D, Vector3]> = {
    ssd: [ssd, new Vector3(0, .1, -.6)], fan: [cool, fanC.clone().add(new Vector3(-1.2, .3, .6))], port: [port, new Vector3(.3, 0, 0)],
    keys: [deck, new Vector3(9, .45, -4)], screen: [lid, new Vector3(-8, -.03, 9)],
  };

  let p = 0, w = 1, h = 1;
  const fit = () => {
    const { f2, f3 } = phases(p);
    const hgt = 6 + 31 * f2 + 6 * f3, wid = 38;
    const t = Math.tan((camera.fov * Math.PI / 180) / 2);
    const dist = Math.max(hgt / 2 / t, wid / 2 / (t * camera.aspect)) * 1.12 + 12;
    const dir = new Vector3(0, .5, 1).normalize();
    camera.position.copy(dir.multiplyScalar(dist)); camera.lookAt(0, 0, 0);
  };
  const layout = () => {
    const { turn, f2, f3 } = phases(p);
    // F2: la tapa se abre a 65°, el conjunto superior sube y la cubierta inferior baja: quedan a la vista placa y batería.
    // F3: despiece completo. Las trayectorias están calculadas para que, desde la cámara (arriba y adelante), ninguna
    // pieza tape a la de abajo: la placa y la refrigeración avanzan y el teclado sube lo suficiente para dejarlas a la vista.
    model.rotation.y = -.62 + .14 * turn + .18 * f2 + .15 * f3;
    model.position.y = -1.2 - 10 * f2 - 6.5 * f3;
    base.position.y = -2.8 * f2 - .4 * f3;
    batt.position.set(0, .3 * f2 + 1.1 * f3, 0);
    ssd.position.copy(ssdHome).add(new Vector3(2.4 * f3, .3 * f2 + 1.9 * f3, .6 * f3));
    board.position.set(0, 1.2 * f2 + 3 * f3, 4.5 * f2 + .5 * f3);
    cool.position.set(0, 1.2 * f2 + 6.6 * f3, 4.5 * f2 + 3 * f3);
    deck.position.set(0, .95 + 12 * f2 + 2.4 * f3, 0);
    lidPivot.position.set(0, 1.27 + 12 * f2 + 5.8 * f3, -10.3 - 1.4 * f3);
    lidPivot.rotation.x = -1.13 * f2 - .55 * f3;
    screws.forEach(({ s, x, z }, i) => s.position.set(x * (1 + .1 * f3), .7 - 2.8 * f2 + (5.4 + (i % 3) * .9) * f3, z * (1 + .12 * f3)));
    shadowMat.opacity = .9 - .3 * f3;
  };
  // data-tris: triángulos dibujados en el último cuadro (las pruebas verifican que WebGL dibujó)
  const render = () => { layout(); fit(); renderer.render(scene, camera); canvas.dataset.tris = String(renderer.info.render.triangles); };
  const resize = () => {
    const r = canvas.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); render();
  };
  const toPx = (v: Vector3) => { v.project(camera); return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h }; };
  resize();

  return {
    set(next) { p = clamp(next); render(); },
    anchor(name) { const [o, v] = anchors[name]; model.updateMatrixWorld(true); return toPx(o.localToWorld(v.clone())); },
    extent() {
      model.updateMatrixWorld(true);
      let left = Infinity, right = -Infinity;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0, 1]) {
        const o = y ? deck : base; const c = toPx(o.localToWorld(new Vector3(sx * W / 2, .3, sz * D / 2)));
        left = Math.min(left, c.x); right = Math.max(right, c.x);
      }
      return { left, right };
    },
    resize,
    dispose() { disposables.forEach(d => d.dispose()); renderer.dispose(); },
  };
}

