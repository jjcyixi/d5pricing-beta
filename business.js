// B2B benefits and cards preserved from V4. No launch bonus.
function renderProSummary(lang) {
  return lang === 'zh' ? [
    '<b>完整 D5 Render 专业版</b>',
    '<b>16,000+</b> 云端素材',
    '城市生成与专业灯光',
    'VR / XR 与交互漫游',
    'Render AI 增强与放大 <b>免积分</b>',
  ] : [
    '<b>Full D5 Render Pro</b>',
    '<b>16,000+</b> cloud assets',
    'City generation & professional lighting',
    'VR / XR & interactive tours',
    'Render AI enhance & upscale <b>without credits</b>',
  ];
}

function businessBenefitGroups(seat, moduleId) {
  const zh = state.lang === 'zh';
  const enterprise = moduleId === 'enterprise';
  const pro = seat.style === 'pro';
  const ai = zh ? [
    'AI 图像与视频创作 <em>全部 AI 模型可用 · AI 生成内容可商用</em>',
    enterprise ? '同时运行的 AI 任务数 <b>不限</b>' : '最多同时运行 <b>10</b> 个 AI 任务',
    'AI 生图与视频最高 <b>4K</b> <em>具体输出以所选模型及功能支持为准</em>',
    '<b>团队 AI 积分共享与分配</b> <em>基础席位与专业席位共享积分池</em>',
    enterprise ? '<b>跨团队</b>积分额度管理' : '<b>单团队</b>积分额度管理',
    pro ? 'AI 增强与放大 <em>Arco 内消耗积分；Render 内不消耗积分</em>' : 'AI 增强与放大 <em>Arco、Render 内均消耗积分</em>',
  ] : [
    'AI image & video creation <em>All AI models · Commercial-use AI output</em>',
    enterprise ? '<b>Unlimited</b> concurrent AI tasks' : 'Run up to <b>10</b> AI tasks at once',
    'AI images & video up to <b>4K</b> <em>Output depends on the selected model and feature</em>',
    '<b>Shared team AI credits & allocation</b> <em>Basic and Pro seats share one credit pool</em>',
    enterprise ? '<b>Multi-team</b> credit quota management' : '<b>Single-team</b> credit quota management',
    pro ? 'AI enhance & upscale <em>Consumes credits in Arco; no credit consumption in Render</em>' : 'AI enhance & upscale <em>Consumes credits in both Arco and Render</em>',
  ];
  const features = zh ? [
    '设计成果分享与反馈 <em>支持画布、对话分享与 Arco 项目评论</em>',
    '每个画布的分享链接数 <b>不限</b>',
    '分享下载权限控制 · 可关闭署名水印',
    '团队成员与数字资产统一管理',
  ] : [
    'Share designs & collect feedback <em>Canvas and conversation sharing; Arco project comments</em>',
    '<b>Unlimited</b> share links per canvas',
    'Control shared-file downloads · Disable attribution watermark',
    'Unified team member & digital asset management',
  ];
  if (pro) features.push(...renderProSummary(state.lang), zh ? 'Render 项目评论与多人编辑' : 'Render project comments & multi-user editing');
  const groups = [['ai', zh ? 'AI 权益' : 'AI benefits', ai], ['features', zh ? '功能' : 'Features', features]];
  const note = zh ? (pro ? '专业席位含 D5 Render 专业版权益及项目协作功能。' : '基础席位不含 D5 Render 专业版权益、Render 项目评论或多人编辑。') : (pro ? 'Pro seats include D5 Render Pro entitlements and Render project collaboration.' : 'Basic seats do not include D5 Render Pro entitlements, Render project comments or multi-user editing.');
  const terms = `<details class="benefit-terms"><summary>${zh ? '充值规则' : 'Top-up terms'}</summary><p>${zh ? '充值积分有效期 365 天；价格以销售报价为准。' : 'Top-up credits valid for 365 days; prices follow the sales quote.'}</p></details>`;
  return `<p class="product-scope">${note}</p><div class="seat-benefit-groups">${groups.map(([id,label,items]) => `<div class="benefit-block ${id === 'ai' ? 'benefit-ai' : ''}" data-seat-group="${id}"><div class="benefit-label">${label}</div><ul class="plan-list seat-bullets">${listItems(items, `benefit43.seat.${seat.id}.${id}`)}</ul>${id === 'ai' ? terms : ''}</div>`).join('')}</div>`;
}


function renderBusiness(grid) {
    const modules = businessModules[state.lang];
    const meta = businessMeta[state.lang];
    grid.innerHTML = `
      <div class="team-intro">
        <h2 data-edit-key="team.intro.title">${state.lang === 'zh' ? '让设计能力在团队中共享' : 'Share design capacity across the team'}</h2>
        <p data-edit-key="team.intro.body">${state.lang === 'zh' ? '共享 AI 积分、统一管理成员与数字资产。团队与企业的差别在协作与治理能力，不只是积分多寡。' : 'Shared AI credits and unified member & asset management. Teams vs Enterprise differs in collaboration and governance — not only credit volume.'}</p>
      </div>
      ${modules.map(mod => `
      <section class="biz-module" data-biz-module="${mod.id}">
        <div class="biz-module-head">
          <h2 data-edit-key="biz.${mod.id}.title">${mod.title}</h2>
          <p data-edit-key="biz.${mod.id}.subtitle">${mod.subtitle}</p>
          <p class="biz-module-tagline" data-edit-key="biz.${mod.id}.tagline">${mod.tagline || ''}</p>
          <p class="biz-module-note" data-edit-key="biz.${mod.id}.note">${mod.note || meta.note}</p>
        </div>
        <div class="biz-seat-grid">
          ${mod.seats.map(seat => `
            <article class="plan-card ${seat.style} seat-card" data-seat="${seat.id}">
              <div class="plan-zone-a">
                <div class="plan-title">
                  <div class="plan-name"><h2 data-edit-key="seat.${seat.id}.name">${seat.name}</h2></div>
                  <p class="plan-desc" data-edit-key="seat.${seat.id}.desc">${seat.desc}</p>
                </div>
                <div class="capacity-zone seat-capacity">
                  <div class="capacity-title" data-edit-key="seat.${seat.id}.capacity">${q('共享积分池','Shared credit pool')}</div>
                </div>
              </div>
              <button type="button" class="plan-button" data-contact-sales="${seat.id}"><span data-edit-key="seat.${seat.id}.cta">${seat.cta}</span></button>
              ${businessBenefitGroups(seat, mod.id)}
            </article>`).join('')}
        </div>
      </section>`).join('')}`;

}
