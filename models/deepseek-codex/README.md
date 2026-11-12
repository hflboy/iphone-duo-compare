# iPhone Duo · Fold Lab

> 对照组：**DeepSeek-V4.1-Flash + Codex**
>
> 统一提示词：[`PROMPT.md`](../../PROMPT.md) v1（一字未改）
>
> 技术路线：Three.js r128 + 原生 HTML/CSS/JS，零构建、零外部模型/贴图

## 功能

- 15 个可交互拆解部件：双中框、折叠内屏、外屏、双电池、主板、相机、铰链、Taptic、USB-C、eSIM、MagSafe 与双扬声器。
- 部件点击拆出、信息卡与相机聚焦；支持空格整体拆解、F 折叠、自动巡览和进度滑杆。
- 左右机身围绕水滴铰链联动，折叠后外屏朝外。
- Canvas 程序化生成内屏、外屏、PCB 与电池标签，不依赖图片资源。
- Three.js 支持本地文件优先与三级 CDN 兜底。

## 运行

直接打开 `index.html`。如浏览器限制本地脚本加载，可回到仓库根目录运行：

```powershell
npm run serve
```

访问 `http://127.0.0.1:4173/models/deepseek-codex/`。

## 目录

```text
deepseek-codex/
├── index.html    UI、样式、加载器
├── js/main.js    场景、程序化建模、交互、拆解与折叠动画
└── README.md
```

## 已知限制

- 几何结构依据公开资料做视觉近似，不是维修级 CAD 数据。
- 首次打开需联网获取 Three.js；放入 `js/lib/three.min.js` 后可离线运行。
