/* ============================================================
 * iPhone Duo · 交互式 3D 拆解实验室
 * main.js —— 场景 / 灯光 / 后期 / UI / 自动演示 / 折叠动画
 * ============================================================ */
(function () {
  'use strict';

  var App = window.App = window.App || {};

  var renderer, scene, camera, postfx, clock;
  var controls, phoneRoot, parts, leftGroup, foldPivot, foldGroup;
  var raycaster, hoverNdc = null, hoverPart = null, selectedPart = null;
  var particles = null;
  var tour = { on: false, phase: '', t: 0, idx: -1 };
  var foldTarget = 0, foldCurrent = 0;
  var els = {};

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  init();

  function init() {
    els = {
      canvas: document.getElementById('scene'),
      loader: document.getElementById('loader'),
      tooltip: document.getElementById('tooltip'),
      infoPanel: document.getElementById('info-panel'),
      ipEn: document.getElementById('ip-en'),
      ipName: document.getElementById('ip-name'),
      ipDesc: document.getElementById('ip-desc'),
      ipSpecs: document.getElementById('ip-specs'),
      ipState: document.getElementById('ip-state'),
      ipClose: document.getElementById('ip-close'),
      partsCount: document.getElementById('parts-count'),
      partsUl: document.getElementById('parts-ul'),
      btnExplode: document.getElementById('btn-explode'),
      btnAssemble: document.getElementById('btn-assemble'),
      btnTour: document.getElementById('btn-tour'),
      btnRotate: document.getElementById('btn-rotate'),
      btnReset: document.getElementById('btn-reset'),
      btnFold: document.getElementById('btn-fold'),
      slider: document.getElementById('explode-slider'),
      sliderVal: document.getElementById('slider-val'),
      stateText: document.getElementById('explode-state')
    };

    if (!window.THREE) {
      els.loader.querySelector('.load-text').textContent =
        'Three.js 加载失败:请联网后刷新(将自动从 CDN 兜底加载)';
      return;
    }

    renderer = new THREE.WebGLRenderer({ canvas: els.canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02040a, 0.012);
    scene.background = App.canvasTexture(1024, 1024, drawBackground);

    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 400);
    camera.position.set(15, 10, 26);

    // 环境反射(PMREM 程序化 HDR 工作室,无外部资源)
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(buildEnvScene(), 0.05).texture;
    pmrem.dispose();

    addLights();
    addGround();
    addParticles();

    var built = App.buildPhone();
    phoneRoot = built.root;
    parts = built.parts;
    leftGroup = built.leftGroup;
    foldPivot = built.foldPivot;
    foldGroup = built.foldGroup;
    scene.add(phoneRoot);

    App.explode = new App.Explode();
    App.explode.registerAll(parts);
    App.explode.onChange = syncSlider;

    controls = new App.OrbitGestures(camera, els.canvas);
    controls.onClick = function (ndc) { handleClick(ndc); };
    controls.onDoubleClick = function (ndc) { handleFocus(ndc); };
    controls.onInteract = function () { stopTour(); };

    els.canvas.addEventListener('pointermove', onHoverMove);
    els.canvas.addEventListener('pointerleave', function () { hoverNdc = null; });

    raycaster = new THREE.Raycaster();

    // 后期:自研轻量泛光管线(bloom.js,免外部后期库)
    // 注意:必须先于 onResize() 创建,否则 onResize 内 postfx 未定义
    postfx = new App.PostFX(renderer);
    postfx.setSize(window.innerWidth, window.innerHeight, renderer.getPixelRatio());

    bindUI();
    buildPartsList();

    onResize();
    window.addEventListener('resize', onResize);

    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space') { e.preventDefault(); stopTour(); toggleExplode(); }
      else if (e.key === 'r' || e.key === 'R') { stopTour(); controls.resetView(); }
      else if (e.key === 'f' || e.key === 'F') { stopTour(); toggleFold(); }
      else if (e.key === 'Escape') { stopTour(); deselect(); }
    });

    clock = new THREE.Clock();
    animate();

    setTimeout(function () { els.loader.classList.add('hide'); }, 500);

    console.log('%c iPhone DUO · 交互式拆解实验室已就绪 ',
      'background:#0ea5b7;color:#02121a;font-weight:bold;padding:4px 8px;border-radius:4px');
  }

  /* ---------------- 环境 ---------------- */

  function buildEnvScene() {
    var s = new THREE.Scene();
    function panel(hex, intensity, w, h, x, y, z) {
      var mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(intensity) });
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      s.add(m);
    }
    panel(0xffffff, 4.5, 16, 16, 0, 14, 0);    // 顶部主光
    panel(0x66d9ff, 2.2, 12, 5, -14, 3, 5);    // 左侧青色条
    panel(0xffa04d, 1.4, 10, 4, 14, -3, -4);   // 右侧暖光
    panel(0x88aaff, 0.7, 18, 7, 0, -2, 14);    // 正面冷补光
    panel(0xffffff, 7.0, 1.4, 13, -8, 7, 8);   // 高光窄条 1
    panel(0x99e6ff, 5.0, 1.1, 11, 9, 6, -7);   // 高光窄条 2
    return s;
  }

  function addLights() {
    scene.add(new THREE.HemisphereLight(0x5d7bb0, 0x05070c, 0.55));

    var key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(16, 24, 18);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 90;
    key.shadow.camera.left = -26;
    key.shadow.camera.right = 26;
    key.shadow.camera.top = 30;
    key.shadow.camera.bottom = -30;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    scene.add(key);

    var rim = new THREE.PointLight(0x22d3ee, 1.1, 90);
    rim.position.set(-18, 6, -14);
    scene.add(rim);

    var warm = new THREE.PointLight(0xff8a3d, 0.5, 80);
    warm.position.set(16, -8, -10);
    scene.add(warm);

    var fill = new THREE.PointLight(0x88aaff, 0.45, 100);
    fill.position.set(4, 8, 20);
    scene.add(fill);
  }

  function addGround() {
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.ShadowMaterial({ opacity: 0.32 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -13.5;
    floor.receiveShadow = true;
    scene.add(floor);

    var grid = new THREE.GridHelper(240, 80, 0x14263f, 0x0a1626);
    grid.material.transparent = true;
    grid.material.opacity = 0.5;
    grid.material.depthWrite = false;
    grid.position.y = -13.49;
    scene.add(grid);

    var glow = new THREE.Mesh(new THREE.PlaneGeometry(60, 60),
      new THREE.MeshBasicMaterial({
        map: App.canvasTexture(256, 256, function (c, w, h) {
          var g = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
          g.addColorStop(0, 'rgba(30,110,220,0.5)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = g;
          c.fillRect(0, 0, w, h);
        }),
        transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -13.48;
    scene.add(glow);
  }

  function addParticles() {
    var n = 260;
    var pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var r = 18 + Math.random() * 55;
      var th = Math.random() * Math.PI * 2;
      var ph = Math.acos(Math.random() * 2 - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.6 - 2;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({
      map: App.canvasTexture(64, 64, function (c, w, h) {
        var g = c.createRadialGradient(32, 32, 0, 32, 32, 30);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.4, 'rgba(160,220,255,0.5)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }),
      color: 0x9fd8ff, size: 0.55, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    particles = new THREE.Points(geo, mat);
    scene.add(particles);
  }

  function drawBackground(c, w, h) {
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#060b18');
    g.addColorStop(0.5, '#03060d');
    g.addColorStop(1, '#010206');
    c.fillStyle = g; c.fillRect(0, 0, w, h);

    g = c.createRadialGradient(w * 0.5, h * 0.42, 60, w * 0.5, h * 0.42, w * 0.55);
    g.addColorStop(0, 'rgba(36,84,150,0.28)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);

    g = c.createRadialGradient(w * 0.16, h * 0.74, 40, w * 0.16, h * 0.74, w * 0.4);
    g.addColorStop(0, 'rgba(34,211,238,0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);

    g = c.createRadialGradient(w * 0.86, h * 0.28, 40, w * 0.86, h * 0.28, w * 0.38);
    g.addColorStop(0, 'rgba(147,51,234,0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);

    for (var i = 0; i < 170; i++) {
      c.fillStyle = 'rgba(200,222,255,' + (Math.random() * 0.5 + 0.06).toFixed(2) + ')';
      c.beginPath();
      c.arc(Math.random() * w, Math.random() * h, Math.random() * 1.6 + 0.4, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = 'rgba(120,180,255,0.02)';
    for (var y = 0; y < h; y += 6) c.fillRect(0, y, w, 2);
  }

  /* ---------------- 拾取与选择 ---------------- */

  function findPart(obj) {
    var o = obj;
    while (o) {
      if (o.userData && o.userData.partRef) return o.userData.partRef;
      o = o.parent;
    }
    return null;
  }

  function handleClick(ndc) {
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(phoneRoot.children, true);
    var part = findPart(hits.length ? hits[0].object : null);
    if (part) selectPart(part, { pop: true, fly: false });
    else deselect();
  }

  function handleFocus(ndc) {
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(phoneRoot.children, true);
    var part = findPart(hits.length ? hits[0].object : null);
    if (part) selectPart(part, { pop: true, fly: true });
  }

  function selectPart(part, opts) {
    opts = opts || {};
    if (selectedPart) selectedPart.selected = false;
    selectedPart = part;
    part.selected = true;
    if (opts.pop) part.extraTarget = part.extraTarget > 0.5 ? 0 : 1;
    showInfo(part);
    updateListActive();
    if (opts.fly) flyToPart(part);
  }

  function deselect() {
    if (selectedPart) { selectedPart.selected = false; selectedPart = null; }
    els.infoPanel.classList.remove('show');
    updateListActive();
  }

  function showInfo(part) {
    var d = part.def;
    els.ipEn.textContent = d.en || '';
    els.ipName.textContent = d.name;
    els.ipDesc.textContent = d.desc || '';
    els.ipSpecs.innerHTML = '';
    (d.specs || []).forEach(function (row) {
      var tr = document.createElement('tr');
      var td1 = document.createElement('td');
      var td2 = document.createElement('td');
      td1.textContent = row[0];
      td2.textContent = row[1];
      tr.appendChild(td1);
      tr.appendChild(td2);
      els.ipSpecs.appendChild(tr);
    });
    els.infoPanel.classList.add('show');
  }

  function flyToPart(part) {
    var box = new THREE.Box3().setFromObject(part.group);
    var c = box.getCenter(new THREE.Vector3());
    var size = box.getSize(new THREE.Vector3()).length();
    controls.flyTo(c, Math.max(8, size * 2.2), 1.0);
  }

  function updateListActive() {
    var lis = els.partsUl.children;
    for (var i = 0; i < lis.length; i++) {
      var id = lis[i].getAttribute('data-id');
      lis[i].classList.toggle('active', !!(selectedPart && selectedPart.id === id));
    }
  }

  /* ---------------- 悬停提示 ---------------- */

  function onHoverMove(e) {
    var r = els.canvas.getBoundingClientRect();
    hoverNdc = new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1
    );
    els.tooltip.style.left = (e.clientX + 16) + 'px';
    els.tooltip.style.top = (e.clientY + 14) + 'px';
  }

  function updateHover() {
    if (!hoverNdc || controls.pointers.size > 0) { setHover(null); return; }
    raycaster.setFromCamera(hoverNdc, camera);
    var hits = raycaster.intersectObjects(phoneRoot.children, true);
    setHover(findPart(hits.length ? hits[0].object : null));
  }

  function setHover(p) {
    if (p === hoverPart) return;
    if (hoverPart) hoverPart.hovered = false;
    hoverPart = p;
    if (p) {
      p.hovered = true;
      els.tooltip.textContent = p.def.name + (p.extraTarget > 0.5 ? ' · 点击收回' : ' · 点击拆出');
      els.tooltip.classList.add('show');
      els.canvas.style.cursor = 'pointer';
    } else {
      els.tooltip.classList.remove('show');
      els.canvas.style.cursor = '';
    }
  }

  /* ---------------- UI 绑定 ---------------- */

  function bindUI() {
    els.btnExplode.addEventListener('click', function () {
      stopTour();
      parts.forEach(function (p) { p.extraTarget = 0; });
      App.explode.setTarget(1);
    });
    els.btnAssemble.addEventListener('click', function () {
      stopTour();
      parts.forEach(function (p) { p.extraTarget = 0; });
      App.explode.setTarget(0);
    });
    els.btnTour.addEventListener('click', function () {
      if (tour.on) stopTour(); else startTour();
    });
    els.btnRotate.addEventListener('click', function () {
      controls.autoRotate = !controls.autoRotate;
      els.btnRotate.classList.toggle('active', controls.autoRotate);
    });
    els.btnReset.addEventListener('click', function () {
      controls.resetView();
    });
    els.btnFold.addEventListener('click', function () {
      stopTour();
      toggleFold();
    });
    els.slider.addEventListener('input', function () {
      stopTour();
      App.explode.setTarget(els.slider.value / 100, { snap: true });
    });
    els.ipClose.addEventListener('click', deselect);
  }

  function toggleExplode() {
    if (App.explode.target > 0.5) {
      parts.forEach(function (p) { p.extraTarget = 0; });
      App.explode.setTarget(0);
    } else {
      App.explode.setTarget(1);
    }
  }

  function toggleFold() {
    foldTarget = foldTarget > 0.5 ? 0 : 1;
    els.btnFold.classList.toggle('active', foldTarget > 0.5);
    els.btnFold.textContent = foldTarget > 0.5 ? '⇲ 展开' : '⇱ 折叠';
  }

  function syncSlider(v) {
    var pct = Math.round(v * 100);
    els.slider.value = pct;
    els.sliderVal.textContent = pct + '%';
    els.stateText.textContent = v < 0.01 ? '已组装' : (v > 0.99 ? '完全拆解' : '拆解中…');
  }

  function buildPartsList() {
    els.partsCount.textContent = parts.length;
    parts.forEach(function (p) {
      var li = document.createElement('li');
      li.setAttribute('data-id', p.id);
      var idx = document.createElement('span');
      idx.className = 'idx';
      idx.textContent = String(p.index + 1).padStart(2, '0');
      var nm = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = p.def.name;
      li.appendChild(idx);
      li.appendChild(nm);
      li.addEventListener('click', function () {
        stopTour();
        selectPart(p, { pop: true, fly: true });
      });
      els.partsUl.appendChild(li);
    });
  }

  /* ---------------- 自动演示 ---------------- */

  function startTour() {
    if (foldTarget > 0.5) toggleFold();
    tour.on = true; tour.phase = 'assemble'; tour.t = 0; tour.idx = -1;
    deselect();
    parts.forEach(function (p) { p.extraTarget = 0; });
    App.explode.setTarget(0);
    controls.autoRotate = true;
    els.btnTour.classList.add('active');
    els.btnTour.textContent = '⏸ 停止演示';
  }

  function stopTour() {
    if (!tour.on) return;
    tour.on = false;
    els.btnTour.classList.remove('active');
    els.btnTour.textContent = '▶ 自动演示';
  }

  function updateTour(dt) {
    if (!tour.on) return;
    tour.t += dt;

    if (tour.phase === 'assemble') {
      if (tour.t > 1.2) { tour.phase = 'explode'; tour.t = 0; App.explode.setTarget(1); }
    } else if (tour.phase === 'explode') {
      if (tour.t > 2.8) { tour.phase = 'parts'; tour.t = 0; tour.idx = -1; }
    } else if (tour.phase === 'parts') {
      if (tour.idx < 0 || tour.t > 2.1) {
        tour.idx++; tour.t = 0;
        if (tour.idx >= parts.length) {
          tour.phase = 'final'; tour.t = 0;
          deselect();
          parts.forEach(function (p) { p.extraTarget = 0; });
          App.explode.setTarget(0);
        } else {
          var p = parts[tour.idx];
          selectPart(p, { pop: false, fly: false });
          p.extraTarget = 1;
          flyToPart(p);
        }
      }
    } else if (tour.phase === 'final') {
      if (tour.t > 2.4) {
        tour.on = false;
        controls.autoRotate = false;
        els.btnTour.classList.remove('active');
        els.btnTour.textContent = '▶ 自动演示';
      }
    }
  }

  /* ---------------- 主循环 ---------------- */

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(0.05, clock.getDelta());

    controls.update(dt);
    App.explode.update(dt);
    updateTour(dt);
    updateHover();

    // 折叠补间(绕铰链轴旋转右半机)
    if (Math.abs(foldTarget - foldCurrent) > 0.0005) {
      foldCurrent += (foldTarget - foldCurrent) * Math.min(1, dt * 3);
    } else {
      foldCurrent = foldTarget;
    }
    // 负角:右半机朝观察者(+Z,内屏一侧)翻起再合上 = 内折叠;
    // 取正角会让右半机绕到机身背后再转回来,视觉上"反着折"。
    foldPivot.rotation.y = -easeInOutCubic(foldCurrent) * Math.PI;

    if (particles) particles.rotation.y += dt * 0.008;

    if (selectedPart) {
      var out = App.explode.partEase(selectedPart, App.explode.progress) > 0.5 || selectedPart.extra > 0.5;
      var txt = out ? '● 已拆出' : '○ 装配中';
      if (els.ipState.textContent !== txt) els.ipState.textContent = txt;
    }

    postfx.render(scene, camera);
  }

  function onResize() {
    if (!renderer || !postfx) return; // 防御:初始化未完成时忽略
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    postfx.setSize(window.innerWidth, window.innerHeight, renderer.getPixelRatio());
  }
})();
