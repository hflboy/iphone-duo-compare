/* ============================================================
 * iPhone Duo · 交互式 3D 拆解实验室
 * phoneModel.js —— 程序化建模(零外部模型/贴图,全部代码生成)
 *
 * 结构依据(公开资料):
 *  - Apple 官方:iPhone Duo 为首款折叠屏 iPhone,内屏 7.6″ + 外屏 6.2″,
 *    Grade 5 钛金属中框与铰链盖,A20 Pro + 均热板,双电池系统,C2 基带,
 *    48MP Dual Fusion 双摄(主摄+超广角),12MP Center Stage 外屏前摄,
 *    屏下 FaceTime 前摄,eSIM-only。
 *  - iFixit / REWA 拆解:双电芯 2962mAh + 1921mAh(电控脱胶胶拉固定)、
 *    水滴型铰链、内外屏总成分层、跨铰链排线。
 *
 * 本文件把整机拆成 22 个可交互部件,左右半机分别挂载,支持折叠联动。
 * 部件原位(home)、拆解方向(dir)与距离(dist)见 PLACEMENT 表。
 * ============================================================ */
(function () {
  'use strict';

  var PI = Math.PI;
  var HALF = 3.55;          // 左右半机中心 X
  var FOLD_AXIS = 0.32;     // 折叠旋转轴 Z 位置(前玻璃外表面)

  var TEX = {};             // 纹理缓存

  window.App = window.App || {};
  App.FOLD_AXIS = FOLD_AXIS;

  /* ---------------- 基础几何工具 ---------------- */

  function roundedRectShape(w, h, r) {
    r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001);
    var s = new THREE.Shape();
    var x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  /* 圆角薄板(带倒角),Z 向居中 */
  function slabGeo(w, h, t, r) {
    var b = Math.min(0.03, t * 0.3, r * 0.6);
    var shape = roundedRectShape(w - 2 * b, h - 2 * b, Math.max(0.02, r - b));
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: t - 2 * b,
      bevelEnabled: true, bevelThickness: b, bevelSize: b,
      bevelSegments: 2, curveSegments: 12
    });
    geo.translate(0, 0, -(t - 2 * b) / 2);
    return geo;
  }

  /* ---------------- 程序化纹理(CanvasTexture) ---------------- */

  function canvasTexture(w, h, draw) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }
  App.canvasTexture = canvasTexture;

  function tex(key, w, h, draw) {
    if (TEX[key]) return TEX[key];
    TEX[key] = canvasTexture(w, h, draw);
    return TEX[key];
  }

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function blob(ctx, x, y, r, color) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /* 内屏壁纸(左右两半各一张,拼合后连续,靠铰链一侧有折痕阴影) */
  function drawInnerScreen(ctx, w, h, side) {
    ctx.fillStyle = '#000208';
    ctx.fillRect(0, 0, w, h);
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b1a38'); g.addColorStop(0.55, '#071026'); g.addColorStop(1, '#03060f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    blob(ctx, w * 0.30, h * 0.26, w * 0.55, 'rgba(34,120,220,0.30)');
    blob(ctx, w * 0.75, h * 0.62, w * 0.60, 'rgba(88,60,200,0.22)');
    blob(ctx, w * 0.50, h * 0.92, w * 0.50, 'rgba(20,160,190,0.16)');
    for (var i = 0; i < 90; i++) {
      ctx.fillStyle = 'rgba(190,215,255,' + (Math.random() * 0.4 + 0.05).toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.5 + 0.4, 0, PI * 2);
      ctx.fill();
    }

    if (side === 'L') {
      ctx.fillStyle = 'rgba(240,248,255,0.95)';
      ctx.font = '600 54px "Segoe UI","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('9:41', 44, 84);
      ctx.font = '400 22px "Segoe UI","Microsoft YaHei",sans-serif';
      ctx.fillStyle = 'rgba(200,220,250,0.6)';
      ctx.fillText('11月4日 星期二', 44, 120);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      rr(ctx, w - 220, 44, 176, 176, 24); ctx.fill();
      ctx.strokeStyle = 'rgba(140,190,255,0.15)';
      ctx.stroke();
      ctx.fillStyle = 'rgba(220,235,255,0.8)';
      ctx.font = '500 20px "Segoe UI","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Duo Widget', w - 132, 120);
      ctx.fillStyle = 'rgba(34,211,238,0.8)';
      ctx.fillText('82%', w - 132, 156);
    }

    // Dock(横跨两半,各画一段)
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    if (side === 'L') rr(ctx, 40, h - 150, w - 40, 106, 40);
    else rr(ctx, 0, h - 150, w - 40, 106, 40);
    ctx.fill();
    var iconColors = ['rgba(90,150,255,0.75)', 'rgba(80,220,200,0.75)', 'rgba(255,160,90,0.75)', 'rgba(200,120,255,0.75)'];
    var startIdx = side === 'L' ? 0 : 4;
    for (var k = 0; k < 4; k++) {
      var ix = side === 'L' ? 70 + k * 120 : 20 + k * 120;
      var ig = ctx.createLinearGradient(ix, h - 130, ix + 86, h - 50);
      ig.addColorStop(0, iconColors[(startIdx + k) % 4]);
      ig.addColorStop(1, 'rgba(20,30,50,0.9)');
      ctx.fillStyle = ig;
      rr(ctx, ix, h - 130, 86, 86, 22); ctx.fill();
    }

    // 折痕阴影(铰链一侧)
    var crease = ctx.createLinearGradient(side === 'L' ? w : 0, 0, side === 'L' ? w - 70 : 70, 0);
    crease.addColorStop(0, 'rgba(0,0,0,0.55)');
    crease.addColorStop(0.5, 'rgba(0,0,0,0.12)');
    crease.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = crease;
    ctx.fillRect(0, 0, w, h);

    if (side === 'R') {
      // 屏下前摄区域(极淡印记)
      ctx.beginPath();
      ctx.arc(w * 0.294, h * 0.093, 56, 0, PI * 2);
      ctx.strokeStyle = 'rgba(130,170,255,0.10)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  /* 外屏(AOD 常显风格,含打孔前摄) */
  function drawOuterScreen(ctx, w, h) {
    ctx.fillStyle = '#000205';
    ctx.fillRect(0, 0, w, h);
    var g = ctx.createRadialGradient(w * 0.5, h * 0.42, 20, w * 0.5, h * 0.42, h * 0.55);
    g.addColorStop(0, 'rgba(30,70,140,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    ctx.beginPath(); ctx.arc(44, 54, 30, 0, PI * 2);
    ctx.fillStyle = '#000'; ctx.fill();
    ctx.strokeStyle = 'rgba(120,170,230,0.28)';
    ctx.lineWidth = 2; ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(235,246,255,0.92)';
    ctx.font = '600 120px "Segoe UI","Microsoft YaHei",sans-serif';
    ctx.fillText('21:47', w / 2, h * 0.44);
    ctx.font = '400 26px "Segoe UI","Microsoft YaHei",sans-serif';
    ctx.fillStyle = 'rgba(180,205,240,0.55)';
    ctx.fillText('11月4日 · 星期二', w / 2, h * 0.44 + 48);

    ctx.lineWidth = 9;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.arc(w / 2, h * 0.72, 56, 0, PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(34,211,238,0.85)';
    ctx.beginPath(); ctx.arc(w / 2, h * 0.72, 56, -PI / 2, PI * 0.9); ctx.stroke();
    ctx.fillStyle = 'rgba(220,240,255,0.85)';
    ctx.font = '500 24px "Segoe UI",sans-serif';
    ctx.fillText('82%', w / 2, h * 0.72 + 8);

    ctx.fillStyle = 'rgba(150,190,240,0.35)';
    rr(ctx, 16, h * 0.20, 12, h * 0.5, 6); ctx.fill();

    ctx.fillStyle = 'rgba(34,211,238,0.75)';
    ctx.font = '700 40px "Segoe UI",sans-serif';
    ctx.fillText('D U O', w / 2, h - 70);
  }

  /* 电池标签(真实容量 2962 / 1921 mAh,电控脱胶) */
  function drawBatt(ctx, w, h, side) {
    ctx.fillStyle = '#b3b8be';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1d2228';
    ctx.fillRect(0, 0, w, 88);
    ctx.fillStyle = '#f5d76e';
    ctx.font = '600 22px "Segoe UI","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚠ 禁止刺穿 · 高温 · 短路', 20, 52);

    ctx.fillStyle = '#171b20';
    ctx.textAlign = 'center';
    ctx.font = '700 30px "Segoe UI",sans-serif';
    ctx.fillText('DUO ENERGY', w / 2, 150);
    ctx.font = '500 26px "Microsoft YaHei",sans-serif';
    ctx.fillText('锂离子电池组', w / 2, 192);

    ctx.fillStyle = '#2a2f36';
    ctx.font = '400 20px "Segoe UI","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    if (side === 'L') ctx.fillText('型号: A3110-L · 2962 mAh · 11.52 Wh', 28, 248);
    else ctx.fillText('型号: A3110-R · 1921 mAh · 7.47 Wh', 28, 248);
    ctx.fillText('标称电压: 3.89V · 充电限制: 4.48V', 28, 282);
    ctx.fillText('电控脱胶设计:通电可辅助拆除', 28, 316);
    ctx.fillText('执行标准: GB 31241 · UN38.3', 28, 350);

    ctx.fillStyle = '#15181c';
    var bx = 28;
    while (bx < w - 28) {
      var bw = 2 + Math.random() * 6;
      ctx.fillRect(bx, 390, bw, 86);
      bx += bw + 3 + Math.random() * 6;
    }
    ctx.font = '400 16px Consolas,monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2a2f36';
    ctx.fillText(side === 'L' ? 'S/N DU26-L-1103A' : 'S/N DU26-R-1103A', w / 2, 506);

    ctx.font = '400 52px "Segoe UI Emoji",sans-serif';
    ctx.fillStyle = '#3a4046';
    ctx.fillText('♻', w / 2, 586);
    ctx.font = '400 18px "Microsoft YaHei",sans-serif';
    ctx.fillText('iPhone Duo 电池组 · 请循环回收', w / 2, 634);
    ctx.fillStyle = '#8a9097';
    ctx.fillRect(0, h - 26, w, 26);
  }

  /* 芯片丝印(A20 Pro / C2 基带) */
  function drawChip(ctx, w, h, big, sub, note) {
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(212,175,55,0.8)';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.strokeStyle = 'rgba(212,175,55,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 22, w - 44, h - 44);
    ctx.fillStyle = 'rgba(212,175,55,0.7)';
    for (var i = 0; i < 10; i++) {
      var p = 30 + i * ((w - 60) / 9);
      ctx.fillRect(p, 2, 10, 8);
      ctx.fillRect(p, h - 10, 10, 8);
      ctx.fillRect(2, p, 8, 10);
      ctx.fillRect(w - 10, p, 8, 10);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d4af37';
    ctx.font = '700 64px "Segoe UI",sans-serif';
    ctx.fillText(big, w / 2, h * 0.44);
    ctx.font = '600 26px "Segoe UI",sans-serif';
    ctx.fillText(sub, w / 2, h * 0.44 + 40);
    ctx.fillStyle = 'rgba(212,175,55,0.55)';
    ctx.font = '400 13px Consolas,monospace';
    ctx.fillText(note, w / 2, h * 0.44 + 72);
    ctx.fillText('DUO SILICON', w / 2, h * 0.44 + 94);
  }

  /* 扬声器网孔 */
  function drawDots(ctx, w, h) {
    ctx.fillStyle = '#0d1014';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#39424d';
    for (var y = 6; y < h; y += 8) {
      for (var x = 6; x < w; x += 8) {
        ctx.beginPath();
        ctx.arc(x, y, 1.7, 0, PI * 2);
        ctx.fill();
      }
    }
  }

  /* DUO 字标 */
  function drawDuoMark(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(200,225,255,0.9)';
    ctx.font = '700 44px "Segoe UI",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('D U O', w / 2, h * 0.68);
  }

  /* ---------------- 部件放置表(局部坐标,单位≈cm) ---------------- */

  var PLACEMENT = {
    screws:       { home: [1.2, -7.40, 0],      dir: [0.15, -0.86, 0.49],   dist: 7.0 },
    innerGlassL:  { home: [-3.55, 0, 0.26],     dir: [-0.05, 0.10, 0.995],  dist: 10.4 },
    innerGlassR:  { home: [3.55, 0, 0.26],      dir: [0.05, 0.10, 0.995],   dist: 10.4 },
    innerPanelL:  { home: [-3.55, 0, 0.18],     dir: [-0.04, 0.05, 0.998],  dist: 8.8 },
    innerPanelR:  { home: [3.55, 0, 0.18],      dir: [0.04, 0.05, 0.998],   dist: 8.8 },
    udCamera:     { home: [2.2, 5.9, 0.02],     dir: [-0.10, 0.16, 0.98],   dist: 7.2 },
    vaporChamber: { home: [-3.55, 4.7, -0.16],  dir: [0.05, 0.20, 0.977],   dist: 5.6 },
    mainBoard:    { home: [-3.55, 4.7, -0.04],  dir: [-0.08, 0.14, 0.987],  dist: 4.6 },
    subBoard:     { home: [3.55, 4.7, -0.04],   dir: [0.08, 0.14, 0.987],   dist: 4.6 },
    batteryL:     { home: [-3.55, -1.4, 0],     dir: [-0.05, 0.02, 0.998],  dist: 3.4 },
    batteryR:     { home: [3.55, -1.4, 0],      dir: [0.05, 0.02, 0.998],   dist: 3.4 },
    coilL:        { home: [-3.55, -1.4, -0.225],dir: [-0.05, -0.02, 0.998], dist: 2.2 },
    coilR:        { home: [3.55, -1.4, -0.225], dir: [0.05, -0.02, 0.998],  dist: 2.2 },
    frameL:       { home: [0, 0, 0],            dir: [0, 0.02, 1],          dist: 1.3 },
    frameR:       { home: [0, 0, 0],            dir: [0, 0.02, 1],          dist: 1.3 },
    hinge:        { home: [0, 0, 0],            dir: [1, 0, 0.05],          dist: 9.8 },
    cameraModule: { home: [5.2, 5.1, -0.42],    dir: [-0.05, 0.12, -0.99],  dist: 5.6 },
    taptic:       { home: [-4.9, -5.7, 0],      dir: [0.06, -0.08, -0.995], dist: 3.0 },
    speaker:      { home: [-3.4, -6.85, 0],     dir: [-0.06, -0.08, -0.995],dist: 3.7 },
    usbPort:      { home: [1.2, -7.0, 0],       dir: [0.10, -0.10, -0.99],  dist: 2.6 },
    outerDisplay: { home: [-3.55, 0, -0.30],    dir: [-0.06, 0.02, -0.998], dist: 8.4 },
    backCover:    { home: [3.55, 0, -0.295],    dir: [0.06, 0.02, -0.998],  dist: 9.8 }
  };

  /* 左半 / 右半 / 根(折叠时跟随与否) */
  var SIDE = {
    screws: 'R', innerGlassL: 'L', innerGlassR: 'R', innerPanelL: 'L', innerPanelR: 'R',
    udCamera: 'R', vaporChamber: 'L', mainBoard: 'L', subBoard: 'R',
    batteryL: 'L', batteryR: 'R', coilL: 'L', coilR: 'R',
    frameL: 'L', frameR: 'R', hinge: 'root', cameraModule: 'R',
    taptic: 'L', speaker: 'L', usbPort: 'R', outerDisplay: 'L', backCover: 'R'
  };

  /* ---------------- 各部件建模 ---------------- */

  var goldMat, shieldMat, darkMat;

  function sharedMats() {
    if (goldMat) return;
    goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 1, roughness: 0.35 });
    shieldMat = new THREE.MeshStandardMaterial({ color: 0xb9c0c8, metalness: 0.95, roughness: 0.28 });
    darkMat = new THREE.MeshStandardMaterial({ color: 0x14181d, metalness: 0.5, roughness: 0.4 });
  }

  var BUILDERS = {

    screws: function () {
      var g = new THREE.Group();
      var mat = new THREE.MeshStandardMaterial({ color: 0xc8ced6, metalness: 1, roughness: 0.3 });
      [-0.85, 0.85].forEach(function (x) {
        var m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 6), mat);
        m.position.set(x, 0, 0);
        g.add(m);
        var slot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.078),
          new THREE.MeshStandardMaterial({ color: 0x23282e, metalness: 0.8, roughness: 0.4 }));
        slot.position.set(x, -0.036, 0);
        slot.rotation.y = x > 0 ? 0.5 : -0.5;
        g.add(slot);
      });
      return g;
    },

    innerGlassL: function () { return glassHalf(); },
    innerGlassR: function () { return glassHalf(); },

    innerPanelL: function () { return panelHalf('L'); },
    innerPanelR: function () { return panelHalf('R'); },

    udCamera: function () {
      var g = new THREE.Group();
      var base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.8, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x05070a, metalness: 0.4, roughness: 0.4 }));
      g.add(base);
      var lens = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.10, 24),
        new THREE.MeshStandardMaterial({ color: 0x0a1018, metalness: 0.6, roughness: 0.25 }));
      lens.rotation.x = PI / 2;
      lens.position.set(0, 0, 0.10);
      g.add(lens);
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.02, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0x39424d, metalness: 0.9, roughness: 0.3 }));
      ring.position.set(0, 0, 0.145);
      g.add(ring);
      var pcb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x143024, metalness: 0.3, roughness: 0.5 }));
      pcb.position.set(0, -0.02, -0.07);
      g.add(pcb);
      return g;
    },

    vaporChamber: function () {
      sharedMats();
      var g = new THREE.Group();
      var mat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 1, roughness: 0.32 });
      g.add(new THREE.Mesh(slabGeo(5.9, 4.6, 0.06, 0.5), mat));
      var t1 = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.05, 8, 40, PI), mat);
      t1.position.set(-1.2, -1.2, 0.04);
      g.add(t1);
      var t2 = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.05, 8, 40, PI), mat);
      t2.position.set(1.2, 1.2, 0.04);
      t2.rotation.z = PI;
      g.add(t2);
      return g;
    },

    mainBoard: function () { return board('main'); },
    subBoard: function () { return board('sub'); },

    batteryL: function () { return battery('L'); },
    batteryR: function () { return battery('R'); },

    coilL: function () { return coilUnit(); },
    coilR: function () { return coilUnit(); },

    frameL: function () { return frame('L'); },
    frameR: function () { return frame('R'); },

    hinge: function () {
      sharedMats();
      var g = new THREE.Group();
      var tiMat = new THREE.MeshStandardMaterial({ color: 0x525a64, metalness: 0.95, roughness: 0.4, envMapIntensity: 1.3 });
      var gearMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 1, roughness: 0.35 });
      var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 13.6, 24), tiMat);
      barrel.position.set(0, 0, -0.10);
      g.add(barrel);
      [-4.4, 0, 4.4].forEach(function (y) {
        var kn = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.40, 1.3, 24), tiMat);
        kn.position.set(0, y, -0.10);
        g.add(kn);
      });
      [-2.2, 2.2].forEach(function (y) {
        var gear = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.5, 12), gearMat);
        gear.position.set(0, y, -0.10);
        g.add(gear);
        for (var i = 0; i < 8; i++) {
          var tooth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.5, 0.07), gearMat);
          var a = (i / 8) * PI * 2;
          tooth.position.set(Math.cos(a) * 0.27, y, -0.10 + Math.sin(a) * 0.27);
          tooth.rotation.y = -a;
          g.add(tooth);
        }
      });
      [-5.4, 5.4].forEach(function (y) {
        var cam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.8, 0.5), tiMat);
        cam.position.set(0, y, -0.14);
        g.add(cam);
      });
      return g;
    },

    cameraModule: function () {
      sharedMats();
      var g = new THREE.Group();
      g.add(new THREE.Mesh(slabGeo(2.5, 2.5, 0.28, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x0b0e13, metalness: 0.4, roughness: 0.35 })));
      var lensGlass = new THREE.MeshPhysicalMaterial({ color: 0x05070c, metalness: 0.3, roughness: 0.08, clearcoat: 1 });
      var rimMat = new THREE.MeshStandardMaterial({ color: 0x39424d, metalness: 0.95, roughness: 0.3 });
      function lens(x, y, r) {
        var barrel = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.20, 28),
          new THREE.MeshStandardMaterial({ color: 0x11151b, metalness: 0.7, roughness: 0.3 }));
        barrel.rotation.x = PI / 2;
        barrel.position.set(x, y, -0.22);
        g.add(barrel);
        var rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 10, 28), rimMat);
        rim.position.set(x, y, -0.33);
        g.add(rim);
        var glass = new THREE.Mesh(new THREE.CircleGeometry(r * 0.72, 24), lensGlass);
        glass.rotation.y = PI;
        glass.position.set(x, y, -0.335);
        g.add(glass);
        var dot = new THREE.Mesh(new THREE.CircleGeometry(r * 0.14, 12),
          new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.85 }));
        dot.rotation.y = PI;
        dot.position.set(x - r * 0.22, y + r * 0.22, -0.342);
        g.add(dot);
      }
      lens(-0.5, 0.5, 0.46);    // 48MP Fusion 主摄
      lens(-0.5, -0.55, 0.40);  // 48MP Fusion 超广角
      var flash = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 20),
        new THREE.MeshStandardMaterial({ color: 0xf5eeda, emissive: 0xfff3c4, emissiveIntensity: 0.3, roughness: 0.3 }));
      flash.rotation.x = PI / 2;
      flash.position.set(0.72, 0.72, -0.16);
      g.add(flash);
      var mic = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), darkMat);
      mic.rotation.x = PI / 2;
      mic.position.set(0.72, -0.4, -0.15);
      g.add(mic);
      return g;
    },

    taptic: function () {
      sharedMats();
      var g = new THREE.Group();
      g.add(new THREE.Mesh(slabGeo(2.6, 0.95, 0.44, 0.18),
        new THREE.MeshStandardMaterial({ color: 0xb4bac2, metalness: 0.85, roughness: 0.35 })));
      var cap = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 0.46),
        new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.8, roughness: 0.4 }));
      cap.position.set(-1.1, 0, 0);
      g.add(cap);
      var coil = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.1), goldMat);
      coil.position.set(0.3, 0, 0.23);
      g.add(coil);
      return g;
    },

    speaker: function () {
      sharedMats();
      var g = new THREE.Group();
      g.add(new THREE.Mesh(slabGeo(2.2, 0.85, 0.44, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x7d838a, metalness: 0.7, roughness: 0.4 })));
      var mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.55),
        new THREE.MeshStandardMaterial({ map: tex('dots', 64, 64, drawDots), roughness: 0.6, metalness: 0.2 }));
      mesh.position.z = 0.23;
      g.add(mesh);
      return g;
    },

    usbPort: function () {
      sharedMats();
      var g = new THREE.Group();
      var pcb = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x101820, metalness: 0.4, roughness: 0.5 }));
      g.add(pcb);
      var port = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.30, 0.34),
        new THREE.MeshStandardMaterial({ color: 0x06080a, metalness: 0.5, roughness: 0.35 }));
      port.position.set(0, 0.08, 0.10);
      g.add(port);
      var tongue = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x30363d, metalness: 0.9, roughness: 0.3 }));
      tongue.position.set(0, 0.02, 0.28);
      g.add(tongue);
      var mic = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10), darkMat);
      mic.position.set(-0.85, -0.1, 0.1);
      g.add(mic);
      return g;
    },

    outerDisplay: function () {
      var g = new THREE.Group();
      g.add(new THREE.Mesh(slabGeo(6.7, 14.5, 0.12, 1.05),
        new THREE.MeshStandardMaterial({ color: 0x04060a, metalness: 0.3, roughness: 0.4 })));
      var scr = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 14.1),
        new THREE.MeshStandardMaterial({
          color: 0x000000, emissive: 0xffffff, emissiveIntensity: 1.0,
          emissiveMap: tex('outer', 512, 1024, drawOuterScreen),
          roughness: 0.35, metalness: 0
        }));
      scr.material.userData.glowCap = 0.35;
      scr.rotation.y = PI;
      scr.position.z = -0.062;
      g.add(scr);
      var punch = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 20),
        new THREE.MeshStandardMaterial({ color: 0x05070a, metalness: 0.5, roughness: 0.3 }));
      punch.rotation.x = PI / 2;
      punch.position.set(2.65, 6.3, -0.065);
      g.add(punch);
      var punchRing = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.018, 8, 20),
        new THREE.MeshStandardMaterial({ color: 0x39424d, metalness: 0.9, roughness: 0.3 }));
      punchRing.position.set(2.65, 6.3, -0.068);
      g.add(punchRing);
      return g;
    },

    backCover: function () {
      var g = new THREE.Group();
      g.add(new THREE.Mesh(slabGeo(6.7, 14.5, 0.10, 1.05),
        new THREE.MeshPhysicalMaterial({
          color: 0x0d1420, metalness: 0.35, roughness: 0.3,
          clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 1.3
        })));
      var logo = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5),
        new THREE.MeshBasicMaterial({ map: tex('duoMark', 256, 64, drawDuoMark), transparent: true, opacity: 0.5 }));
      logo.rotation.y = PI;
      logo.position.set(0, -5.6, -0.052);
      g.add(logo);
      return g;
    }
  };

  function glassHalf() {
    var g = new THREE.Group();
    var m = new THREE.Mesh(slabGeo(6.7, 14.6, 0.12, 1.05),
      new THREE.MeshPhysicalMaterial({
        color: 0x9fc7e8, metalness: 0, roughness: 0.05,
        transparent: true, opacity: 0.16,
        clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.6
      }));
    m.userData.noShadow = true;
    g.add(m);
    return g;
  }

  function panelHalf(side) {
    var g = new THREE.Group();
    g.add(new THREE.Mesh(slabGeo(6.6, 14.5, 0.10, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x04060a, metalness: 0.2, roughness: 0.45 })));
    var scr = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 14.2),
      new THREE.MeshStandardMaterial({
        color: 0x000000, emissive: 0xffffff, emissiveIntensity: 1.0,
        emissiveMap: tex(side === 'L' ? 'innerL' : 'innerR', 512, 1024, function (c, w, h) { drawInnerScreen(c, w, h, side); }),
        roughness: 0.35, metalness: 0
      }));
    scr.material.userData.glowCap = 0.35;
    scr.position.z = 0.056;
    g.add(scr);
    return g;
  }

  function board(type) {
    sharedMats();
    var g = new THREE.Group();
    g.add(new THREE.Mesh(slabGeo(6.0, 4.5, 0.12, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x0d1319, metalness: 0.35, roughness: 0.5 })));
    if (type === 'main') {
      var chip = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 0.09), darkMat);
      chip.position.set(-1.2, 0.9, 0.10);
      g.add(chip);
      var die = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.98),
        new THREE.MeshStandardMaterial({
          color: 0x000000, emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.3, metalness: 0.2,
          emissiveMap: tex('chipA20', 256, 256, function (c, w, h) { drawChip(c, w, h, 'A20', 'PRO', 'DUAL 16-CORE NEURAL ENGINE'); })
        }));
      die.material.userData.glowCap = 0.3;
      die.position.set(-1.2, 0.9, 0.156);
      g.add(die);
      var s1 = new THREE.Mesh(slabGeo(1.9, 1.5, 0.08, 0.12), shieldMat);
      s1.position.set(1.2, 1.0, 0.10);
      g.add(s1);
      var s2 = new THREE.Mesh(slabGeo(1.9, 1.5, 0.08, 0.12), shieldMat);
      s2.position.set(1.2, -0.9, 0.10);
      g.add(s2);
      var ram = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.15, 0.07),
        new THREE.MeshStandardMaterial({ color: 0x1a1f26, metalness: 0.6, roughness: 0.35 }));
      ram.position.set(-1.2, -1.0, 0.095);
      g.add(ram);
      var pmic = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.07), goldMat);
      pmic.position.set(0.1, -0.4, 0.095);
      g.add(pmic);
    } else {
      var chip2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.09), darkMat);
      chip2.position.set(0.9, 0.8, 0.10);
      g.add(chip2);
      var die2 = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.84),
        new THREE.MeshStandardMaterial({
          color: 0x000000, emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.3, metalness: 0.2,
          emissiveMap: tex('chipC2', 256, 256, function (c, w, h) { drawChip(c, w, h, 'C2', 'MODEM', 'APPLE 5G MODEM'); })
        }));
      die2.material.userData.glowCap = 0.3;
      die2.position.set(0.9, 0.8, 0.156);
      g.add(die2);
      var s3 = new THREE.Mesh(slabGeo(1.9, 1.5, 0.08, 0.12), shieldMat);
      s3.position.set(-1.2, 0.9, 0.10);
      g.add(s3);
      var s4 = new THREE.Mesh(slabGeo(1.9, 1.5, 0.08, 0.12), shieldMat);
      s4.position.set(-1.2, -0.9, 0.10);
      g.add(s4);
      [-0.5, 0, 0.5].forEach(function (yy) {
        var conn = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.1), goldMat);
        conn.position.set(-2.85, yy, 0.10);
        g.add(conn);
      });
      var rf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.06), shieldMat);
      rf.position.set(0.6, -1.5, 0.09);
      g.add(rf);
    }
    var capPos = [[-2.5, 1.9], [-2.5, -1.9], [2.5, 1.9], [2.5, -1.9], [-2.4, 0.2], [2.4, 0.2], [0, 1.9], [0, -1.9]];
    capPos.forEach(function (cp, i) {
      var cap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.05), (i % 2) ? goldMat : darkMat);
      cap.position.set(cp[0], cp[1], 0.09);
      g.add(cap);
    });
    return g;
  }

  function battery(side) {
    sharedMats();
    var g = new THREE.Group();
    var pouch = new THREE.Mesh(slabGeo(6.3, 7.2, 0.38, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x8e9296, metalness: 0.55, roughness: 0.5 }));
    g.add(pouch);
    var label = new THREE.Mesh(new THREE.PlaneGeometry(5.9, 6.8),
      new THREE.MeshStandardMaterial({
        map: tex(side === 'L' ? 'battL' : 'battR', 384, 768, function (c, w, h) { drawBatt(c, w, h, side); }),
        roughness: 0.6, metalness: 0.05
      }));
    label.position.z = 0.195;
    g.add(label);
    var tab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x18c5de, emissive: 0x18c5de, emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.4 }));
    tab.position.set(side === 'L' ? -2.2 : 2.2, -3.4, 0.20);
    g.add(tab);
    var flex = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.32, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x1a1e24, metalness: 0.4, roughness: 0.5 }));
    flex.position.set(0, 3.45, 0.19);
    g.add(flex);
    return g;
  }

  function coilUnit() {
    sharedMats();
    var g = new THREE.Group();
    g.add(new THREE.Mesh(slabGeo(3.4, 3.4, 0.06, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x12161c, metalness: 0.4, roughness: 0.5 })));
    var copperMat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 1, roughness: 0.32 });
    var r1 = new THREE.Mesh(new THREE.TorusGeometry(1.30, 0.09, 10, 44), copperMat);
    r1.position.z = 0.05;
    g.add(r1);
    var r2 = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.07, 10, 40), copperMat);
    r2.position.z = 0.05;
    g.add(r2);
    var mag = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.13, 8, 36),
      new THREE.MeshStandardMaterial({ color: 0x4a5058, metalness: 1, roughness: 0.45 }));
    mag.position.z = 0.04;
    g.add(mag);
    return g;
  }

  function frame(side) {
    sharedMats();
    var g = new THREE.Group();
    var cx = side === 'L' ? -HALF : HALF;

    var outer = roundedRectShape(6.9, 14.7, 1.08);
    outer.holes.push(roundedRectShape(6.5, 14.3, 0.92));
    var geo = new THREE.ExtrudeGeometry(outer, {
      depth: 0.26, bevelEnabled: true,
      bevelThickness: 0.09, bevelSize: 0.10,
      bevelSegments: 2, curveSegments: 14
    });
    geo.translate(0, 0, -0.13);
    var ring = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0x3d434c, metalness: 0.95, roughness: 0.42, envMapIntensity: 1.2
    }));
    ring.position.x = cx;
    g.add(ring);

    function mkBox(w, h, d, x, y, z, mat) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    }

    var btnMat = new THREE.MeshStandardMaterial({ color: 0x2f343c, metalness: 0.9, roughness: 0.4 });
    if (side === 'L') {
      mkBox(0.10, 0.55, 0.16, cx - 3.47, 5.0, 0, btnMat);   // 操作按钮
      mkBox(0.10, 0.95, 0.16, cx - 3.47, 3.55, 0, btnMat);  // 音量+
      mkBox(0.10, 0.95, 0.16, cx - 3.47, 2.35, 0, btnMat);  // 音量-
    } else {
      mkBox(0.10, 1.15, 0.16, cx + 3.47, 3.4, 0, btnMat);   // 电源键
    }

    var antMat = new THREE.MeshStandardMaterial({ color: 0xcfd4da, metalness: 0.2, roughness: 0.6 });
    mkBox(0.05, 0.85, 0.5, cx - 3.44, 4.6, 0, antMat);
    mkBox(0.05, 0.85, 0.5, cx + 3.44, -4.6, 0, antMat);
    mkBox(0.8, 0.05, 0.5, cx - 2.2, 7.36, 0, antMat);
    mkBox(0.8, 0.05, 0.5, cx + 2.2, 7.36, 0, antMat);

    var darkHole = new THREE.MeshStandardMaterial({ color: 0x06080a, metalness: 0.3, roughness: 0.5 });
    if (side === 'L') {
      for (var i = 0; i < 5; i++) {
        var hole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 10), darkHole);
        hole.position.set(cx - 2.4 + i * 0.4, -7.36, 0);
        g.add(hole);
      }
    } else {
      var port = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.36, 0.5), darkHole);
      port.position.set(1.2, -7.30, 0);
      g.add(port);
      var tongue = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x30363d, metalness: 0.9, roughness: 0.3 }));
      tongue.position.set(1.2, -7.42, 0);
      g.add(tongue);
      var mic = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 10), darkHole);
      mic.position.set(cx - 0.6, -7.36, 0);
      g.add(mic);
    }
    return g;
  }

  /* ---------------- 描边高亮层 ---------------- */

  function buildEdges(group, accentColor) {
    var mat = new THREE.LineBasicMaterial({
      color: accentColor.clone().lerp(new THREE.Color(0xffffff), 0.25),
      transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    var container = new THREE.Group();
    group.traverse(function (o) {
      if (o.isMesh) {
        try {
          var eg = new THREE.EdgesGeometry(o.geometry, 25);
          var line = new THREE.LineSegments(eg, mat);
          line.position.copy(o.position);
          line.rotation.copy(o.rotation);
          line.scale.copy(o.scale);
          line.raycast = function () {};
          container.add(line);
        } catch (e) { /* 个别几何体无法提取边缘时忽略 */ }
      }
    });
    group.add(container);
    return mat;
  }

  /* ---------------- 组装整机 ---------------- */

  function buildPhone() {
    sharedMats();
    var root = new THREE.Group();
    var leftGroup = new THREE.Group();
    var foldPivot = new THREE.Group();
    var foldGroup = new THREE.Group();

    foldPivot.position.set(0, 0, FOLD_AXIS);
    foldGroup.position.set(0, 0, -FOLD_AXIS);
    foldPivot.add(foldGroup);
    root.add(leftGroup);
    root.add(foldPivot);

    var parts = [];
    App.PARTS.forEach(function (def) {
      var pl = PLACEMENT[def.id];
      var fn = BUILDERS[def.id];
      if (!pl || !fn) {
        console.warn('[Duo] 缺少部件定义:', def.id);
        return;
      }
      var group = fn();
      group.position.fromArray(pl.home);

      var accentColor = new THREE.Color(def.accent || 0x22d3ee);
      var edgesMat = buildEdges(group, accentColor);

      var meshes = [], mats = [];
      group.traverse(function (o) {
        if (o.isMesh) {
          o.castShadow = !o.userData.noShadow;
          o.receiveShadow = false;
          meshes.push(o);
          var m = o.material;
          if (m && m.emissive && !mats.some(function (x) { return x.mat === m; })) {
            var baseColor = m.emissive.clone();
            var baseEI = (m.emissiveIntensity !== undefined) ? m.emissiveIntensity : 1;
            m.userData.baseColor = baseColor;
            m.userData.baseEI = baseEI;
            mats.push({
              mat: m, baseColor: baseColor, baseEI: baseEI,
              cap: (m.userData.glowCap !== undefined) ? m.userData.glowCap : 1.6
            });
          }
        }
      });

      var part = {
        id: def.id, def: def, index: parts.length, group: group, meshes: meshes,
        home: group.position.clone(),
        dir: new THREE.Vector3().fromArray(pl.dir).normalize(),
        dist: pl.dist,
        extra: 0, extraTarget: 0,
        selected: false, hovered: false,
        mats: mats, edgesMat: edgesMat, accentColor: accentColor,
        stagger: 0, window: 0.58,
        side: SIDE[def.id] || 'root'
      };
      group.userData.partRef = part;

      if (part.side === 'L') leftGroup.add(group);
      else if (part.side === 'R') foldGroup.add(group);
      else root.add(group);

      parts.push(part);
    });

    return { root: root, parts: parts, leftGroup: leftGroup, foldPivot: foldPivot, foldGroup: foldGroup };
  }

  App.buildPhone = buildPhone;
})();
