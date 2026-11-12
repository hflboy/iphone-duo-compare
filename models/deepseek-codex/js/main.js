/* iPhone Duo · Fold Lab — procedural Three.js teardown */
(function () {
  'use strict';

  if (!window.THREE) return;

  var T = THREE;
  var stage = document.getElementById('stage');
  var card = document.getElementById('partCard');
  var partIndex = document.getElementById('partIndex');
  var partName = document.getElementById('partName');
  var partDesc = document.getElementById('partDesc');
  var partSpecs = document.getElementById('partSpecs');
  var range = document.getElementById('explodeRange');
  var rangeValue = document.getElementById('explodeValue');
  var explodeBtn = document.getElementById('explodeBtn');
  var foldBtn = document.getElementById('foldBtn');
  var autoBtn = document.getElementById('autoBtn');
  var resetBtn = document.getElementById('resetBtn');
  var clearBtn = document.getElementById('clearBtn');
  var stateText = document.getElementById('stateText');
  var toastEl = document.getElementById('toast');

  var scene = new T.Scene();
  scene.background = new T.Color(0x05080d);
  scene.fog = new T.FogExp2(0x05080d, 0.021);

  var camera = new T.PerspectiveCamera(37, innerWidth / innerHeight, 0.1, 180);
  var renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);

  var clock = new T.Clock();
  var raycaster = new T.Raycaster();
  var pointer = new T.Vector2();
  var model = new T.Group();
  var leftRoot = new T.Group();
  var rightRoot = new T.Group();
  var hingeRoot = new T.Group();
  var rightScreenFold = new T.Group();
  scene.add(model);
  model.add(leftRoot, rightRoot, hingeRoot);

  var parts = [];
  var partMap = {};
  var pickables = [];
  var selectedId = null;
  var hoverId = null;
  var explodeCurrent = 0;
  var explodeTarget = 0;
  var foldCurrent = 0;
  var foldTarget = 0;
  var autoMode = false;
  var autoStart = 0;
  var elapsed = 0;

  var DATA = {
    'chassis-left': {
      name: '左机身中框', en: 'GRADE 5 TITANIUM', icon: '01',
      desc: 'Grade 5 钛金属主中框。左侧容纳 2962mAh 主电池、内屏左半区与折叠承力结构。',
      specs: [['材料', 'Grade 5 钛'], ['电池', '2962mAh'], ['结构', '承力主框']]
    },
    'chassis-right': {
      name: '右机身中框', en: 'TITANIUM FRAME', icon: '02',
      desc: '右侧承力中框与背板组合，承载相机岛、第二电池和无线充电线圈。',
      specs: [['材料', '钛金属'], ['电池', '1921mAh'], ['接口', 'USB-C']]
    },
    'inner-screen': {
      name: '7.6″ 折叠内屏', en: 'LTPO · 1–120Hz', icon: '03',
      desc: '贯穿左右机身的柔性内屏。展开后形成 7.6 英寸大屏，峰值亮度 3000 nits。',
      specs: [['尺寸', '7.6 inch'], ['刷新率', '1–120Hz'], ['峰值亮度', '3000 nits']]
    },
    'outer-screen': {
      name: '6.2″ 外屏', en: 'COVER DISPLAY', icon: '04',
      desc: '位于右半机背部的常亮外屏，折叠后成为整机正面的主要交互界面。',
      specs: [['尺寸', '6.2 inch'], ['材质', 'LTPO OLED'], ['前摄', '12MP']]
    },
    'battery-left': {
      name: '主电池', en: '2962mAh · 11.46Wh', icon: '05',
      desc: '左半机身主电池，带橙色电控脱胶拉手。双电池通过主板的并联电源管理协同工作。',
      specs: [['容量', '2962mAh'], ['能量', '11.46Wh'], ['维修', '拉手脱胶']]
    },
    'battery-right': {
      name: '副电池', en: '1921mAh · 7.43Wh', icon: '06',
      desc: '右半机身副电池，与前摄、相机岛共用纵向空间以平衡整机重量。',
      specs: [['容量', '1921mAh'], ['能量', '7.43Wh'], ['系统合计', '4883mAh']]
    },
    'logic-board': {
      name: '双层主板', en: 'A20 PRO / C2', icon: '07',
      desc: '双层堆叠主板集成 A20 Pro 与 Apple C2 基带。高密度互连缩短信号路径并节省内部空间。',
      specs: [['处理器', 'A20 Pro'], ['基带', 'C2'], ['结构', '双层堆叠']]
    },
    camera: {
      name: '48MP Dual Fusion', en: 'MAIN + ULTRA WIDE', icon: '08',
      desc: '双摄相机岛，包含 48MP 主摄与 48MP 超广角。相机模组通过独立金属支架固定在中框上。',
      specs: [['主摄', '48MP'], ['超广角', '48MP'], ['闪光灯', '原彩']]
    },
    hinge: {
      name: '水滴铰链', en: 'FOLDING SPINE', icon: '09',
      desc: '四连杆水滴铰链在折叠时让屏幕形成更大的弯曲半径，同时保持机身两侧同步运动。',
      specs: [['结构', '四连杆'], ['形态', '水滴'], ['运动', '双轴联动']]
    },
    taptic: {
      name: 'Taptic Engine', en: 'HAPTIC CORE', icon: '10',
      desc: '线性触觉马达位于左半机身底部，为折叠开合、按键和系统交互提供精确反馈。',
      specs: [['类型', '线性马达'], ['位置', '底部左侧'], ['功能', '触觉反馈']]
    },
    'usb-core': {
      name: 'USB-C 接口', en: 'DATA + POWER', icon: '11',
      desc: 'USB-C 电源与数据接口，独立密封组件安装在中框底部，便于维修替换。',
      specs: [['接口', 'USB-C'], ['功能', '充电/数据'], ['密封', '独立胶圈']]
    },
    esim: {
      name: 'eSIM 模块', en: 'DIGITAL SIM', icon: '12',
      desc: '无实体 SIM 卡槽，蜂窝连接由嵌入式 eSIM 与 C2 基带共同完成。',
      specs: [['方案', 'eSIM only'], ['基带', 'Apple C2'], ['卡槽', '无']]
    },
    magsafe: {
      name: 'MagSafe 线圈', en: 'WIRELESS CHARGING', icon: '13',
      desc: '右半机背部的磁吸无线充电线圈，与机身外屏共享背部纵向空间。',
      specs: [['方案', 'MagSafe'], ['位置', '右半机背'], ['功能', '磁吸充电']]
    },
    'speaker-left': {
      name: '底部扬声器', en: 'STEREO AUDIO · L', icon: '14',
      desc: '左半机身底部扬声器组件，与右半机扬声器组成立体声系统。',
      specs: [['声道', '左声道'], ['位置', '底部'], ['密封', '独立腔体']]
    },
    'speaker-right': {
      name: '底部扬声器', en: 'STEREO AUDIO · R', icon: '15',
      desc: '右半机身底部扬声器组件，与左声道协同提供横屏立体声。',
      specs: [['声道', '右声道'], ['位置', '底部'], ['密封', '独立腔体']]
    }
  };

  function canvasTexture(width, height, draw) {
    var c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    var g = c.getContext('2d');
    draw(g, width, height);
    var tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return tex;
  }

  function roundRect(g, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + radius, y);
    g.arcTo(x + w, y, x + w, y + h, radius);
    g.arcTo(x + w, y + h, x, y + h, radius);
    g.arcTo(x, y + h, x, y, radius);
    g.arcTo(x, y, x + w, y, radius);
    g.closePath();
  }

  function innerScreenTexture() {
    return canvasTexture(1536, 1728, function (g, w, h) {
      var bg = g.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#061924');
      bg.addColorStop(.47, '#0b3341');
      bg.addColorStop(1, '#071019');
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);

      var glow = g.createRadialGradient(w * .39, h * .42, 0, w * .39, h * .42, w * .75);
      glow.addColorStop(0, 'rgba(91,242,255,.32)');
      glow.addColorStop(.38, 'rgba(27,122,147,.13)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, w, h);

      g.strokeStyle = 'rgba(111,229,248,.17)';
      g.lineWidth = 2;
      for (var i = 0; i < 7; i++) {
        g.beginPath();
        g.arc(w * .5, h * .52, 120 + i * 92, -.4, Math.PI * 1.35);
        g.stroke();
      }

      g.fillStyle = 'rgba(225,253,255,.96)';
      g.font = '300 154px Bahnschrift, sans-serif';
      g.textAlign = 'center';
      g.fillText('09:41', w * .5, h * .34);
      g.fillStyle = 'rgba(164,222,233,.72)';
      g.font = '500 30px Consolas, monospace';
      g.fillText('WED  ·  12 NOV', w * .5, h * .405);

      g.fillStyle = 'rgba(5,15,20,.62)';
      roundRect(g, w * .18, h * .72, w * .64, 156, 55);
      g.fill();
      g.strokeStyle = 'rgba(124,231,247,.22)';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = 'rgba(220,252,255,.92)';
      g.font = '500 34px Bahnschrift, sans-serif';
      g.fillText('DUO  /  FOLD LAB', w * .5, h * .775);
      g.fillStyle = 'rgba(103,229,247,.82)';
      g.font = '500 19px Consolas, monospace';
      g.fillText('7.6"  ·  LTPO 1–120HZ', w * .5, h * .815);

      g.fillStyle = 'rgba(255,255,255,.7)';
      g.fillRect(w * .493, 0, 3, h);
      g.fillStyle = 'rgba(2,10,14,.38)';
      g.fillRect(w * .497, 0, 10, h);

      for (var s = 0; s < 160; s++) {
        var sx = (s * 197) % w;
        var sy = (s * 337) % h;
        g.fillStyle = 'rgba(173,239,248,' + (.08 + (s % 5) * .025) + ')';
        g.fillRect(sx, sy, 2, 2);
      }
    });
  }

  function outerScreenTexture() {
    return canvasTexture(640, 840, function (g, w, h) {
      var bg = g.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#07131c');
      bg.addColorStop(.55, '#123143');
      bg.addColorStop(1, '#05090e');
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.93)';
      g.textAlign = 'center';
      g.font = '300 97px Bahnschrift, sans-serif';
      g.fillText('09:41', w / 2, 165);
      g.fillStyle = 'rgba(160,213,225,.8)';
      g.font = '500 19px Consolas, monospace';
      g.fillText('12 NOVEMBER · 18°', w / 2, 208);

      g.fillStyle = 'rgba(6,19,26,.58)';
      roundRect(g, 54, 292, w - 108, 224, 34);
      g.fill();
      g.strokeStyle = 'rgba(118,229,246,.22)';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = 'rgba(207,250,255,.93)';
      g.font = '500 27px Bahnschrift, sans-serif';
      g.fillText('FOLDED / ACTIVE', w / 2, 354);
      g.fillStyle = 'rgba(110,225,243,.75)';
      g.font = '500 16px Consolas, monospace';
      g.fillText('6.2" COVER DISPLAY', w / 2, 395);

      for (var r = 0; r < 41; r++) {
        var a = r * 1.7;
        var rr = 35 + r * 4.6;
        g.strokeStyle = 'rgba(106,231,247,' + (0.24 - r * .004) + ')';
        g.beginPath();
        g.arc(w / 2, 658, rr, a, a + 1.6);
        g.stroke();
      }
      g.fillStyle = 'rgba(224,253,255,.92)';
      g.font = '500 18px Consolas, monospace';
      g.fillText('DUO', w / 2, 665);
    });
  }

  function batteryTexture(label, capacity, wh, tint) {
    return canvasTexture(700, 860, function (g, w, h) {
      g.fillStyle = '#c8d0d1';
      g.fillRect(0, 0, w, h);
      var grad = g.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, 'rgba(255,255,255,.55)');
      grad.addColorStop(.52, 'rgba(120,145,150,.08)');
      grad.addColorStop(1, 'rgba(10,20,22,.15)');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      g.fillStyle = tint;
      g.fillRect(0, 0, 18, h);
      g.fillStyle = '#20282a';
      g.font = '700 42px Bahnschrift, sans-serif';
      g.fillText('Apple', 52, 78);
      g.font = '500 22px Consolas, monospace';
      g.fillText(label, 54, 121);
      g.fillStyle = '#252e30';
      g.font = '700 66px Bahnschrift, sans-serif';
      g.fillText(capacity, 52, 246);
      g.font = '500 25px Consolas, monospace';
      g.fillText(wh, 54, 287);
      g.strokeStyle = 'rgba(26,35,37,.22)';
      g.lineWidth = 2;
      g.strokeRect(50, 326, w - 100, 160);
      g.font = '400 18px Consolas, monospace';
      g.fillStyle = '#445254';
      g.fillText('Li-ion Polymer', 68, 360);
      g.fillText('Tear-down pull tab', 68, 392);
      g.fillText('Service only by Apple', 68, 424);
      g.fillStyle = 'rgba(35,44,46,.2)';
      for (var y = 520; y < h - 40; y += 4) g.fillRect(45, y, w - 90, 1);
      g.fillStyle = '#bf5428';
      roundRect(g, w - 214, h - 94, 158, 38, 5);
      g.fill();
      g.fillStyle = '#fff4e9';
      g.font = '700 16px Consolas, monospace';
      g.fillText('ADHESIVE TAB', w - 193, h - 68);
    });
  }

  function boardTexture() {
    return canvasTexture(720, 640, function (g, w, h) {
      g.fillStyle = '#123d32';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(147,210,162,.26)';
      g.lineWidth = 2;
      for (var i = 0; i < 32; i++) {
        var x = (i * 73) % w;
        var y = (i * 121) % h;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo((x + 100 + i * 7) % w, y);
        g.lineTo((x + 100 + i * 7) % w, (y + 50 + i * 3) % h);
        g.stroke();
      }
      var chips = [
        [230, 174, 190, 142, '#1d2428', 'A20'],
        [452, 350, 132, 108, '#20262a', 'C2'],
        [110, 408, 94, 74, '#272c2d', 'PMIC']
      ];
      chips.forEach(function (c) {
        g.fillStyle = c[4];
        roundRect(g, c[0], c[1], c[2], c[3], 8);
        g.fill();
        g.strokeStyle = 'rgba(210,227,220,.22)';
        g.stroke();
        g.fillStyle = 'rgba(219,236,228,.78)';
        g.font = '600 21px Consolas, monospace';
        g.textAlign = 'center';
        g.fillText(c[5], c[0] + c[2] / 2, c[1] + c[3] / 2 + 7);
      });
      g.fillStyle = 'rgba(223,239,231,.34)';
      g.font = '500 13px Consolas, monospace';
      g.textAlign = 'left';
      g.fillText('IPHONE DUO MAIN LOGIC  ·  REV A', 34, h - 30);
      g.textAlign = 'start';
    });
  }

  function metal(color, roughness) {
    return new T.MeshStandardMaterial({
      color: color,
      metalness: .82,
      roughness: roughness == null ? .26 : roughness,
      envMapIntensity: .85
    });
  }

  function glow(color, intensity) {
    return new T.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: intensity == null ? .45 : intensity,
      metalness: .2,
      roughness: .32
    });
  }

  function roundedShape(w, h, r) {
    var s = new T.Shape();
    var x = -w / 2;
    var y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    s.closePath();
    return s;
  }

  function roundedBoard(w, h, r, depth, mat) {
    var geo = new T.ExtrudeGeometry(roundedShape(w, h, r), {
      depth: depth,
      curveSegments: 10,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: .035,
      bevelThickness: .035
    });
    geo.translate(0, 0, -depth / 2);
    var mesh = new T.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function roundedPlane(w, h, r, mat) {
    var geometry = new T.ShapeGeometry(roundedShape(w, h, r), 12);
    var position = geometry.attributes.position;
    var uv = [];
    for (var i = 0; i < position.count; i++) {
      uv.push((position.getX(i) + w / 2) / w, (position.getY(i) + h / 2) / h);
    }
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    var mesh = new T.Mesh(geometry, mat);
    mesh.receiveShadow = true;
    return mesh;
  }

  function cylinder(radius, depth, mat, axis) {
    var geo = new T.CylinderGeometry(radius, radius, depth, 32);
    if (axis === 'x') geo.rotateZ(Math.PI / 2);
    if (axis === 'z') geo.rotateX(Math.PI / 2);
    var mesh = new T.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function makePart(id, parent, position, dir, distance, delay) {
    var group = new T.Group();
    group.name = id;
    group.position.fromArray(position);
    parent.add(group);
    var part = {
      id: id,
      group: group,
      home: group.position.clone(),
      dir: new T.Vector3(dir[0], dir[1], dir[2]).normalize(),
      distance: distance,
      delay: delay || 0,
      materials: [],
      baseEmissive: [],
      active: 0
    };
    parts.push(part);
    partMap[id] = part;
    group.userData.partId = id;
    return part;
  }

  function registerPartMeshes(part) {
    part.group.traverse(function (child) {
      if (!child.isMesh) return;
      child.userData.partId = part.id;
      pickables.push(child);
      var mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(function (mat) {
        if (!mat || mat.userData.registered) return;
        mat.userData.registered = true;
        part.materials.push(mat);
        if (mat.emissive) part.baseEmissive.push(mat.emissiveIntensity || 0);
        if (part.fadeOnExplode) {
          mat.transparent = true;
          mat.opacity = 1;
          mat.depthWrite = true;
        }
      });
    });
  }

  function addChassis(id, parent, x, width, backOffset) {
    var part = makePart(id, parent, [x, 0, 0], [x < 0 ? -1 : 1, 0, 0], 1.55, .04);
    var frameMat = metal(0x8e999c, .27);
    var backMat = metal(0x40484b, .34);
    var back = roundedBoard(width, 14.9, .72, .25, backMat);
    back.position.z = backOffset;
    part.group.add(back);

    var railMat = metal(0xb3bcc0, .2);
    var railW = .17;
    [
      [x < 0 ? -width / 2 + railW / 2 : width / 2 - railW / 2, 0, railW, 14.55],
      [0, 7.37, width, railW],
      [0, -7.37, width, railW]
    ].forEach(function (v) {
      var rail = new T.Mesh(new T.BoxGeometry(v[2], v[3], .22), railMat);
      rail.position.set(v[0], v[1], .08);
      rail.castShadow = true;
      part.group.add(rail);
    });

    var innerBack = roundedPlane(width - .4, 14.45, .58, frameMat);
    innerBack.position.z = backOffset - .145;
    innerBack.rotation.y = Math.PI;
    part.group.add(innerBack);
    registerPartMeshes(part);
    return part;
  }

  function addHeadphones() {
    var part = makePart('hinge', hingeRoot, [0, 0, 0], [0, 1, 0], 1.05, .08);
    var hingeMat = metal(0xb9c4c6, .18);
    var dark = new T.MeshStandardMaterial({ color: 0x171d20, metalness: .7, roughness: .4 });
    for (var i = 0; i < 8; i++) {
      var y = 6.25 - i * 1.66;
      var barrel = cylinder(.34, 1.02, i % 2 ? hingeMat : dark, 'y');
      barrel.position.set(0, y, -.05);
      part.group.add(barrel);
      var pin = cylinder(.105, 1.28, hingeMat, 'y');
      pin.position.set(0, y, -.06);
      part.group.add(pin);
    }
    var spine = new T.Mesh(new T.BoxGeometry(.84, 13.7, .32), dark);
    spine.position.z = -.24;
    spine.castShadow = true;
    part.group.add(spine);
    registerPartMeshes(part);
  }

  function addInnerScreen() {
    var part = makePart('inner-screen', model, [0, 0, .34], [-.08, 1, .12], 7.2, .02);
    part.fadeOnExplode = true;
    var mat = new T.MeshStandardMaterial({
      map: innerScreenTexture(),
      roughness: .18,
      metalness: .05,
      emissive: 0x194b59,
      emissiveIntensity: .26,
      side: T.DoubleSide
    });
    var edgeMat = metal(0x11181b, .25);
    var leftPanel = roundedPlane(6.56, 14.24, .45, mat);
    leftPanel.position.x = -3.38;
    part.group.add(leftPanel);
    var leftEdge = roundedBoard(6.68, 14.36, .5, .08, edgeMat);
    leftEdge.position.set(-3.38, 0, -.07);
    part.group.add(leftEdge);

    rightScreenFold.position.set(0, 0, 0);
    part.group.add(rightScreenFold);
    var rightPanel = roundedPlane(6.56, 14.24, .45, mat);
    rightPanel.position.x = 3.38;
    rightScreenFold.add(rightPanel);
    var rightEdge = roundedBoard(6.68, 14.36, .5, .08, edgeMat);
    rightEdge.position.set(3.38, 0, -.07);
    rightScreenFold.add(rightEdge);

    var selfieMat = new T.MeshStandardMaterial({ color: 0x071014, metalness: .4, roughness: .2 });
    var selfie = cylinder(.16, .04, selfieMat, 'z');
    selfie.position.set(4.1, 6.12, .08);
    rightScreenFold.add(selfie);
    registerPartMeshes(part);
  }

  function addOuterScreen() {
    var part = makePart('outer-screen', rightRoot, [3.38, 0, -.43], [0, 0, -1], 2.15, .05);
    part.fadeOnExplode = true;
    var mat = new T.MeshStandardMaterial({
      map: outerScreenTexture(),
      roughness: .17,
      metalness: .04,
      emissive: 0x15333d,
      emissiveIntensity: .34,
      side: T.DoubleSide
    });
    var panel = roundedPlane(5.55, 11.62, .55, mat);
    panel.rotation.y = Math.PI;
    part.group.add(panel);
    var glassMat = new T.MeshPhysicalMaterial({
      color: 0x020508,
      roughness: .08,
      metalness: .3,
      clearcoat: .8,
      clearcoatRoughness: .15
    });
    var back = roundedBoard(5.8, 11.9, .62, .07, glassMat);
    back.position.z = .1;
    part.group.add(back);
    registerPartMeshes(part);
  }

  function addBattery(id, parent, x, width, height, tex) {
    var part = makePart(id, parent, [x, -1.34, -.02], [x < 0 ? -.35 : .35, -.15, .65], 2.25, .12);
    var sideMat = new T.MeshStandardMaterial({ color: 0x899496, metalness: .2, roughness: .62 });
    var battery = roundedBoard(width, height, .28, .28, sideMat);
    part.group.add(battery);
    var labelMat = new T.MeshStandardMaterial({
      map: tex,
      roughness: .74,
      metalness: .05,
      polygonOffset: true,
      polygonOffsetFactor: -1
    });
    var label = roundedPlane(width - .18, height - .18, .24, labelMat);
    label.position.z = .153;
    part.group.add(label);
    var tabMat = new T.MeshStandardMaterial({ color: 0xe8682e, roughness: .75 });
    for (var i = 0; i < 2; i++) {
      var tab = new T.Mesh(new T.BoxGeometry(.48, .08, .75), tabMat);
      tab.position.set((i ? 1 : -1) * width * .22, -height / 2 - .27, .08);
      tab.rotation.x = -.2;
      part.group.add(tab);
    }
    registerPartMeshes(part);
  }

  function addLogicBoard() {
    var part = makePart('logic-board', leftRoot, [3.7, 3.35, -.26], [0, .2, 1], 2.15, .18);
    var pcbMat = new T.MeshStandardMaterial({ color: 0x173c31, metalness: .34, roughness: .66 });
    var board = roundedBoard(3.78, 4.35, .2, .18, pcbMat);
    part.group.add(board);
    var labelMat = new T.MeshStandardMaterial({
      map: boardTexture(),
      roughness: .62,
      metalness: .12,
      polygonOffset: true,
      polygonOffsetFactor: -1
    });
    var label = roundedPlane(3.6, 4.16, .18, labelMat);
    label.position.z = .103;
    part.group.add(label);

    var icMat = new T.MeshStandardMaterial({ color: 0x20272b, metalness: .5, roughness: .34 });
    [
      [-.72, .72, 1.12, .9],
      [.73, .1, .82, .72],
      [-.4, -1.2, .72, .55]
    ].forEach(function (v) {
      var chip = new T.Mesh(new T.BoxGeometry(v[2], v[3], .12), icMat);
      chip.position.set(v[0], v[1], .2);
      part.group.add(chip);
    });
    registerPartMeshes(part);
  }

  function addCamera() {
    var part = makePart('camera', rightRoot, [4.18, 3.92, -.53], [0, .15, 1], 2.35, .2);
    var islandMat = metal(0x8e989b, .3);
    var island = roundedBoard(2.78, 3.55, .62, .24, islandMat);
    island.rotation.y = Math.PI;
    part.group.add(island);
    var lensGlass = new T.MeshPhysicalMaterial({
      color: 0x06121a,
      metalness: .72,
      roughness: .1,
      clearcoat: 1,
      clearcoatRoughness: .06
    });
    var lensRing = metal(0xc9d0d1, .16);
    [
      [-.63, .61],
      [.65, .57],
      [0, -1.04]
    ].forEach(function (v, idx) {
      var ring = cylinder(idx === 2 ? .38 : .47, .21, lensRing, 'z');
      ring.position.set(v[0], v[1], -.18);
      part.group.add(ring);
      var glass = cylinder(idx === 2 ? .3 : .38, .04, lensGlass, 'z');
      glass.position.set(v[0], v[1], -.3);
      part.group.add(glass);
    });
    var flashMat = glow(0xffd9a0, .8);
    var flash = cylinder(.12, .05, flashMat, 'z');
    flash.position.set(-.82, -1.12, -.3);
    part.group.add(flash);
    registerPartMeshes(part);
  }

  function addTaptic() {
    var part = makePart('taptic', leftRoot, [4.55, -5.85, -.1], [.1, -.35, 1], 1.8, .23);
    var taptic = roundedBoard(1.4, 1.25, .22, .22, metal(0x8e999b, .32));
    part.group.add(taptic);
    var coilMat = new T.MeshStandardMaterial({ color: 0x242c2f, metalness: .76, roughness: .3 });
    var coil = new T.Mesh(new T.TorusGeometry(.43, .05, 8, 40), coilMat);
    coil.position.z = .16;
    part.group.add(coil);
    registerPartMeshes(part);
  }

  function addUSB() {
    var part = makePart('usb-core', rightRoot, [3.35, -7.36, .18], [0, -1, .35], 1.55, .24);
    var portMat = metal(0x9aa5a7, .24);
    var port = roundedBoard(1.15, .38, .16, .22, portMat);
    port.rotation.x = Math.PI / 2;
    part.group.add(port);
    var inner = new T.Mesh(new T.BoxGeometry(.72, .13, .08), new T.MeshStandardMaterial({ color: 0x070b0d, roughness: .7 }));
    inner.position.y = -.2;
    part.group.add(inner);
    registerPartMeshes(part);
  }

  function addESIM() {
    var part = makePart('esim', rightRoot, [4.7, 5.55, -.12], [0, .45, .75], 1.65, .26);
    var board = roundedBoard(1.04, .78, .12, .09, new T.MeshStandardMaterial({
      color: 0x263634,
      metalness: .35,
      roughness: .5
    }));
    part.group.add(board);
    var chip = roundedPlane(.52, .34, .06, glow(0x74d899, .45));
    chip.position.z = .07;
    part.group.add(chip);
    registerPartMeshes(part);
  }

  function addMagSafe() {
    var part = makePart('magsafe', rightRoot, [4.25, -1.1, -.54], [0, 0, 1], 1.9, .28);
    var coilMat = new T.MeshStandardMaterial({ color: 0x8d6b4e, metalness: .75, roughness: .28 });
    for (var i = 0; i < 7; i++) {
      var ring = new T.Mesh(new T.TorusGeometry(.7 + i * .18, .035, 7, 50), coilMat);
      ring.position.z = -.035;
      part.group.add(ring);
    }
    registerPartMeshes(part);
  }

  function addSpeaker(id, parent, x, y, dir) {
    var part = makePart(id, parent, [x, y, -.12], dir, 1.55, .3);
    var body = roundedBoard(1.22, .56, .17, .14, metal(0x687477, .36));
    part.group.add(body);
    var grilleMat = new T.MeshStandardMaterial({ color: 0x101719, metalness: .5, roughness: .55 });
    for (var i = 0; i < 15; i++) {
      var dot = cylinder(.025, .025, grilleMat, 'z');
      dot.position.set(-.43 + (i % 10) * .095, -.12 + Math.floor(i / 10) * .16, .085);
      part.group.add(dot);
    }
    registerPartMeshes(part);
  }

  function buildPhone() {
    addChassis('chassis-left', leftRoot, -3.38, 6.72, 0);
    addChassis('chassis-right', rightRoot, 3.38, 6.72, 0);
    addHeadphones();
    addInnerScreen();
    addOuterScreen();
    addBattery('battery-left', leftRoot, -3.42, 5.42, 7.35, batteryTexture('Li-ion Polymer', '2962 mAh', '11.46 Wh', '#e16535'));
    addBattery('battery-right', rightRoot, 3.42, 4.72, 6.38, batteryTexture('Li-ion Polymer', '1921 mAh', '7.43 Wh', '#d3913e'));
    addLogicBoard();
    addCamera();
    addTaptic();
    addUSB();
    addESIM();
    addMagSafe();
    addSpeaker('speaker-left', leftRoot, -4.76, -7.12, [-.2, -1, .4]);
    addSpeaker('speaker-right', rightRoot, 4.74, -7.12, [.2, -1, .4]);
    model.position.y = .1;
  }

  function makeGrid() {
    var grid = new T.GridHelper(90, 90, 0x16495a, 0x0d2731);
    grid.position.y = -8.2;
    grid.material.transparent = true;
    grid.material.opacity = .36;
    scene.add(grid);

    var ringMat = new T.MeshBasicMaterial({
      color: 0x2fd8f4,
      transparent: true,
      opacity: .12,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
      depthWrite: false
    });
    for (var i = 0; i < 4; i++) {
      var ring = new T.Mesh(new T.RingGeometry(7.8 + i * 1.15, 7.815 + i * 1.15, 120), ringMat.clone());
      ring.material.opacity = .11 - i * .018;
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -8.15;
      scene.add(ring);
    }

    var count = 900;
    var positions = new Float32Array(count * 3);
    for (var p = 0; p < count; p++) {
      positions[p * 3] = (Math.random() - .5) * 65;
      positions[p * 3 + 1] = Math.random() * 42 - 6;
      positions[p * 3 + 2] = (Math.random() - .5) * 45 - 8;
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(positions, 3));
    var pointsMat = new T.PointsMaterial({
      color: 0x7edced,
      size: .035,
      transparent: true,
      opacity: .32,
      depthWrite: false
    });
    scene.add(new T.Points(geo, pointsMat));
  }

  function addLights() {
    scene.add(new T.HemisphereLight(0x95dfff, 0x11150e, .62));
    var key = new T.DirectionalLight(0xe9fbff, 2.2);
    key.position.set(10, 15, 14);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 16;
    key.shadow.camera.bottom = -16;
    scene.add(key);
    var cyan = new T.PointLight(0x36d9ff, 2.2, 32);
    cyan.position.set(-10, 2, 9);
    scene.add(cyan);
    var lime = new T.PointLight(0x9bd94f, 1.15, 26);
    lime.position.set(11, -5, -6);
    scene.add(lime);
    var warm = new T.PointLight(0xffad66, .8, 20);
    warm.position.set(0, 10, -8);
    scene.add(warm);
  }

  function environmentTexture() {
    var envScene = new T.Scene();
    envScene.background = new T.Color(0x071019);
    var panelMat = new T.MeshBasicMaterial({ color: 0x7ae9ff, side: T.DoubleSide });
    var warmMat = new T.MeshBasicMaterial({ color: 0xffb46b, side: T.DoubleSide });
    var m1 = new T.Mesh(new T.PlaneGeometry(6, 12), panelMat);
    m1.position.set(-8, 1, 4);
    m1.rotation.y = Math.PI / 2;
    envScene.add(m1);
    var m2 = new T.Mesh(new T.PlaneGeometry(4, 6), warmMat);
    m2.position.set(7, 5, -2);
    m2.rotation.y = -Math.PI / 2;
    envScene.add(m2);
    var pmrem = new T.PMREMGenerator(renderer);
    var target = pmrem.fromScene(envScene, .04);
    pmrem.dispose();
    return target.texture;
  }

  buildPhone();
  makeGrid();
  addLights();
  scene.environment = environmentTexture();

  var orbit = {
    target: new T.Vector3(0, .2, 0),
    theta: .54,
    phi: 1.19,
    radius: 27,
    desiredTheta: .54,
    desiredPhi: 1.19,
    desiredRadius: 27,
    desiredTarget: new T.Vector3(0, .2, 0),
    dragging: false,
    button: 0,
    lastX: 0,
    lastY: 0,
    moved: 0,
    downAt: 0
  };

  function updateCamera() {
    orbit.theta += (orbit.desiredTheta - orbit.theta) * .11;
    orbit.phi += (orbit.desiredPhi - orbit.phi) * .11;
    orbit.radius += (orbit.desiredRadius - orbit.radius) * .1;
    orbit.target.lerp(orbit.desiredTarget, .1);
    var sp = Math.sin(orbit.phi);
    camera.position.set(
      orbit.target.x + orbit.radius * sp * Math.sin(orbit.theta),
      orbit.target.y + orbit.radius * Math.cos(orbit.phi),
      orbit.target.z + orbit.radius * sp * Math.cos(orbit.theta)
    );
    camera.lookAt(orbit.target);
  }

  function setRange(value) {
    explodeTarget = Math.max(0, Math.min(1, value));
    range.value = String(Math.round(explodeTarget * 100));
    range.style.setProperty('--fill', (explodeTarget * 100) + '%');
    rangeValue.textContent = String(Math.round(explodeTarget * 100)).padStart(3, '0') + '%';
    explodeBtn.textContent = explodeTarget > .6 ? '合拢整机' : '整体拆解';
  }

  function toggleExplode() {
    autoMode = false;
    setRange(explodeTarget > .6 ? 0 : 1);
  }

  function toggleFold() {
    autoMode = false;
    foldTarget = foldTarget > .5 ? 0 : 1;
    foldBtn.classList.toggle('primary', foldTarget > .5);
    if (foldTarget > .5) setRange(0);
  }

  function clearSelection() {
    selectedId = null;
    hoverId = null;
    card.classList.remove('show');
    document.querySelectorAll('.legend button').forEach(function (b) {
      b.classList.toggle('active', false);
    });
  }

  function selectPart(id, fromList) {
    if (!DATA[id] || !partMap[id]) return;
    selectedId = id;
    var d = DATA[id];
    partIndex.textContent = 'PART ' + d.icon + ' / 15';
    partName.textContent = d.name;
    partDesc.textContent = d.desc;
    partSpecs.innerHTML = d.specs.map(function (s) {
      return '<div><span>' + s[0] + '</span><b>' + s[1] + '</b></div>';
    }).join('');
    card.classList.add('show');
    document.querySelectorAll('.legend button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.part === id);
    });
    if (fromList) {
      var part = partMap[id];
      var world = new T.Vector3();
      part.group.getWorldPosition(world);
      orbit.desiredTarget.copy(world).multiplyScalar(.42);
    }
  }

  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  function resetView() {
    autoMode = false;
    foldTarget = 0;
    setRange(0);
    clearSelection();
    orbit.desiredTheta = .54;
    orbit.desiredPhi = 1.19;
    orbit.desiredRadius = 27;
    orbit.desiredTarget.set(0, .2, 0);
    foldBtn.classList.remove('primary');
    toast('视角与结构已复位');
  }

  function startAuto() {
    autoMode = !autoMode;
    autoBtn.classList.toggle('primary', autoMode);
    if (autoMode) {
      autoStart = elapsed;
      foldTarget = 0;
      setRange(0);
      toast('自动巡览已启动');
    } else {
      toast('自动巡览已停止');
    }
  }

  function applySelection(part, intensity, pulse) {
    part.materials.forEach(function (mat, index) {
      if (!mat.emissive) return;
      var base = part.baseEmissive[index] || 0;
      mat.emissiveIntensity = base + intensity * pulse;
    });
  }

  function updateParts(time) {
    parts.forEach(function (part) {
      var localT = Math.max(0, Math.min(1, (explodeCurrent - part.delay * .72) / .68));
      var eased = localT * localT * (3 - 2 * localT);
      var selectedLift = selectedId === part.id ? .46 * Math.min(1, explodeCurrent + .32) : 0;
      part.group.position.copy(part.home).addScaledVector(part.dir, part.distance * eased + selectedLift);
      var highlight = selectedId === part.id ? 1 : (hoverId === part.id ? .34 : .08 * explodeCurrent);
      var pulse = .62 + Math.sin(time * 3.8) * .18;
      var fade = part.fadeOnExplode
        ? Math.max(.13, 1 - Math.max(0, explodeCurrent - .42) / .58 * .87)
        : 1;
      part.materials.forEach(function (mat) {
        if (!part.fadeOnExplode) return;
        mat.opacity = fade;
        mat.depthWrite = fade > .96;
      });
      applySelection(part, highlight, pulse);
    });
  }

  function updateFold() {
    foldCurrent += (foldTarget - foldCurrent) * .075;
    var ease = foldCurrent * foldCurrent * (3 - 2 * foldCurrent);
    rightRoot.rotation.y = -Math.PI * .985 * ease;
    rightRoot.position.z = -.57 * Math.sin(ease * Math.PI * .5);
    rightRoot.position.x = -.12 * Math.sin(ease * Math.PI);
    rightScreenFold.rotation.y = rightRoot.rotation.y;
    rightScreenFold.position.z = rightRoot.position.z;
    rightScreenFold.position.x = rightRoot.position.x;
    stateText.textContent = ease > .55 ? 'FOLDED' : (ease > .08 ? 'MOVING' : 'OPEN');
  }

  function updateAuto() {
    if (!autoMode) return;
    var t = (elapsed - autoStart) % 15;
    if (t < 3) {
      setRange(t / 3);
    } else if (t < 9) {
      setRange(1);
      orbit.desiredTheta = .54 + Math.sin((t - 3) * .55) * .8;
      orbit.desiredPhi = 1.1 + Math.sin((t - 3) * .36) * .22;
    } else if (t < 12) {
      setRange(1 - (t - 9) / 3);
    } else if (t < 15) {
      setRange(0);
      foldTarget = t > 13.5 ? 1 : 0;
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), .05);
    elapsed += dt;
    explodeCurrent += (explodeTarget - explodeCurrent) * .085;
    updateAuto();
    updateFold();
    updateParts(elapsed);
    model.rotation.y += dt * (autoMode ? .075 : .018);
    model.position.y = .1 + Math.sin(elapsed * .55) * .045;
    updateCamera();
    renderer.render(scene, camera);
  }

  function castPointer(event) {
    var rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(pickables, false);
    return hits.length ? hits[0].object.userData.partId : null;
  }

  function focusPart(id) {
    var part = partMap[id];
    if (!part) return;
    var world = new T.Vector3();
    part.group.getWorldPosition(world);
    orbit.desiredTarget.copy(world);
    orbit.desiredRadius = Math.max(10, orbit.radius * .68);
  }

  renderer.domElement.addEventListener('pointerdown', function (event) {
    orbit.dragging = true;
    orbit.button = event.button;
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;
    orbit.moved = 0;
    orbit.downAt = performance.now();
    renderer.domElement.setPointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener('pointermove', function (event) {
    if (!orbit.dragging) {
      hoverId = castPointer(event);
      renderer.domElement.style.cursor = hoverId ? 'pointer' : 'grab';
      return;
    }
    var dx = event.clientX - orbit.lastX;
    var dy = event.clientY - orbit.lastY;
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;
    orbit.moved += Math.abs(dx) + Math.abs(dy);
    if (orbit.button === 2) {
      orbit.desiredTarget.x -= dx * .018;
      orbit.desiredTarget.y += dy * .018;
    } else {
      orbit.desiredTheta -= dx * .006;
      orbit.desiredPhi = Math.max(.42, Math.min(1.62, orbit.desiredPhi - dy * .005));
    }
  });

  function endPointer(event) {
    if (!orbit.dragging) return;
    orbit.dragging = false;
    if (renderer.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId);
    }
    if (orbit.moved < 7 && performance.now() - orbit.downAt < 450 && orbit.button === 0) {
      var id = castPointer(event);
      if (id) selectPart(id, false); else clearSelection();
    }
  }
  renderer.domElement.addEventListener('pointerup', endPointer);
  renderer.domElement.addEventListener('pointercancel', endPointer);
  renderer.domElement.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  renderer.domElement.addEventListener('wheel', function (event) {
    event.preventDefault();
    orbit.desiredRadius = Math.max(8.5, Math.min(44, orbit.desiredRadius + event.deltaY * .022));
  }, { passive: false });
  renderer.domElement.addEventListener('dblclick', function (event) {
    var id = castPointer(event);
    if (id) {
      selectPart(id, false);
      focusPart(id);
    }
  });

  document.querySelectorAll('.legend button').forEach(function (button) {
    button.addEventListener('click', function () {
      var id = button.dataset.part;
      selectPart(id, true);
      focusPart(id);
    });
  });
  range.addEventListener('input', function () {
    autoMode = false;
    setRange(Number(range.value) / 100);
  });
  explodeBtn.addEventListener('click', toggleExplode);
  foldBtn.addEventListener('click', toggleFold);
  autoBtn.addEventListener('click', startAuto);
  resetBtn.addEventListener('click', resetView);
  clearBtn.addEventListener('click', clearSelection);
  addEventListener('keydown', function (event) {
    if (event.code === 'Space') {
      event.preventDefault();
      toggleExplode();
    } else if (event.key === 'f' || event.key === 'F') {
      toggleFold();
    } else if (event.key === 'r' || event.key === 'R') {
      resetView();
    } else if (event.key === 'Escape') {
      clearSelection();
    }
  });
  addEventListener('resize', function () {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
  });

  setRange(0);
  updateCamera();
  animate();
}());
