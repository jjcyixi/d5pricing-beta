## 2026-10-15 · 团队页：只展示团队版（会议 10-14 蒋嘉诚）

- **个人侧冻结**：未改个人卡 / CTA / 估算 tip /「限时赠送」；不 clear `localStorage`。
- **国内 3.2 展示**：团队 tab **只渲染「团队版」**；去掉「企业版」模块；**不露出「基础席位 / 专业席位」并列卡**，不展示席位公开价/积分数。
- **文案**：席位分级可灵活配置 · 联系销售；通用权益短列表（共享积分池/后台/看板/100G/客服/AI/资产管理）；主 CTA「获取团队方案」+ 次 CTA「预约试用」（均为 contact-sales）。
- 源数据 `data.js` BUSINESS 收成单模块无 seats；`business.js` 单卡渲染；biz-scoped CSS；cache `?v=20261015-team-only`。
- FAQ 团队购买一句去掉「企业版」表述（非个人文案）。

## 2026-10-15 · 企业侧扫读收口（对齐个人卡）

- **个人侧冻结**：未改个人卡文案 / CTA / 估算 tip / 对比「限时赠送」路径；不 clear localStorage。
- **企业 IA**：去掉 team 大标题长文 + module tagline 叠层；页顶一行「按席配置 · 联系销售报价」；模块仅 title + 一句 subtitle + 小字 note。
- **席位卡**：name + 一行定位（Basic=Arco AI 协作 / Pro=Arco + D5 Render 专业版）；共享积分池 + 销售确认小字；CTA 仍销售导向；AI/功能短 bullet；细则收进「充值与合同说明」details。
- **Team vs Enterprise**：并发 10 vs 不限；单团队 vs 跨团队额度。**Basic vs Pro**：Pro 含 Render 专业版 / Render 免积分增强 / 项目协作。
- 源文案在 `data.js` BUSINESS（`ai`/`features`）；`business.js` 只渲染。biz-scoped CSS 收紧。cache `?v=20261015-biz-scannable`。

## 2026-10-15 · 手改优先硬规矩

- **永不覆盖用户手改**：`draft.copy` 已有键不被 data.js/app.js 默认文案写回；`applyCopyStyles` 期间禁止 `commit`（防 renderAll 把默认值存进草稿）。
- 对比表 `zh:compare.row.0.2` 恢复为用户删减后的「限时赠送」（默认源文案仍为「发布限时赠送」，仅草稿覆盖）。
- 同步代码到 8788 时只拷文件，**不** clear localStorage。
- cache bust：`?v=20261015-hand-edit-guard`。

# CHANGELOG — Beta editor gork（2026-10-15）

## 2026-10-15 · 黄框数字框内可编（edit-max）

- 用户要求 demo 可编辑性尽量大；黄虚线 `data-demo-field`（价/积分）改为 **contenteditable 框内直接改**，不再点开会抢焦点开 JSON。
- `commitDemoField`：失焦解析数字写回 `draft.demoPricing`（`prices.*.monthly|annual`、`monthlyCredits`、`launchBonus`、`communityCredits`）→ `applyDemoToRuntime` + `renderAll`，产能/对比/订单同源。
- `app.js`：月积分 base 与 `.launch-gift` 分字段；标题改「框内直接修改」。JSON 面板仍可由工具栏打开。
- 跨方案隔离逻辑保留；业务默认数字未改；cache bust `?v=20261015-edit-max`。
- 回归：`tests/edit-key-isolation-smoke.mjs` 增加 demo-field 可编断言。


## data.js / business.js
- **仅增加** runtime overlay 读取：`demoPricing()`、`communityCredits()`、`communityDays()`、`sourcePricing()`；`price` / `monthlyBatch` / `buildCompare` / `snapshotPricing` 在存在 `window.D5Demo.pricing` 时走演示层。
- **未改**源字面量：Basic 49/399、Pro 200/1920、`monthlyCredits: 1000`、`oneTimeCredits: 300`、赠分仍按 `subscriptionBonusRate: 0.5`。
- business.js：团队模块/席位补 `data-edit-key`（无业务数字变更）。

## app.js / flows.js
- 卡片积分与短带、订单预览改为读 `D.monthlyBatch` / `D.communityCredits`，与演示层同源。
- 开放更多 `data-edit-key`；功能行不再因含数字而禁止编辑键。
- 去掉首发短带容器级 `data-locked`（子文案可编；权威数字走 demo 面板）。

## editor.js / editor.css
- 移除 `allowed()` 白名单；V4 式全页 sweep + JSON 价格面板 + 模块显隐 + 离线 HTML。
- 新草稿键/schema，与旧 `d5-beta-copy-v1` 分离，支持显式导入旧稿。

