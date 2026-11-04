/* ============================================================
 * iPhone Duo · Teardown Lab
 * textures.js —— 全部贴图由 Canvas 程序化绘制(零图片资源)
 * ============================================================ */
(function () {
  'use strict';

  var seed = 20261104;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function toTexture(canvas, aniso, srgb) {
    var t = new THREE.CanvasTexture(canvas);
    t.anisotropy = aniso || 4;
    if (srgb !== false) t.encoding = THREE.sRGBEncoding;
    t.needsUpdate = true;
    return t;
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ---------------- 内屏壁纸(左右两半共用一张,沿中线切开) ---------------- */
  function wallpaper() {
    var W = 1440, H = 1620;
    var c = makeCanvas(W, H), ctx = c.getContext('2d');

    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#03060f');
    bg.addColorStop(0.45, '#071226');
    bg.addColorStop(0.72, '#0a0a22');
    bg.addColorStop(1, '#04060c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 极光光晕
    function glow(x, y, r, color, alpha) {
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    }
    glow(W * 0.25, H * 0.3, W * 0.55, 'rgba(24,150,255,0.55)', 0.9);
    glow(W * 0.82, H * 0.66, W * 0.5, 'rgba(255,40,180,0.42)', 0.9);
    glow(W * 0.52, H * 0.9, W * 0.45, 'rgba(80,255,220,0.18)', 0.8);

    // 细网格
    ctx.strokeStyle = 'rgba(120,200,255,0.055)';
    ctx.lineWidth = 1;
    for (var x = 0; x < W; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (var y = 0; y < H; y += 48) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // 程序化光带
    var ribbons = [
      ['rgba(40,230,255,0.95)', 0.42],
      ['rgba(255,70,200,0.85)', 0.72],
      ['rgba(120,120,255,0.7)', 0.58]
    ];
    for (var i = 0; i < ribbons.length; i++) {
      var ry = H * ribbons[i][1];
      var grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.2, ribbons[i][0]);
      grad.addColorStop(0.8, ribbons[i][0]);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3 + i * 2;
      ctx.shadowColor = ribbons[i][0];
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.moveTo(-40, ry);
      ctx.bezierCurveTo(W * 0.3, ry - 180 - i * 40, W * 0.62, ry + 160 + i * 30, W + 40, ry - 30);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 中央同心圆弧(折叠中轴)
    ctx.save();
    ctx.translate(W * 0.5, H * 0.46);
    for (var k = 0; k < 7; k++) {
      ctx.beginPath();
      ctx.arc(0, 0, 130 + k * 78, Math.PI * 0.62, Math.PI * 1.92, false);
      ctx.strokeStyle = 'rgba(90,220,255,' + (0.32 - k * 0.035) + ')';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();

    // 折痕光轴
    var axis = ctx.createLinearGradient(0, H * 0.1, 0, H * 0.9);
    axis.addColorStop(0, 'rgba(120,240,255,0)');
    axis.addColorStop(0.5, 'rgba(120,240,255,0.45)');
    axis.addColorStop(1, 'rgba(120,240,255,0)');
    ctx.strokeStyle = axis;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();

    // 星点
    for (var s = 0; s < 260; s++) {
      var sx = rnd() * W, sy = rnd() * H;
      var a = 0.12 + rnd() * 0.5;
      ctx.fillStyle = 'rgba(200,240,255,' + a + ')';
      ctx.fillRect(sx, sy, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
    }

    // 时间 / 日期:完整落在左半幅,避免被折叠中缝切断
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(235,248,255,0.96)';
    ctx.font = '200 150px "Segoe UI Light","PingFang SC",sans-serif';
    ctx.fillText('9:41', 96, 286);
    ctx.fillStyle = 'rgba(190,225,250,0.65)';
    ctx.font = '400 36px "PingFang SC","Segoe UI",sans-serif';
    ctx.fillText('11月4日 星期三', 100, 342);

    // 右半幅:参数小组件
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(120,230,255,0.8)';
    ctx.font = '600 22px "Segoe UI",sans-serif';
    ctx.fillText('INNER DISPLAY', 1352, 258);
    ctx.fillStyle = 'rgba(240,250,255,0.95)';
    ctx.font = '300 78px "Segoe UI Light","PingFang SC",sans-serif';
    ctx.fillText('7.6″', 1354, 336);
    ctx.fillStyle = 'rgba(170,205,230,0.55)';
    ctx.font = '400 20px "Segoe UI",sans-serif';
    ctx.fillText('LTPO · 1–120Hz · 3000 nits', 1352, 372);

    // 底部字标(分别落在左右半幅)
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(220,245,255,0.28)';
    ctx.font = '600 26px "Segoe UI","PingFang SC",sans-serif';
    ctx.fillText('IPHONE DUO', 360, H - 64);
    ctx.fillText('2026', 1080, H - 64);

    return c;
  }

  function wallpaperHalf(canvas, left, aniso) {
    var t = toTexture(canvas, aniso, true);
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.repeat.set(0.5, 1);
    t.offset.set(left ? 0 : 0.5, 0);
    return t;
  }

  /* ---------------- 外屏(常亮锁屏) ---------------- */
  function coverScreen() {
    var W = 760, H = 1560;
    var c = makeCanvas(W, H), ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#000000');
    g.addColorStop(0.45, '#03060d');
    g.addColorStop(1, '#02040a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    var rg = ctx.createRadialGradient(W * 0.5, H * 0.35, 0, W * 0.5, H * 0.35, W * 0.75);
    rg.addColorStop(0, 'rgba(30,120,220,0.20)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(240,250,255,0.95)';
    ctx.font = '200 200px "Segoe UI Light","PingFang SC",sans-serif';
    ctx.fillText('9:41', W / 2, 330);

    ctx.fillStyle = 'rgba(180,220,250,0.62)';
    ctx.font = '400 38px "PingFang SC","Segoe UI",sans-serif';
    ctx.fillText('11月4日 星期三', W / 2, 400);

    // 组件卡片
    function card(x, y, w, h, label, value, accent) {
      ctx.save();
      roundRect(ctx, x, y, w, h, 26);
      ctx.fillStyle = 'rgba(255,255,255,0.055)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,220,255,0.14)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = accent;
      ctx.font = '600 24px "Segoe UI","PingFang SC",sans-serif';
      ctx.fillText(label, x + 30, y + 48);
      ctx.fillStyle = 'rgba(235,248,255,0.92)';
      ctx.font = '600 42px "Segoe UI","PingFang SC",sans-serif';
      ctx.fillText(value, x + 30, y + 108);
      ctx.restore();
    }
    card(56, 520, 300, 150, '天气 · 上海', '24° 晴', 'rgba(120,230,255,0.9)');
    card(404, 520, 300, 150, '电量', '100%', 'rgba(130,240,180,0.9)');
    card(56, 700, 648, 150, 'iPhone Duo', '展开 · 7.6″', 'rgba(255,150,220,0.9)');

    // 底部提示与品牌
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(200,230,255,0.38)';
    ctx.font = '400 26px "Segoe UI","PingFang SC",sans-serif';
    ctx.fillText('轻点唤醒 · 滑动展开', W / 2, H - 120);
    ctx.fillStyle = 'rgba(190,230,255,0.55)';
    ctx.font = '600 24px "Segoe UI",sans-serif';
    ctx.fillText('D U O', W / 2, H - 64);
    return c;
  }

  /* ---------------- 电池标签 ---------------- */
  function batteryLabel(mah, wh, side) {
    var W = 520, H = 1080;
    var c = makeCanvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#1b1e22';
    ctx.fillRect(0, 0, W, H);

    // 斜纹
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#ffffff';
    for (var i = -H; i < W; i += 22) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = 'rgba(230,240,250,0.7)';
    ctx.lineWidth = 3;
    roundRect(ctx, 22, 22, W - 44, H - 44, 18);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(235,242,250,0.92)';
    ctx.font = '600 30px "Segoe UI",sans-serif';
    ctx.fillText('Li-ion Polymer Battery', W / 2, 92);
    ctx.fillStyle = 'rgba(150,180,205,0.8)';
    ctx.font = '400 22px "Segoe UI",sans-serif';
    ctx.fillText('APPLE CONFIDENTIAL', W / 2, 128);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 92px "Segoe UI",sans-serif';
    ctx.fillText(String(mah), W / 2 - 32, 330);
    ctx.font = '600 34px "Segoe UI",sans-serif';
    ctx.fillStyle = 'rgba(220,235,250,0.85)';
    ctx.fillText('mAh', W / 2 + 118, 330);

    ctx.font = '400 28px "Segoe UI",sans-serif';
    ctx.fillStyle = 'rgba(200,220,240,0.65)';
    ctx.fillText('3.87 V   ·   ' + wh + ' Wh', W / 2, 388);

    // 参数块
    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(200,220,240,0.2)';
    ctx.beginPath(); ctx.moveTo(48, 440); ctx.lineTo(W - 48, 440); ctx.stroke();
    var rows = [
      ['CELL', side],
      ['CHEMISTRY', 'NMC / Si-C'],
      ['CYCLE', '1000 (80%)'],
      ['MADE IN', 'PRC · 2026']
    ];
    ctx.font = '400 22px "Segoe UI",sans-serif';
    rows.forEach(function (r, i) {
      ctx.fillStyle = 'rgba(150,180,205,0.55)';
      ctx.fillText(r[0], 52, 500 + i * 46);
      ctx.fillStyle = 'rgba(225,238,250,0.85)';
      ctx.fillText(r[1], 220, 500 + i * 46);
    });

    // 条形码
    ctx.fillStyle = 'rgba(240,248,255,0.85)';
    var bx = 52, bw = W - 104;
    for (var b = 0; b < 60; b++) {
      var w = 1 + Math.floor(rnd() * 5);
      ctx.fillRect(bx, 740, w, 90);
      bx += w + 2 + Math.floor(rnd() * 4);
      if (bx > 52 + bw) break;
    }
    ctx.font = '400 20px Consolas,monospace';
    ctx.fillStyle = 'rgba(210,228,245,0.7)';
    ctx.fillText('DUO-' + mah + '-' + (side === 'L' ? 'A1' : 'B2') + ' / 4883 mAh SYSTEM', 52, 866);

    // 维修提示
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,170,90,0.9)';
    ctx.font = '600 21px "PingFang SC","Segoe UI",sans-serif';
    ctx.fillText('电控脱胶 · 通电释放粘性', W / 2, 940);
    ctx.fillStyle = 'rgba(160,190,215,0.55)';
    ctx.font = '400 18px "PingFang SC","Segoe UI",sans-serif';
    ctx.fillText('DO NOT PUNCTURE · DO NOT HEAT ABOVE 80°C', W / 2, 980);
    return c;
  }

  /* ---------------- 主板 PCB ---------------- */
  function pcb() {
    var W = 900, H = 1300;
    var c = makeCanvas(W, H), ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#06130d');
    g.addColorStop(0.5, '#0a1c12');
    g.addColorStop(1, '#04100a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 走线
    for (var i = 0; i < 130; i++) {
      var x = rnd() * W, y = rnd() * H;
      ctx.beginPath();
      ctx.moveTo(x, y);
      var steps = 2 + Math.floor(rnd() * 4);
      for (var s = 0; s < steps; s++) {
        if (rnd() > 0.5) x += (rnd() - 0.5) * 260;
        else y += (rnd() - 0.5) * 260;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rnd() > 0.72 ? 'rgba(255,205,120,0.55)' : 'rgba(120,220,170,0.28)';
      ctx.lineWidth = rnd() > 0.8 ? 2 : 1;
      ctx.stroke();
    }
    // 焊盘
    for (var p = 0; p < 190; p++) {
      ctx.fillStyle = rnd() > 0.6 ? 'rgba(255,215,140,0.75)' : 'rgba(160,235,190,0.4)';
      var r = 1 + rnd() * 3;
      ctx.beginPath();
      ctx.arc(rnd() * W, rnd() * H, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 丝印
    ctx.fillStyle = 'rgba(210,240,225,0.5)';
    ctx.font = '600 24px Consolas,monospace';
    ctx.fillText('DUO LOGIC BOARD  2026', 46, 70);
    ctx.font = '400 18px Consolas,monospace';
    ctx.fillText('EMC 2A-4883 · FCBGA', 46, 102);
    ctx.fillText('DESIGNED BY APPLE IN CALIFORNIA', 46, H - 40);
    return c;
  }

  /* ---------------- 芯片丝印 ---------------- */
  function chip(name, sub) {
    var S = 300;
    var c = makeCanvas(S, S), ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#2a2d33');
    g.addColorStop(0.45, '#14161a');
    g.addColorStop(0.6, '#34383f');
    g.addColorStop(1, '#101216');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(220,235,250,0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, S - 16, S - 16);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(235,245,255,0.9)';
    ctx.font = '700 66px "Segoe UI",sans-serif';
    ctx.fillText(name, S / 2, S / 2 + 4);
    ctx.fillStyle = 'rgba(160,200,235,0.65)';
    ctx.font = '500 24px "Segoe UI",sans-serif';
    ctx.fillText(sub, S / 2, S / 2 + 48);
    return c;
  }

  /* ---------------- 扬声器网孔 ---------------- */
  function grille() {
    var W = 320, H = 160;
    var c = makeCanvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, W, H);
    for (var y = 12; y < H - 8; y += 14) {
      for (var x = 12 + ((y / 14) % 2) * 7; x < W - 8; x += 14) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(150,175,200,0.30)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
      }
    }
    return c;
  }

  /* ---------------- 镜头玻璃 ---------------- */
  function lens() {
    var S = 512;
    var c = makeCanvas(S, S), ctx = c.getContext('2d');
    ctx.clearRect(0, 0, S, S);
    var g = ctx.createRadialGradient(S * 0.36, S * 0.32, 10, S / 2, S / 2, S / 2);
    g.addColorStop(0, '#5f8dcc');
    g.addColorStop(0.18, '#1b3159');
    g.addColorStop(0.55, '#070c17');
    g.addColorStop(1, '#020307');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(120,190,255,0.35)';
    ctx.lineWidth = 3;
    for (var i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, 70 + i * 30, i * 1.1, i * 1.1 + 2.2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(180,220,255,0.55)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 10, 0, Math.PI * 2);
    ctx.stroke();
    // 高光
    ctx.fillStyle = 'rgba(210,240,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(S * 0.34, S * 0.3, 26, 12, -0.6, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  /* ---------------- 钛金属拉丝粗糙度 ---------------- */
  function brushed() {
    var S = 512;
    var c = makeCanvas(S, S), ctx = c.getContext('2d');
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(0, 0, S, S);
    for (var i = 0; i < 2600; i++) {
      var y = rnd() * S;
      var v = 90 + Math.floor(rnd() * 90);
      ctx.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.22)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y + (rnd() - 0.5) * 3);
      ctx.stroke();
    }
    return c;
  }

  /* ---------------- 玻璃背板微纹理 ---------------- */
  function frost() {
    var S = 512;
    var c = makeCanvas(S, S), ctx = c.getContext('2d');
    ctx.fillStyle = '#7d8794';
    ctx.fillRect(0, 0, S, S);
    for (var i = 0; i < 5000; i++) {
      var v = 90 + Math.floor(rnd() * 90);
      ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.25)';
      ctx.fillRect(rnd() * S, rnd() * S, 1.6, 1.6);
    }
    return c;
  }

  DUO.buildTextures = function (aniso) {
    var wallCanvas = wallpaper();
    var T = {
      wallL: wallpaperHalf(wallCanvas, true, aniso),
      wallR: wallpaperHalf(wallCanvas, false, aniso),
      cover: toTexture(coverScreen(), aniso),
      batteryL: toTexture(batteryLabel(2962, '11.46', 'L'), aniso),
      batteryR: toTexture(batteryLabel(1921, '7.43', 'R'), aniso),
      pcb: toTexture(pcb(), aniso),
      a20: toTexture(chip('A20', 'PRO · 2026'), aniso),
      c2: toTexture(chip('C2', '5G MODEM'), aniso),
      grille: toTexture(grille(), aniso),
      lens: toTexture(lens(), aniso),
      brushed: toTexture(brushed(), aniso, false),
      frost: toTexture(frost(), aniso, false)
    };
    T.brushed.wrapS = T.brushed.wrapT = THREE.RepeatWrapping;
    T.brushed.repeat.set(2, 8);
    T.frost.wrapS = T.frost.wrapT = THREE.RepeatWrapping;
    T.frost.repeat.set(3, 6);
    return T;
  };
})();