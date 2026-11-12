#!/usr/bin/env node
/**
 * 渲染预览自动生成器
 * ---------------------------------------------------------------
 * 用无头 Chromium 打开 models/ 下的每个页面,自动产出:
 *   docs/shots/<id>-cover.png     静止首屏(1440x900)
 *   docs/shots/<id>-exploded.png  100% 拆解定格
 *   docs/shots/<id>-explode.gif   0→100 拆解过程动图(800x500,循环播放)
 *
 * 用法:
 *   npm install
 *   npx playwright install chromium
 *   npm run capture              # 全部模型
 *   npm run capture -- glm-5.3   # 只跑指定 id
 *
 * 环境变量:
 *   CAPTURE_PORT   本地静态服务端口(默认 4173)
 *   CAPTURE_FRAMES 动图帧数(默认 28)
 */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

// pngjs / gifenc 都是 CJS 包,统一用 createRequire 取,避免 Node ESM 具名导出的解析差异
const require = createRequire(import.meta.url);
async function loadModule(name) {
  try {
    return require(name);
  } catch {
    return await import(name);
  }
}
const pngjs = await loadModule('pngjs');
const gifenc = await loadModule('gifenc');
const PNG = pngjs.PNG || pngjs.default?.PNG;
const G = gifenc.GIFEncoder ? gifenc : gifenc.default;
const { GIFEncoder, quantize, applyPalette } = G;

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'docs', 'shots');
const PORT = Number(process.env.CAPTURE_PORT || 4173);
// 软件渲染(SwiftShader)下每帧截图很贵,默认只用 12 帧,靠回程帧凑出循环
const FRAMES = Math.max(6, Number(process.env.CAPTURE_FRAMES || 12));

