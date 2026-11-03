# VaKao Hub Launcher Frontend

技术栈：Vue 3 + TypeScript + Vite。界面采用自定义设计系统，未引入通用组件库，以保持品牌视觉一致。

## 结构

```text
src/
├── App.vue                 # 页面编排、目录状态与业务动作
├── components/
│   ├── AppCard.vue         # 应用卡片与卡片菜单
│   ├── AppDetailPanel.vue  # 应用详情、截图、更新日志、自定义滚动条
│   ├── LauncherHeader.vue  # 品牌头、刷新、搜索、排序、视图切换
│   ├── SettingsModal.vue   # 外观、更新频率、分发服务、关于
│   ├── StatusBar.vue       # 上次检查、来源、服务状态、外链
│   └── UninstallDialog.vue # 卸载确认与数据删除选项
├── composables/
│   └── useTheme.ts         # 明暗/跟随系统、原生标题栏、持久化
├── lib/
│   ├── detail-meta.ts      # 应用详情静态文案
│   ├── format.ts           # 日期、大小、首字母、进度格式化
│   ├── meta.ts             # 详情类型
│   ├── theme.ts            # 主题色、哈希色、色值工具
│   └── version.ts          # 版本比较
└── api.ts                  # Wails 绑定与 API 类型
```

## 约束

- `App.vue` 不直接写大段页面结构，只负责组合组件和业务状态。
- 新 UI 片段优先放入 `components/`，公共逻辑放入 `composables/` 或 `lib/`。
- 修改后执行 `npm run build`；发布前执行 `wails build`。
