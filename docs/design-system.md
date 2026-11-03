# VaKao Hub 设计系统

## 概念

**档案室 / 工作台**：像一份排版克制的软件档案，而不是彩色应用商店。纸面、墨色、四色星芒作为唯一彩色来源；信息靠字号、间距和 1px 线分层，不靠阴影和渐变大色块。

参考对象与取舍：

- [Setapp](https://setapp.com/)：软件目录的信息层级与卡片密度；
- [Raycast](https://www.raycast.com/)：大字号标题、克制的黑白色、产品截图；
- [Linear 设计刷新](https://linear.app/now/behind-the-latest-design-refresh)：降低导航噪音，让主内容先被看到；
- [Craft Launcher](https://github.com/storytold/craft-launcher)：应用列表的状态、版本与操作组织方式。

## 设计令牌

| Token | 值 | 用途 |
| --- | --- | --- |
| `--paper` | `#F3F1EC` | 页面背景 |
| `--raised` | `#FAF9F5` | 卡片/面板 |
| `--ink` | `#171512` | 主文字、主按钮 |
| `--strong` | `#0E0D0B` | 大标题 |
| `--muted` | `#5E5A52` | 正文/描述 |
| `--faint` | `#8C877D` | HUD、注释、次要信息 |
| `--line` | `rgba(23,21,18,.12)` | 1px 分隔线/边框 |
| `--line-soft` | `rgba(23,21,18,.07)` | 表格内分隔线 |
| `--line-strong` | `rgba(23,21,18,.24)` | 输入框 hover 边框 |
| `--table-head` | `#F8F7F2` | 表头/行 hover |
| `--table-head-text` | `#6B6459` | 表头文字 |
| `--shadow-soft` | `rgba(16,24,40,.03)` | 卡片微阴影 |
| `--shadow-panel` | `rgba(16,24,40,.07)` | 登录/浮层阴影 |
| `--topbar-bg` | `rgba(250,249,245,.86)` | 管理端顶栏 |
| `--raised-soft` | `rgba(250,249,245,.5)` | 半透明面板 |
| `--accent-soft` | `rgba(70,166,198,.05)` | 强调块底色 |
| `--success` | `#4A8F6B` | 成功状态 |
| `--warning` | `#B4763C` | 警告状态 |
| `--danger` | `#9A453A` | 危险状态 |
| `--nav-bg` | `#171512` | 导航底色 |
| `--nav-text` | `#FAF9F5` | 导航主文字 |
| `--nav-soft` | `rgba(250,249,245,.6)` | 导航次文字 |
| `--nav-muted` | `rgba(250,249,245,.38)` | 导航 HUD |
| `--nav-hover` | `rgba(250,249,245,.06)` | 导航 hover |
| `--nav-active` | `rgba(70,166,198,.16)` | 导航选中底色 |
| `--nav-line` | `rgba(250,249,245,.12)` | 导航分隔线 |
| `--accent` | `#46A6C6` | 链接、进度、交互 |
| `--orange / --blue / --purple / --yellow` | `#F0995F / #5FBEDC / #A27FC2 / #EDDF55` | 星芒、状态、单点强调 |

深色：背景 `#121210`、面板 `#1A1916`、文字 `#F2EFE7`，四色不变。

## 实现

- 令牌唯一来源是 [`packages/shared/design/tokens.css`](../packages/shared/design/tokens.css)，admin 通过 `@import` 使用。
- website 与 launcher 前端是独立构建产物（不依赖 workspace 包），保留同值副本；`packages/server/tests/design-tokens.test.mjs` 校验三端令牌一致，并确保 admin 样式无硬编码色值。
- admin 的 Naive UI 主题在运行时读取 CSS 变量构造，不在 JS 维护第二套色值。
- 暗色：显式 `data-theme="dark"` 或系统 `prefers-color-scheme`；admin 顶栏提供明暗切换，选择写入 localStorage。

字体：

- 展示：Archivo（600–800，字距收紧）；
- 正文：Inter（400–600）；
- 引文：Instrument Serif Italic；
- 中文：PingFang SC / Noto Sans SC；
- 数据/HUD：SF Mono / Menlo，大写，字距 +4%。

## 版式

- 12 列网格，间距 24px，页面最大宽度 1240px；
- 大标题占 6–8 列，正文不超过 560px；
- 分区用 `01 / CATALOG` 一类 HUD 编号；
- 卡片圆角 10–14px，边框 1px，无重阴影；
- 列表行高 64–88px，同一行只保留一个主操作。

## 组件

- **星芒**：四色顺序固定（上橙、右蓝、下紫、左黄），只用于品牌与单点强调。
- **状态**：`当前运行`（墨色）、`可更新`（蓝）、`已安装`（灰）、`必须更新`（橙）。
- **按钮**：主按钮墨色实心；次按钮透明 + 1px 线；危险操作仅文字/描边。
- **进度**：细线进度条，蓝紫渐变只用于进度，不用于装饰。
- **数据块**：标签在上、数字在下，数字用 Archivo，标签用 HUD。

## 动效

- 只使用透明度、位移 4–8px、颜色过渡，160–220ms；
- 不做弹跳、闪烁、彩色频闪；
- 支持 `prefers-reduced-motion`。

## 三端应用

- **启动器**：左侧固定导航 + 主区应用列表；顶部总览数字；设置用右侧抽屉；应用行显示图标、版本、状态与单一主操作。
- **管理后台**：墨色侧栏 + 纸面内容区；表格/表单用细线框，版本号和哈希用等宽字体；总览用数字块与漏斗。
- **下载站**：编辑式排版，大标题 + 启动器截图；软件目录是主体，平台切换保持轻量。