## 2026-10-15 · cloud sync
- Added `cloudflare-worker/` (Worker + KV API, no public list, 409 conflicts).
- Added `cloud-sync.js` + toolbar「云端分享」; edit/view links; save/pull/force.
- Offline HTML boot strips cloud session/tokens.
- Docs: `README-CLOUD.md`, `SMOKE-CLOUD.md`; capability table updated.
- **No public Worker URL until wrangler deploy** (credentials not in repo).

## 2026-10-15 · cloud DO fix
- Replaced KV get→check→put with per-project **Durable Object** (`ProjectDO`); concurrent same-version PUT → one 200 + rest 409.
- `pageShareBase()` keeps `/d5pricing-beta/`; CORS default includes `https://jjcyixi.github.io`.
- Tests: `worker-do-concurrent.test.mjs`, `share-link-path.test.mjs`.
- **Still no public Worker URL** (wrangler login pending).

## 2026-10-15 · align display to V4 output45 + keep V3 editor

- **母版**：Mac `d5pricing-v4-output-20261015`（box `/workspace/uploads/d5pricing-v4-output-20261015/`）；未读到实时 8767。
- **app.js**：AI 权益改为 output45 短句扫读（模型/分辨率/并发/商用/增强）；产能按**基础月积分 1000**（500 张 / 80 秒）与社区 300（150/25），公式 `floor(c/2)`、`floor(c/60)×5`；首发 +500 仍只在积分行；Pro 增加「原 D5 Render 专业版权益完整保留」；scope → `Arco + D5 Render 专业版`。
- **beta.css**：恢复 `.feature-upgrade` 淡色边框高亮与大号产能数字（此前被抹平）；保留 Beta 1200 布局与首发短带。
- **editor.js**：SWEEP 含 `.pro-retained`；编辑能力仍对齐 V3（开关/sweep/JSON 价/导入导出）。
- **未改**：`data.js` 业务字面量；无四档滑条；无真实支付；未推 GitHub。
- 差距文档：`../GAP-V4-display-V3-editor.md`。

## 2026-10-15 · 编辑层重写（顶栏 V3 手感）

- 根因见 `EDITOR-REWRITE.md`：底栏难发现、`plaintext-only` 在 Safari 失效、编辑态 CTA 抢点击
- `index.html` 顶部静态 `#d5-editor` /「编辑模式」；`editor.js`/`editor.css` 重写
- `contenteditable="true"`；每次 `d5:render` 重挂 sweep；价格仍走 JSON 面板
- 草稿 schema `d5-beta-editor-gork-v2`（兼容读 v1）；`D5Editor` / cloud-sync 接口保留
- 缓存 bust：`?v=20261015-editor-rewrite`
- 自检：`tests/editor-rewrite-smoke.mjs`（20/20）

## 2026-10-15 · 权益编辑跨列隔离

- 用户反馈：改基础/专业「功能与权益」时社区版文案会变。
- **复现结论：未复现。** CDP 下 `plan.{plan}.feature/ai/terms.*` 本已分列；批量改基础版后 `communityChangedCount=0`，`sharedAcrossPlans=[]`。同 key 跨节点仅见 `plan.*.name` 卡片标题↔对比表表头（同方案，有意同步）。
- 脆弱点（未触发该反馈，仍加固）：`capacityBlock` / `.compare-text` 曾靠 `auto.*`；`[data-zh][data-en]` 用无 idx 的 `i18n.${class}` 会撞键。
- 加固：`capacityBlock` → 稳定 `plan.${plan}.capacity*`；对比单元格 → `compare.cell.{g}.{r}.{c}`；`commit` 禁止跨不同 `[data-plan-card]` 同步（同方案卡片↔表头 name 仍可）；`i18n.${guess}.${idx}` 防撞键。
- 回归：`tests/edit-key-isolation-smoke.mjs`；业务数字未改；未推 GitHub。

## 2026-10-15 · AI 权益对齐飞书表（入门档）

- 卡面 AI：商用分档（基础=AI生成可商用 / 专业=全部成果可商用）；增强拆成 Arco 消耗 / Render 不支持|不消耗。
- 从「使用与充值规则」提炼到功能：每画布分享链接数、可否充值；细则只留规格说明/评论边界/下载水印细节/充值入口。
- AI/新提炼行改用语义 `data-edit-key`，避免盖掉用户其它手改；不重置 localStorage。

## 2026-10-15 · 个人版 CTA + 估算角标

- 付费卡 CTA：月付「立即订阅」、年付「立即购买」（edit key 分 billing，不盖社区版手改 CTA）。
- 用量估算：去掉下拉「估算说明」；标签旁 ? 悬停短文案（图像 2/张，Seedance 2.0 Mini 12/秒）；视频秒数按 /12 计算。

## 2026-10-15 team-seat-diff
- Team tab: one Teams product; common benefits + Basic/Pro seat entitlement compare (not buyable seat cards).
- No Enterprise; no public seat prices/credit amounts. Personal frozen.
