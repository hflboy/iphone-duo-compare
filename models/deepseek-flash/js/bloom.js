/* ============================================================
 * iPhone Duo · Teardown Lab
 * bloom.js —— 轻量级后期:亮部提取 → 两轮分离高斯模糊 → 合成
 * 不依赖任何 examples/ 附加脚本,便于双击 index.html 运行
 * ============================================================ */
(function () {
  'use strict';

  var VERT = [
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = uv;',
    '  gl_Position = vec4(position.xy, 0.0, 1.0);',
    '}'
  ].join('\n');

  var BRIGHT_FRAG = [
    'uniform sampler2D tDiffuse;',
    'uniform float threshold;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec3 c = texture2D(tDiffuse, vUv).rgb;',
    '  float l = max(c.r, max(c.g, c.b));',
    '  float f = smoothstep(threshold, threshold + 0.32, l);',
    '  gl_FragColor = vec4(c * f, 1.0);',
    '}'
  ].join('\n');

  var BLUR_FRAG = [
    'uniform sampler2D tDiffuse;',
    'uniform vec2 direction;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec3 c = texture2D(tDiffuse, vUv).rgb * 0.227027;',
    '  c += (texture2D(tDiffuse, vUv + direction * 1.384615).rgb + texture2D(tDiffuse, vUv - direction * 1.384615).rgb) * 0.316216;',
    '  c += (texture2D(tDiffuse, vUv + direction * 3.230769).rgb + texture2D(tDiffuse, vUv - direction * 3.230769).rgb) * 0.070270;',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  /* 合成拆成两趟(同一趟里同时采两个渲染目标,底色会被吃掉):
   *   1) COPY  场景 → 屏幕;
   *   2) GLOW  泛光 → 屏幕,叠加混合。
   * 屏幕暗角/扫描线交给页面上的 .vignette / .scanline 两个 CSS 覆盖层。
   * 注意:场景渲染进渲染目标时 three 不做 outputEncoding(见 WebGLPrograms:
   * 有 renderTarget 时取 target.texture.encoding = Linear),所以这里直接按
   * 线性值输出,和建模时调的明暗一致;自己再套一次 sRGB 会让整机发白。 */
  var COPY_FRAG = [
    'uniform sampler2D tScene;',
    'varying vec2 vUv;',
    'void main(){',
    '  gl_FragColor = vec4(texture2D(tScene, vUv).rgb, 1.0);',
    '}'
  ].join('\n');

  var GLOW_FRAG = [
    'uniform sampler2D tBloom;',
    'uniform float strength;',
    'varying vec2 vUv;',
    'void main(){',
    '  gl_FragColor = vec4(texture2D(tBloom, vUv).rgb * strength, 1.0);',
    '}'
  ].join('\n');

  function makeRT(w, h) {
    return new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
      depthBuffer: true
    });
  }

  DUO.createBloom = function (renderer, scene, camera) {
    var size = renderer.getDrawingBufferSize(new THREE.Vector2());
    var W = Math.max(2, size.x), H = Math.max(2, size.y);

    var rtScene = makeRT(W, H);
    var rtA = makeRT(W >> 1, H >> 1);
    var rtB = makeRT(W >> 1, H >> 1);

    var quadScene = new THREE.Scene();
    var quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quad.frustumCulled = false;
    quadScene.add(quad);

    var brightMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        threshold: { value: 0.58 }
      },
      vertexShader: VERT,
      fragmentShader: BRIGHT_FRAG,
      depthTest: false,
      depthWrite: false
    });

    var blurMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        direction: { value: new THREE.Vector2(1 / 512, 0) }
      },
      vertexShader: VERT,
      fragmentShader: BLUR_FRAG,
      depthTest: false,
      depthWrite: false
    });

    var copyMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: rtScene.texture }
      },
      vertexShader: VERT,
      fragmentShader: COPY_FRAG,
      depthTest: false,
      depthWrite: false
    });

    var glowMat = new THREE.ShaderMaterial({
      uniforms: {
        tBloom: { value: rtA.texture },
        strength: { value: 0.85 }
      },
      vertexShader: VERT,
      fragmentShader: GLOW_FRAG,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    function blit(mat, target) {
      quad.material = mat;
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(quadScene, quadCam);
    }

    function blurPass(src, dst, dx, dy) {
      blurMat.uniforms.tDiffuse.value = src.texture;
      blurMat.uniforms.direction.value.set(dx, dy);
      blit(blurMat, dst);
    }

    var api = {
      rtScene: rtScene,
      uniforms: glowMat.uniforms,
      strength: 0.85,
      render: function (time) {
        renderer.autoClear = false;

        renderer.setRenderTarget(rtScene);
        renderer.clear();
        renderer.render(scene, camera);

        brightMat.uniforms.tDiffuse.value = rtScene.texture;
        blit(brightMat, rtA);

        var hw = rtA.width, hh = rtA.height;
        // 第一轮:细密辉光
        blurPass(rtA, rtB, 1.0 / hw, 0);
        blurPass(rtB, rtA, 0, 1.0 / hh);
        // 第二轮:更宽的扩散
        blurPass(rtA, rtB, 2.6 / hw, 0);
        blurPass(rtB, rtA, 0, 2.6 / hh);

        // ① 场景 → 屏幕(线性转 sRGB)
        copyMat.uniforms.tScene.value = rtScene.texture;
        blit(copyMat, null);

        // ② 泛光叠加到屏幕(不清屏)
        glowMat.uniforms.tBloom.value = rtA.texture;
        glowMat.uniforms.strength.value = api.strength;
        quad.material = glowMat;
        renderer.setRenderTarget(null);
        renderer.render(quadScene, quadCam);
      },
      setSize: function () {
        var s = renderer.getDrawingBufferSize(new THREE.Vector2());
        var w = Math.max(2, s.x), h = Math.max(2, s.y);
        rtScene.setSize(w, h);
        rtA.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
        rtB.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
      }
    };

    return api;
  };
})();
