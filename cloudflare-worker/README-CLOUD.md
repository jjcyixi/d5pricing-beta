# D5 Beta 价格页 · 云端分享（Cloudflare Worker + Durable Object）

**尚无公网 Worker URL。** 需你方账号 `wrangler login` 后部署。本目录不含密钥。  
**KV 已降级移除**：权威存储为一项目一 Durable Object（强一致串行），避免 KV 最终一致导致静默覆盖。

## 部署进度（如实）

| 项 | 状态 |
|---|---|
| 源码（Worker + ProjectDO + 前端 cloud-sync） | ✅ 本包已齐 |
| 本地 Fake-DO 并发单测 | ✅ `node tests/worker-do-concurrent.test.mjs` |
| Cloudflare 账号 `wrangler login` | ❌ 未授权（缺登录） |
| DO migration / `wrangler deploy` | ❌ 未执行 → **无 workers.dev 地址** |
| 前端 `D5_CLOUD_API` 指向公网 | ❌ 依赖上项 |
| GitHub Pages 静态站 `d5pricing-beta` | ⏳ 等嘉诚仓库链接后另推；**不等于**云端持久化 |

## API 契约

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/projects` | 创建。Body: `{ title?, payload }` → `{ id, editToken, viewToken, version, updatedAt, title }` |
| `GET` | `/api/projects/:id?token=` | view 或 edit → `{ id, version, updatedAt, title, role, payload }` |
| `PUT` | `/api/projects/:id` | Body: `{ token, version, payload, title? }`。仅 edit。版本不一致 → **409** `{ error:'conflict', currentVersion, serverUpdatedAt }`。同 version 并发：DO 内仅一成，其余 409 |
| `POST` | `/api/projects/:id/rotate` | Body: `{ token }`（旧 edit）。轮换 editToken |
| `GET` | `/api/health` | `{ ok, service, storage:'durable_object' }` |
| — | 无公开 list | 项目默认私密 |

CORS：仅 `ALLOWED_ORIGINS` 中的 **Origin**（scheme+host[+port]，**不含路径**）。  
GitHub Pages 前端 Origin 为 `https://jjcyixi.github.io`（不是 `…/d5pricing-beta`）。

## 部署步骤

```bash
cd cloudflare-worker
npx wrangler login          # 需浏览器授权 — 当前未完成
# wrangler.toml 已含 [[durable_objects.bindings]] PROJECT → ProjectDO 与 migrations v1
# 编辑 [vars] ALLOWED_ORIGINS（默认已含 https://jjcyixi.github.io 与本地端口）
npx wrangler deploy
```

记下 `https://d5-pricing-beta-share.<account>.workers.dev`，配置到前端（见下）。

## 前端配置

优先级：`window.D5_CLOUD_API` → `<meta name="d5-cloud-api">` → `localStorage['d5-cloud-api-base']`。

未配置时 UI 明示「仅本地」，编辑器不崩溃。

## 分享链接形态（保留 Pages 子路径）

用**当前页面 URL** 的 origin+pathname 构造（`cloud-sync.js` → `pageShareBase()`）：

- 编辑：`https://jjcyixi.github.io/d5pricing-beta/?project={id}#edit={editToken}`
- 只读：`https://jjcyixi.github.io/d5pricing-beta/?project={id}#view={viewToken}`

禁止拼成丢子路径的 `https://jjcyixi.github.io/index.html?…`。  
Token 在 **hash**；CORS Origin 仍是 `https://jjcyixi.github.io`。

## 为何不用 KV 做 PUT CAS

Cloudflare KV 最终一致且无原子 compare-and-swap：`get → check version → put` 下，A/B 同持 version=1 可能双双成功写 version=2，静默覆盖。  
本实现把读写/版本检查放进 **ProjectDO**；同对象请求串行，临界区内检查 version 再写。

## 安全边界

- 不把 Account / API Token 提交进仓库
- 无公开 list；持 edit/view 链接者可访问
- 离线导出 HTML **剥离** 云端 token
- 教育官网 / 真实支付不在本 Worker 范围
