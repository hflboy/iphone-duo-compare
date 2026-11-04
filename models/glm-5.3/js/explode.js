/* ============================================================
 * iPhone Duo · 交互式 3D 拆解实验室
 * explode.js —— 拆解 / 组装编排系统
 *   - 全局拆解进度(0~1),按部件分层错峰展开
 *   - 部件单击"弹出/收回"(extra 位移)
 *   - 运动中部件自发光脉冲 + 描边高亮(配合 Bloom 泛光)
 * ============================================================ */
(function () {
  'use strict';

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function Explode() {
    this.parts = [];
    this.progress = 0;      // 当前全局进度
    this.target = 0;        // 目标全局进度
    this.time = 0;
    this.onChange = null;   // 进度变化回调(同步 UI)
  }

  /* 注册全部部件,并按顺序生成错峰时间窗 */
  Explode.prototype.registerAll = function (parts) {
    this.parts = parts;
    var n = parts.length || 1;
    for (var i = 0; i < n; i++) {
      parts[i].stagger = (i / n) * 0.42; // 错峰起点
      parts[i].window = 0.58;            // 每个部件的运动窗口宽度
    }
  };

  /* 某部件在全局进度 P 下的缓动值 0~1 */
  Explode.prototype.partEase = function (part, P) {
    var t = clamp01((P - part.stagger) / part.window);
    return easeInOutCubic(t);
  };

  /* 设置目标进度;snap=true 时立刻贴合(用于滑杆拖动) */
  Explode.prototype.setTarget = function (v, opts) {
    this.target = clamp01(v);
    if (opts && opts.snap) this.progress = this.target;
    if (this.onChange) this.onChange(this.target);
  };

  Explode.prototype.isBusy = function () {
    return Math.abs(this.target - this.progress) > 0.001;
  };

  Explode.prototype.update = function (dt) {
    this.time += dt;

    /* 全局进度平滑逼近目标 */
    if (Math.abs(this.target - this.progress) > 0.0005) {
      this.progress += (this.target - this.progress) * Math.min(1, dt * 2.6);
    } else {
      this.progress = this.target;
    }

    for (var i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];

      /* 单部件"弹出"补间 */
      p.extra += (p.extraTarget - p.extra) * Math.min(1, dt * 5);

      /* 位置 = 原位 + 方向 × (全局展开量 + 单独弹出量) */
      var e = this.partEase(p, this.progress);
      var move = e * p.dist + p.extra * 0.45 * p.dist;
      p.group.position.copy(p.home).addScaledVector(p.dir, move);

      /* 发光:运动脉冲 + 选中呼吸 + 悬停微亮 */
      var motion1 = Math.sin(clamp01(e) * Math.PI);
      var motion2 = Math.sin(clamp01(p.extra) * Math.PI);
      var sel = p.selected ? 0.5 + 0.18 * Math.sin(this.time * 4.2) : 0;
      var hov = p.hovered ? 0.2 : 0;
      var glow = motion1 * 1.05 + motion2 * 1.25 + sel + hov;

      var mats = p.mats;
      for (var j = 0; j < mats.length; j++) {
        var m = mats[j];
        var g = Math.min(m.cap, glow);
        if (g > 0.005) {
          m.mat.emissive.copy(m.baseColor).lerp(p.accentColor, Math.min(1, g * 1.4));
          m.mat.emissiveIntensity = m.baseEI + g;
        } else {
          m.mat.emissive.copy(m.baseColor);
          m.mat.emissiveIntensity = m.baseEI;
        }
      }

      var eo = Math.min(0.85, glow * 0.8 + (p.selected ? 0.3 : 0));
      p.edgesMat.opacity = eo;
      p.edgesMat.visible = eo > 0.02;
    }
  };

  window.App = window.App || {};
  window.App.Explode = Explode;
})();
