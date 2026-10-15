/* Read-only order preview. No payment, account mutation, contact submission or invented dates. */
(function (global) {
  'use strict';
  const dialog = document.getElementById('order-preview');
  let opener = null;
  const row = (label,value,attr='') => `<div class="order-row"><dt>${label}</dt><dd ${attr}>${value}</dd></div>`;
  function buildOrder(plan,billing=state.billing) {
    if (!['basic','pro'].includes(plan)) return null;
    return {demo:true, plan, billing, currency:'CNY', amount:D.price(plan,billing),
      batch:D.monthlyBatch(true), afterWindow:D.monthlyBatch(false),
      issuance:'monthly', bonusEligibility:D.LAUNCH.eligibility, expiry:D.LAUNCH.expiry};
  }
  function show(title,body) {
    opener=document.activeElement;
    document.getElementById('preview-content').innerHTML=`<div class="preview-top"><span class="beta-marker">${q('演示 · 只读订单预览','Demo · Read-only order preview')}</span><button type="button" class="close-preview" data-close-preview aria-label="${q('关闭预览','Close preview')}">×</button></div><h2 id="preview-title">${title}</h2><p class="preview-demo" id="preview-demo">${q('此预览不创建真实订单、不收款，也不会开通权益。','This preview does not create a real order, collect payment or activate benefits.')}</p>${body}<button type="button" class="preview-done" data-close-preview>${q('关闭预览，返回方案','Close preview and return')}</button>`;
    dialog.showModal();
  }
  function openOrder(plan) {
    const o=buildOrder(plan);
    if (!o) {
      if (plan==='community') {
        const once=D.communityCredits(), days=D.communityDays(), est=D.outputEstimate(once);
        show(q('开始免费体验','Start free'),`<dl>${row(q('版本','Plan'),D.PLAN_META[state.lang].community.name)}${row(q('一次性积分','One-time credits'),String(once),'data-order-community-credits')}${row(q('同一积分池，二选一','Same pool, either output'),q(`${est.images} 张图片 或 ${est.videoSeconds} 秒视频`,`${est.images} images OR ${est.videoSeconds} seconds of video`),'data-order-output')}</dl><p class="order-note">${q(`登录一次性领取 · 有效期 ${days} 天。估算按 2 积分/张图片或 60 积分/5 秒视频；实际消耗随模型与设置变化。`,`One-time on sign-in · valid ${days} days. Estimated at 2 credits/image or 60 credits/5-second video; actual cost varies by model and settings.`)}</p>`);
      }
      return;
    }
    const annual=o.billing==='annual';
    const est=D.outputEstimate(o.batch.total);
    show(q('确认你的方案','Review your plan'),`<dl>${row(q('方案','Plan'),D.PLAN_META[state.lang][plan].name,'data-order-plan')}${row(q('购买周期','Billing cycle'),annual?q('年付 · 一次支付全年费用','Annual · full year paid once'):q('月付','Monthly'),'data-order-billing')}${row(q('本次费用（人民币）','Price (CNY)'),money(o.amount),'data-order-amount')}${row(q('每月基础积分','Monthly base credits'),String(o.batch.base),'data-order-base')}${row(q('首个合资格月度批次','First eligible monthly batch'),launchEquation(),'data-order-batch')}${row(q('该批次最多生成（二选一）','Batch output (either type)'),q(`${est.images} 张图片 或 ${est.videoSeconds} 秒视频`,`${est.images} images OR ${est.videoSeconds} seconds of video`),'data-order-output')}</dl><p class="order-note" data-order-issuance>${annual?q('年费一次支付，积分按月发放。','The annual fee is paid once; credits are issued monthly. '):''}${issuanceNote()}</p><p class="order-note">${q('首发活动为上线起三个月；晚加入仅享剩余窗口内的合资格批次，不保证个人三个月赠分。','The activity runs for three months from launch. Joining later covers only eligible batches in the remaining window, not three personal bonus months.')}</p><p class="order-note">${expiryNote()}</p>`);
  }
  function openBusiness(contactId) {
    // CN 3.2: Teams product CTAs (team / team-trial). Legacy seat ids still supported if present.
    const raw = String(contactId || '');
    const isTrial = raw.endsWith('-trial');
    const modId = raw.replace(/-trial$/, '') || 'team';
    const modules = D.BUSINESS[state.lang] || [];
    let mod = modules.find(m => m.id === modId);
    let seat = null;
    if (!mod && Array.isArray(modules)) {
      for (const m of modules) {
        if (m.seats) seat = m.seats.find(s => s.id === raw);
        if (seat) { mod = m; break; }
      }
    }
    if (!mod) return;
    const intent = isTrial
      ? q('预约试用', 'Book a trial')
      : (mod.cta || q('获取团队方案', 'Get a Teams plan'));
    const seatRow = seat
      ? row(q('席位','Seat'), seat.name)
      : row(q('配置','Configuration'), q('席位分级可灵活配置','Flexible seat mix'));
    show(`${mod.title} · ${intent}`,`<p class="order-note">${q('联系销售获取方案与合同价。当前为设计预览，未接入销售咨询，不会提交联系请求。','Contact sales for a plan and contract price. This design preview is not connected to sales and does not submit a contact request.')}</p><dl>${row(q('方案','Plan'),mod.title)}${seatRow}${row(q('积分','Credits'),q('共享积分池 · 不过期','Shared credit pool · never expire'))}${row(q('意向','Intent'),intent)}</dl>`);
  }
  function exportPayload() {
    return {version:'November launch Beta', demo:true, ...D.snapshotPricing(),
      view:{lang:state.lang,billing:state.billing,audience:state.audience,proMode:'credits'},
      orders:['basic','pro'].map(plan=>buildOrder(plan)),
      business:JSON.parse(JSON.stringify(D.BUSINESS)), education:JSON.parse(JSON.stringify(D.EDUCATION))};
  }
  function exportJson() {
    const blob=new Blob([JSON.stringify(exportPayload(),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download='d5-pricing-beta-202611.json'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    const announcer=document.getElementById('announcer');
    if(announcer) announcer.textContent=q('方案已导出','Plans exported');
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-preview-plan')) openOrder(button.dataset.previewPlan);
    else if (button.hasAttribute('data-contact-sales')) openBusiness(button.dataset.contactSales);
    else if (button.hasAttribute('data-close-preview')) dialog.close();
    else if (button.hasAttribute('data-export')) exportJson();
  });
  dialog?.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog?.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();});
  global.D5Flows=Object.freeze({buildOrder,exportPayload,exportJson});
})(window);
