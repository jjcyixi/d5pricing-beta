# 编辑器冒烟（Beta gork）

## 本地起页

```bash
cd pricing-beta-202611
python3 -m http.server 8769 --bind 127.0.0.1
# 浏览器打开 http://127.0.0.1:8769/
```

Mac 验收可用既有 8768；勿与本机其他服务抢端口即可。

## 关键用例

1. **全页可编**：点「编辑页面」，虚线文案 ≥ 数十处（hero、三卡文案、对比表头/行名、FAQ 问答、教育条、团队模块等）；无「仅白名单」限制。
2. **演示价订单一致**：打开「价格 / JSON」，把 `demoPricing.prices.basic.monthly` 改为 `77`，`monthlyCredits` 改为 `1200`，应用 → 卡片 Basic 显示 ¥77；点订阅打开订单预览金额 ¥77、基础积分 1200；对比表价格行含 77。清除演示价后回 ¥49 / 1000。
3. **文案草稿不串视图**：改中文 hero 标题 → 切 EN 再切回中文仍在；切月年/个人团队不丢。
4. **模块显隐**：取消 FAQ 勾选 → FAQ 隐藏；导出 JSON 含 `moduleVisibility`。
5. **硬刷新保留**：改文案后等「已保存」→ 刷新 → 仍在（键 `d5-pricing-beta-gork-v1`）。
6. **离线 HTML**：导出 HTML → `file://` 断网打开 → 所见保留 → 再编辑 → 再导出。体积约 350KB+，源码无未内联的相对 `*.css`/`*.js`（boot 内已带 bundle）。
7. **非法 JSON**：导入缺 schema / 涂改超范围数字 → 状态栏报错，页面源价不变。
8. **教育 / 充值边界**：学生「立即申请」→ `https://www.d5render.cn/edu/`（需联网）；离线 HTML 内充值入口只读提示。

## 自动化（可选）

仓库旁 `_smoke/smoke.mjs`（需本机 Chrome + puppeteer-core）曾对上述 1–2、离线 build、模块显隐跑通。交付 tar **不含** `_smoke/node_modules`。
