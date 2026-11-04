/* ============================================================
 * iPhone Duo · 交互式 3D 拆解实验室
 * partsData.js —— 部件元数据(名称 / 文案 / 参数 / 高亮色)
 * 结构参考:Apple 官方 iPhone Duo 资料与公开折叠屏/iPhone 拆解常识
 * ============================================================ */
(function () {
  'use strict';

  var PARTS = [
    {
      id: 'screws',
      name: 'Pentalobe 防拆螺丝 ×2',
      en: 'Pentalobe Security Screws',
      accent: 0x22d3ee,
      desc: '拆解的第一步:两颗 P2 五瓣防拆螺丝封住 USB-C 开口两侧,是苹果著名的"防拆第一道防线"。必须使用 Pentalobe P2 专用刀头,普通批头只会滑丝。',
      specs: [
        ['规格', 'P2 五瓣梅花槽'],
        ['数量', '2 颗'],
        ['位置', '底部接口两侧'],
        ['工具', 'Pentalobe P2 精密螺丝刀']
      ]
    },
    {
      id: 'innerGlassL',
      name: '内屏玻璃 · 左半',
      en: 'Inner Ceramic Shield (L)',
      accent: 0x7dd3fc,
      desc: '7.6 英寸内屏最外层:超瓷晶玻璃经纳米纹理处理以减少眩光,内屏整体由 10 余层超薄材料贴合而成。拆解需先加热软化整圈防水胶,再用吸盘与拨片分离——折叠机的玻璃比直板机更"娇气"。(可视化中将内屏拆为左右两半)',
      specs: [
        ['材质', 'Ceramic Shield + 纳米纹理'],
        ['厚度', '约 0.5 mm'],
        ['密封', '整圈防水胶'],
        ['贴合', 'OCA 全贴合']
      ]
    },
    {
      id: 'innerGlassR',
      name: '内屏玻璃 · 右半',
      en: 'Inner Ceramic Shield (R)',
      accent: 0x7dd3fc,
      desc: '内屏玻璃右半。展开时左右两半共同构成 7.6 英寸无开孔 viewing surface,只有折叠时中部铰链区域才显露出来。',
      specs: [
        ['材质', 'Ceramic Shield + 纳米纹理'],
        ['形态', '与左半拼接为整面'],
        ['折痕区', '中部铰链上方'],
        ['密封', '整圈防水胶']
      ]
    },
    {
      id: 'innerPanelL',
      name: '内屏面板 · 左半',
      en: 'Inner OLED Panel (L)',
      accent: 0x22d3ee,
      desc: '7.6 英寸 Super Retina XDR 内屏:LTPO 1-120Hz ProMotion,3000 nits 峰值亮度,屏下藏着一颗 FaceTime 前摄,息屏时完全隐形。与铰链平行的折痕区是折叠屏最脆弱的部分。',
      specs: [
        ['尺寸', '7.6″ 内屏(双半拼合)'],
        ['刷新率', '1-120Hz LTPO'],
        ['峰值亮度', '3000 nits'],
        ['特性', '屏下前摄 · 宽视角 OLED']
      ]
    },
    {
      id: 'innerPanelR',
      name: '内屏面板 · 右半',
      en: 'Inner OLED Panel (R)',
      accent: 0x22d3ee,
      desc: '内屏面板右半。面板采用 COF 封装把驱动 IC 弯折到背面以压缩边框;屏下摄像头区域(右上)像素经过特殊排布以透光。',
      specs: [
        ['封装', 'COF 柔性驱动'],
        ['屏下区', 'FaceTime 前摄'],
        ['触控', 'On-cell 集成触控'],
        ['排线', '跨铰链软排线']
      ]
    },
    {
      id: 'udCamera',
      name: '屏下 FaceTime 前摄',
      en: 'Under-Display FaceTime Camera',
      accent: 0x818cf8,
      desc: '藏在内屏像素下方的 FaceTime 前摄:不工作时完全隐形,激活时系统 UI 自动避让。它依靠定制传感器与像素间隙采光,是实现"无孔内屏"的关键。',
      specs: [
        ['用途', 'FaceTime 通话'],
        ['位置', '内屏右上像素下方'],
        ['可见性', '激活时 UI 避让'],
        ['技术', '屏下成像(CUP)']
      ]
    },
    {
      id: 'vaporChamber',
      name: '均热板散热系统',
      en: 'Vapor Chamber',
      accent: 0xfb923c,
      desc: 'A20 Pro 的"退烧贴":一枚覆盖主板的真空腔均热板,靠腔内工质蒸发—冷凝把热量快速摊平,支撑较 A19 Pro 提速 20% 的 CPU 与长时间游戏负载。',
      specs: [
        ['对应芯片', 'A20 Pro'],
        ['结构', '真空腔均热板'],
        ['收益', '6 核 CPU 提速至 20%'],
        ['位置', '主板区域']
      ]
    },
    {
      id: 'mainBoard',
      name: '主逻辑板(A20 Pro)',
      en: 'Main Logic Board',
      accent: 0x2dd4bf,
      desc: 'iPhone Duo 的运算中枢:A20 Pro(6 核 CPU、双 16 核神经引擎、内存带宽较 A19 Pro +50%)与运存、电源管理芯片双面堆叠在指甲盖大小的 PCB 上,外罩屏蔽罩与石墨贴片。',
      specs: [
        ['SoC', 'A20 Pro · 6 核 CPU'],
        ['神经引擎', '双 16 核'],
        ['内存带宽', '较 A19 Pro +50%'],
        ['封装', '双面 SMT 堆叠']
      ]
    },
    {
      id: 'subBoard',
      name: '副板(C2 基带·射频)',
      en: 'Sub Board (C2 Modem)',
      accent: 0x34d399,
      desc: '折叠机的"第二块脑子":苹果自研 C2 基带、射频前端与充电电路集成在副板上,通过板对板连接器和跨铰链软排线与主板互通——折叠机内部走线的一半工夫都花在"跨铰链"上。',
      specs: [
        ['基带', '苹果 C2 调制解调器'],
        ['连接', '板对板连接器'],
        ['射频', '收发器 · 功放'],
        ['跨接', '跨铰链软排线']
      ]
    },
    {
      id: 'batteryL',
      name: '主电池 · 左半',
      en: 'Main Battery (L)',
      accent: 0xfbbf24,
      desc: '双电池系统的左半(主电芯):与右半电池协同供电,为 7.6 英寸大屏与 A20 Pro 提供持续电流。官方续航:内屏播放视频最长 31 小时;约 20 分钟即可充至 50%。',
      specs: [
        ['系统', '双电池系统(与右半协同)'],
        ['容量', '2962 mAh · 11.52 Wh'],
        ['固定', '电控脱胶胶拉(通电松胶)'],
        ['续航', '内屏 31h 视频(官方)']
      ]
    },
    {
      id: 'batteryR',
      name: '副电池 · 右半',
      en: 'Secondary Battery (R)',
      accent: 0xf59e0b,
      desc: '双电池系统的右半(副电芯,1921 mAh)。iFixit 评价 iPhone Duo 为"目前最易维修的折叠机":两块电池均采用 iPhone 16 同款电控脱胶胶拉,通小电流即可松胶、干净取出。拆解时先断电再拉胶,动作要慢。',
      specs: [
        ['容量', '1921 mAh · 7.47 Wh'],
        ['合计', '双电芯 4883 mAh'],
        ['固定', '电控脱胶胶拉(通电松胶)'],
        ['续航', '外屏 44h 视频(官方)']
      ]
    },
    {
      id: 'coilL',
      name: '无线充电线圈 · 左',
      en: 'Wireless Charging Coil (L)',
      accent: 0xf97316,
      desc: '铜线绕制的扁平利兹线线圈,贴在左半电池背面,对准充电板即可无线补电。线圈背面的磁吸环同时负责配件对位。',
      specs: [
        ['结构', '扁平利兹线绕组'],
        ['位置', '左电池背面'],
        ['对位', '磁吸对位环'],
        ['兼容', 'Qi 无线充电']
      ]
    },
    {
      id: 'coilR',
      name: '无线充电线圈 · 右',
      en: 'Wireless Charging Coil (R)',
      accent: 0xf97316,
      desc: '右半无线充电线圈,与左半线圈独立走线、经跨铰链排线汇入充电电路——折叠机的无线充电要兼顾"任何一半贴板都能充"。',
      specs: [
        ['结构', '扁平利兹线绕组'],
        ['位置', '右电池背面'],
        ['走线', '跨铰链排线'],
        ['兼容', 'Qi 无线充电']
      ]
    },
    {
      id: 'frameL',
      name: '钛金属中框 · 左半',
      en: 'Grade-5 Titanium Frame (L)',
      accent: 0x94a3b8,
      desc: 'Grade 5 钛金属中框左半:集成操作按钮与音量键,内衬铝制支架撑起整机骨架。天线断点把金属边框切成数段,避免信号屏蔽。',
      specs: [
        ['材质', 'Grade 5 钛合金'],
        ['侧键', '操作按钮 + 音量键'],
        ['天线', '断点式注塑'],
        ['防护', 'IP68']
      ]
    },
    {
      id: 'frameR',
      name: '钛金属中框 · 右半',
      en: 'Grade-5 Titanium Frame (R)',
      accent: 0x94a3b8,
      desc: '中框右半:集成电源键、USB-C 开口与麦克风开孔,是拆解的"主战场"——两颗防拆螺丝和屏幕胶都在这一侧。',
      specs: [
        ['接口', 'USB-C'],
        ['侧键', '电源键'],
        ['麦克风', '底部开孔'],
        ['密封', '胶圈 + 点胶']
      ]
    },
    {
      id: 'hinge',
      name: '铰链总成(齿轮组)',
      en: 'Hinge Assembly',
      accent: 0xa78bfa,
      desc: '整机的灵魂:水滴型铰链把两半屏幕轴对称折起,齿轮组与凸轮保证任意角度悬停、摊平折痕应力。官方为铰链盖单独使用 Grade 5 钛合金;iFixit 拆解同时指出,部分内屏裂纹疑与铰链设计相关,对 SoC 所在的铰链角落施压可能压迫屏幕——拆解铰链是公认的高难度步骤,需要加热并挑开大量胶粘点。',
      specs: [
        ['类型', '水滴型铰链'],
        ['铰链盖', 'Grade 5 钛合金'],
        ['特性', '多角度悬停'],
        ['争议', '内屏裂纹疑与铰链相关(iFixit)']
      ]
    },
    {
      id: 'cameraModule',
      name: '48MP 双摄模组(Dual Fusion)',
      en: '48MP Dual Fusion Cameras',
      accent: 0x60a5fa,
      desc: '48MP Dual Fusion 相机系统:主摄与超广角均为 4800 万像素 Fusion 传感器,支持 2 倍光学品质变焦与 4K 120fps 杜比视界录制;旁侧是原彩闪光灯与后置麦克风。',
      specs: [
        ['主摄', '48MP Fusion'],
        ['超广角', '48MP Fusion'],
        ['变焦', '2× 光学品质'],
        ['视频', '4K 120fps 杜比视界']
      ]
    },
    {
      id: 'taptic',
      name: 'Taptic Engine',
      en: 'Taptic Engine',
      accent: 0xc084fc,
      desc: '触感反馈的来源:LRA 线性马达毫秒级启停,模拟出按压实体的错觉。折叠机内部寸土寸金,它的位置被挤到左半底部。',
      specs: [
        ['类型', 'LRA 线性马达'],
        ['响应', '毫秒级启停'],
        ['位置', '左半底部'],
        ['功能', '触感引擎']
      ]
    },
    {
      id: 'speaker',
      name: '底部扬声器',
      en: 'Bottom Speaker',
      accent: 0x22d3ee,
      desc: '底部扬声器单元:与听筒组成立体声,出音孔后面藏着防水防尘网。拆解时注意它与 Taptic Engine 的排线路径。',
      specs: [
        ['布局', '与听筒组成立体声'],
        ['防护', '防水防尘网'],
        ['位置', '左半底部'],
        ['模组', '独立密封腔体']
      ]
    },
    {
      id: 'usbPort',
      name: 'USB-C 端口总成',
      en: 'USB-C Port Assembly',
      accent: 0xf472b6,
      desc: 'USB-C 端口总成:充电、数据与配件的统一入口,支持快充(约 20 分钟充至 50%)。端口模组上集成底部麦克风,拆解时需与中框点胶分离。',
      specs: [
        ['接口', 'USB-C'],
        ['快充', '20 分钟 ≈ 50%'],
        ['集成', '底部麦克风'],
        ['密封', '端口防水胶']
      ]
    },
    {
      id: 'outerDisplay',
      name: '外屏总成(6.2″)',
      en: 'Outer Display Assembly',
      accent: 0x7dd3fc,
      desc: '6.2 英寸外屏总成:面积超过 iPhone 18 Pro 的 90%,比例更宽更矮,iOS 27 把工具栏与标签栏移到侧边以保住纵向空间。角落里是常显的 12MP Center Stage 前摄打孔。',
      specs: [
        ['尺寸', '6.2″ LTPO OLED'],
        ['亮度', '3000 nits 峰值'],
        ['前摄', '12MP Center Stage'],
        ['布局', '侧边工具栏/标签栏']
      ]
    },
    {
      id: 'backCover',
      name: '后盖玻璃(Ceramic Shield)',
      en: 'Back Cover Glass',
      accent: 0x93c5fd,
      desc: 'Ceramic Shield 后盖:闭合形态下的"机身背面",与前盖同源工艺。Night Sky 配色为深蓝黑渐变镀膜;拆下后即可看到双电池与跨铰链排线的全貌。',
      specs: [
        ['材质', 'Ceramic Shield 玻璃'],
        ['配色', '夜空 / 星白'],
        ['镀膜', '渐变镀层'],
        ['密封', '整圈防水胶']
      ]
    }
  ];

  window.App = window.App || {};
  window.App.PARTS = PARTS;
})();
