import type { DetailMeta } from './meta';

export const DETAIL_META: Record<string, DetailMeta> = {
  vakaohub: {
    tagline: '把 VaKao 的软件，放在一个地方。',
    features: [
      { title: '一个目录，所有版本', description: 'Android 与 macOS 共用一套应用、版本与产物模型。' },
      { title: '发布状态可追溯', description: '灰度、全量、强更与回滚都在后台留痕。' },
      { title: '安装前后校验', description: 'SHA-256 与 macOS codesign 完整性检查。' },
      { title: '安静的更新', description: '启动即检查，不弹窗轰炸，也不静默替换正在使用的版本。' },
    ],
    screenshots: ['https://dist.woyuxiaji.cn/assets/screens/launcher.png'],
  },
  wiredeck: {
    tagline: '无线 ADB 桌面控制台。',
    features: [
      { title: '无线调试', description: '同一 Wi-Fi 下连接 Android 设备，不再插线。' },
      { title: 'USB 备用', description: '网络不可用时自动退回 USB 调试。' },
      { title: '桌面工作台', description: '设备、应用与日志集中在一个窗口。' },
      { title: '轻量原生', description: '不依赖浏览器运行时，启动即用。' },
    ],
    screenshots: ['https://dist.woyuxiaji.cn/assets/screens/wiredeck.png'],
  },
  dianmo: {
    tagline: '面向单机离线游戏的 Android 内存修改器。',
    features: [
      { title: 'Root 内存编辑', description: '需要 Root 权限，直接读写目标进程内存。' },
      { title: '单机离线', description: '只面向本地单机游戏，不接入在线服务。' },
      { title: '精确扫描', description: '按数值类型与范围定位并修改内存。' },
      { title: '轻量专注', description: '一个工具，只做一件事。' },
    ],
    screenshots: [],
  },
};
