/* ============================================================
 * iPhone Duo · Teardown Lab
 * phone.js —— 纯程序化几何建模(不加载任何外部模型/贴图文件)
 *
 * 坐标约定:1 单位 = 10 mm,整机展开约 13.6 × 15.0 × 0.54 单位
 * 右半机挂在 foldPivot 下,绕 Y 轴旋转实现折叠
 * ============================================================ */
(function () {
  'use strict';

  var D = DUO.DIM;
  var T = null;              // 贴图集
  var pickables = [];
  var parts = [];

  /* ---------------- 材质工厂 ---------------- */
  function titanium() {
    return new THREE.MeshStandardMaterial({
      color: 0x9aa4ae, metalness: 1.0, roughness: 0.46,
      roughnessMap: T.brushed, envMapIntensity: 1.25
    });
  }
  function titaniumDark() {
    return new THREE.MeshStandardMaterial({
      color: 0x3c434c, metalness: 1.0, roughness: 0.4,
      roughnessMap: T.brushed, envMapIntensity: 1.0
    });
  }
  function steel() {
    return new THREE.MeshStandardMaterial({ color: 0xb9c3cc, metalness: 1.0, roughness: 0.28 });
  }
  function blackMetal() {
    return new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.7, roughness: 0.42 });
  }
  function glassBlack() {
    return new THREE.MeshPhysicalMaterial({
      color: 0x05070b, metalness: 0.25, roughness: 0.09,
      clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.4
    });
  }
  function backGlass() {
    return new THREE.MeshPhysicalMaterial({
      color: 0x2a3038, metalness: 0.55, roughness: 0.55,
      roughnessMap: T.frost, clearcoat: 0.7, clearcoatRoughness: 0.25,
      envMapIntensity: 1.1
    });
  }
  function copper() {
    return new THREE.MeshStandardMaterial({ color: 0xc07a3e, metalness: 1.0, roughness: 0.32, envMapIntensity: 1.2 });
  }
  function gold() {
    return new THREE.MeshStandardMaterial({ color: 0xd8ad68, metalness: 1.0, roughness: 0.24 });
  }
  function batteryBody() {
    return new THREE.MeshStandardMaterial({ color: 0x24282e, metalness: 0.45, roughness: 0.5 });
  }
  function pcbMat() {
    return new THREE.MeshStandardMaterial({ color: 0x0b1a12, metalness: 0.25, roughness: 0.62 });
  }
  function chipMat() {
    return new THREE.MeshStandardMaterial({ color: 0x202329, metalness: 0.95, roughness: 0.32 });
  }
  function labelMat(tex) {
    return new THREE.MeshStandardMaterial({
      map: tex, metalness: 0.15, roughness: 0.55,
      emissive: 0x2a3038, emissiveMap: tex, emissiveIntensity: 0.15
    });
  }
  function screenMat(tex) {
    return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  }
  function lensMat(tex) {
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff, map: tex, metalness: 0.35, roughness: 0.06,
      clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.0
    });
  }
  function glassSheen() {
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.05, transparent: true,
      opacity: 0.07, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false
    });
  }

  /* ---------------- 圆角矩形几何 ---------------- */
  function rrectPoints(w, h, r, seg) {
    r = Math.min(r, w / 2, h / 2);
    seg = seg || 8;
    var cx = w / 2 - r, cy = h / 2 - r;
    var corners = [
      [cx, -cy, -Math.PI / 2, 0],
      [cx, cy, 0, Math.PI / 2],
      [-cx, cy, Math.PI / 2, Math.PI],
      [-cx, -cy, Math.PI, Math.PI * 1.5]
    ];
    var pts = [];
    for (var c = 0; c < corners.length; c++) {
      var cc = corners[c];
      for (var i = 0; i <= seg; i++) {
        var a = cc[2] + (cc[3] - cc[2]) * (i / seg);
        pts.push([cc[0] + Math.cos(a) * r, cc[1] + Math.sin(a) * r]);
      }
    }
    return pts;
  }

  function shapeFromPoints(pts) {
    var s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    return s;
  }

  function pathFromPoints(pts) {
    var p = new THREE.Path();
    p.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    p.closePath();
    return p;
  }

  function roundedPlateGeo(w, h, r, depth, bevel) {
    var shape = shapeFromPoints(rrectPoints(w, h, r));
    var g = new THREE.ExtrudeGeometry(shape, {
      depth: depth, bevelEnabled: true,
      bevelThickness: bevel || 0, bevelSize: bevel || 0,
      bevelSegments: 2, curveSegments: 1, steps: 1
    });
    g.center();
    return g;
  }

  function roundedFrameGeo(w, h, r, border, depth) {
    var shape = shapeFromPoints(rrectPoints(w, h, r));
    var inner = rrectPoints(w - border * 2, h - border * 2, Math.max(0.05, r - border));
    inner.reverse();
    shape.holes.push(pathFromPoints(inner));
    var g = new THREE.ExtrudeGeometry(shape, {
      depth: depth, bevelEnabled: true,
      bevelThickness: 0.02, bevelSize: 0.02,
      bevelSegments: 2, curveSegments: 1, steps: 1
    });
    g.center();
    return g;
  }

  function box(w, h, d, mat, x, y, z) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  function cyl(rt, rb, h, seg, mat, x, y, z) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  function screw(parent, x, y, z) {
    var g = new THREE.CylinderGeometry(0.065, 0.065, 0.028, 14);
    g.rotateX(Math.PI / 2);
    var m = new THREE.Mesh(g, steel());
    m.position.set(x, y, z);
    parent.add(m);
  }

  function decal(tex, w, h, opts) {
    opts = opts || {};
    var mat = new THREE.MeshStandardMaterial({
      map: tex, metalness: 0.2, roughness: 0.5,
      transparent: !!opts.transparent,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: opts.glow || 0
    });
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    if (opts.back) m.rotation.y = Math.PI;
    if (opts.down) m.rotation.x = Math.PI / 2;
    if (opts.up) m.rotation.x = -Math.PI / 2;
    m.position.set(opts.x || 0, opts.y || 0, opts.z || 0);
    return m;
  }

  /* ---------------- 部件注册 ---------------- */
  function addPart(id, parent, pos, rotY, build) {
    var def = DUO.PART_MAP[id];
    if (!def) throw new Error('[DUO] unknown part: ' + id);
    var g = new THREE.Group();
    g.position.set(pos[0], pos[1], pos[2]);
    if (rotY) g.rotation.y = rotY;
    parent.add(g);
    build(g);
    g.userData.partId = id;
    var meshes = [];
    g.traverse(function (o) {
      if (!o.isMesh) return;
      if (Array.isArray(o.material)) {
        o.material = o.material.map(function (m) { return m.clone(); });
      } else {
        o.material = o.material.clone();
      }
      o.userData.partId = id;
      pickables.push(o);
      meshes.push(o);
    });
    var part = {
      id: id, def: def, group: g, home: g.position.clone(),
      dir: new THREE.Vector3(def.dir[0], def.dir[1], def.dir[2]).normalize(),
      dist: def.dist, order: def.order, meshes: meshes,
      glow: 0, pop: 0, popTarget: 0
    };
    parts.push(part);
    return part;
  }

  /* ============================================================
   * 左半机
   * ============================================================ */
  function buildLeft(left) {
    // ---- 左中框 ----
    addPart('frameL', left, [0, 0, 0], 0, function (g) {
      var frame = new THREE.Mesh(roundedFrameGeo(6.72, 14.92, 0.78, 0.15, D.T - 0.04), titanium());
      g.add(frame);
      var mid = new THREE.Mesh(roundedPlateGeo(6.46, 14.66, 0.7, 0.05, 0.008), blackMetal());
      mid.position.z = 0.145; g.add(mid);
      // 天线注塑断点
      var antMat = new THREE.MeshStandardMaterial({ color: 0x2b3037, metalness: 0.2, roughness: 0.7 });
      [-5.1, 5.1].forEach(function (y) {
        var strip = box(0.055, 0.22, 0.5, antMat, -3.335, y, 0);
        g.add(strip);
        var strip2 = box(0.055, 0.22, 0.5, antMat, 3.335, y, 0);
        g.add(strip2);
      });
      // 内部螺丝
      [[-2.7, 6.55], [2.7, 6.55], [-2.7, -6.55], [2.7, -6.55], [0, 6.85], [0, -6.85]].forEach(function (p) {
        screw(g, p[0], p[1], -0.305);
      });
      // 侧边注塑天线窗
      var win = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.4, 0.42), antMat);
      win.position.set(-3.36, 6.1, 0); g.add(win);
    });

    // ---- 内屏 · 左半 ----
    addPart('innerL', left, [0, 0, D.T / 2 + 0.02], 0, function (g) {
      var bezel = new THREE.Mesh(roundedFrameGeo(6.7, 14.6, 0.78, 0.07, 0.07), blackMetal());
      bezel.position.z = -0.035; g.add(bezel);
      var screen = new THREE.Mesh(new THREE.PlaneGeometry(6.56, 14.45), screenMat(T.wallL));
      screen.position.z = 0.012; g.add(screen);
      var sheen = new THREE.Mesh(roundedPlateGeo(6.66, 14.56, 0.78, 0.012, 0.004), glassSheen());
      sheen.position.z = 0.032; g.add(sheen);
      // 折痕侧缓冲胶
      var crease = box(0.055, 14.1, 0.02, new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.8 }), 3.26, 0, -0.015);
      g.add(crease);
    });

    // ---- 6.2″ 外屏(左半机背面,朝 -Z) ----
    addPart('cover', left, [0, 0, -D.T / 2 - 0.03], Math.PI, function (g) {
      var bezel = new THREE.Mesh(roundedFrameGeo(6.2, 13.9, 0.86, 0.1, 0.05), blackMetal());
      bezel.position.z = -0.012; g.add(bezel);
      var scr = new THREE.Mesh(new THREE.PlaneGeometry(5.96, 13.56), screenMat(T.cover));
      scr.position.z = 0.022; g.add(scr);
      var glass = new THREE.Mesh(roundedPlateGeo(6.18, 13.88, 0.86, 0.012, 0.004), glassSheen());
      glass.position.z = 0.038; g.add(glass);
    });

    // ---- 左电芯 2962 mAh ----
    addPart('batteryL', left, [0, -1.15, -0.04], 0, function (g) {
      var body = new THREE.Mesh(roundedPlateGeo(3.5, 8.6, 0.5, 0.28, 0.03), batteryBody());
      g.add(body);
      g.add(decal(T.batteryL, 3.18, 8.15, { back: true, z: -0.176, x: 0, y: 0 }));
      // 顶部连接器
      var conn = box(1.05, 0.28, 0.16, blackMetal(), 0.3, 4.4, -0.1); g.add(conn);
      for (var i = 0; i < 7; i++) {
        g.add(box(0.055, 0.12, 0.03, gold(), -0.1 + i * 0.12, 4.4, -0.175));
      }
      // 排线
      var flex = box(0.5, 0.045, 0.02, new THREE.MeshStandardMaterial({ color: 0xc4712f, roughness: 0.55 }), 1.4, 4.55, -0.18);
      flex.rotation.z = 0.32; g.add(flex);
    });

    // ---- MagSafe 线圈 ----
    addPart('coil', left, [0, -1.05, -0.235], 0, function (g) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(1.86, 0.055, 12, 72), copper());
      g.add(ring);
      var ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.035, 10, 64), gold());
      g.add(ring2);
      var core = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 8, 40), copper());
      g.add(core);
      var mag = new THREE.MeshStandardMaterial({ color: 0x8b9099, metalness: 1, roughness: 0.34 });
      for (var i = 0; i < 12; i++) {
        var a = (i / 12) * Math.PI * 2;
        var m = box(0.3, 0.16, 0.055, mag, Math.cos(a) * 1.7, Math.sin(a) * 1.7, -0.01);
        m.rotation.z = a;
        g.add(m);
      }
    });

    // ---- 电控脱胶胶条 ----
    addPart('adhesive', left, [0, -1.15, -0.218], 0, function (g) {
      var mat = new THREE.MeshStandardMaterial({
        color: 0xff8a3d, emissive: 0xff6a1a, emissiveIntensity: 0.35, roughness: 0.6
      });
      g.add(box(3.72, 0.09, 0.025, mat, 0, 4.24, 0));
      g.add(box(3.72, 0.09, 0.025, mat, 0, -4.24, 0));
      g.add(box(0.09, 8.3, 0.025, mat, 1.83, 0, 0));
      g.add(box(0.09, 8.3, 0.025, mat, -1.83, 0, 0));
      // 拉手小尾巴
      var tab = box(0.5, 0.14, 0.02, mat, 1.2, -4.55, 0);
      tab.rotation.z = 0.2; g.add(tab);
    });

    // ---- 12MP 外屏前摄 ----
    addPart('frontCam', left, [-2.0, 6.2, -0.35], 0, function (g) {
      var ring = cyl(0.23, 0.23, 0.06, 32, titaniumDark(), 0, 0, 0.01);
      ring.rotation.x = Math.PI / 2; g.add(ring);
      var glass = new THREE.Mesh(new THREE.CircleGeometry(0.185, 32), lensMat(T.lens));
      glass.rotation.y = Math.PI; glass.position.z = -0.025; g.add(glass);
      var dot = new THREE.Mesh(new THREE.CircleGeometry(0.025, 12), new THREE.MeshBasicMaterial({ color: 0x1a2b44 }));
      dot.rotation.y = Math.PI; dot.position.set(0.27, 0, -0.02); g.add(dot);
    });

    // ---- 钛金属按键(左:音量 + 操作按钮) ----
    addPart('buttons', left, [-3.4, 0, 0], 0, function (g) {
      var mat = titanium();
      [[3.15, 0.62], [2.25, 0.62], [1.3, 0.38]].forEach(function (b) {
        var m = new THREE.Mesh(roundedPlateGeo(0.10, b[1], 0.045, 0.28, 0.012), mat);
        m.rotation.y = Math.PI / 2;
        m.position.set(-0.02, b[0], 0);
        g.add(m);
      });
      // 静音/操作按钮凹槽
      g.add(box(0.02, 0.06, 0.34, blackMetal(), 0.01, 1.3, 0));
    });

    // ---- 底部扬声器 ----
    addPart('speakerL', left, [-1.95, -7.12, -0.02], 0, function (g) {
      var body = new THREE.Mesh(roundedPlateGeo(1.5, 0.52, 0.15, 0.4, 0.02), blackMetal());
      body.rotation.x = Math.PI / 2; body.position.y = 0; g.add(body);
      var grille = decal(T.grille, 1.25, 0.34, { down: true, y: -0.235, z: 0.01 });
      g.add(grille);
      // 音腔
      var chamber = box(1.2, 0.3, 0.34, new THREE.MeshStandardMaterial({ color: 0x15191f, roughness: 0.7 }), 0, 0.16, 0);
      g.add(chamber);
    });
  }

  /* ============================================================
   * 右半机
   * ============================================================ */
  function buildRight(right) {
    // ---- 右中框 ----
    addPart('frameR', right, [0, 0, 0], 0, function (g) {
      var frame = new THREE.Mesh(roundedFrameGeo(6.72, 14.92, 0.78, 0.15, D.T - 0.04), titanium());
      g.add(frame);
      var mid = new THREE.Mesh(roundedPlateGeo(6.46, 14.66, 0.7, 0.05, 0.008), blackMetal());
      mid.position.z = 0.145; g.add(mid);
      var antMat = new THREE.MeshStandardMaterial({ color: 0x2b3037, metalness: 0.2, roughness: 0.7 });
      [-5.1, 5.1].forEach(function (y) {
        g.add(box(0.055, 0.22, 0.5, antMat, -3.335, y, 0));
        g.add(box(0.055, 0.22, 0.5, antMat, 3.335, y, 0));
      });
      [[-2.7, 6.55], [2.7, 6.55], [-2.7, -6.55], [2.7, -6.55], [0, 6.85], [0, -6.85]].forEach(function (p) {
        screw(g, p[0], p[1], -0.305);
      });
      // 电源键(右侧)
      var pw = new THREE.Mesh(roundedPlateGeo(0.10, 1.4, 0.05, 0.28, 0.012), titanium());
      pw.rotation.y = Math.PI / 2; pw.position.set(3.38, 2.4, 0); g.add(pw);
    });

    // ---- 内屏 · 右半 ----
    addPart('innerR', right, [0, 0, D.T / 2 + 0.02], 0, function (g) {
      var bezel = new THREE.Mesh(roundedFrameGeo(6.7, 14.6, 0.78, 0.07, 0.07), blackMetal());
      bezel.position.z = -0.035; g.add(bezel);
      var screen = new THREE.Mesh(new THREE.PlaneGeometry(6.56, 14.45), screenMat(T.wallR));
      screen.position.z = 0.012; g.add(screen);
      var sheen = new THREE.Mesh(roundedPlateGeo(6.66, 14.56, 0.78, 0.012, 0.004), glassSheen());
      sheen.position.z = 0.032; g.add(sheen);
      var crease = box(0.055, 14.1, 0.02, new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.8 }), -3.26, 0, -0.015);
      g.add(crease);
    });

    // ---- 右背板 ----
    addPart('backGlass', right, [0, 0, -D.T / 2 - 0.025], 0, function (g) {
      var plate = new THREE.Mesh(roundedPlateGeo(6.5, 14.72, 0.82, 0.06, 0.012), backGlass());
      g.add(plate);
      // 极简 DUO 字标
      var logo = document.createElement('canvas');
      logo.width = 512; logo.height = 128;
      var lc = logo.getContext('2d');
      lc.clearRect(0, 0, 512, 128);
      lc.textAlign = 'center';
      lc.fillStyle = 'rgba(210,225,240,0.5)';
      lc.font = '600 58px "Segoe UI",sans-serif';
      if (lc.letterSpacing !== undefined) lc.letterSpacing = '18px';
      lc.fillText('D U O', 256, 84);
      var logoMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(logo), transparent: true, toneMapped: false });
      var lm = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), logoMat);
      lm.rotation.y = Math.PI; lm.position.set(0, -6.1, -0.045); g.add(lm);
      // 防水胶圈
      var seal = new THREE.Mesh(roundedFrameGeo(6.56, 14.78, 0.84, 0.035, 0.004), new THREE.MeshStandardMaterial({ color: 0x11151b, roughness: 0.85 }));
      seal.position.z = 0.015; g.add(seal);
    });

    // ---- 双层主板 ----
    addPart('board', right, [0.15, 3.5, -0.07], 0, function (g) {
      var base = new THREE.Mesh(roundedPlateGeo(3.42, 4.9, 0.42, 0.08, 0.01), pcbMat());
      g.add(base);
      g.add(decal(T.pcb, 3.28, 4.75, { back: true, z: -0.056, x: 0, y: 0 }));
      // 屏蔽罩
      var shield = new THREE.MeshStandardMaterial({ color: 0x9ba6b2, metalness: 1, roughness: 0.38 });
      g.add(box(1.15, 0.95, 0.06, shield, -0.95, 1.15, -0.085));
      g.add(box(0.8, 0.6, 0.06, shield, 1.0, 0.9, -0.085));
      g.add(box(1.6, 0.35, 0.05, blackMetal(), 0, -2.1, -0.08));
      // 连接器
      for (var i = 0; i < 4; i++) {
        g.add(box(0.55, 0.12, 0.05, gold(), -1.2 + i * 0.8, -2.35, -0.085));
      }
      // 屏蔽罩上的细纹
      for (var k = 0; k < 5; k++) {
        g.add(box(0.9, 0.012, 0.005, blackMetal(), -0.95, 0.8 + k * 0.14, -0.118));
      }
    });

    // ---- A20 Pro ----
    addPart('a20', right, [0.35, 3.95, -0.185], 0, function (g) {
      var sub = new THREE.Mesh(roundedPlateGeo(1.15, 1.15, 0.12, 0.05, 0.008), blackMetal());
      g.add(sub);
      var lid = box(1.02, 1.02, 0.09, chipMat(), 0, 0, -0.045); g.add(lid);
      g.add(decal(T.a20, 0.86, 0.86, { back: true, z: -0.095 }));
      // 周边小电容
      for (var i = 0; i < 10; i++) {
        var a = (i / 10) * Math.PI * 2;
        g.add(box(0.07, 0.05, 0.04, blackMetal(), Math.cos(a) * 0.72, Math.sin(a) * 0.72, -0.055));
      }
    });

    // ---- C2 基带 ----
    addPart('c2', right, [1.3, 1.55, -0.185], 0, function (g) {
      var sub = new THREE.Mesh(roundedPlateGeo(0.86, 0.68, 0.08, 0.04, 0.006), blackMetal());
      g.add(sub);
      g.add(box(0.76, 0.58, 0.07, chipMat(), 0, 0, -0.04));
      g.add(decal(T.c2, 0.6, 0.48, { back: true, z: -0.079 }));
    });

    // ---- VC 均热板 ----
    addPart('vapor', right, [0.35, 3.75, -0.105], 0, function (g) {
      var plate = new THREE.Mesh(roundedPlateGeo(2.55, 3.4, 0.35, 0.055, 0.008), copper());
      g.add(plate);
      // 毛细沟槽
      var groove = new THREE.MeshStandardMaterial({ color: 0x8a4f24, metalness: 1, roughness: 0.45 });
      for (var i = 0; i < 9; i++) {
        g.add(box(2.25, 0.02, 0.006, groove, 0, -1.35 + i * 0.34, -0.04));
      }
      // 边缘焊点
      var dotMat = new THREE.MeshStandardMaterial({ color: 0xd8a765, metalness: 1, roughness: 0.3 });
      for (var k = 0; k < 8; k++) {
        g.add(box(0.04, 0.04, 0.006, dotMat, -1.1 + (k % 4) * 0.73, k < 4 ? 1.58 : -1.58, -0.041));
      }
    });

    // ---- eSIM ----
    addPart('esim', right, [1.55, 1.35, -0.16], 0, function (g) {
      var base = new THREE.Mesh(roundedPlateGeo(0.62, 0.46, 0.06, 0.035, 0.005), blackMetal());
      g.add(base);
      var chip = box(0.42, 0.3, 0.03, new THREE.MeshStandardMaterial({ color: 0x1b1e22, metalness: 0.5, roughness: 0.4 }), 0, 0, -0.03);
      g.add(chip);
      g.add(box(0.3, 0.02, 0.005, gold(), 0, 0.08, -0.048));
    });

    // ---- 1921 mAh 右电芯 ----
    addPart('batteryR', right, [0, -2.1, -0.04], 0, function (g) {
      var body = new THREE.Mesh(roundedPlateGeo(3.2, 6.0, 0.45, 0.28, 0.03), batteryBody());
      g.add(body);
      g.add(decal(T.batteryR, 2.92, 5.62, { back: true, z: -0.176 }));
      var conn = box(0.9, 0.24, 0.14, blackMetal(), -0.3, 3.1, -0.1); g.add(conn);
      for (var i = 0; i < 6; i++) {
        g.add(box(0.05, 0.1, 0.03, gold(), -0.62 + i * 0.12, 3.1, -0.175));
      }
    });

    // ---- Taptic Engine ----
    addPart('taptic', right, [0.75, -5.95, -0.06], 0, function (g) {
      var body = new THREE.Mesh(roundedPlateGeo(1.6, 1.5, 0.3, 0.28, 0.025), blackMetal());
      g.add(body);
      var coil = cyl(0.5, 0.5, 0.09, 28, copper(), 0, 0.05, -0.17);
      coil.rotation.x = Math.PI / 2; g.add(coil);
      g.add(box(0.7, 0.32, 0.06, steel(), 0, -0.42, -0.17));
      screw(g, 0.52, 0.45, -0.18);
    });

    // ---- USB-C ----
    addPart('usbc', right, [0.75, -7.3, -0.01], 0, function (g) {
      var shell = new THREE.Mesh(roundedPlateGeo(1.18, 0.34, 0.14, 0.46, 0.02), titaniumDark());
      shell.rotation.x = Math.PI / 2; g.add(shell);
      // 接口开口(朝下)
      var mouth = new THREE.Mesh(roundedPlateGeo(0.9, 0.22, 0.1, 0.012, 0.003),
        new THREE.MeshBasicMaterial({ color: 0x020304 }));
      mouth.rotation.x = Math.PI / 2; mouth.position.y = -0.238; g.add(mouth);
      var cavity = box(0.78, 0.2, 0.05, new THREE.MeshStandardMaterial({ color: 0x020304, roughness: 0.9 }), 0, -0.22, 0);
      g.add(cavity);
      // 接口内的舌片
      g.add(box(0.58, 0.045, 0.16, blackMetal(), 0, -0.2, 0));
      // 两颗 P2 防拆螺丝
      screw(g, -0.82, -0.16, 0.02);
      screw(g, 0.82, -0.16, 0.02);
      // 底部天线断点
      g.add(box(0.06, 0.06, 0.34, new THREE.MeshStandardMaterial({ color: 0x2b3037, roughness: 0.7 }), -1.15, -0.12, 0));
    });

    // ---- 48MP 双摄 ----
    addPart('camera', right, [0.35, 5.52, -0.345], 0, function (g) {
      var island = new THREE.Mesh(roundedPlateGeo(3.0, 3.12, 0.72, 0.16, 0.035), titaniumDark());
      g.add(island);
      // 玻璃底
      var glassBase = new THREE.Mesh(roundedPlateGeo(2.86, 2.98, 0.68, 0.02, 0.005), glassBlack());
      glassBase.position.z = -0.128; g.add(glassBase);

      function lensAssembly(x, y, scale) {
        var lg = new THREE.Group();
        var barrel = cyl(0.62 * scale, 0.68 * scale, 0.2, 40, titaniumDark(), 0, 0, 0);
        barrel.rotation.x = Math.PI / 2; lg.add(barrel);
        var ring = new THREE.Mesh(new THREE.TorusGeometry(0.6 * scale, 0.038, 12, 48), steel());
        ring.position.z = -0.105; lg.add(ring);
        var glass = new THREE.Mesh(new THREE.CircleGeometry(0.55 * scale, 48), lensMat(T.lens));
        glass.rotation.y = Math.PI; glass.position.z = -0.112; lg.add(glass);
        var hi = new THREE.Mesh(new THREE.TorusGeometry(0.44 * scale, 0.012, 8, 40),
          new THREE.MeshBasicMaterial({ color: 0x86c6ff, transparent: true, opacity: 0.22 }));
        hi.position.z = -0.116; lg.add(hi);
        lg.position.set(x, y, -0.08);
        return lg;
      }
      g.add(lensAssembly(-0.58, 0.62, 1.0));
      g.add(lensAssembly(0.58, -0.6, 0.92));
      // 闪光灯开孔与麦克风(闪光灯为独立部件)
      var mic = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      mic.rotation.y = Math.PI; mic.position.set(-0.95, -0.95, -0.118); g.add(mic);
      // 48MP 字标
      var c = document.createElement('canvas'); c.width = 256; c.height = 64;
      var cx = c.getContext('2d'); cx.clearRect(0, 0, 256, 64);
      cx.fillStyle = 'rgba(205,220,235,0.6)'; cx.textAlign = 'center';
      cx.font = '600 26px "Segoe UI",sans-serif';
      if (cx.letterSpacing !== undefined) cx.letterSpacing = '4px';
      cx.fillText('48MP', 128, 42);
      var mt = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, toneMapped: false });
      var label = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.175), mt);
      label.rotation.y = Math.PI; label.position.set(0.9, -1.0, -0.118); g.add(label);
    });

    // ---- 原彩闪光灯 ----
    addPart('flash', right, [1.3, 6.35, -0.46], 0, function (g) {
      var ring = cyl(0.2, 0.2, 0.05, 28, titaniumDark(), 0, 0, 0);
      ring.rotation.x = Math.PI / 2; g.add(ring);
      var lens = new THREE.Mesh(new THREE.CircleGeometry(0.155, 28),
        new THREE.MeshStandardMaterial({ color: 0xfff5db, emissive: 0xffd88a, emissiveIntensity: 0.55, roughness: 0.2 }));
      lens.rotation.y = Math.PI; lens.position.z = -0.03; g.add(lens);
      var mic = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), new THREE.MeshBasicMaterial({ color: 0x020202 }));
      mic.rotation.y = Math.PI; mic.position.set(0.34, 0, -0.03); g.add(mic);
    });

    // ---- 屏下 FaceTime 前摄 ----
    addPart('faceCam', right, [0.85, 6.15, 0.18], 0, function (g) {
      var base = box(0.52, 0.52, 0.09, new THREE.MeshStandardMaterial({ color: 0x14171c, metalness: 0.6, roughness: 0.4 }), 0, 0, 0);
      g.add(base);
      var barrel = cyl(0.1, 0.12, 0.08, 24, blackMetal(), 0, 0, 0.06);
      barrel.rotation.x = Math.PI / 2; g.add(barrel);
      var lens = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24),
        new THREE.MeshStandardMaterial({ color: 0x2a3a66, emissive: 0x1d2f66, emissiveIntensity: 0.4, metalness: 0.8, roughness: 0.1 }));
      lens.position.z = 0.105; g.add(lens);
      var ir = new THREE.Mesh(new THREE.CircleGeometry(0.032, 12), new THREE.MeshBasicMaterial({ color: 0x5a1636 }));
      ir.position.set(0.19, 0, 0.052); g.add(ir);
    });
  }

  /* ============================================================
   * 中央铰链
   * ============================================================ */
  function buildHinge(root) {
    addPart('hinge', root, [0, 0, 0], 0, function (g) {
      var mat = titanium();
      var railL = cyl(0.135, 0.135, 14.6, 20, mat, -0.13, 0, 0.02);
      var railR = cyl(0.135, 0.135, 14.6, 20, mat, 0.13, 0, 0.02);
      g.add(railL); g.add(railR);
      // 凸轮关节
      for (var i = 0; i < 9; i++) {
        var y = -6.4 + i * 1.6;
        var k = cyl(0.205, 0.205, 0.5, 20, titaniumDark(), 0, y, 0);
        g.add(k);
        var cam = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.045, 8, 24), mat);
        cam.rotation.x = Math.PI / 2; cam.position.set(0, y, 0); g.add(cam);
      }
      // 承力支架
      [-5.8, -2.0, 2.0, 5.8].forEach(function (y) {
        g.add(box(0.66, 0.26, 0.24, titaniumDark(), 0, y, -0.05));
      });
      // 两端封盖
      g.add(cyl(0.23, 0.23, 0.14, 24, steel(), 0, 7.38, 0));
      g.add(cyl(0.23, 0.23, 0.14, 24, steel(), 0, -7.38, 0));
      // 排线通道
      g.add(box(0.16, 14.2, 0.05, blackMetal(), 0, 0, -0.16));
    });

    addPart('hingeCover', root, [0, 0, 0], 0, function (g) {
      var mat = titanium();
      var spine = new THREE.Mesh(roundedPlateGeo(0.62, 14.7, 0.28, 0.11, 0.02), mat);
      spine.position.z = -0.34; g.add(spine);
      // 两侧过渡导轨
      [-0.38, 0.38].forEach(function (x) {
        var rail = new THREE.Mesh(roundedPlateGeo(0.18, 14.55, 0.08, 0.06, 0.012), titaniumDark());
        rail.position.set(x, 0, -0.39); g.add(rail);
      });
      // 拉丝装饰线
      var lineMat = new THREE.MeshStandardMaterial({ color: 0xd7e0e8, metalness: 1, roughness: 0.3 });
      for (var i = 0; i < 2; i++) {
        g.add(box(0.012, 14.2, 0.006, lineMat, -0.13 + i * 0.26, 0, -0.418));
      }
      // 铰链盖固定螺丝
      [6.35, -6.35].forEach(function (y) { screw(g, 0, y, -0.42); });
    });
  }

  /* ---------------- 组装 ---------------- */
  DUO.buildPhone = function (textures) {
    T = textures;
    pickables.length = 0;
    parts.length = 0;

    var root = new THREE.Group();
    root.name = 'iPhoneDuo';

    var left = new THREE.Group();
    left.name = 'leftHalf';
    left.position.set(-D.W / 2, 0, 0);
    root.add(left);

    var foldPivot = new THREE.Group();
    foldPivot.name = 'foldPivot';
    root.add(foldPivot);

    var right = new THREE.Group();
    right.name = 'rightHalf';
    right.position.set(D.W / 2, 0, 0);
    foldPivot.add(right);

    buildLeft(left);
    buildRight(right);
    buildHinge(root);

    return {
      root: root, left: left, right: right, foldPivot: foldPivot,
      parts: parts, pickables: pickables,
      leftHome: left.position.clone(), rightHome: right.position.clone()
    };
  };
})();
