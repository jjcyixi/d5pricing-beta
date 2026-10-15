# D5 Beta 价格页 · 云端分享（Cloudflare Worker + KV）

尚无公网地址，需你方账号执行 `wrangler login` 后部署。本目录不含密钥。

## API 契约

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/projects` | 创建项目。Body: `{ title?, payload }` → `{ id, editToken, viewToken, version, updatedAt, title }` |
| `GET` | `/api/projects/:id?token=` | 持 view 或 edit token。→ `{ id, version, updatedAt, title, role, payload }` |
| `PUT` | `/api/projects/:id` | Body: `{ token, version, payload, title? }`。仅 edit。版本不一致 → **409** `{ error:'conflict', currentVersion, serverUpdatedAt }` |
| `POST` | `/api/projects/:id/rotate` | Body: `{ token }`（旧 edit）。轮换 editToken，view 不变 |
| `GET` | `/api/health` | `{ ok: true }` |
| — | 无 `GET /api/projects` 列表 | 项目默认私密，不进公开列表 |

CORS：仅 `ALLOWED_ORIGINS`（逗号分隔）中的 Origin；**拒绝 `*`**。

## 部署步骤

```bash
cd cloudflare-worker
npx wrangler login
npx wrangler kv:namespace create d5-pricing-beta-share
npx wrangler kv:namespace create d5-pricing-beta-share --preview
# 将返回的 id / preview_id 填进 wrangler.toml 的 [[kv_namespaces]]
# 编辑 [vars] ALLOWED_ORIGINS，加入真实页面 Origin（如 https://your-pages.example）
npx wrangler deploy
```

记下输出的 `https://d5-pricing-beta-share.<account>.workers.dev`。

## 前端配置

任选其一（优先级从上到下）：

1. 页面里：`window.D5_CLOUD_API = 'https://d5-pricing-beta-share.<account>.workers.dev'`
2. `<meta name="d5-cloud-api" content="https://...">`
3. 浏览器控制台：`localStorage.setItem('d5-cloud-api-base', 'https://...')` 后刷新

未配置时工具栏显示「未配置云端 API，仅本地」，本地编辑器仍可用。

## 分享链接形态

- 编辑：`{页面Origin}/index.html?project={id}#edit={editToken}`
- 只读：`{页面Origin}/index.html?project={id}#view={viewToken}`

Token 放在 **hash**，减少进 Referer / 访问日志；请求 Worker 时仍经 query/body 传递。

## 本地开发（可选）

```bash
npx wrangler dev
# 前端 ALLOWED_ORIGINS 已含 localhost；把 D5_CLOUD_API 指到 wrangler 给出的地址
```

## 安全边界

- 不把 KV id、API Token、Account 密钥提交进仓库明文
- 不提供公开 list
- 离线导出 HTML **剥离** 云端 token（不写入 `D5_EDITOR_BOOT`）
- 教育官网 / 真实支付不在本 Worker 范围
