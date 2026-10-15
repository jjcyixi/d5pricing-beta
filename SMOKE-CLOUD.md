# 云端分享冒烟（Mac 双会话）

**前提**：已 `wrangler deploy`（Durable Object），前端已配置 `D5_CLOUD_API`。  
**尚无公网地址时**：只跑「0. 未配置」与「7. 分享链接子路径」；完整互改等部署后。

## 0. 未配置 API
1. 清掉 `localStorage d5-cloud-api-base`，无 meta / 无 `D5_CLOUD_API`。
2. 打开价格页 →「云端分享」→「未配置云端 API，仅本地」；创建/保存不可用或明文失败。
3. 本地编辑 / 导出 HTML 仍可用。

## 1. 双浏览器同项目互改（底线）
1. A：配置 API →「创建分享项目」→ 复制**编辑链接**（须含 `/d5pricing-beta/` 若在 Pages）。
2. B（无痕）：打开编辑链接 → 自动拉取；改文案 →「保存到云端」→ version+1。
3. A：拉取或刷新 → 见 B 的修改；再改保存 → B 刷新一致。

## 2. 只读链接
只读可浏览、不可云端保存；编辑令牌仍可保存。

## 3. 冲突（含并发语义）
1. A、B 同 version → A 先保存成功。
2. B 不拉取直接保存 → **409** 明文；可拉取后再存，或确认「强制覆盖」。
3. 部署后可用两客户端几乎同时点保存验证：仅一方成功。本地单测：`node tests/worker-do-concurrent.test.mjs`。

## 4. 断网 / 5xx
Offline 或停 Worker → 保存/拉取明文失败，不假成功。

## 5. 离线 HTML 无 token
导出 HTML 源码不含当前 edit/view token；`D5_EDITOR_BOOT` 仅 draft+view。

## 6. 业务数字
源默认 Basic 49/399、Pro 200/1920、1000+500、社区 300；云端只同步草稿 payload。

## 7. 分享链接子路径（Pages）
在 `https://jjcyixi.github.io/d5pricing-beta/`（或 `/index.html`）创建项目后，编辑/只读链接必须仍含 `/d5pricing-beta/`，不得变成 `https://jjcyixi.github.io/index.html?project=…`。  
本地：`node tests/share-link-path.test.mjs`。
