# docs/shots · 渲染预览产物

README 顶部「效果预览」用的图全部由脚本生成,不要手动改文件名。

| 文件 | 规格 | 用途 |
|---|---|---|
| `<id>-cover.png` | 1440×900 | 首屏静态对比,README 表格左/右列 |
| `<id>-exploded.png` | 1440×900 | 100% 拆解定格,可作第二张卡片 |
| `<id>-explode.gif` | 800×500 · 12.5fps | 拆解过程动图,README 自动播放 |

`<id>` 取值:`glm-5.3`、`deepseek-flash`。

## 重新生成

```powershell
npm install
npx playwright install chromium
npm run capture            # 全部
npm run capture -- glm-5.3 # 单个
```

生成后在本地 `npm run serve` 打开 <http://127.0.0.1:4173/> 检查,
再提交 `docs/shots/` 即可。GitHub Actions 里也有 `capture-shots`
工作流可以跑同样的事,见 `.github/workflows/capture.yml`。

## 注意

- 单个 GIF 建议 < 4MB,超了调小 `CAPTURE_FRAMES`(默认 28);
- 每张 PNG 建议 < 1.5MB,必要时用 `oxipng`/`pngquant` 压一下;
- 页面依赖 CDN 上的 Three.js,截图机需要能联网。
