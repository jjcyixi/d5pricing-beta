# Beta 价格页第二轮完善 · 2026-10-15

## 协作依据
- JJC 12:02：排版、设计、页面可编辑不完善，要求与 gork bot 沟通后一起完善。
- gork bot 12:04 共同评审，12:10 二审（原文存 tmp/beta-gork-design-round2-response.txt）。
- 采纳：首发叙事只保留一处；三卡按身份/价值→价格→CTA→AI权益→功能排列；Pro差异只强调已核实的Render专业版权益；编辑草稿按逻辑字段，不按月年拆多稿；事实锁定，导出HTML需自包含。
- 二审再采纳：AI高亮缩至3条，增强/放大支持说明移入使用条款（完整权益仍在对比表），避免高亮区变长清单。

## 已改
- 1200px内容宽，三卡20px间距、26px内边距，黑紫视觉收敛。
- 价格、CTA、AI区与功能区在桌面对齐；390单列，表格局部横滚、行名固定与滚动提示。
- 首发短带只有一个，点击查看规则展开同处详情；去掉独立三列规则区、重复脚注，FAQ不重复窗口全文。
- 学生原文与edu直达保留；个人团队隔离；不改价、不改积分、不扩权益。
- 已清除订单预览中的“不一次发全年”内部描述。

## 事实源保持
- data.js / business.js / i18n-sync.js / topup.js 与修改前SHA256一致。
- 修改前源码备份 tmp/beta-redesign-20261015/source-before；可控Chrome浏览器DOM/localStorage备份 browser-before.json。既有Beta无contenteditable编辑器，未见其编辑草稿。
- 未操作用户常规Chrome未导出的改动；测试使用独立Chrome profile /tmp/d5-beta-review-chrome。
- V4 8767未改。

## 验收
- 实际Chrome/CDP测试：1440/390 × 中英 × 个人团队 × 月年 = 16组合通过（价格、三卡、团队隔离、无页面横向溢出、edu直达、桌面分区对齐）。
- 12组合购买预览（中英×月年×三卡）通过，Escape关闭与焦点回原按钮通过，首发详情链接可展开。
- 测试记录：acceptance-redesign/visual-matrix.json、orders.json与截图。
- 标题/副文、版本名与定位、CTA、无数字权益文案、对比表非数字表头/行名/分组、FAQ问题提供稳定编辑key；版本名在卡片与表头共用同一key。
- 编辑器继续由独立coding任务完善（job codex-ef38c346）；不以代码落盘代替浏览器验收。独立终验脚本 acceptance-redesign/independent-final-check.py 与 independent-roundtrip.py 已备。
- 14:30 Gork 终审补充：表头/行名要能编、样式必须进草稿、答案锁定给只读提示；必须验硬刷新、离线打开/二次导出、跨视图、事实锁、非法JSON与恢复隔离。

## 二审与补充
- gork 12:10 二审确认结构可继续，强调AI高亮只保留2–3行；已压至3行并保留增强放大说明于条款。
- 1024/768/320中英额外断点无页面横溢。
- 原Node DOM fixture未模拟window事件/Event，已更新测试夹具；逻辑验收当前唯一未通过项为editor文件仍待完成，不是业务失败。

## 14:45 最终收口
- Codex 任务查到了缺陷，但未落修复代码且沙箱无法连接本机浏览器；已取消任务，主代理亲自完成 editor.js / editor.css，不将协作者计划冒充实现。
- 输入即进入草稿并自动保存；修复离线重开误用boot旧稿、语言原文缓存、同key多节点同步、字号整数校验；点文可改文案和字号/颜色/对齐。FAQ答案锁定，问题侧给只读规则提示。
- 100项真实Chrome布局/订单/焦点/源文件验收通过（1440/390/320）；17项持久化/非法导入/离线断网二次导出通过；7项25步撤销重做/样式刷新/恢复确认通过。详情 independent-*-results.json / .log。
- 逻辑检查全通过，data.js/business.js/i18n-sync.js/topup.js保持不变；原V3/V4 SHA256树无差异。
- 自包含离线产物 D5-首发价格页-Beta.html（约356KB），可离线打开、编辑、再次导出。教育官网需联网；独立充值页未嵌入，离线入口禁用并提示返回本机预览，在线入口仍正常。不含真实支付/账号变更。
- 测试仅在独立Chrome profile进行，验收草稿恢复原值，未覆盖用户常规Chrome草稿。
