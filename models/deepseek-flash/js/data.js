/* ============================================================
 * iPhone Duo · Teardown Lab
 * data.js —— 25 个部件的元数据与拆解参数
 *
 * 事实基线:Apple 2026 首款折叠屏 iPhone(7.6″ 内屏 + 6.2″ 外屏,
 * Grade 5 钛金属中框/铰链盖,A20 Pro + 均热板,C2 基带,eSIM-only,
 * 48MP Dual Fusion 双摄,2962 + 1921 = 4883 mAh 双电池,电控脱胶)
 * 另参考 iFixit 对 iPhone Duo 的拆解结论。
 * ============================================================ */
(function () {
  'use strict';

  var PARTS = [
    /* ---------------- 显示 ---------------- */
    {
      id: 'innerL',
      name: '7.6″ 内屏 · 左半',
      en: 'Inner LTPO OLED · Left',
      cat: '显示',
      accent: 0x38e6ff,
      specs: 'LTPO 1–120Hz · 3000 nits 峰值 · 屏下前摄',
      desc: '7.6 英寸柔性 LTPO OLED 的左半幅。展开后与右半无缝拼成完整内屏,折痕区以双层缓冲与超薄柔性玻璃分散弯折应力。峰值亮度 3000 nits,支持 1–120Hz 自适应刷新。',
      dir: [-0.72, 0.12, 1], dist: 4.1, order: 0.72
    },
    {
      id: 'innerR',
      name: '7.6″ 内屏 · 右半',
      en: 'Inner LTPO OLED · Right',
      cat: '显示',
      accent: 0x38e6ff,
      specs: 'LTPO 1–120Hz · 3000 nits 峰值 · 折叠侧',
      desc: '内屏右半幅,固定在可 180° 翻转的右半机上。它与左半共用同一张壁纸:翻转时画面随铰链一起折叠,是整机最直观的机械浪漫。',
      dir: [0.72, 0.12, 1], dist: 4.1, order: 0.73
    },
    {
      id: 'cover',
      name: '6.2″ 外屏',
      en: '6.2″ Cover Display',
      cat: '显示',
      accent: 0x4fd2ff,
      specs: '3000 nits · LTPO 1–120Hz · 超瓷晶面板',
      desc: '折叠状态下的主屏:6.2 英寸、3000 nits、LTPO 1–120Hz。覆盖超瓷晶面板,顶部为 12MP Center Stage 前摄挖孔。它贴在左半机背面,也是整机的外侧主视觉。',
      dir: [-0.55, 0, -1], dist: 5.4, order: 0.14
    },

    /* ---------------- 结构 ---------------- */
    {
      id: 'frameL',
      name: '左中框',
      en: 'Titanium Frame · Left',
      cat: '结构',
      accent: 0x9fb4c8,
      specs: 'Grade 5 钛金属 · CNC 一体成型',
      desc: 'Grade 5 钛金属中框,CNC 一体成型。边框上分布天线注塑断点与防水胶槽,内部承托内屏左半、外屏与 2962 mAh 电池。',
      dir: [-1, 0, 0], dist: 1.2, order: 0.62
    },
    {
      id: 'frameR',
      name: '右中框',
      en: 'Titanium Frame · Right',
      cat: '结构',
      accent: 0x9fb4c8,
      specs: 'Grade 5 钛金属 · 铰链承力侧',
      desc: '右中框与铰链承力结构直接相连,折叠时承担绝大部分扭转与冲击载荷。内部集成主板、1921 mAh 电池、Taptic Engine 与 USB-C。',
      dir: [1, 0, 0], dist: 1.2, order: 0.63
    },
    {
      id: 'hinge',
      name: '水滴铰链',
      en: 'Water-drop Hinge',
      cat: '结构',
      accent: 0xb7c7d8,
      specs: '双轨凸轮 · 钛合金承力件 · 悬停',
      desc: '双轨水滴铰链:闭合时让屏幕以更大的弯折半径收进机身,展开后把两半屏幕顶成同一平面。凸轮组提供阻尼与多角度悬停,是折叠屏最精密的机械总成。',
      dir: [0, 0.55, 1], dist: 1.9, order: 0.58
    },
    {
      id: 'hingeCover',
      name: '钛金属铰链盖',
      en: 'Titanium Hinge Cover',
      cat: '结构',
      accent: 0xc3d2e0,
      specs: 'Grade 5 钛 · 拉丝处理',
      desc: '铰链外侧的钛金属盖板,与中框同为 Grade 5 钛,表面做细拉丝。它同时是折叠态的握持脊线,内部藏有防尘刷与排线通道。',
      dir: [0, 0.4, 1], dist: 3.2, order: 0.6
    },
    {
      id: 'backGlass',
      name: '右背板',
      en: 'Ceramic Shield Back',
      cat: '结构',
      accent: 0x8ca0b4,
      specs: '超瓷晶 · 磨砂 · IP68 密封',
      desc: '右半机背部的超瓷晶背板,磨砂质感,与钛中框之间以防水胶圈密封。摄像头模组、闪光灯与无线充电线圈都叠合在这块背板之下。',
      dir: [0.6, -0.12, -1], dist: 6.8, order: 0.04
    },

    /* ---------------- 能源 ---------------- */
    {
      id: 'batteryL',
      name: '电池 · 2962 mAh',
      en: 'Battery Cell · 2962 mAh',
      cat: '能源',
      accent: 0x7ef0b8,
      specs: '2962 mAh · 3.87V · 11.46Wh',
      desc: '双电池系统的左电芯,2962 mAh。与右侧 1921 mAh 电芯并联组成 4883 mAh。iFixit 指出它使用电控脱胶胶条固定——通电即可释放粘性,是"最易维修折叠机"的关键。',
      dir: [-0.18, -0.2, -1], dist: 2.1, order: 0.25
    },
    {
      id: 'batteryR',
      name: '电池 · 1921 mAh',
      en: 'Battery Cell · 1921 mAh',
      cat: '能源',
      accent: 0x7ef0b8,
      specs: '1921 mAh · 3.87V · 7.43Wh',
      desc: '右电芯 1921 mAh,被主板与 Taptic Engine 夹在中间。两块电芯分置左右,既利用铰链两侧的异形空间,也让整机重量更均衡。',
      dir: [0.18, -0.32, -1], dist: 2.2, order: 0.27
    },
    {
      id: 'coil',
      name: 'MagSafe 线圈',
      en: 'MagSafe Coil Array',
      cat: '能源',
      accent: 0xffc46b,
      specs: '磁吸阵列 · 无线充电 · NFC',
      desc: '叠在左半机外屏内侧的 MagSafe 磁吸阵列与无线充电线圈。折叠时机身厚度翻倍,线圈仍被安排在左半机最外层以保证磁吸对位。',
      dir: [-0.35, 0, -1], dist: 4.6, order: 0.18
    },

    /* ---------------- 计算 ---------------- */
    {
      id: 'board',
      name: '双层主板',
      en: 'Stacked Logic Board',
      cat: '计算',
      accent: 0x7ed6a5,
      specs: '双层堆叠 · 主板 + 射频子板',
      desc: '双层堆叠主板,把 A20 Pro、C2 基带、电源管理与射频前端压进右半机有限的厚度里。主板背面覆盖石墨散热层,与均热板、钛中框组成散热路径。',
      dir: [0.12, 0.08, -1], dist: 1.2, order: 0.32
    },
    {
      id: 'a20',
      name: 'A20 Pro 芯片',
      en: 'A20 Pro SoC',
      cat: '计算',
      accent: 0xff8f6b,
      specs: 'A20 Pro · 金属热盖 · 端侧 AI',
      desc: 'A20 Pro 仿生芯片,金属热盖直接贴合均热板。它负责整机的计算、影像与端侧 Apple Intelligence,是右半机最大的热源。',
      dir: [0.12, 0.16, -1], dist: 3.0, order: 0.42
    },
    {
      id: 'c2',
      name: 'C2 基带',
      en: 'Apple C2 Modem',
      cat: '计算',
      accent: 0x9fe3ff,
      specs: '自研 5G 基带 · eSIM-only',
      desc: '苹果自研 C2 5G 基带。iPhone Duo 取消实体 SIM 卡槽、采用 eSIM-only,正是为了给双电池与铰链腾出结构空间。',
      dir: [0.3, 0, -1], dist: 2.6, order: 0.44
    },
    {
      id: 'vapor',
      name: 'VC 均热板',
      en: 'Vapor Chamber',
      cat: '计算',
      accent: 0xffa36b,
      specs: '大面积 VC · 铜质毛细结构',
      desc: '覆盖 A20 Pro 与 C2 的大面积 VC 均热板。铜质毛细结构把热点摊平,再经石墨层导向钛金属中框——折叠机内部空间紧张,散热只能靠"摊大饼"。',
      dir: [0.1, 0.1, -1], dist: 2.0, order: 0.38
    },
    {
      id: 'esim',
      name: 'eSIM 模块',
      en: 'eSIM Module',
      cat: '计算',
      accent: 0x9fe3ff,
      specs: '无实体卡槽 · 双 eSIM',
      desc: 'eSIM 模块。没有卡槽与卡托,省下的体积被让给电池和铰链;换号、双卡都通过运营商 eSIM 配置完成。',
      dir: [0.4, 0.25, -1], dist: 2.3, order: 0.46
    },

    /* ---------------- 影像 ---------------- */
    {
      id: 'camera',
      name: '48MP 双摄模组',
      en: '48MP Dual Fusion Camera',
      cat: '影像',
      accent: 0xb79bff,
      specs: '48MP 主摄 + 48MP 超广角 · 无长焦',
      desc: '48MP Dual Fusion 双摄:主摄与超广角共用一套计算影像管线,没有长焦。模组凸起于右半机背板,内部含 OIS 与镜头组,是拆解时最先被分离的部件之一。',
      dir: [0.5, 0.25, -1], dist: 4.2, order: 0.08
    },
    {
      id: 'flash',
      name: '原彩闪光灯',
      en: 'True Tone Flash',
      cat: '影像',
      accent: 0xffe6a8,
      specs: '双色温 LED · 后置麦克风',
      desc: '双色温原彩闪光灯与后置收音麦克风。折叠态下它位于机身背面,展开后仍保持在右半机顶部,不会因折叠改变拍摄握姿。',
      dir: [0.75, 0.45, -1], dist: 4.9, order: 0.1
    },
    {
      id: 'frontCam',
      name: '12MP 外屏前摄',
      en: '12MP Center Stage Camera',
      cat: '影像',
      accent: 0xc7a7ff,
      specs: '12MP · Center Stage · 外屏挖孔',
      desc: '12MP Center Stage 外屏前摄,位于 6.2 英寸外屏顶部挖孔。视频通话时画面会自动跟随人物移动,折叠态下也能直接自拍。',
      dir: [-0.6, 0.5, -1], dist: 5.8, order: 0.16
    },
    {
      id: 'faceCam',
      name: '屏下 FaceTime 前摄',
      en: 'Under-display FaceTime Camera',
      cat: '影像',
      accent: 0xc7a7ff,
      specs: '屏下方案 · 像素补偿 · 内屏',
      desc: '藏在内屏之下的 FaceTime 前摄。屏幕对应区域降低像素密度、提高透光率,息屏时完全隐形,展开后即可用大屏视频通话。',
      dir: [0, 0.2, 1], dist: 2.9, order: 0.74
    },

    /* ---------------- 交互 ---------------- */
    {
      id: 'taptic',
      name: 'Taptic Engine',
      en: 'Taptic Engine',
      cat: '交互',
      accent: 0xff9ecb,
      specs: '大尺寸线性马达 · 宽频触感',
      desc: '大尺寸线性马达,负责铃声、打字与相机快门的触感。折叠机左右两半的配重不同,苹果用它与电池位置共同调平整机重心。',
      dir: [0.18, -0.3, -1], dist: 3.3, order: 0.5
    },
    {
      id: 'speakerL',
      name: '底部扬声器',
      en: 'Bottom Speaker',
      cat: '交互',
      accent: 0xffb3a1,
      specs: '立体声 · 折叠态声道切换',
      desc: '底部扬声器,与顶部听筒组成立体声。折叠态下系统会自动重排左右声道,保证横屏观影时声场仍然正确。',
      dir: [-0.2, -1, -0.15], dist: 2.9, order: 0.54
    },
    {
      id: 'usbc',
      name: 'USB-C 接口',
      en: 'USB-C Port',
      cat: '交互',
      accent: 0xaab8c6,
      specs: '充电 + 数据 · 底部中置偏右',
      desc: 'USB-C 接口,位于右半机底部。它同时承担有线充电、数据传输与维修诊断,接口两侧各有一颗 P2 防拆螺丝。',
      dir: [0, -1, -0.15], dist: 2.7, order: 0.52
    },
    {
      id: 'buttons',
      name: '钛金属按键',
      en: 'Titanium Buttons',
      cat: '交互',
      accent: 0xb9c8d6,
      specs: '音量键 · 操作按钮 · 电源键',
      desc: '左中框上的音量键与操作按钮(右侧对应电源键),均为钛金属切削件。按键通过密封胶圈穿过中框,是防水结构的薄弱点之一。',
      dir: [-1, 0, 0], dist: 1.4, order: 0.66
    },

    /* ---------------- 维修 ---------------- */
    {
      id: 'adhesive',
      name: '电控脱胶胶条',
      en: 'Electrically Debonding Adhesive',
      cat: '维修',
      accent: 0xff9b57,
      specs: '通电脱胶 · 电池易拆 · iFixit 好评',
      desc: '固定左电芯的电控脱胶胶条。维修时对胶条施加电压,粘性迅速下降,电池即可无撬动取出。iFixit 因此称 iPhone Duo 为"最易维修的折叠机"。',
      dir: [-0.2, 0, -1], dist: 1.5, order: 0.2
    }
  ];

  var CATS = ['显示', '结构', '能源', '计算', '影像', '交互', '维修'];

  var MAP = {};
  PARTS.forEach(function (p) { MAP[p.id] = p; });

  window.DUO = window.DUO || {};
  DUO.PARTS = PARTS;
  DUO.PART_MAP = MAP;
  DUO.CATS = CATS;
  DUO.DIM = { W: 6.8, H: 15.0, T: 0.54, R: 0.72 };
})();