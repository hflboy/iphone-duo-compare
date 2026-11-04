/* ============================================================
 * iPhone Duo · 交互式 3D 拆解实验室
 * bloom.js —— 自研轻量泛光后处理管线(免外部后期库)
 *
 * 流程:场景 → 亮部提取 → 半分辨率高斯模糊(H/V × 2) →
 *      叠加泛光 + 伽马校正输出到屏幕
 * 仅使用 Three.js 核心 API(WebGLRenderTarget / ShaderMaterial)。
 * ============================================================ */
(function () {
  'use strict';

  var App = window.App = window.App || {};

  var VERT = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = vec4(position.xy, 0.0, 1.0);',
    '}'
  ].join('\n');

  /* 亮部提取:超过阈值的能量平滑保留 */
  var BRIGHT_FRAG = [
    'uniform sampler2D tex;',
    'uniform float threshold;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec3 c = texture2D(tex, vUv).rgb;',
    '  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));',
    '  float k = smoothstep(threshold, threshold + 0.35, luma);',
    '  gl_FragColor = vec4(c * k, 1.0);',
    '}'
  ].join('\n');

  /* 5 抽头高斯(两轮迭代扩展半径) */
  var BLUR_FRAG = [
    'uniform sampler2D tex;',
    'uniform vec2 dir;',
    'uniform vec2 texel;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec2 o = dir * texel;',
    '  vec3 s = texture2D(tex, vUv).rgb * 0.227027;',
    '  s += (texture2D(tex, vUv + o * 1.3846).rgb + texture2D(tex, vUv - o * 1.3846).rgb) * 0.3162162;',
    '  s += (texture2D(tex, vUv + o * 3.2308).rgb + texture2D(tex, vUv - o * 3.2308).rgb) * 0.0702703;',
    '  gl_FragColor = vec4(s, 1.0);',
    '}'
  ].join('\n');

  /* 合成 + 伽马校正 */
  var COMPOSITE_FRAG = [
    'uniform sampler2D tex;',
    'uniform sampler2D bloom;',
    'uniform float strength;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec3 c = texture2D(tex, vUv).rgb;',
    '  vec3 b = texture2D(bloom, vUv).rgb;',
    '  c += b * strength;',
    '  c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  function makeRT(w, h) {
    return new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false
    });
  }

  function PostFX(renderer) {
    this.renderer = renderer;
    this.strength = 0.9;
    this.threshold = 0.72;

    this.fsScene = new THREE.Scene();
    this.fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial());
    this.quad.frustumCulled = false;
    this.fsScene.add(this.quad);

    this.rtScene = makeRT(2, 2);
    this.rtA = makeRT(2, 2);
    this.rtB = makeRT(2, 2);

    this.brightMat = new THREE.ShaderMaterial({
      uniforms: { tex: { value: null }, threshold: { value: this.threshold } },
      vertexShader: VERT, fragmentShader: BRIGHT_FRAG,
      depthTest: false, depthWrite: false
    });
    this.blurMat = new THREE.ShaderMaterial({
      uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2(1, 0) }, texel: { value: new THREE.Vector2() } },
      vertexShader: VERT, fragmentShader: BLUR_FRAG,
      depthTest: false, depthWrite: false
    });
    this.compositeMat = new THREE.ShaderMaterial({
      uniforms: { tex: { value: null }, bloom: { value: null }, strength: { value: this.strength } },
      vertexShader: VERT, fragmentShader: COMPOSITE_FRAG,
      depthTest: false, depthWrite: false
    });
  }

  PostFX.prototype.setSize = function (w, h, dpr) {
    dpr = dpr || 1;
    var tw = Math.max(2, Math.floor(w * dpr));
    var th = Math.max(2, Math.floor(h * dpr));
    this.rtScene.setSize(tw, th);
    var bw = Math.max(2, Math.floor(tw / 2));
    var bh = Math.max(2, Math.floor(th / 2));
    this.rtA.setSize(bw, bh);
    this.rtB.setSize(bw, bh);
  };

  PostFX.prototype._blit = function (mat, target) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.fsScene, this.fsCam);
  };

  PostFX.prototype.render = function (scene, camera) {
    var r = this.renderer;

    /* 1. 场景 → rtScene(材质内已做 ACES 色调映射) */
    r.setRenderTarget(this.rtScene);
    r.render(scene, camera);

    /* 2. 亮部提取 → rtA */
    this.brightMat.uniforms.tex.value = this.rtScene.texture;
    this._blit(this.brightMat, this.rtA);

    /* 3. 高斯模糊 H/V 交替 ×2 */
    var tw = 1 / this.rtA.width, th = 1 / this.rtA.height;
    for (var i = 0; i < 2; i++) {
      this.blurMat.uniforms.tex.value = this.rtA.texture;
      this.blurMat.uniforms.dir.value.set(1, 0);
      this.blurMat.uniforms.texel.value.set(tw, th);
      this._blit(this.blurMat, this.rtB);

      this.blurMat.uniforms.tex.value = this.rtB.texture;
      this.blurMat.uniforms.dir.value.set(0, 1);
      this._blit(this.blurMat, this.rtA);
    }

    /* 4. 合成 + 伽马 → 屏幕 */
    this.compositeMat.uniforms.tex.value = this.rtScene.texture;
    this.compositeMat.uniforms.bloom.value = this.rtA.texture;
    this.compositeMat.uniforms.strength.value = this.strength;
    this._blit(this.compositeMat, null);
  };

  App.PostFX = PostFX;
})();