/** 每个模型页面的"就绪"判定与拆解滑杆选择器 */
const TARGETS = [
  {
    id: 'glm-5.3',
    entry: '/models/glm-5.3/index.html',
    slider: '#explode-slider',
    loader: '#loader',
    readyClass: 'hide',
  },
  {
    id: 'deepseek-flash',
    entry: '/models/deepseek-flash/index.html',
    slider: '#explodeSlider',
    loader: '#loading',
    readyClass: 'hidden',
  },
  {
    id: 'deepseek-codex',
    entry: '/models/deepseek-codex/index.html',
    slider: '#explodeRange',
    loader: '#loading',
    readyClass: 'hidden',
  },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      let rel = decodeURIComponent(url.pathname);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.join(ROOT, path.normalize(rel));
      if (!file.startsWith(ROOT)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

/** 等页面真正出画面:canvas 有尺寸 + loader 已隐藏 */
async function waitReady(page, target) {
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.waitForFunction(
    ({ loader, readyClass }) => {
      const el = document.querySelector(loader);
      if (!el) return true;
      return el.classList.contains(readyClass) || getComputedStyle(el).opacity === '0';
    },
    target,
    { timeout: 60000 },
  );
  await page.waitForFunction(
    () => {
      const c = document.querySelector('canvas');
      return c && c.width > 8 && c.height > 8;
    },
    null,
    { timeout: 30000 },
  );
}

/** 通过 dispatchEvent('input') 直接驱动拆解滑杆,避免依赖按钮动画时长 */
async function setExplode(page, selector, percent) {
  await page.evaluate(
    ({ selector, percent }) => {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`找不到拆解滑杆: ${selector}`);
      el.value = String(percent);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { selector, percent },
  );
}

async function captureTarget(browser, target) {
  const base = `http://127.0.0.1:${PORT}${target.entry}`;
  console.log(`\n▶ ${target.id}`);

  // ---------- 1) 静态图:首屏 + 100% 拆解 ----------
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', (e) => console.warn(`  ! pageerror: ${e.message}`));

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await waitReady(page, target);
  await page.waitForTimeout(2500); // 等泛光/材质首帧稳定

  const cover = path.join(OUT, `${target.id}-cover.png`);
  const coverBuf = await page.screenshot({ type: 'png' });
  await writeFile(cover, coverBuf);
  console.log(`  ✓ ${path.basename(cover)}  ${kb(coverBuf.length)}`);

  await setExplode(page, target.slider, 100);
  await page.waitForTimeout(1800);
  const explodedBuf = await page.screenshot({ type: 'png' });
  const exploded = path.join(OUT, `${target.id}-exploded.png`);
  await writeFile(exploded, explodedBuf);
  console.log(`  ✓ ${path.basename(exploded)}  ${kb(explodedBuf.length)}`);

  await ctx.close();

  // ---------- 2) 动图:小视口重新加载,逐帧推进拆解 ----------
  const gifCtx = await browser.newContext({
    viewport: { width: 720, height: 450 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  });
  const gifPage = await gifCtx.newPage();
  gifPage.setDefaultTimeout(30000);
  await gifPage.goto(base, { waitUntil: 'domcontentloaded' });
  await waitReady(gifPage, target);
  await gifPage.waitForTimeout(2000);

  const steps = [];
  for (let i = 0; i <= FRAMES; i++) steps.push(Math.round((i / FRAMES) * 100));
  for (let i = FRAMES - 2; i >= 0; i -= 2) steps.push(Math.round((i / FRAMES) * 100)); // 回程,便于无缝循环

  const gif = GIFEncoder();
  const delay = 80; // ms/帧 → 12.5fps
  let frameNo = 0;
  for (const pct of steps) {
    await setExplode(gifPage, target.slider, pct);
    await gifPage.waitForTimeout(delay);
    const buf = await gifPage.screenshot({ type: 'png' });
    const { width, height, data } = PNG.sync.read(buf);
    const palette = quantize(data, 256, { format: 'rgb565' });
    const index = applyPalette(data, palette, 'rgb565');
    gif.writeFrame(index, width, height, { palette, delay });
    frameNo++;
    if (frameNo % 4 === 0 || frameNo === steps.length) {
      console.log(`    · 帧 ${frameNo}/${steps.length}`);
    }
  }
  gif.finish();
  const gifBuf = Buffer.from(gif.bytesView());
  const gifFile = path.join(OUT, `${target.id}-explode.gif`);
  await writeFile(gifFile, gifBuf);
  console.log(`  ✓ ${path.basename(gifFile)}  ${kb(gifBuf.length)}  (${steps.length} 帧)`);
  if (gifBuf.length > 4 * 1024 * 1024) {
    console.warn('  ! 动图超过 4MB,GitHub 首屏加载会变慢,建议调小 CAPTURE_FRAMES');
  }

  await gifCtx.close();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const targets = only.length ? TARGETS.filter((t) => only.includes(t.id)) : TARGETS;
  if (!targets.length) {
    console.error(`没有匹配的目标。可选: ${TARGETS.map((t) => t.id).join(', ')}`);
    process.exit(1);
  }

  const server = await startServer();
  const browser = await chromium.launch({
    args: [
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--disable-dev-shm-usage',
    ],
  });

  let failed = 0;
  for (const target of targets) {
    try {
      await captureTarget(browser, target);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${target.id} 失败: ${err.message}`);
      console.error('    提示:页面依赖 CDN 上的 Three.js,请确认网络可达;首次运行还需 npx playwright install chromium');
    }
  }

  await browser.close();
  server.close();

  const files = await Promise.all(
    targets.flatMap((t) => [`${t.id}-cover.png`, `${t.id}-exploded.png`, `${t.id}-explode.gif`]),
  );
  console.log('\n产物:');
  for (const f of files) {
    try {
      const s = await stat(path.join(OUT, f));
      console.log(`  docs/shots/${f}  ${kb(s.size)}`);
    } catch {
      console.log(`  docs/shots/${f}  (未生成)`);
    }
  }
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
