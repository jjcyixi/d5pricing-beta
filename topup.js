'use strict';
let previewMembership = 'community';
// Returning from the personal top-up page should reveal personal subscription rules.
state.audience = 'personal';
D5Preferences.save(state);
function renderTopup() {
  document.title=q('D5 · 积分充值 Beta','D5 · Credit top-ups Beta');
  const root=document.getElementById('topup-selector');
  // Called by app.js only after this script has initialized.
  if (!root) return;
  root.setAttribute('aria-label',q('演示订阅身份','Demo subscription'));
  root.innerHTML=['community','basic','pro'].map(plan=>`<button type="button" data-topup-membership="${plan}" aria-pressed="${previewMembership===plan}">${D.PLAN_META[state.lang][plan].name}</button>`).join('');
  const eligible=previewMembership!=='community';
  document.getElementById('topup-status').innerHTML=`<h3>${eligible?q('在订期间可充值','Eligible while subscribed'):q('社区版不可充值','Community cannot top up')}</h3><p>${eligible?q('充值仅补充积分，不改变你的方案权益。首发活动窗口内合资格充值加赠 50%。','Top-ups add credits without changing plan features. Eligible top-ups within the launch window receive a 50% bonus.'):q('先订阅基础版或专业版，再根据实际用量补充积分。','Subscribe to Basic or Pro first, then add credits as needed.')}</p><a class="text-link" href="index.html#pricing">${q('查看订阅方案 →','View subscription plans →')}</a>`;
}
document.addEventListener('click',event=>{
  const btn=event.target.closest('[data-topup-membership]');
  if (!btn) return;
  previewMembership=btn.dataset.topupMembership;
  renderTopup();
  document.querySelector(`[data-topup-membership="${previewMembership}"]`)?.focus();
});
renderTopup();
