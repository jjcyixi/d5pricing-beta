# Beta 编辑自由度对照（V3/V4 → gork 实现）

工作目录：`d5pricing-beta-editor-gork/pricing-beta-202611/`  
草稿键：`localStorage['d5-pricing-beta-gork-v1']`（schema `d5-beta-editor-gork-v1`）  
业务默认仍在 `data.js` 字面量；演示覆盖走 `window.D5Demo.pricing`。

| 旧 V3/V4 能力 | 新版位置 / 操作 |
|---|---|
| 编辑模式开关（demo-toolbar「编辑模式」） | 底部浮动条「✎ 编辑页面」/`D5Editor.setMode`；`body.d5-editing` + `body.editing` |
| `data-edit` / `data-i18n` 可 contenteditable | `editor.js` `enableSweep`：`[data-edit-key]`、`[data-edit]`、`[data-i18n]`、`[data-zh]+[data-en]` |
| 全页 selector sweep（hero/卡/对比/FAQ/教育/footer/billing…） | 同文件 `SWEEP` 列表 + `data-edit-auto` 兜底；无白名单 |
| 文案覆盖 `copyOverrides` | draft.`copy`，键格式 `zh:key` / `en:key`；月年/个人团队仅投影不切分草稿 |
| JSON 面板改 tiers / 价格数字 | 「价格 / JSON」面板：`demoPricing` + copy；「应用」→ `applyDemoPricing` / `D5Demo.pricing` |
| 改价后卡片与结算一致 | `data.js` `price` / `monthlyBatch` / `communityCredits` / `buildCompare` 读 overlay；`flows.js` 订单预览同源 |
| 导出 / 导入 JSON | 「导出草稿 JSON」「导入草稿」；可迁旧 `d5-beta-copy-v1`；松散兼容 V4 `copyOverrides` |
| 重置 | 「恢复原稿」确认后清空 copy/styles/demoPricing |
| 本地持久化 | 自动保存 350ms；`beforeunload` 落盘 |
| （Beta 增强）撤销 / 重做 | 工具栏 ↶↷，栈深 50 |
| （Beta 增强）字号 / 颜色 / 对齐 | 编辑态格式条；另支持上间距 `paddingTop` |
| （Beta 增强）离线单文件 HTML | 「导出 HTML」：内联 CSS/JS/图 + `D5_EDITOR_BOOT`；重开可再编再导出 |
| （补齐）模块显隐 | 编辑态勾选 Hero / 首发短带 / 学生条 / 对比 / FAQ / 页脚 → `moduleVisibility` |
| 演示会员下拉（V4） | draft.`membershipId` 字段保留在 JSON；Beta 无多档滑条，不做 V4 slider |
| 教育链接 | 仍为 `https://www.d5render.cn/edu/`（HTML + `data.js` EDUCATION） |
| 充值页 | 在线 `topup.html`；离线导出将入口标只读并提示回本机预览 |

## 演示数字怎么改（勿只改 DOM）

1. 点「价格 / JSON」，编辑 `demoPricing`（`prices` / `monthlyCredits` / `launchBonus` / `communityCredits`）。
2. 点「应用」。卡片价、对比表金额/积分、订单预览同步。
3. 「清除演示价」或重置 → 回 `data.js` 源默认（Basic 49/399、Pro 200/1920、1000+500、社区 300）。

页面上带黄虚线的 `[data-demo-field]` 节点点击会打开同一面板，避免 contenteditable 改出假价。

## 云端分享（Cloudflare Worker + 每项目 Durable Object）

| 能力 | 位置 |
|---|---|
| 创建私有项目 + 编辑/只读双链接 | `cloud-sync.js`「云端分享」；`POST /api/projects` → ProjectDO |
| 保存到云端 / 拉取最新 | 同面板；`PUT` / `GET`；本地 `localStorage` 仍作缓存 |
| 版本冲突 409（强一致） | DO 内串行 check+write；同 version 并发仅一成；UI 提示拉取或「强制覆盖」 |
| 分享链接保留 Pages 子路径 | `pageShareBase()` 用当前页 URL；例 `…/d5pricing-beta/?project=…` |
| CORS Origin | `https://jjcyixi.github.io`（**不含** `/d5pricing-beta` 路径） |
| 配置 API | `window.D5_CLOUD_API` / `<meta name="d5-cloud-api">` / `localStorage d5-cloud-api-base` |
| Worker | `cloudflare-worker/`（DO binding `PROJECT`；**无 KV 权威存储**） |
| 离线 HTML | `buildHtml` **不**写入 edit/view token |
| 公开列表 | **无** |

**尚无公网 Worker URL / DO 未部署**：缺 `wrangler login`。未配置时 UI「仅本地」。Pages 静态托管 ≠ 云端持久化。
