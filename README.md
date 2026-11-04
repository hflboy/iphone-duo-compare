# iPhone Duo · 同提示词多模型对比实验室

用**同一份提示词**([PROMPT.md](PROMPT.md))让不同 AI 模型各自生成
「iPhone Duo 交互式 3D 拆解可视化」,汇总在同一仓库做横向对比。

## 目录结构

```
iphone-duo-compare/
├── README.md            本文件 · 对比总览
├── PROMPT.md            统一提示词原文 + 评测维度
├── upload-to-github.ps1 一键上传脚本(GitHub API,无需 git)
├── .gitignore
└── models/
    └── glm-5.3/         ← 第一个项目(GLM-5.3-Flash 生成,完整可运行)
        ├── index.html
        ├── README.md
        └── js/ (partsData / phoneModel / bloom / controls / explode / main)
```

## 对比总表

| 模型 | 状态 | 技术要点 | 亮点 | 待改进 |
|---|---|---|---|---|
| GLM-5.3-Flash | ✅ 可运行 | Three.js r128 UMD + 原生 JS;22 部件程序化建模;自研轨道控制器/泛光管线/拆解编排;折叠联动动画 | 零模型贴图全代码生成;真实拆解数据(2962+1921mAh 电控脱胶);自动演示模式;六级 CDN 兜底 | 首次打开需联网取 Three.js(可下载到 `js/lib/` 实现完全离线) |
| _(待添加)_ | | | | |

## 如何添加新模型项目

1. 把 [PROMPT.md](PROMPT.md) 里的提示词原文交给目标模型(一字不改);
2. 将其生成的完整项目放入 `models/<模型名>\`;
3. 在上表追加一行该模型的表现;
4. 重新运行上传脚本同步到 GitHub。

## 如何上传 / 更新到 GitHub

在 PowerShell 中运行(需要 GitHub 用户名与 Fine-grained PAT,
权限:`Contents: Read and write` + `Administration: Read and write`):

```powershell
cd D:\HFL\study\iphone-duo-compare
.\upload-to-github.ps1
```

- 无需安装 git(走 GitHub API 逐文件上传)
- 重复运行安全:已存在的文件自动按 sha 更新
- ⚠️ Token 仅在本进程内使用,用完请到 GitHub 撤销
