/* ============================================================
 * iPhone Duo · Teardown Lab
 * app.js —— 场景 / 灯光 / 交互 / 拆解编排 / UI
 * ============================================================ */
(function () {
  'use strict';

  var D = DUO.DIM;
  var PARTS = DUO.PARTS;
  var PART_MAP = DUO.PART_MAP;

  var canvas, renderer, scene, camera, bloom, rig, phone;
  var clock, raycaster, ndc, pointerClient = { x: -1, y: -1 };
  var parts = [], partsById = {};
  var S = {
    progress: 0, target: 0,
    fold: 0, targetFold: 0,
    selected: null, hovered: null,
    demo: false, demoToken: 0
  };
  var demoToken = 0, demoTimer = null, time = 0;
  var frameCount = 0, fpsTime = 0, lastSelectAt = 0;
  var ui = {};

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function easeInOut(t) {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function hexCss(n) { return '#' + ('000000' + n.toString(16)).slice(-6); }

  /* ---------------- 加载提示 ---------------- */
  function bootStatus(pct, text) {
    var bar = $('loadBar'), st = $('loadStatus'), pc = $('loadPct');
    if (bar) bar.style.width = pct + '%';
    if (st && text) st.textContent = text;
    if (pc) pc.textContent = Math.round(pct) + '%';
  }
  function bootFail(msg) {
    var el = $('loading');
    if (!el) return;
    el.classList.add('failed');
    var st = $('loadStatus');
    if (st) st.textContent = '初始化失败:' + msg;
    var pc = $('loadPct');
    if (pc) pc.textContent = 'ERR';
    var hint = $('loadHint');
    if (hint) hint.textContent = '请确认浏览器支持 WebGL,并允许加载 Three.js CDN。';
  }
  function bootDone() {
    bootStatus(100, '就绪');
    var el = $('loading');
    if (el) setTimeout(function () { el.classList.add('hidden'); }, 420);
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    canvas = $('scene');
    bootStatus(78, '构建 25 个部件…');

    renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: true, alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.autoClear = true;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03060c, 0.0072);
    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 400);

    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();
    ndc = new THREE.Vector2();

    buildEnvironment();
    buildBackground();
    addLights();

    var maxAniso = renderer.capabilities.getMaxAnisotropy();
    var textures = DUO.buildTextures(Math.min(8, maxAniso));
    phone = DUO.buildPhone(textures);
    scene.add(phone.root);
    phone.root.updateMatrixWorld(true);

    parts = phone.parts;
    parts.forEach(function (p, i) {
      partsById[p.id] = p;
      p.index = PARTS.indexOf(p.def) + 1;
      p.start = p.order * 0.78;
      p.dur = 0.22;
      p.accent = new THREE.Color(p.def.accent);
      var bb = new THREE.Box3().setFromObject(p.group);
      var sphere = bb.getBoundingSphere(new THREE.Sphere());
      p.size = Math.max(0.4, sphere.radius);
      p.worldPos = new THREE.Vector3();
      prepareHighlight(p);
    });

    // 选中部件时的跟随点光
    ui.selLight = new THREE.PointLight(0xffffff, 0, 22, 2);
    ui.selLight.position.set(0, 0, 6);
    scene.add(ui.selLight);

    rig = new DUO.OrbitRig(camera, canvas);
    rig.onClick = onCanvasClick;
    rig.onInteract = onUserInteract;

    bloom = null;
    try {
      bloom = DUO.createBloom(renderer, scene, camera);
    } catch (bloomErr) {
      console.warn('[DUO] post-processing skipped:', bloomErr);
    }

    buildUI();
    bindEvents();

    bootStatus(92, '编译着色器…');
    try { renderer.compile(scene, camera); } catch (compileErr) { console.warn('[DUO] compile warning:', compileErr); }
    bootStatus(100, '就绪');

    animate(0);
    requestAnimationFrame(function () { bootDone(); });
  }

  /* ---------------- 环境反射(程序化灯房) ---------------- */
  function buildEnvironment() {
    try {
      var pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      var env = new THREE.Scene();
      var shell = new THREE.Mesh(
        new THREE.BoxGeometry(120, 120, 120),
        new THREE.MeshBasicMaterial({ color: 0x03060d, side: THREE.BackSide })
      );
      env.add(shell);

      function panel(color, intensity, w, h, d, x, y, z) {
        var m = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) })
        );
        m.position.set(x, y, z);
        env.add(m);
      }
      // 顶部冷白主光带
      panel(0xdff3ff, 5.0, 34, 1, 18, 0, 30, 4);
      // 左侧青色灯条
      panel(0x1ec8ff, 4.0, 1.2, 26, 26, -28, 4, 6);
      // 右侧品红灯条
      panel(0xff2fbf, 2.6, 1.2, 22, 22, 28, 2, -4);
      // 前方暖色补光
      panel(0xffd2a0, 1.6, 18, 12, 1, 4, 4, 28);
      // 底部冷光
      panel(0x0a2a55, 2.0, 30, 1, 30, 0, -26, 0);

      var rt = pmrem.fromScene(env, 0.035);
      scene.environment = rt.texture;
      pmrem.dispose();
    } catch (err) {
      console.warn('[DUO] environment skipped:', err);
    }
  }

  /* ---------------- 深色科技背景 ---------------- */
  function buildBackground() {
    var sky = new THREE.Mesh(
      new THREE.SphereGeometry(150, 32, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, depthTest: false,
        uniforms: {
          top: { value: new THREE.Color(0x03060e) },
          bottom: { value: new THREE.Color(0x010206) },
          glow: { value: new THREE.Color(0x0a3050) }
        },
        vertexShader: [
          'varying vec3 vPos;',
          'void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
        ].join('\n'),
        fragmentShader: [
          'varying vec3 vPos;',
          'uniform vec3 top; uniform vec3 bottom; uniform vec3 glow;',
          'void main(){',
          '  vec3 dir = normalize(vPos);',
          '  float h = dir.y * 0.5 + 0.5;',
          '  vec3 col = mix(bottom, top, smoothstep(0.0, 1.0, h));',
          '  float d = length(dir.xy);',
          '  col += glow * exp(-d * d * 4.5) * 0.55;',
          '  float bandX = (h - 0.52) * 14.0;',
          '  float band = exp(-bandX * bandX);',
          '  col += vec3(0.02, 0.08, 0.12) * band;',
          '  gl_FragColor = vec4(col, 1.0);',
          '}'
        ].join('\n')
      })
    );
    sky.renderOrder = -10;
    scene.add(sky);

    // 地面网格
    var grid = new THREE.GridHelper(80, 80, 0x16405c, 0x081824);
    grid.position.y = -9.6;
    grid.material.transparent = true;
    grid.material.opacity = 0.42;
    grid.material.depthWrite = false;
    scene.add(grid);

    // 地面光环
    for (var i = 0; i < 3; i++) {
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(10 + i * 3.2, 0.018, 6, 120),
        new THREE.MeshBasicMaterial({
          color: i === 1 ? 0xff4fd8 : 0x35d8ff,
          transparent: true, opacity: 0.18 - i * 0.035,
          blending: THREE.AdditiveBlending, depthWrite: false
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -9.58;
      scene.add(ring);
    }

    // 地面投影(柔和的假接触阴影)
    var sc = document.createElement('canvas');
    sc.width = 256; sc.height = 256;
    var sctx = sc.getContext('2d');
    var sg = sctx.createRadialGradient(128, 128, 8, 128, 128, 124);
    sg.addColorStop(0, 'rgba(0,0,0,0.68)');
    sg.addColorStop(0.45, 'rgba(0,0,0,0.32)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 256, 256);
    var shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 9),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(sc), transparent: true, opacity: 0.8,
        depthWrite: false, toneMapped: false
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -9.55;
    scene.add(shadow);

    // 星尘
    var count = 700;
    var pos = new Float32Array(count * 3);
    for (var p = 0; p < count; p++) {
      var r = 16 + Math.random() * 52;
      var th = Math.random() * Math.PI * 2;
      var ph = Math.acos(Math.random() * 2 - 1);
      pos[p * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[p * 3 + 1] = (Math.random() - 0.35) * 42;
      pos[p * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var dust = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x7fdcff, size: 0.09, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    }));
    dust.name = 'dust';
    scene.add(dust);
  }

  /* ---------------- 灯光 ---------------- */
  function addLights() {
    scene.add(new THREE.HemisphereLight(0x6aa8ff, 0x03060c, 0.55));

    var key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(9, 15, 13);
    scene.add(key);

    var rimCyan = new THREE.DirectionalLight(0x38d8ff, 1.7);
    rimCyan.position.set(-13, 7, -12);
    scene.add(rimCyan);

    var rimPink = new THREE.DirectionalLight(0xff3fc8, 0.95);
    rimPink.position.set(12, -5, -10);
    scene.add(rimPink);

    var fill = new THREE.PointLight(0x66ccff, 0.8, 45, 2);
    fill.position.set(0, 2, 12);
    scene.add(fill);

    var under = new THREE.PointLight(0x1e6cff, 0.55, 40, 2);
    under.position.set(-6, -8, 4);
    scene.add(under);
  }

  /* ---------------- 高亮准备 ---------------- */
  function prepareHighlight(p) {
    p.mats = [];
    p.edges = [];
    p.meshes.forEach(function (m) {
      var mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach(function (mat) {
        if (mat.__duoInit) return;
        mat.__duoInit = true;
        if (mat.emissive) {
          mat.userData.baseEmissive = mat.emissive.clone();
          mat.userData.baseIntensity = mat.emissiveIntensity || 0;
          p.mats.push(mat);
        }
      });

      if (!m.geometry || !m.geometry.attributes.position) return;
      try {
        var eg = new THREE.EdgesGeometry(m.geometry, 38);
        var em = new THREE.LineBasicMaterial({
          color: p.def.accent,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        var line = new THREE.LineSegments(eg, em);
        line.position.copy(m.position);
        line.rotation.copy(m.rotation);
        line.scale.copy(m.scale);
        line.renderOrder = 3;
        m.parent.add(line);
        p.edges.push(line);
      } catch (edgeErr) {
        console.warn('[DUO] edge skipped:', edgeErr);
      }
    });
  }

  /* ---------------- UI ---------------- */
  function buildUI() {
    ui.partsList = $('partsList');
    ui.info = $('infoPanel');
    ui.ipCat = $('ipCat');
    ui.ipName = $('ipName');
    ui.ipEn = $('ipEn');
    ui.ipSpecs = $('ipSpecs');
    ui.ipDesc = $('ipDesc');
    ui.tooltip = $('tooltip');
    ui.btnExplode = $('btnExplode');
    ui.btnFold = $('btnFold');
    ui.btnAuto = $('btnAuto');
    ui.btnReset = $('btnReset');
    ui.btnExport = $('btnExport');
    ui.slider = $('explodeSlider');
    ui.sliderVal = $('sliderVal');
    ui.hudFps = $('hudFps');
    ui.hudCount = $('hudCount');
    ui.hudState = $('hudState');
    ui.toast = $('toast');
    ui.modal = $('modal');
    ui.modalJson = $('modalJson');
    ui.partsPanel = $('partsPanel');

    // 部件清单
    var frag = document.createDocumentFragment();
    DUO.CATS.forEach(function (cat) {
      var list = PARTS.filter(function (p) { return p.cat === cat; });
      if (!list.length) return;
      var head = document.createElement('div');
      head.className = 'pl-cat';
      head.innerHTML = '<span>' + cat + '</span><i>' + list.length + '</i>';
      frag.appendChild(head);
      list.forEach(function (def) {
        var p = partsById[def.id];
        var btn = document.createElement('button');
        btn.className = 'pl-item';
        btn.setAttribute('data-id', def.id);
        btn.innerHTML =
          '<span class="pl-idx">' + ('0' + p.index).slice(-2) + '</span>' +
          '<span class="pl-dot" style="background:' + hexCss(def.accent) + '"></span>' +
          '<span class="pl-name">' + def.name + '</span>' +
          '<span class="pl-cat-tag">' + def.cat + '</span>';
        btn.addEventListener('click', function () { selectPart(def.id, true); });
        frag.appendChild(btn);
      });
    });
    ui.partsList.appendChild(frag);

    ui.hudCount.textContent = PARTS.length;
    updateUIControls();
  }

  function bindEvents() {
    ui.btnExplode.addEventListener('click', function () { toggleExplode(); });
    ui.btnFold.addEventListener('click', function () { toggleFold(); });
    ui.btnAuto.addEventListener('click', function () {
      if (S.demo) stopDemo(true); else runDemo();
    });
    ui.btnReset.addEventListener('click', function () { rig.reset(); toast('视角已重置'); });
    ui.btnExport.addEventListener('click', openExport);
    $('ipClose').addEventListener('click', function () { deselect(); });
    $('modalClose').addEventListener('click', closeExport);
    $('modalCopy').addEventListener('click', copyExport);
    $('modalDownload').addEventListener('click', downloadExport);
    ui.modal.addEventListener('click', function (e) {
      if (e.target === ui.modal) closeExport();
    });

    ui.slider.addEventListener('input', function (e) {
      var v = Number(e.target.value) / 100;
      if (S.targetFold > 0.5) setFold(false, true);
      S.progress = S.target = v;
      clearSelection();
      updateUIControls();
    });
    ui.slider.addEventListener('change', function () { ui.slider.blur(); });

    var toggle = $('partsToggle');
    if (toggle) toggle.addEventListener('click', function () {
      ui.partsPanel.classList.toggle('open');
    });

    canvas.addEventListener('pointermove', function (e) {
      pointerClient.x = e.clientX;
      pointerClient.y = e.clientY;
      if (rig.pointerCount === 0) updateHover(e.clientX, e.clientY);
    });
    canvas.addEventListener('pointerleave', function () {
      setHover(null);
      if (ui.tooltip) ui.tooltip.classList.add('hidden');
    });
    canvas.addEventListener('pointerdown', function () {
      if (ui.tooltip) ui.tooltip.classList.add('hidden');
    });

    window.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.repeat) return;
      if (!ui.modal.classList.contains('hidden')) {
        if (e.code === 'Escape') closeExport();
        return;
      }
      if (e.code === 'Space') { e.preventDefault(); toggleExplode(); }
      else if (e.code === 'KeyF') { toggleFold(); }
      else if (e.code === 'KeyR') { rig.reset(); toast('视角已重置'); }
      else if (e.code === 'KeyA') { if (S.demo) stopDemo(true); else runDemo(); }
      else if (e.code === 'KeyE') { openExport(); }
      else if (e.code === 'Escape') { deselect(); }
    });

    window.addEventListener('resize', onResize);
  }

  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    if (bloom) bloom.setSize();
  }

  /* ---------------- 显隐 / 信息 ---------------- */
  function showInfo(p) {
    ui.ipCat.textContent = p.def.cat;
    ui.ipCat.style.color = hexCss(p.def.accent);
    ui.ipCat.style.borderColor = hexCss(p.def.accent) + '66';
    ui.ipName.textContent = p.def.name;
    ui.ipEn.textContent = p.def.en.toUpperCase();
    ui.ipSpecs.textContent = p.def.specs;
    ui.ipDesc.textContent = p.def.desc;
    ui.info.style.setProperty('--accent', hexCss(p.def.accent));
    ui.info.classList.add('show');
  }
  function hideInfo() { ui.info.classList.remove('show'); }

  /* ---------------- 选择 / 悬停 ---------------- */
  function selectPart(id, focus, keepDemo) {
    var p = partsById[id];
    if (!p) return;
    if (S.demo && !keepDemo) stopDemo(false);
    if (S.fold > 0.02) setFold(false);

    if (S.selected === p) { deselect(); return; }
    if (S.selected) S.selected.popTarget = 0;
    S.selected = p;
    lastSelectAt = performance.now();
    p.popTarget = 1;

    var listBtn = ui.partsList.querySelector('[data-id="' + id + '"]');
    ui.partsList.querySelectorAll('.pl-item.active').forEach(function (el) { el.classList.remove('active'); });
    if (listBtn) {
      listBtn.classList.add('active');
      if (listBtn.scrollIntoView) listBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    showInfo(p);
    if (window.innerWidth < 900) ui.partsPanel.classList.remove('open');
    if (focus !== false) {
      phone.root.updateMatrixWorld(true);
      p.group.getWorldPosition(p.worldPos);
      rig.focusOn(p.worldPos, clamp(p.size * 2.1 + 5, 9, 23));
    }
    updateUIControls();
  }

  function deselect() {
    if (S.selected) S.selected.popTarget = 0;
    S.selected = null;
    ui.partsList.querySelectorAll('.pl-item.active').forEach(function (el) { el.classList.remove('active'); });
    hideInfo();
    updateUIControls();
  }
  function clearSelection() { deselect(); }

  function setHover(p) {
    if (S.hovered === p) return;
    S.hovered = p;
    if (!p) {
      canvas.style.cursor = 'grab';
      if (ui.tooltip) ui.tooltip.classList.add('hidden');
    } else {
      canvas.style.cursor = 'pointer';
      if (ui.tooltip) {
        ui.tooltip.innerHTML = '<b>' + p.def.name + '</b><span>' + p.def.en + '</span>';
        ui.tooltip.classList.remove('hidden');
      }
    }
  }

  function updateHover(x, y) {
    if (!phone) return;
    ndc.x = (x / window.innerWidth) * 2 - 1;
    ndc.y = -(y / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(phone.pickables, false);
    var p = hits.length ? partsById[hits[0].object.userData.partId] : null;
    setHover(p || null);
    if (p && ui.tooltip) {
      var tx = Math.min(x + 16, window.innerWidth - 220);
      var ty = Math.min(y + 18, window.innerHeight - 70);
      ui.tooltip.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
    }
  }

  function onCanvasClick(pos) {
    if (!phone) return;
    ndc.x = (pos.x / window.innerWidth) * 2 - 1;
    ndc.y = -(pos.y / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(phone.pickables, false);
    if (hits.length) {
      var id = hits[0].object.userData.partId;
      // 双击同一部件时保持选中,避免“双击=选中又取消”
      if (S.selected && S.selected.id === id && performance.now() - lastSelectAt < 360) return;
      selectPart(id, true);
    } else {
      deselect();
    }
  }

  function onUserInteract() {
    if (S.demo) stopDemo(true);
  }

  /* ---------------- 拆解 / 折叠 ---------------- */
  function setExplode(v) {
    S.target = v;
    if (v > 0.5) {
      setFold(false, true);
      rig.focusOn(new THREE.Vector3(0, 0, 0), 37);
    } else {
      rig.focusOn(new THREE.Vector3(0, 0, 0), 31);
    }
    updateUIControls();
  }
  function toggleExplode() {
    if (S.demo) stopDemo(false);
    var next = S.target > 0.5 ? 0 : 1;
    setExplode(next);
    if (next > 0.5) deselect();
  }

  function setFold(v, silent) {
    S.targetFold = v ? 1 : 0;
    if (S.targetFold) {
      S.target = 0;
      clearSelection();
      rig.focusOn(new THREE.Vector3(0, 0, 0), 27);
    } else {
      rig.focusOn(new THREE.Vector3(0, 0, 0), 31);
    }
    if (!silent) updateUIControls();
  }
  function toggleFold() {
    if (S.demo) stopDemo(false);
    var fold = S.targetFold < 0.5;
    if (fold && S.progress > 0.02) setExplode(0);
    setFold(fold);
    toast(fold ? '折叠演示 · 点击展开' : '展开为 7.6″ 内屏');
  }

  function updateUIControls() {
    ui.btnExplode.classList.toggle('active', S.target > 0.5);
    ui.btnExplode.querySelector('.btn-label').textContent = S.target > 0.5 ? '合拢组装' : '整体拆解';
    ui.btnFold.classList.toggle('active', S.targetFold > 0.5);
    ui.btnFold.querySelector('.btn-label').textContent = S.targetFold > 0.5 ? '展开机身' : '折叠演示';
    ui.btnAuto.classList.toggle('active', S.demo);
    if (ui.hudState) ui.hudState.textContent = S.targetFold > 0.5 ? 'FOLDED' : (S.target > 0.5 ? 'EXPLODED' : 'ASSEMBLED');
  }

  /* ---------------- 自动演示 ---------------- */
  function stopDemo(notify) {
    demoToken++;
    S.demo = false;
    demoTimer = null;
    rig.autoRotate = false;
    updateUIControls();
    if (notify) toast('演示已停止');
  }
  function wait(ms) {
    return new Promise(function (resolve) {
      demoTimer = setTimeout(resolve, ms);
    });
  }
  async function runDemo() {
    if (S.demo) return;
    var token = ++demoToken;
    S.demo = true;
    updateUIControls();
    clearSelection();

    rig.reset(true);
    S.progress = 0; S.target = 0;
    setFold(false, true);
    await wait(700);
    if (token !== demoToken) return;

    setExplode(1);
    rig.setAngles(0.44, 1.12);
    rig.goal.radius = 36;
    await wait(1800);
    if (token !== demoToken) return;

    rig.autoRotate = true;
    rig.autoRotateSpeed = 0.085;

    var showcase = ['camera', 'batteryL', 'hinge', 'a20', 'cover', 'innerL'];
    for (var i = 0; i < showcase.length; i++) {
      if (token !== demoToken) return;
      selectPart(showcase[i], true, true);
      if (S.selected) S.selected.popTarget = 0.55;
      await wait(2500);
    }
    if (token !== demoToken) return;

    rig.autoRotate = false;
    deselect();
    rig.setAngles(0.62, 1.22);
    rig.focusOn(new THREE.Vector3(0, 0, 0), 31);
    S.target = 0;
    await wait(1600);
    if (token !== demoToken) return;

    setFold(true);
    await wait(2200);
    if (token !== demoToken) return;

    setFold(false);
    rig.reset();
    S.demo = false;
    updateUIControls();
    toast('演示完成 · 可自由探索');
  }

  /* ---------------- 导出拆解清单 ---------------- */
  function buildReport() {
    return {
      app: 'iPhone Duo · Teardown Lab',
      model: 'DeepSeek-Flash',
      prompt: 'PROMPT.md(统一提示词)',
      generatedAt: new Date().toISOString(),
      device: {
        name: 'iPhone Duo',
        innerDisplay: '7.6″ LTPO 1–120Hz / 3000 nits',
        coverDisplay: '6.2″ LTPO 1–120Hz / 3000 nits',
        frame: 'Grade 5 Titanium',
        chip: 'A20 Pro + vapor chamber',
        modem: 'Apple C2 / eSIM-only',
        camera: '48MP Dual Fusion (main + ultra-wide)',
        battery: '2962 mAh + 1921 mAh = 4883 mAh'
      },
      partCount: PARTS.length,
      parts: PARTS.map(function (d) {
        var p = partsById[d.id];
        return {
          id: d.id, index: p ? p.index : 0, name: d.name, en: d.en, category: d.cat,
          specs: d.specs, explodeDistance: d.dist,
          explodeDirection: d.dir, description: d.desc
        };
      })
    };
  }
  function openExport() {
    if (S.demo) stopDemo(false);
    var report = buildReport();
    ui.modalJson.textContent = JSON.stringify(report, null, 2);
    ui.modal.classList.remove('hidden');
    ui.modal.dataset.json = JSON.stringify(report);
  }
  function closeExport() { ui.modal.classList.add('hidden'); }
  function copyExport() {
    var text = ui.modal.dataset.json || '';
    function ok() { toast('拆解清单已复制到剪贴板'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(fallback);
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast('复制失败,请手动选择'); }
      document.body.removeChild(ta);
    }
  }
  function downloadExport() {
    var text = ui.modal.dataset.json || '';
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'iphone-duo-teardown-deepseek-flash.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast('清单已下载');
  }

  /* ---------------- 提示 ---------------- */
  var toastTimer = null;
  function toast(msg) {
    if (!ui.toast) return;
    ui.toast.textContent = msg;
    ui.toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { ui.toast.classList.remove('show'); }, 2200);
  }

  /* ---------------- 主循环 ---------------- */
  function animate(now) {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    time += dt;

    // 折叠
    if (Math.abs(S.targetFold - S.fold) > 0.0005) {
      S.fold += (S.targetFold - S.fold) * (1 - Math.exp(-dt * 5.5));
    } else {
      S.fold = S.targetFold;
    }
    phone.foldPivot.rotation.y = -S.fold * Math.PI * 0.985;
    phone.foldPivot.position.z = S.fold * 0.44;
    phone.root.position.x = (D.W / 2) * S.fold;
    phone.root.position.z = -S.fold * 0.32;

    // 拆解进度
    if (Math.abs(S.target - S.progress) > 0.0005) {
      S.progress += (S.target - S.progress) * (1 - Math.exp(-dt * 5.2));
    } else {
      S.progress = S.target;
    }

    var spread = easeInOut(S.progress) * 1.35;
    phone.left.position.x = phone.leftHome.x - spread;
    phone.right.position.x = phone.rightHome.x + spread;

    var i, p;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      var t = clamp((S.progress - p.start) / p.dur, 0, 1);
      var e = easeInOut(t);
      p.pop += (p.popTarget - p.pop) * (1 - Math.exp(-dt * 9));
      var off = p.dist * e + p.pop * 0.95;
      p.group.position.copy(p.home).addScaledVector(p.dir, off);
      p.group.getWorldPosition(p.worldPos);
    }

    rig.update(dt);

    // 高亮 + 描边
    var moving = Math.abs(S.target - S.progress) > 0.012;
    var baseGlow = moving ? 0.34 : 0;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      var targetGlow = (p === S.selected) ? 1 : (p === S.hovered ? 0.42 : 0);
      if (baseGlow > targetGlow) targetGlow = baseGlow;
      p.glow += (targetGlow - p.glow) * (1 - Math.exp(-dt * 9));
      var g = p.glow * (0.6 + 0.4 * Math.sin(time * 4.1 + p.order * 5));
      for (var m = 0; m < p.mats.length; m++) {
        var mat = p.mats[m];
        mat.emissive.copy(p.accent);
        mat.emissiveIntensity = (mat.userData.baseIntensity || 0) + g * 1.55;
      }
      for (var e2 = 0; e2 < p.edges.length; e2++) {
        p.edges[e2].material.opacity = g * 0.85;
        p.edges[e2].visible = g > 0.012;
      }
    }

    if (S.selected) {
      var sp = S.selected.worldPos;
      ui.selLight.position.set(sp.x, sp.y, sp.z + 1.2);
      ui.selLight.color.copy(S.selected.accent);
      ui.selLight.intensity += ((S.selected.glow * 2.6 + 0.2) - ui.selLight.intensity) * (1 - Math.exp(-dt * 7));
    } else {
      ui.selLight.intensity += (0 - ui.selLight.intensity) * (1 - Math.exp(-dt * 7));
    }

    // 星尘缓慢旋转
    var dust = scene.getObjectByName('dust');
    if (dust) { dust.rotation.y += dt * 0.012; dust.rotation.x = Math.sin(time * 0.1) * 0.03; }

    // UI 同步
    if (document.activeElement !== ui.slider) {
      ui.slider.value = Math.round(S.progress * 100);
    }
    ui.sliderVal.textContent = Math.round(S.progress * 100) + '%';

    // 帧率
    frameCount++;
    fpsTime += dt;
    if (fpsTime > 0.5) {
      ui.hudFps.textContent = Math.min(120, Math.round(frameCount / fpsTime));
      frameCount = 0; fpsTime = 0;
    }

    if (bloom) bloom.render(time);
    else renderer.render(scene, camera);
  }

  DUO.App = { init: init, _state: S, _parts: parts };
  try {
    init();
  } catch (err) {
    console.error(err);
    bootFail(err && err.message ? err.message : String(err));
  }
})();