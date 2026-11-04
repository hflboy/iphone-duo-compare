# iPhone DUO · 交互式 3D 拆解实验室

基于 **Three.js + 原生 HTML/JS** 的折叠屏 iPhone「iPhone Duo」拆解可视化。
零外部模型、零贴图文件、零构建工具——整机 22 个部件全部由代码程序化生成。

> **iPhone Duo 是什么?** 苹果于 2026 年发布的首款折叠屏 iPhone:
> 7.6″ 内屏 + 6.2″ 外屏(3000 nits / LTPO 1-120Hz)、Grade 5 钛金属中框与铰链盖、
> A20 Pro 芯片 + 均热板、双电池系统(2962 + 1921 = 4883 mAh)、苹果 C2 基带、
> 48MP Dual Fusion 双摄、屏下 FaceTime 前摄、eSIM-only。

---

## 快速开始

**方式一(最简单):** 双击 `index.html` 即可在浏览器中打开。
首次打开需要联网加载 Three.js(页面内置 BootCDN → Baomitu → Staticfile → cdnjs → jsdelivr → unpkg 六级 CDN 兜底);
若把 `three.min.js`(r128)下载到 `js/lib/three.min.js`,即可完全离线运行。

**方式二(本地服务器,推荐):**

```bash
cd models/glm-5.3
python -m http.server 8080
# 浏览器访问 http://localhost:8080
```

推荐使用 Chrome / Edge / Firefox / Safari 现代版本,支持 WebGL 与 Pointer Events。

---

## 交互指南

| 操作 | 鼠标 | 触摸 | 快捷键 |
|---|---|---|---|
| 旋转视图 | 左键拖拽 | 单指拖动 | — |
| 缩放 | 滚轮 | 双指捏合 | — |
| 平移 | 右键/中键拖拽 | 双指拖动 | — |
| 聚焦部件 | 双击部件 | 双击部件 | — |
| 拆出 / 收回单个部件 | 单击部件 | 点按部件 | — |
| 整体拆解 / 组装 | 工具栏按钮 / 进度滑杆 | 同左 | `空格` |
| 开合折叠演示 | 工具栏按钮 | 同左 | `F` |
| 重置视角 | 工具栏按钮 | 同左 | `R` |
| 取消选中 | 点击空白 | 同左 | `Esc` |
| 自动旋转 / 自动拆解演示 | 工具栏按钮 | 同左 | — |

**自动演示**:一键完成「组装 → 整体拆解 → 逐个部件弹出聚焦 → 复位」全流程,
任意手动操作即可打断。

---

## 目录结构

```
glm-5.3/
├── index.html          主页面(含全部样式与 CDN 兜底加载)
├── README.md           本文件
└── js/
    ├── partsData.js    22 个部件的名称 / 文案 / 参数 / 高亮色
    ├── phoneModel.js   程序化建模:外观、摄像头、铰链、主板、电池……
    ├── bloom.js        自研轻量泛光后处理(亮部提取→高斯模糊→合成)
    ├── controls.js     自研轨道控制器(鼠标 + 触摸手势 + 阻尼 + 视角飞行)
    ├── explode.js      拆解编排(错峰展开、弹出/收回、发光脉冲)
    └── main.js         场景、灯光、环境反射、UI、自动演示、折叠动画
```

---

## 技术实现要点

- **程序化建模**:`THREE.Shape` 圆角轮廓 + `ExtrudeGeometry` 倒角挤出构成全部壳体;
  屏幕、电池标签、芯片丝印均为 `CanvasTexture` 现场绘制(内屏壁纸、外屏息屏钟、
  2962/1921mAh 电池标签、A20 Pro / C2 芯片、DUO 字标)。
- **折叠联动**:右半机挂在铰链轴上的枢轴组下(`foldPivot`),拆解方向定义为
  部件局部坐标,因此**折叠态下拆解动画依然自洽**——内外屏分别向前后爆开。
- **环境反射**:`PMREMGenerator.fromScene` 把程序化"HDR 灯房"(顶光 + 青色条形灯 +
  暖色补光)烘焙为环境贴图,钛金属与镜头玻璃的反射全靠它。
- **发光高亮**:拆解运动中部件自发光按正弦脉冲抬升、描边层(EdgesGeometry +
  AdditiveBlending)渐显,再经自研泛光管线在暗场中形成辉光;选中部件持续呼吸。
- **拆解编排**:全局进度 0→1,22 个部件按层级错峰(每个部件有独立时间窗),
  配合缓动函数得到波浪式展开;进度滑杆可直接拖动 scrub。
- **手势控制**:自研控制器支持指针事件统一处理的多点触控(单指旋转、双指捏合
  缩放 + 平移),带指数阻尼惯性、视角飞行补间与自动旋转。

---

## 定制指南

- **增改部件文案/参数**:编辑 `js/partsData.js`(每条含 `name / en / desc / specs / accent`)。
- **调整部件位置与拆解方向**:`js/phoneModel.js` 中的 `PLACEMENT` 表
  (`home` 原位 / `dir` 拆解方向 / `dist` 拆解距离)。
- **调整视觉**:泛光强度与阈值在 `js/bloom.js`(`strength` / `threshold`);
  灯光与背景在 `js/main.js` 的 `addLights` / `drawBackground`。

---

## 资料来源

**官方资料**

- Apple — iPhone Duo: <https://www.apple.com/iphone-duo/>
- Apple HIG — Designing for iPhone Duo: <https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo>
- Apple Tech Talks — 为 iPhone Duo 进行设计: <https://developer.apple.com/cn/videos/play/tech-talks/111466/>

**拆解资料**

- iFixit — iPhone Duo Teardown: The Most Repairable Foldable: <https://www.ifixit.com/News/119895/iphone-duo-teardown>
- MacRumors — iFixit iPhone Duo Teardown Points to Possible Cause of Screen Cracks(2026-10-25): <https://www.macrumors.com/2026/10/25/ifixit-iphone-duo-teardown/>
- REWA Technology — iPhone Duo Teardown(YouTube): <https://www.youtube.com/watch?v=3MSg-ZOfqGA>
- TECHN 拆解报道(双电芯 2962mAh + 1921mAh = 4883mAh、电控脱胶): <https://www.instagram.com/p/De6A76BAcAE/>

---

## 免责声明

本项目为技术学习与可视化演示用途,几何尺寸与内部布局为基于公开资料的
近似演绎,不代表官方维修指导;iPhone、FaceTime、MagSafe、Ceramic Shield
为 Apple Inc. 商标。
