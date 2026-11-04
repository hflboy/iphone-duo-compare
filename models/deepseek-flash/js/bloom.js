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

  var COMP_FRAG = [
    'uniform sampler2D tScene;',
    'uniform sampler2D tBloom;',
    'uniform float strength;',
    'uniform float time;',
    'uniform vec2 resolution;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec3 base = texture2D(tScene, vUv).rgb;',
    '  vec3 bloom = texture2D(tBloom, vUv).rgb;',
    '  vec3 col = base + bloom * strength;',
    '  vec2 d = vUv - 0.5;',
    '  float vig = smoothstep(0.92, 0.28, length(d) * 1.55);',
    '  col *= mix(0.68, 1.0, vig);',
    '  float grain = fract(sin(dot(vUv * resolution + time, vec2(12.9898, 78.233))) * 43758.5453);',
    '  col += (grain - 0.5) * 0.014;',
    '  col = max(col, vec3(0.0));',
    '  gl_FragColor = vec4(col, 1.0);',
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

    var compMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: rtScene.texture },
        tBloom: { value: rtA.texture },
        strength: { value: 0.95 },
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(W, H) }
      },
      vertexShader: VERT,
      fragmentShader: COMP_FRAG,
      depthTest: false,
      depthWrite: false
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
      uniforms: compMat.uniforms,
      strength: 0.95,
      render: function (time) {
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

        compMat.uniforms.tScene.value = rtScene.texture;
        compMat.uniforms.tBloom.value = rtA.texture;
        compMat.uniforms.time.value = time;
        compMat.uniforms.strength.value = api.strength;
        renderer.setRenderTarget(null);
        renderer.clear();
        renderer.render(quadScene, quadCam);
      },
      setSize: function () {
        var s = renderer.getDrawingBufferSize(new THREE.Vector2());
        var w = Math.max(2, s.x), h = Math.max(2, s.y);
        rtScene.setSize(w, h);
        rtA.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
        rtB.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
        compMat.uniforms.resolution.value.set(w, h);
      }
    };

    return api;
  };
})();