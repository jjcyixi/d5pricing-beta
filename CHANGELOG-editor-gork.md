# CHANGELOG — Beta editor gork（2026-10-15）

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
