import * as THREE from "three";

/**
 * Cena WebGL do fundo da home: pecas de mecanica automotiva em estilo "projeto" (corpo escuro
 * com arestas brancas finas) — engrenagens que se encaixam, disco de freio, roda com pneu e
 * conjunto biela-pistao em movimento. Fica atras do conteudo (camada do fundo, sem eventos).
 *
 * Interacao: o mouse move a camera (parallax) e "acelera" as pecas conforme o movimento; um
 * clique em qualquer lugar da um tranco de aceleracao; a rolagem gira as engrenagens e
 * afasta a camera. Com "reduzir movimento" desenha um quadro estatico e nao anima.
 */
type Opcoes = { reduzirMovimento: boolean; temMouse: boolean };

const FOV = 40;
const DIST = 16;

/** Engrenagem: contorno com dentes trapezoidais, furo central e furos de alivio. */
function geometriaEngrenagem(dentes: number, rExt: number, rInt: number, espessura: number, furo: number) {
  const forma = new THREE.Shape();
  const passo = (Math.PI * 2) / dentes;
  const perfil: [number, number][] = [
    [0, rInt],
    [0.18, rExt],
    [0.42, rExt],
    [0.6, rInt],
    [0.8, rInt],
  ];
  let primeiro = true;
  for (let i = 0; i < dentes; i++) {
    for (const [f, r] of perfil) {
      const a = (i + f) * passo;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (primeiro) {
        forma.moveTo(x, y);
        primeiro = false;
      } else forma.lineTo(x, y);
    }
  }
  forma.closePath();
  const centro = new THREE.Path();
  centro.absarc(0, 0, furo, 0, Math.PI * 2, true);
  forma.holes.push(centro);
  const n = 6;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const raio = (rInt + furo) / 2;
    const alivio = new THREE.Path();
    alivio.absarc(Math.cos(a) * raio, Math.sin(a) * raio, (rInt - furo) * 0.28, 0, Math.PI * 2, true);
    forma.holes.push(alivio);
  }
  const g = new THREE.ExtrudeGeometry(forma, { depth: espessura, bevelEnabled: false, curveSegments: 14 });
  g.translate(0, 0, -espessura / 2);
  return g;
}

/** Disco de freio ventilado: prato com furo central e furos em anel. */
function geometriaDisco() {
  const forma = new THREE.Shape();
  forma.absarc(0, 0, 2.3, 0, Math.PI * 2, false);
  const centro = new THREE.Path();
  centro.absarc(0, 0, 0.62, 0, Math.PI * 2, true);
  forma.holes.push(centro);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const furo = new THREE.Path();
    furo.absarc(Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0.16, 0, Math.PI * 2, true);
    forma.holes.push(furo);
  }
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.3;
    const parafuso = new THREE.Path();
    parafuso.absarc(Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0.1, 0, Math.PI * 2, true);
    forma.holes.push(parafuso);
  }
  const g = new THREE.ExtrudeGeometry(forma, { depth: 0.22, bevelEnabled: false, curveSegments: 24 });
  g.translate(0, 0, -0.11);
  return g;
}

