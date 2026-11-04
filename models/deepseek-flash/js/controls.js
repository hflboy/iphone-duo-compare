/* ============================================================
 * iPhone Duo · Teardown Lab
 * controls.js —— 自研轨道控制器
 * 鼠标:左键旋转 / 滚轮缩放 / 右键平移
 * 触摸:单指旋转 / 双指捏合缩放 + 平移
 * 特性:指数阻尼、点击检测、视角聚焦飞行、自动旋转
 * ============================================================ */
(function () {
  'use strict';

  function OrbitRig(camera, dom) {
    this.camera = camera;
    this.dom = dom;

    this.target = new THREE.Vector3(0, 0, 0);
    this.goalTarget = new THREE.Vector3(0, 0, 0);
    this.sph = { radius: 31, theta: 0.62, phi: 1.22 };
    this.goal = { radius: 31, theta: 0.62, phi: 1.22 };

    this.minRadius = 8;
    this.maxRadius = 68;
    this.autoRotate = false;
    this.autoRotateSpeed = 0.12;

    this.onClick = null;
    this.onInteract = null;

    this.pointers = {};
    this.pointerCount = 0;
    this._mode = null;
    this._startX = 0;
    this._startY = 0;
    this._startTime = 0;
    this._moved = 0;
    this._pinchDist = 0;
    this._pinchCenter = { x: 0, y: 0 };

    this._bind();
    this.update(0.016);
  }

  OrbitRig.prototype._bind = function () {
    var self = this;

    this._onDown = function (e) {
      if (e.button !== undefined && e.button !== 0 && e.button !== 1 && e.button !== 2) return;
      self.dom.setPointerCapture && self.dom.setPointerCapture(e.pointerId);
      self.pointers[e.pointerId] = { x: e.clientX, y: e.clientY, button: e.button };
      self.pointerCount++;
      if (self.pointerCount === 1) {
        self._startX = e.clientX;
        self._startY = e.clientY;
        self._startTime = performance.now();
        self._moved = 0;
        self._mode = (e.button === 2 || e.button === 1) ? 'pan' : 'rotate';
        self.dom.classList.add('is-grabbing');
      } else {
        self._mode = 'pinch';
        self._pinchDist = 0;
        self._pinchCenter = { x: 0, y: 0 };
      }
      if (self.onInteract) self.onInteract(e);
      e.preventDefault();
    };

    this._onMove = function (e) {
      var p = self.pointers[e.pointerId];
      if (!p) return;

      var dx = e.clientX - p.x;
      var dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      self._moved += Math.abs(dx) + Math.abs(dy);

      if (self.pointerCount >= 2) {
        var ids = Object.keys(self.pointers);
        var a = self.pointers[ids[0]], b = self.pointers[ids[1]];
        var dist = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
        var cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        if (self._pinchDist > 0) {
          var ratio = self._pinchDist / Math.max(1, dist);
          self.goal.radius = THREE.MathUtils.clamp(self.goal.radius * ratio, self.minRadius, self.maxRadius);
          self._pan(cx - self._pinchCenter.x, cy - self._pinchCenter.y);
        }
        self._pinchDist = dist;
        self._pinchCenter.x = cx; self._pinchCenter.y = cy;
        return;
      }

      if (self._mode === 'rotate') {
        self.goal.theta -= dx * 0.0052;
        self.goal.phi = THREE.MathUtils.clamp(self.goal.phi - dy * 0.0052, 0.14, Math.PI - 0.14);
      } else if (self._mode === 'pan') {
        self._pan(dx, dy);
      }
    };

    this._onUp = function (e) {
      if (!self.pointers[e.pointerId]) return;
      delete self.pointers[e.pointerId];
      self.pointerCount = Math.max(0, self.pointerCount - 1);

      var dt = performance.now() - self._startTime;
      if (self.pointerCount === 0) {
        self.dom.classList.remove('is-grabbing');
        if (self._mode !== 'pinch' && self._moved < 7 && dt < 500 && self.onClick) {
          self.onClick({ x: e.clientX, y: e.clientY });
        }
        self._mode = null;
      } else {
        // 从双指回到单指,重置基准避免跳变
        var rest = Object.keys(self.pointers)[0];
        if (rest !== undefined) {
          self.pointers[rest].x = self.pointers[rest].x;
          self._mode = 'rotate';
          self._pinchDist = 0;
        }
      }
      try { self.dom.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
    };

    this._onWheel = function (e) {
      e.preventDefault();
      self.goal.radius = THREE.MathUtils.clamp(
        self.goal.radius * Math.exp(e.deltaY * 0.0011), self.minRadius, self.maxRadius
      );
      if (self.onInteract) self.onInteract(e);
    };

    this._onContext = function (e) { e.preventDefault(); };

    this.dom.addEventListener('pointerdown', this._onDown);
    this.dom.addEventListener('pointermove', this._onMove);
    this.dom.addEventListener('pointerup', this._onUp);
    this.dom.addEventListener('pointercancel', this._onUp);
    this.dom.addEventListener('wheel', this._onWheel, { passive: false });
    this.dom.addEventListener('contextmenu', this._onContext);
  };

  OrbitRig.prototype._pan = function (dx, dy) {
    var r = this.sph.radius;
    var right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    var up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
    this.goalTarget.addScaledVector(right, -dx * 0.0017 * r);
    this.goalTarget.addScaledVector(up, dy * 0.0017 * r);
    this.goalTarget.x = THREE.MathUtils.clamp(this.goalTarget.x, -16, 16);
    this.goalTarget.y = THREE.MathUtils.clamp(this.goalTarget.y, -14, 14);
    this.goalTarget.z = THREE.MathUtils.clamp(this.goalTarget.z, -14, 14);
  };

  OrbitRig.prototype.focusOn = function (point, radius) {
    this.goalTarget.copy(point);
    if (radius) this.goal.radius = THREE.MathUtils.clamp(radius, this.minRadius, this.maxRadius);
  };

  OrbitRig.prototype.setAngles = function (theta, phi) {
    this.goal.theta = theta;
    this.goal.phi = THREE.MathUtils.clamp(phi, 0.14, Math.PI - 0.14);
  };

  OrbitRig.prototype.reset = function (instant) {
    this.goalTarget.set(0, 0, 0);
    this.goal.radius = 31;
    this.goal.theta = 0.62;
    this.goal.phi = 1.22;
    this.autoRotate = false;
    if (instant) {
      this.target.copy(this.goalTarget);
      this.sph.radius = this.goal.radius;
      this.sph.theta = this.goal.theta;
      this.sph.phi = this.goal.phi;
      this.update(0.016);
    }
  };

  OrbitRig.prototype.update = function (dt) {
    if (this.autoRotate) this.goal.theta += dt * this.autoRotateSpeed;

    var k = 1 - Math.exp(-dt * 6.5);
    this.sph.theta += (this.goal.theta - this.sph.theta) * k;
    this.sph.phi += (this.goal.phi - this.sph.phi) * k;
    this.sph.radius += (this.goal.radius - this.sph.radius) * k;
    this.target.lerp(this.goalTarget, k);

    var sp = Math.sin(this.sph.phi);
    this.camera.position.set(
      this.target.x + this.sph.radius * sp * Math.sin(this.sph.theta),
      this.target.y + this.sph.radius * Math.cos(this.sph.phi),
      this.target.z + this.sph.radius * sp * Math.cos(this.sph.theta)
    );
    this.camera.lookAt(this.target);
    this.camera.updateMatrix();
  };

  DUO.OrbitRig = OrbitRig;
})();