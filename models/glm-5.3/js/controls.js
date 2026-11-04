/* ============================================================
 * iPhone Duo · 交互式 3D 拆解实验室
 * controls.js —— 自研轨道控制器(零依赖)
 *   鼠标:左键旋转 / 滚轮缩放 / 右键(或中键)平移 / 双击聚焦
 *   触摸:单指旋转 / 双指捏合缩放 + 双指拖动平移
 *   带阻尼惯性、视角飞行(flyTo)、自动旋转
 * ============================================================ */
(function () {
  'use strict';

  var PI = Math.PI;
  var V3 = function (x, y, z) { return new THREE.Vector3(x || 0, y || 0, z || 0); };

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function OrbitGestures(camera, dom) {
    this.camera = camera;
    this.dom = dom;

    this.target = V3(0, 0, 0);
    this.spherical = new THREE.Spherical(30, 1.22, 0.62);
    this.targetRadius = 30;

    this.minRadius = 7;
    this.maxRadius = 85;
    this.minPhi = 0.14;
    this.maxPhi = PI - 0.14;

    this.rotateSpeed = 0.9;
    this.autoRotate = false;
    this.autoRotateSpeed = 0.38;      // rad/s
    this.damping = 0.002;             // 阻尼底数(按 dt 指数衰减)

    this.sphDelta = new THREE.Vector2(0, 0); // x: theta, y: phi
    this.panOffset = V3(0, 0, 0);

    this.pointers = new Map();        // pointerId -> {x,y}
    this.mode = 'none';               // rotate | pan | pinch
    this.lastPinchDist = 0;
    this.lastCenter = { x: 0, y: 0 };
    this.downPos = null;
    this.downTime = 0;
    this.moved = false;
    this.fly = null;

    this.onInteract = null;           // 用户开始交互(打断自动演示等)
    this.onClick = null;              // (ndc, event)
    this.onDoubleClick = null;        // (ndc, event)

    this._bind();
  }

  OrbitGestures.prototype._bind = function () {
    var self = this, dom = this.dom;
    dom.style.touchAction = 'none';

    dom.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    dom.addEventListener('pointerdown', function (e) { self._down(e); });
    dom.addEventListener('pointermove', function (e) { self._move(e); });
    dom.addEventListener('pointerup', function (e) { self._up(e); });
    dom.addEventListener('pointercancel', function (e) { self._up(e); });

    dom.addEventListener('wheel', function (e) {
      e.preventDefault();
      self._break();
      var d = e.deltaY;
      if (e.deltaMode === 1) d *= 33; else if (e.deltaMode === 2) d *= 100;
      d = clamp(d, -240, 240);
      self.targetRadius = self._clampRadius(self.targetRadius * Math.pow(1.0016, d));
    }, { passive: false });

    dom.addEventListener('dblclick', function (e) {
      if (self.onDoubleClick) self.onDoubleClick(self.getNDC(e), e);
    });
  };

  OrbitGestures.prototype.getNDC = function (e) {
    var r = this.dom.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1
    );
  };

  OrbitGestures.prototype._clampRadius = function (r) {
    return clamp(r, this.minRadius, this.maxRadius);
  };

  OrbitGestures.prototype._break = function () {
    this.fly = null;
    if (this.onInteract) this.onInteract();
  };

  OrbitGestures.prototype._down = function (e) {
    try { this.dom.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this._break();

    if (this.pointers.size === 1) {
      this.mode = (e.button === 2 || e.button === 1) ? 'pan' : 'rotate';
      this.downPos = { x: e.clientX, y: e.clientY };
      this.downTime = performance.now();
      this.moved = false;
    } else if (this.pointers.size === 2) {
      this.mode = 'pinch';
      var arr = this._pointerArray();
      this.lastPinchDist = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      this.lastCenter = { x: (arr[0].x + arr[1].x) / 2, y: (arr[0].y + arr[1].y) / 2 };
      this.moved = true; // 双指不触发点击
    }
  };

  OrbitGestures.prototype._pointerArray = function () {
    var arr = [];
    this.pointers.forEach(function (v) { arr.push(v); });
    return arr;
  };

  OrbitGestures.prototype._move = function (e) {
    if (!this.pointers.has(e.pointerId)) return; // 无按键悬停,交由 hover 逻辑处理

    var prev = this.pointers.get(e.pointerId);
    var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.downPos && Math.hypot(e.clientX - this.downPos.x, e.clientY - this.downPos.y) > 6) {
      this.moved = true;
    }

    if (this.mode === 'rotate' && this.pointers.size === 1) {
      this.sphDelta.x -= 2 * PI * dx / this.dom.clientHeight * this.rotateSpeed;
      this.sphDelta.y -= 2 * PI * dy / this.dom.clientHeight * this.rotateSpeed;
    } else if (this.mode === 'pan') {
      this._pan(dx, dy);
    } else if (this.mode === 'pinch' && this.pointers.size === 2) {
      var arr = this._pointerArray();
      var dist = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      var cx = (arr[0].x + arr[1].x) / 2, cy = (arr[0].y + arr[1].y) / 2;
      if (this.lastPinchDist > 0 && dist > 0) {
        this.targetRadius = this._clampRadius(this.targetRadius * this.lastPinchDist / dist);
      }
      this._pan(cx - this.lastCenter.x, cy - this.lastCenter.y);
      this.lastPinchDist = dist;
      this.lastCenter = { x: cx, y: cy };
    }
  };

  OrbitGestures.prototype._up = function (e) {
    this.pointers.delete(e.pointerId);
    try { this.dom.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }

    if (this.pointers.size === 0) {
      var dt = performance.now() - this.downTime;
      if (this.mode === 'rotate' && !this.moved && dt < 500 && this.onClick) {
        this.onClick(this.getNDC(e), e);
      }
      this.mode = 'none';
      this.downPos = null;
    } else if (this.pointers.size === 1) {
      // 双指捏合结束,剩余单指继续旋转;标记 moved 防止误触发点击
      this.mode = 'rotate';
      var arr = this._pointerArray();
      this.downPos = { x: arr[0].x, y: arr[0].y };
      this.downTime = performance.now();
      this.moved = true;
    }
  };

  OrbitGestures.prototype._pan = function (dx, dy) {
    var dist = this.camera.position.distanceTo(this.target);
    var unit = (2 * Math.tan(this.camera.fov * PI / 360) * dist) / Math.max(1, this.dom.clientHeight);
    var xAxis = V3(0, 0, 0).setFromMatrixColumn(this.camera.matrix, 0);
    var yAxis = V3(0, 0, 0).setFromMatrixColumn(this.camera.matrix, 1);
    this.panOffset.addScaledVector(xAxis, -dx * unit);
    this.panOffset.addScaledVector(yAxis, dy * unit);
  };

  OrbitGestures.prototype.flyTo = function (point, radius, duration) {
    duration = duration || 1.1;
    this.fly = {
      t: 0, dur: duration,
      fromTarget: this.target.clone(), toTarget: point.clone(),
      fromR: this.spherical.radius, toR: this._clampRadius(radius)
    };
  };

  OrbitGestures.prototype.resetView = function () {
    this.flyTo(V3(0, 0, 0), 30, 1.2);
  };

  OrbitGestures.prototype.update = function (dt) {
    if (this.fly) {
      var f = this.fly;
      f.t += dt;
      var k = easeInOutCubic(clamp(f.t / f.dur, 0, 1));
      this.target.lerpVectors(f.fromTarget, f.toTarget, k);
      var r = f.fromR + (f.toR - f.fromR) * k;
      this.spherical.radius = r;
      this.targetRadius = r;
      if (f.t >= f.dur) this.fly = null;
    } else {
      if (this.autoRotate) this.sphDelta.x -= this.autoRotateSpeed * dt;

      this.spherical.theta += this.sphDelta.x;
      this.spherical.phi = clamp(this.spherical.phi + this.sphDelta.y, this.minPhi, this.maxPhi);
      this.spherical.makeSafe();

      this.spherical.radius += (this.targetRadius - this.spherical.radius) * Math.min(1, dt * 8);
      this.target.add(this.panOffset);

      var decay = Math.pow(this.damping, dt);
      this.sphDelta.multiplyScalar(decay);
      this.panOffset.multiplyScalar(decay);
    }

    this.camera.position.setFromSpherical(this.spherical).add(this.target);
    this.camera.lookAt(this.target);
  };

  window.App = window.App || {};
  window.App.OrbitGestures = OrbitGestures;
})();
