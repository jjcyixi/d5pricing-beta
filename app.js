/* November launch Beta. A single fixed personal allowance, rendered from data.js. */
'use strict';
const D = window.D5Data;
const state = window.state = D5Preferences.load();
Object.defineProperty(state, 'proMode', {value:'credits', enumerable:true, writable:false});
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const q = (zh,en) => state.lang === 'zh' ? zh : en;
const money = n => `¥${Number(n).toLocaleString('en-US')}`;
const businessModules = D.BUSINESS;
const businessMeta = {zh:{note:'按席位年度报价，具体合同价由销售确认。'},en:{note:'Annual per-seat quotes; contract pricing confirmed by sales.'}};

function listItems(items,editPrefix='') {
  return items.map((item,i) => `<li><img class="check" src="assets/figma/check-circle.svg" alt=""><span${editPrefix?` data-edit-key="${editPrefix}.${i}"`:''}>${item}</span></li>`).join('');
}
function launchEquation() {
  const b = D.monthlyBatch();
  return `<span>${b.base} ${q('基础积分','base credits')}</span><span class="launch-plus"> + </span><span class="launch-gift">${b.bonus} ${q('发布限时赠送','launch bonus')}</span><span class="launch-total"> = <strong>${b.total}</strong> ${q('积分','credits')}</span>`;
}
function issuanceNote() {
  const b = D.monthlyBatch(true), after = D.monthlyBatch(false);
  return q(`每月发放 ${b.base} 基础积分；仅首发活动窗口内的合资格批次加赠 ${b.bonus}，窗口结束后每月为 ${after.base}。`,
    `${b.base} base credits issued monthly. Only eligible batches within the launch window receive ${b.bonus} extra; after the window, ${after.base} per month.`);
}
function expiryNote() {
  return q('赠送积分与对应基础批次同到期，优先消耗，不结转；实际到期日见订单及积分明细。',
    'Bonus credits expire with the corresponding base batch, are used first and do not roll over. Actual expiry appears in the order and credit details.');
}
function capacityBlock(plan) {
  const community = plan === 'community';
  const total = community ? D.communityCredits() : D.monthlyBatch().total;
  const {images,videoSeconds} = D.outputEstimate(total);
  return `<div class="capacity-zone generation-zone" data-generation-estimate="${plan}">
    <div class="capacity-label">${community ? q('一次性积分最多可生成','One-time credits: up to') : q('合资格月度批次最多可生成','Eligible monthly batch: up to')}</div>
    <div class="generation-output"><b data-image-count>${images}</b> ${q('张图片','images')}</div>
    <div class="generation-output"><span class="generation-or">${q('或','or')}</span> <b data-video-seconds>${videoSeconds}</b> ${q('秒视频','seconds of video')}</div>
    <p class="pool-note">${q('同一积分池，二选一估算','Same credit pool · either output')}</p>
    <details class="credit-issue generation-assumptions"><summary>${q('估算说明','Estimate details')}</summary><p class="capacity-sub">${q('按图片 2 积分/张、视频 60 积分/5 秒估算，视频仅计完整 5 秒。假设积分全部用于图片或全部用于视频，两者不可叠加；实际消耗随模型、分辨率及设置变化。','Estimates use 2 credits/image or 60 credits per 5-second video, counting only complete 5-second units. All credits are used for one output type; the two outputs cannot be added together. Actual cost varies by model, resolution and settings.')}</p></details>
  </div>`;
}
function benefitBlocks(plan) {
  const community = plan === 'community', pro = plan === 'pro';
  const tier = community ? D.COMMUNITY : D.PERSONAL_TIERS[0];
  const image = community ? tier.imageRes : tier.imageRes[plan];
  const video = community ? tier.videoRes : tier.videoRes[plan];
  const ai = [
    community ? q('部分 AI 模型 · 生成内容不可商用','Selected AI models · non-commercial output') : q('<b>全部 AI 模型</b> · 生成内容可商用','<b>All AI models</b> · commercial AI output'),
    image === video ? q(`AI 图像与视频最高 <b>${image}</b>`,`AI images & video up to <b>${image}</b>`) : q(`AI 图像 <b>${image}</b> · 视频 <b>${video}</b>`,`AI images <b>${image}</b> · Video <b>${video}</b>`),
    q(`同时运行 <b>${tier.concurrency}</b> 个 AI 任务`,`<b>${tier.concurrency}</b> concurrent AI tasks`)];
  const features = pro ? renderProSummary(state.lang) : [q('画布与对话分享','Canvas & conversation sharing'), q('项目评论与反馈','Project comments & feedback'),
    community ? q('限量云空间','Limited cloud storage') : q('<b>10 GB</b> 云空间','<b>10 GB</b> cloud storage'),
    community ? q('可关闭署名水印','Disable attribution watermark') : q('分享下载权限控制','Shared-file download controls')];
  if (community) features.push(q('实时渲染与场景编辑','Real-time rendering & scene editing'), q('图片、全景图与视频渲染','Image, panorama & video rendering'));
  const rules = [q('AI 输出规格以所选模型及功能支持为准。','AI output depends on the selected model and feature.'),
    q('支持 AI 增强与放大。','AI enhance & upscale supported.'),
    pro ? q('Arco 内增强与放大消耗积分；Render 内不消耗积分。','Enhance & upscale consumes credits in Arco, not in Render.') : q('Arco 内增强与放大消耗积分。','Enhance & upscale consumes credits in Arco.'),
    q(`每个画布最多保留 ${tier.shareLinks} 条分享链接；对话分享数量不限。`,`Up to ${tier.shareLinks} share links per canvas; unlimited conversation sharing.`),
    community ? q('分享文件默认可下载，不能关闭下载。','Shared files can be downloaded; downloads cannot be disabled.') : q('可关闭分享内容下载及署名水印。','Disable shared-content downloads and attribution watermark.'),
    q('项目评论与反馈指 Arco 项目，不代表多人编辑。','Comments and feedback apply to Arco projects, not multi-user editing.'),
    community ? q('社区版不可充值。','Top-ups are unavailable on Community.') : `<a href="topup.html">${q('在订期间可充值补充 AI 积分 →','Top up AI credits with an active subscription →')}</a>`];
  return `<div class="benefit-stack"><div class="benefit-block benefit-ai" data-benefit-group="ai"><div class="benefit-label">${q('AI 权益','AI benefits')}</div>${capacityBlock(plan)}<ul class="plan-list" data-ai-list>${listItems(ai)}</ul></div>
    <div class="benefit-divider" aria-hidden="true"></div><div class="benefit-block benefit-workflow ${pro?'feature-upgrade':''}" data-benefit-group="features"><div class="benefit-label" data-edit-key="plan.${plan}.featureLabel">${q('功能','Features')}</div>
    ${pro?`<div class="feature-inheritance">${q('AI 创作与分享功能，另加：','AI creation & sharing, plus:')}</div>`:''}<ul class="plan-list" data-features-list>${listItems(features,`plan.${plan}.feature`)}</ul>${pro?`<p class="feature-storage">${q('10 GB 云空间 · 分享下载权限控制','10 GB storage · Download controls')}</p>`:''}</div>
    <details class="benefit-terms"><summary>${q('使用与充值规则','Usage & top-up terms')}</summary><ul class="plan-list">${listItems(rules)}</ul></details></div>`;
}
function renderPlans() {
  const grid = $('#plan-grid');
  if (!grid) return;
  const team = state.audience === 'team';
  grid.classList.toggle('is-team',team);
  $$('.personal-only').forEach(el => {el.hidden = team;});
  $$('[data-audience]').forEach(el => el.setAttribute('aria-pressed',String(el.dataset.audience===state.audience)));
  if (team) {renderBusiness(grid); return;}
  const meta = D.PLAN_META[state.lang];
  grid.innerHTML = ['community','basic','pro'].map(id => {
    const free = id==='community', pro = id==='pro';
    const period = free ? q('/ 免费体验','/ free') : state.billing==='annual' ? q('/ 年','/ year') : q('/ 月','/ month');
    const scope = free ? q('Arco 体验 · Render 社区版','Arco exploration · Render Community') : pro ? q('含 D5 渲染器专业版权益','Includes D5 Render Pro') : q('Arco · AI 创作','Arco · AI creation');
    const context=free?q('免费开始，探索你的第一个项目','Start free. Explore your first project.') : state.billing==='annual'?q('年费一次支付 · 积分按月发放','Annual payment · monthly credits'):q('按月购买 · 积分按月发放','Monthly payment · monthly credits');
    const batch=D.monthlyBatch(true), once=D.communityCredits(), days=D.communityDays();
    const credit=free?`<div class="credit-kicker" data-edit-key="plan.community.creditKicker">${q('登录一次性领取','One-time on sign-in')}</div><div class="credit-amount" data-demo-field="communityCredits" title="演示积分：用工具栏「价格 / JSON」修改"><strong>${once}</strong> ${q('积分','credits')}</div><p class="credit-basis" data-edit-key="plan.community.creditBasis">${q(`有效期 ${days} 天`,`Valid for ${days} days`)}</p>`:`<div class="credit-kicker" data-edit-key="plan.${id}.creditKicker">${q('每月基础积分','Monthly base credits')}</div><div class="credit-amount" data-demo-field="monthlyCredits" title="演示积分：用工具栏「价格 / JSON」修改"><strong>${batch.base}</strong><span class="launch-gift"> + ${batch.bonus} <small>${q('发布限时赠送','launch bonus')}</small></span></div><p class="credit-basis" data-edit-key="plan.${id}.creditBasis">${q(`合资格批次共 ${batch.total} 积分`,`${batch.total} credits per eligible batch`)}</p>`;
    const benefits=benefitBlocks(id).replace('<div class="benefit-label">'+q('AI 权益','AI benefits')+'</div>', '<div class="benefit-label" data-edit-key="plan.'+id+'.aiLabel">'+q('AI 权益','AI benefits')+'</div><div class="card-credit">'+credit+'</div>');
    return `<article class="plan-card ${id}" data-plan-card="${id}" data-personal-card="1"><div class="plan-zone-a"><div class="plan-title"><div class="plan-name"><h2 data-edit-key="plan.${id}.name">${meta[id].name}</h2></div><p class="plan-desc plan-position" data-edit-key="plan.${id}.value">${meta[id].desc}</p></div><p class="product-scope ${pro?'pro-anchor':''}" data-edit-key="plan.${id}.scope">${scope}</p>
      <div class="plan-price"><span class="price-value" data-price="${id}" data-demo-field="price.${id}" title="演示价格：用工具栏「价格 / JSON」修改">${free?'¥0':money(D.price(id,state.billing))}</span>${state.lang==='en'?'<span class="currency-cny">CNY</span>':''}<span class="price-period" data-edit-key="plan.${id}.period">${period}</span></div>
      <p class="price-context" data-edit-key="plan.${id}.context">${context}</p></div><button type="button" class="plan-button" data-preview-plan="${id}" data-edit-key="plan.${id}.cta">${meta[id].cta}</button>${benefits}</article>`;
  }).join('');
}
function renderCompare() {
  const root = $('#compare');
  if (!root) return;
  const c = D.buildCompare(state.lang,state.billing);
  root.innerHTML = `<table class="compare-table"><thead><tr><th scope="col" class="lead"><span data-edit-key="compare.lead">${c.lead}</span></th>${c.cols.map((n,i)=>`<th scope="col" class="col"><span data-edit-key="plan.${['community','basic','pro'][i]}.name">${n}</span></th>`).join('')}</tr></thead><tbody>${c.groups.map((g,i)=>`<tr><th colspan="4" class="compare-group"><button type="button" class="compare-group-toggle" data-toggle-group="${i}" aria-expanded="${g.defaultOpen}"><img src="assets/figma/caret-down.svg" alt=""><span data-edit-key="compare.group.${i}">${g.title}</span></button></th></tr>${g.rows.map(([label,...values],j)=>`<tr data-group-rows="${i}" ${g.defaultOpen?'':'hidden'}><th scope="row" class="lead"><span data-edit-key="compare.row.${i}.${j}">${label}</span></th>${values.map(v=>`<td class="col"><span class="compare-text">${v}</span></td>`).join('')}</tr>`).join('')}`).join('')}</tbody></table>`;
}
function renderRules() {
  const el=$('#launch-rules-body');
  if(!el)return;
  const b=D.monthlyBatch(true), after=D.monthlyBatch(false);
  el.innerHTML=`<div class="launch-band-head"><span class="launch-dot" aria-hidden="true"></span><strong data-edit-key="launch.title">${q('发布限时赠送 · 上线起三个月','Launch bonus · first three months')}</strong><span data-edit-key="launch.summary">${q(`${b.base} 基础积分 + ${b.bonus} 赠送积分`,`${b.base} base credits + ${b.bonus} bonus`)}</span><a href="#launch-details" data-edit-key="launch.view">${q('查看规则','View terms')} ↗</a></div><details id="launch-details"><summary data-edit-key="launch.detailsSummary">${q('活动与积分使用说明','Activity & credit terms')}</summary><p data-edit-key="launch.detailsBody">${q(`活动持续上线起三个月；基础版与专业版在窗口内获发的合资格月度批次均加赠 ${b.bonus} 积分。月付与年付规则相同，晚加入仅享剩余窗口内的合资格批次。窗口结束后，每月为 ${after.base} 基础积分。`,`The activity runs for three months from launch. Each eligible monthly batch issued to Basic or Pro within the window receives ${b.bonus} bonus credits. Monthly and annual plans follow the same rule; later joiners receive bonuses only for eligible batches remaining in the window. After the window, ${after.base} base credits are issued monthly.`)}</p><p data-edit-key="launch.expiry">${expiryNote()}</p><a class="text-link" href="topup.html" data-edit-key="launch.topupLink">${q('需要更多积分？查看充值规则 →','Need more credits? Top-up rules →')}</a></details>`;
}
function renderFaq() {
  const root = $('#faq-list');
  if (!root) return;
  const entries = [
    [q('基础版和专业版有什么区别？','How do Basic and Pro differ?'),q('两者 AI 积分相同。基础版适合 Arco AI 创作；专业版另含完整 D5 渲染器专业版权益，Render 内增强与放大不消耗积分。完整差异可在上方对比表查看。','Both have the same AI allowance. Basic supports Arco AI creation; Pro adds full D5 Render Pro benefits, with no credit cost for enhance and upscale in Render. See the comparison above for all differences.')],
    [q('年付如何发放积分？','How are credits issued with annual billing?'),q('年费一次支付，积分按月发放。首发赠送条件见上方「发布限时赠送」规则。','The annual fee is paid once; credits are issued monthly. See the launch bonus terms above for eligibility.')],
    [q('图片与视频的产能可以同时获得吗？','Can I get both image and video estimates?'),q('不是。它们使用同一笔积分，分别是假设全部用于图片或全部用于视频的上限估算。图片按 2 积分/张，视频按 60 积分/5 秒且只计完整 5 秒；实际消耗以模型、分辨率及设置为准。','No. The estimates use the same credit pool entirely for one output type: 2 credits/image or 60 credits per complete 5-second video. Actual cost depends on model, resolution and settings.')],
    [q('积分不够用，可以充值吗？','Can I top up if I need more credits?'),q('基础版与专业版在订期间可通过独立充值页补充积分，社区版不可充值。充值不改变版本功能。','Basic and Pro can add credits on the separate top-up page while subscribed. Community cannot top up. Top-ups do not change plan features.')],
    [q('团队与企业如何购买？','How do teams purchase?'),q('切换至「团队协作」查看团队版和企业版，按席配置、联系销售报价。本次发布加赠仅适用于个人版。','Switch to For teams to view Teams and Enterprise. Configure seats and contact sales for a quote. This launch bonus applies only to personal plans.')]
  ];
  root.innerHTML = entries.map(([question,answer],i)=>`<details><summary><span data-edit-key="faq.${i}.question">${question}</span><img src="assets/figma/caret-down-faq.svg" alt=""></summary><p data-edit-key="faq.${i}.answer">${answer}</p></details>`).join('');
}
function applyLanguage() {
  const en = state.lang === 'en';
  document.documentElement.lang = en ? 'en' : 'zh-CN';
  document.title = q('D5 · 首发方案 Beta','D5 · Launch pricing Beta');
  $$('[data-zh][data-en]').forEach(el=>{el.textContent=el.dataset[en?'en':'zh'];});
  $$('[data-lang]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.lang===state.lang)));
  const toggle = $('[data-billing-toggle]');
  if (toggle) {toggle.setAttribute('aria-pressed',String(state.billing==='annual')); toggle.setAttribute('aria-label',state.billing==='annual'?q('切换按月购买','Switch to monthly billing'):q('切换按年购买','Switch to annual billing'));}
  $('.audience-switch')?.setAttribute('aria-label',q('选择用户类别','Choose audience'));
  const education = D.EDUCATION[state.lang];
  ['title','subtitle','button'].forEach(k=>{const el=$(`[data-education="${k}"]`);if(el){el.textContent=education[k];el.setAttribute('data-edit-key','education.'+k);}});
}
function alignCardSections() {
  const cards=$$('[data-personal-card]');
  cards.forEach(c=>{const e=c.querySelector('.benefit-ai');if(e)e.style.minHeight='';});
  if(innerWidth<=900 || !cards.length)return;
  const max=Math.ceil(Math.max(...cards.map(c=>c.querySelector('.benefit-ai').getBoundingClientRect().height)));
  cards.forEach(c=>{c.querySelector('.benefit-ai').style.minHeight=max+'px';});
}
window.addEventListener('resize',alignCardSections);
document.addEventListener('click',event=>{if(event.target.closest('a[href="#launch-details"]')){const d=$('#launch-details');if(d)d.open=true;}});
function renderAll() {
  renderPlans(); renderCompare(); renderRules(); renderFaq(); applyLanguage();
  alignCardSections();
  if (typeof renderTopup === 'function') renderTopup();
  D5Preferences.save(state);
  document.dispatchEvent(new Event('d5:render'));
}
window.renderAll = renderAll;
window.alignCardSections = alignCardSections;
window.launchEquation = launchEquation;
window.issuanceNote = issuanceNote;
window.expiryNote = expiryNote;
document.addEventListener('click',event=>{
  const btn = event.target.closest('button');
  if (!btn) return;
  if (btn.dataset.lang) {state.lang=btn.dataset.lang;renderAll();}
  else if (btn.dataset.audience) {state.audience=btn.dataset.audience;renderAll();}
  else if (btn.hasAttribute('data-billing-toggle')) {state.billing=state.billing==='monthly'?'annual':'monthly';renderAll();}
  else if (btn.hasAttribute('data-toggle-group')) {
    const expanded=btn.getAttribute('aria-expanded')==='true';
    btn.setAttribute('aria-expanded',String(!expanded));
    $$(`[data-group-rows="${btn.dataset.toggleGroup}"]`).forEach(row=>{row.hidden=expanded;});
  }
});
renderAll();
