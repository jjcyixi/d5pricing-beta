// B2B team tab — CN 3.2: one Teams product; explain Basic/Pro seat entitlements
// as configuration tiers (compare table), not as two buyable plan cards.
// No public seat prices or concrete credit amounts. No Enterprise module.
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

function businessSeatCompare(mod) {
  const zh = state.lang === 'zh';
  const mk = `biz.${mod.id}`;
  const compare = mod.seatCompare || {
    cols: zh ? ['基础席位', '专业席位'] : ['Basic seat', 'Pro seat'],
    rows: [],
  };
  const cols = compare.cols || [];
  const rows = compare.rows || [];
  const headCells = [
    `<th class="seat-compare-feature" scope="col" data-edit-key="${mk}.seatCompare.featureHead">${zh ? '权益项' : 'Entitlement'}</th>`,
    ...cols.map((col, i) => `<th scope="col" data-edit-key="${mk}.seatCompare.col.${i}">${col}</th>`),
  ].join('');
  const body = rows.map((row, ri) => {
    const [label, basic, pro] = row;
    const cells = [
      `<th scope="row" data-edit-key="${mk}.seatCompare.row.${ri}.label">${label}</th>`,
      `<td data-edit-key="${mk}.seatCompare.row.${ri}.basic">${basic}</td>`,
      `<td data-edit-key="${mk}.seatCompare.row.${ri}.pro">${pro}</td>`,
    ];
    return `<tr>${cells.join('')}</tr>`;
  }).join('');
  return `<div class="team-panel team-panel--seats" data-team-group="seats">
    <div class="benefit-label" data-edit-key="${mk}.seatCompareLabel">${mod.seatCompareLabel || (zh ? '席位权益' : 'Seat entitlements')}</div>
    <div class="seat-compare-wrap">
      <table class="seat-compare">
        <thead><tr>${headCells}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  </div>`;
}

function businessCommonBenefits(mod) {
  const zh = state.lang === 'zh';
  const mk = `biz.${mod.id}`;
  const items = (mod.commonBenefits || mod.benefits || []).map((item, i) => [`${mk}.common.${i}`, item]);
  return `<div class="team-panel team-panel--common" data-team-group="common">
    <div class="benefit-label" data-edit-key="${mk}.commonBenefitsLabel">${mod.commonBenefitsLabel || (zh ? '团队通用权益' : 'Team-wide benefits')}</div>
    <ul class="plan-list team-bullets">${listItemsKeyed(items)}</ul>
  </div>`;
}

function renderBusiness(grid) {
  const zh = state.lang === 'zh';
  const modules = (businessModules[state.lang] || []).filter((m) => m.id === 'team');
  const mod = modules[0];
  if (!mod) {
    grid.innerHTML = '';
    return;
  }
  const mk = `biz.${mod.id}`;
  const termsLabel = mod.termsLabel || (zh ? '充值与合同说明' : 'Top-up & contract notes');
  const termsBody = mod.termsBody || (zh
    ? '积分不过期；额度不足由管理员充值；合同价由销售确认。'
    : 'Credits never expire. Admins top up when short. Contract price confirmed by sales.');
  grid.innerHTML = `
    <section class="biz-module biz-module--team-only" data-biz-module="${mod.id}">
      <div class="biz-module-head">
        <h2 data-edit-key="${mk}.title">${mod.title}</h2>
        <p data-edit-key="${mk}.subtitle">${mod.subtitle}</p>
      </div>
      <article class="plan-card team-plan-card" data-team-plan="${mod.id}">
        <div class="team-hero">
          <div class="capacity-zone team-capacity">
            <div class="capacity-title" data-edit-key="${mk}.capacityTitle">${mod.capacityTitle || (zh ? '共享积分池 · 积分不过期 · 不足由管理员充值' : 'Shared credit pool · never expire · admin top-up')}</div>
          </div>
          <div class="team-cta-row">
            <button type="button" class="plan-button plan-button--primary" data-contact-sales="${mod.id}"><span data-edit-key="${mk}.cta">${mod.cta}</span></button>
            <button type="button" class="plan-button plan-button--secondary" data-contact-sales="${mod.id}-trial"><span data-edit-key="${mk}.ctaSecondary">${mod.ctaSecondary || (zh ? '预约试用' : 'Book a trial')}</span></button>
          </div>
        </div>
        <div class="team-body-grid">
          ${businessCommonBenefits(mod)}
          ${businessSeatCompare(mod)}
        </div>
        <p class="team-foot-note" data-edit-key="${mk}.seatNote">${mod.seatNote || (zh ? '席位分级可灵活配置，具体席位组合与合同价由销售确认' : 'Seat tiers are flexible; mix and contract price confirmed by sales')}</p>
        <details class="benefit-terms"><summary data-edit-key="${mk}.termsLabel">${termsLabel}</summary><p data-edit-key="${mk}.termsBody">${termsBody}</p></details>
      </article>
    </section>`;
}