export function montarCena(canvas: HTMLCanvasElement, { reduzirMovimento, temMouse }: Opcoes) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  const dprMax = Math.min(window.devicePixelRatio || 1, 1.5);

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, DIST);

  cena.add(new THREE.AmbientLight(0xffffff, 0.9));
  const luz = new THREE.DirectionalLight(0xffffff, 3.2);
  luz.position.set(4, 6, 9);
  cena.add(luz);
  const contraLuz = new THREE.DirectionalLight(0xbfc8d6, 0.9);
  contraLuz.position.set(-6, -3, 4);
  cena.add(contraLuz);

  const descartaveis: { dispose(): void }[] = [];
  const matCorpo = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.55, roughness: 0.34 });
  const matLinha = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
  descartaveis.push(matCorpo, matLinha);

  /** Corpo escuro + arestas brancas (o "desenho tecnico"). */
  const peca = (geo: THREE.BufferGeometry, anguloArestas = 28) => {
    const arestas = new THREE.EdgesGeometry(geo, anguloArestas);
    descartaveis.push(geo, arestas);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, matCorpo));
    g.add(new THREE.LineSegments(arestas, matLinha));
    return g;
  };

  // --- engrenagens que se encaixam (24 e 12 dentes) ---
  const dentesA = 24;
  const dentesB = 12;
  const rA = 3;
  const rB = (rA * dentesB) / dentesA;
  const conjuntoEngrenagens = new THREE.Group();
  const engA = peca(geometriaEngrenagem(dentesA, rA + 0.28, rA - 0.28, 0.5, 0.55));
  const engB = peca(geometriaEngrenagem(dentesB, rB + 0.28, rB - 0.28, 0.5, 0.35));
  const ang = Math.PI / 6;
  engB.position.set(Math.cos(ang) * (rA + rB), Math.sin(ang) * (rA + rB), 0);
  conjuntoEngrenagens.add(engA, engB);

  // --- disco de freio ---
  const disco = new THREE.Group();
  const prato = peca(geometriaDisco());
  const cubo = peca(new THREE.CylinderGeometry(1.0, 1.0, 0.5, 28).rotateX(Math.PI / 2));
  cubo.position.z = -0.35;
  disco.add(prato, cubo);

  // --- roda com pneu ---
  const roda = new THREE.Group();
  roda.add(peca(new THREE.TorusGeometry(2.05, 0.62, 18, 56), 40));
  roda.add(peca(new THREE.TorusGeometry(1.5, 0.07, 8, 48), 40));
  roda.add(peca(new THREE.CylinderGeometry(0.4, 0.4, 0.5, 20).rotateX(Math.PI / 2)));
  for (let k = 0; k < 5; k++) {
    const raio = peca(new THREE.BoxGeometry(0.3, 1.1, 0.14), 20);
    const a = (k / 5) * Math.PI * 2;
    raio.position.set(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0);
    raio.rotation.z = a - Math.PI / 2;
    roda.add(raio);
  }

  // --- conjunto biela-pistao (cinematica real de biela-manivela) ---
  const manivelaR = 0.8;
  const bielaL = 2.4;
  const motor = new THREE.Group();
  const discoManivela = new THREE.Group();
  discoManivela.add(peca(new THREE.CylinderGeometry(1.15, 1.15, 0.3, 28).rotateX(Math.PI / 2)));
  const pino = peca(new THREE.CylinderGeometry(0.17, 0.17, 0.6, 12).rotateX(Math.PI / 2));
  pino.position.set(manivelaR, 0, 0.25);
  discoManivela.add(pino);
  const biela = peca(new THREE.BoxGeometry(0.24, 1, 0.16), 20);
  const pistao = peca(new THREE.CylinderGeometry(0.62, 0.62, 0.95, 24), 40);
  const camisaGeo = new THREE.CylinderGeometry(0.72, 0.72, 3.2, 24, 1, true);
  const camisaArestas = new THREE.EdgesGeometry(camisaGeo, 20);
  descartaveis.push(camisaGeo, camisaArestas);
  const camisa = new THREE.LineSegments(camisaArestas, matLinha);
  camisa.position.y = 2.2;
  motor.add(discoManivela, biela, pistao, camisa);
  motor.rotation.y = -0.45;

  const grupos = [
    { g: conjuntoEngrenagens, fx: -0.8, fy: -0.5, z: -3.2, prof: 0.6 },
    { g: disco, fx: 0.76, fy: 0.46, z: -4.2, prof: 0.45 },
    { g: roda, fx: 0.82, fy: -0.62, z: -1.6, prof: 1 },
    { g: motor, fx: 0.04, fy: 0.12, z: -3.6, prof: 0.8 },
  ];
  for (const { g } of grupos) cena.add(g);
  disco.rotation.set(0.5, -0.55, 0);
  roda.rotation.set(0.35, -0.7, 0);

  let largura = 1;
  let altura = 1;
  const posicionar = () => {
    const meiaAltura = Math.tan((FOV * Math.PI) / 360) * DIST;
    const meiaLargura = meiaAltura * camera.aspect;
    const escala = Math.min(1.15, Math.max(0.55, meiaLargura / 10));
    for (const { g, fx, fy, z } of grupos) {
      g.position.set(fx * meiaLargura, fy * meiaAltura, z);
      g.scale.setScalar(escala);
    }
    // em telas estreitas (celular em pe) so ficam as engrenagens e o disco
    const estreita = camera.aspect < 0.8;
    roda.visible = !estreita;
    motor.visible = !estreita;
  };
  const redimensionar = () => {
    largura = Math.max(1, canvas.clientWidth);
    altura = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(dprMax);
    renderer.setSize(largura, altura, false);
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
    posicionar();
  };

  // --- estado da interacao ---
  let alvoX = 0;
  let alvoY = 0;
  let px = 0;
  let py = 0;
  let energia = 0;
  let rolagem = 0;
  let rolagemAnterior = window.scrollY;
  let anguloManivela = 0.8;

  const quadro = (dt: number) => {
    energia *= Math.exp(-dt * 1.6);
    px += (alvoX - px) * Math.min(1, dt * 4);
    py += (alvoY - py) * Math.min(1, dt * 4);
    const dRolagem = (rolagem - rolagemAnterior) * 0.004;
    rolagemAnterior = rolagem;

    const vel = 1 + energia * 3;
    conjuntoEngrenagens.children[0].rotation.z += 0.22 * vel * dt + dRolagem;
    conjuntoEngrenagens.children[1].rotation.z = -conjuntoEngrenagens.children[0].rotation.z * (dentesA / dentesB) + Math.PI / dentesB;
    disco.rotation.z += 0.35 * vel * dt;
    roda.rotation.z -= 0.6 * vel * dt;
    anguloManivela += (1.3 + energia * 4) * dt + dRolagem * 2;

    // biela-manivela: o pistao sobe e desce conforme o pino da manivela gira
    const pinX = Math.cos(anguloManivela) * manivelaR;
    const pinY = Math.sin(anguloManivela) * manivelaR;
    const pistaoY = pinY + Math.sqrt(bielaL * bielaL - pinX * pinX);
    discoManivela.rotation.z = anguloManivela;
    biela.position.set(pinX / 2, (pinY + pistaoY) / 2, 0.25);
    biela.scale.y = Math.hypot(pinX, pistaoY - pinY);
    biela.rotation.z = Math.atan2(pinX, pistaoY - pinY);
    pistao.position.set(0, pistaoY + 0.45, 0.25);

    // parallax: a camera acompanha o mouse; a rolagem afasta um pouco
    camera.position.x = px * 1.1;
    camera.position.y = -py * 0.7;
    camera.position.z = DIST + Math.min(rolagem, 1600) * 0.0022;
    camera.lookAt(0, 0, 0);
    renderer.render(cena, camera);
  };

  redimensionar();

  const aoRedimensionar = () => {
    redimensionar();
    if (reduzirMovimento) quadro(0);
  };
  window.addEventListener("resize", aoRedimensionar);

  let raf = 0;
  let ultimo = 0;
  let ativo = false;
  let parado = false;

  const laco = (t: number) => {
    if (parado) return;
    const dt = ultimo ? Math.min(0.05, (t - ultimo) / 1000) : 0.016;
    ultimo = t;
    quadro(dt);
    raf = requestAnimationFrame(laco);
  };
  const iniciar = () => {
    if (ativo || parado) return;
    ativo = true;
    ultimo = 0;
    raf = requestAnimationFrame(laco);
  };
  const pausar = () => {
    ativo = false;
    cancelAnimationFrame(raf);
  };

  const aoMover = (e: PointerEvent) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    energia = Math.min(5, energia + Math.hypot(nx - alvoX, ny - alvoY) * 3);
    alvoX = nx;
    alvoY = ny;
  };
  const aoClicar = () => {
    energia = Math.min(5, energia + 2.5);
  };
  const aoRolar = () => {
    rolagem = window.scrollY;
  };
  const aoMudarVisibilidade = () => {
    if (document.hidden) pausar();
    else iniciar();
  };

  if (reduzirMovimento) {
    quadro(0);
  } else {
    if (temMouse) window.addEventListener("pointermove", aoMover, { passive: true });
    window.addEventListener("pointerdown", aoClicar, { passive: true });
    window.addEventListener("scroll", aoRolar, { passive: true });
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    aoRolar();
    rolagemAnterior = rolagem;
    iniciar();
  }

  return () => {
    parado = true;
    pausar();
    window.removeEventListener("resize", aoRedimensionar);
    window.removeEventListener("pointermove", aoMover);
    window.removeEventListener("pointerdown", aoClicar);
    window.removeEventListener("scroll", aoRolar);
    document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    for (const d of descartaveis) d.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };
}
