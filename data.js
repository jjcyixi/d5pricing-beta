/** November launch Beta. Fixed personal allowance; code is the pricing authority. */
(function (global) {
  'use strict';
  const DATA_REVISION = '202611-launch-beta-1';
  const TIER_MAX = 0;
  const DEFAULT_TIER = 0;
  const PERSONAL_TIERS = [{
    id: 'launch', monthlyCredits: 1000,
    concurrency: 4, concurrencyLabel: {zh: '4', en: '4'},
    imageRes: {basic: '2K', pro: '4K'}, videoRes: {basic: '720P', pro: '4K'},
    cloudGB: 10, shareLinks: 3,
    prices: {basic: {monthly: 49, annual: 399}, pro: {monthly: 200, annual: 1920}}
  }];
  const LAUNCH = {
    durationMonths: 3, startDate: null, endDate: null,
    subscriptionBonusRate: 0.5, rechargeBonusRate: 0.5,
    eligibility: 'monthly-credit-batch-issued-within-launch-window',
    expiry: 'same-as-corresponding-base-batch', bonusConsumedFirst: true, carryOver: false
  };
  const PLAN_META = {
    zh: {
      community: {name:'社区版', desc:'免费开始，体验 AI 设计', info:'免费开始 · 非商用；部分模型与限量云空间', cta:'免费开始'},
      basic: {name:'基础版', desc:'用 AI 探索创意，推进设计', cta:'订阅基础版'},
      pro: {name:'专业版', desc:'AI 创作，再加完整专业渲染', cta:'订阅专业版'}
    },
    en: {
      community: {name:'Community', desc:'Start free — explore AI design', info:'Free start · non-commercial; selected models & limited cloud', cta:'Start free'},
      basic: {name:'Basic', desc:'Explore ideas and design with AI', cta:'Subscribe Basic'},
      pro: {name:'Pro', desc:'AI creation, plus full Pro rendering', cta:'Subscribe Pro'}
    }
  };
  const COMMUNITY = {
    id: 'community',
    concurrency: 2,
    imageRes: '1K',
    videoRes: '480P',
    models: 'partial',
    commercial: 'none',
    cloud: 'limited', // do NOT publish internal 1GB
    shareLinks: 1,
    downloadControl: false,
    watermark: 'default_on_can_off',
    recharge: false,
    arcoAmplify: 'consume',
    renderAmplify: 'unsupported',
    oneTimeCredits: 300,
    oneTimeDays: 365,
  };

  const BUSINESS = {
    zh: [
      {
        id: 'team',
        title: '团队版',
        subtitle: '单团队协作 · 共享 AI 积分 · 统一管理',
        seatNote: '席位分级可灵活配置，具体席位组合与合同价由销售确认',
        cta: '获取团队方案',
        ctaSecondary: '预约试用',
        capacityTitle: '共享积分池 · 积分不过期 · 不足由管理员充值',
        commonBenefitsLabel: '团队通用权益',
        commonBenefits: [
          '专属企业客服',
          '100G 云存储',
          '团队后台管理',
          '使用数据看板',
          '共享积分池 · 额度配额管理',
          'AI 创作 · 全部模型 · 可商用',
          '画布分享与成员/数字资产管理',
        ],
        seatCompareLabel: '席位权益',
        seatCompare: {
          cols: ['基础席位', '专业席位'],
          rows: [
            ['团队共享积分权益', '含', '含'],
            ['D5 Render', '与社区版一致', '完整专业版'],
            ['Render 多人编辑', '—', '✓'],
            ['Render 项目评论', '—', '✓'],
            ['Render 增强与放大', '—', '免积分'],
            ['云端素材 / 城市生成 / VR·XR 等', '—', '含'],
          ],
        },
        // legacy alias for older drafts / editor keys
        benefits: [
          '专属企业客服',
          '100G 云存储',
          '团队后台管理',
          '使用数据看板',
          '共享积分池 · 额度配额管理',
          'AI 创作 · 全部模型 · 可商用',
          '画布分享与成员/数字资产管理',
        ],
        termsLabel: '充值与合同说明',
        termsBody: '积分不过期；额度不足由管理员充值；合同价由销售确认。',
      },
    ],
    en: [
      {
        id: 'team',
        title: 'Teams',
        subtitle: 'Single-team collaboration · shared AI credits · unified admin',
        seatNote: 'Seat tiers are flexible; mix and contract price confirmed by sales',
        cta: 'Get a Teams plan',
        ctaSecondary: 'Book a trial',
        capacityTitle: 'Shared credit pool · never expire · admin top-up when short',
        commonBenefitsLabel: 'Team-wide benefits',
        commonBenefits: [
          'Dedicated enterprise support',
          '100 GB cloud storage',
          'Team admin console',
          'Usage dashboard',
          'Shared credit pool · quota management',
          'AI creation · all models · commercial use',
          'Canvas sharing & member / digital asset management',
        ],
        seatCompareLabel: 'Seat entitlements',
        seatCompare: {
          cols: ['Basic seat', 'Pro seat'],
          rows: [
            ['Team shared credit rights', 'Included', 'Included'],
            ['D5 Render', 'Same as Community', 'Full Pro'],
            ['Render multi-user editing', '—', '✓'],
            ['Render project comments', '—', '✓'],
            ['Render enhance & upscale', '—', 'No credits'],
            ['Cloud assets / city gen / VR·XR', '—', 'Included'],
          ],
        },
        benefits: [
          'Dedicated enterprise support',
          '100 GB cloud storage',
          'Team admin console',
          'Usage dashboard',
          'Shared credit pool · quota management',
          'AI creation · all models · commercial use',
          'Canvas sharing & member / digital asset management',
        ],
        termsLabel: 'Top-up & contract notes',
        termsBody: 'Credits never expire. Admins top up when short. Contract price confirmed by sales.',
      },
    ],
  };

  const EDUCATION = {
    zh: {
      title: 'D5学生版',
      subtitle: '专为高校在校生推出的特别权益方案，助力教与学',
      button: '立即申请',
    },
    en: {
      title: 'D5 for Education',
      subtitle: 'A special plan for enrolled university students — teaching and learning',
      button: 'Apply',
    },
  };


  /** Runtime demo overlay only — source literals above stay Beta defaults. */
  function demoPricing() {
    try { return (global.D5Demo && global.D5Demo.pricing) || null; } catch (_) { return null; }
  }
  function communityCredits() {
    const d = demoPricing();
    return d && d.communityCredits != null ? Number(d.communityCredits) : COMMUNITY.oneTimeCredits;
  }
  function communityDays() {
    const d = demoPricing();
    return d && d.communityDays != null ? Number(d.communityDays) : COMMUNITY.oneTimeDays;
  }
  function outputEstimate(credits) {
    return {images: Math.floor(credits / 2), videoSeconds: Math.floor(credits / 12),
      imageCredits: 2, videoCreditsPerSecond: 12, videoModel: 'Seedance 2.0 Mini', samePool: true};
  }
  function monthlyBatch(eligible = true) {
    const d = demoPricing();
    const base = d && d.monthlyCredits != null ? Number(d.monthlyCredits) : PERSONAL_TIERS[0].monthlyCredits;
    const bonus = eligible === true
      ? (d && d.launchBonus != null ? Number(d.launchBonus) : base * LAUNCH.subscriptionBonusRate)
      : 0;
    return {base, bonus, total: base + bonus, eligible: eligible === true, period: 'monthly', ...outputEstimate(base + bonus)};
  }
  function price(plan, billing) {
    if (!['basic','pro'].includes(plan) || !['monthly','annual'].includes(billing)) throw new TypeError('Invalid plan or billing');
    const d = demoPricing();
    if (d && d.prices && d.prices[plan] && d.prices[plan][billing] != null) return Number(d.prices[plan][billing]);
    return PERSONAL_TIERS[0].prices[plan][billing];
  }
  function sourcePricing() {
    return {
      prices: JSON.parse(JSON.stringify(PERSONAL_TIERS[0].prices)),
      monthlyCredits: PERSONAL_TIERS[0].monthlyCredits,
      launchBonus: PERSONAL_TIERS[0].monthlyCredits * LAUNCH.subscriptionBonusRate,
      communityCredits: COMMUNITY.oneTimeCredits,
      communityDays: COMMUNITY.oneTimeDays
    };
  }
  function buildCompare(lang, billing = 'monthly') {
    const zh = lang === 'zh';
    const q = (a,b) => zh ? a : b;
    const t = PERSONAL_TIERS[0], batch = monthlyBatch(), after = monthlyBatch(false), once = communityCredits();
    const each = q('每月','/ month');
    const credits = `${batch.base} + ${batch.bonus} = ${batch.total}`;
    const onceEst = outputEstimate(once), paidEst = outputEstimate(batch.total);
    return {lead:q('功能与权益','Features & benefits'), cols:q(['社区版','基础版','专业版'],['Community','Basic','Pro']), groups:[
      {id:'allowance', title:q('积分与创作','Credits & creation'), defaultOpen:true, rows:[
        [q('常规价格（人民币）','Regular price (CNY)'), '¥0', `¥${price('basic',billing)} / ${q(billing==='annual'?'年':'月',billing==='annual'?'yr':'mo')}`, `¥${price('pro',billing)} / ${q(billing==='annual'?'年':'月',billing==='annual'?'yr':'mo')}`],
        [q('基础积分','Base credits'),q(`一次性 ${once}`,`${once} once`),`${batch.base} ${each}`,`${batch.base} ${each}`],
        [q('限时赠送','Launch bonus'), '—', q(`合资格月度批次 +${batch.bonus}`,`+${batch.bonus} per eligible monthly batch`),q(`合资格月度批次 +${batch.bonus}`,`+${batch.bonus} per eligible monthly batch`)],
        [q('首发合资格批次合计','Eligible launch batch total'), String(once), credits, credits],
        [q('同一积分池最多生成（二选一）','Same pool: up to either output'),q(`${onceEst.images} 张图片 或 ${onceEst.videoSeconds} 秒视频`,`${onceEst.images} images OR ${onceEst.videoSeconds} seconds of video`),q(`${paidEst.images} 张图片 或 ${paidEst.videoSeconds} 秒视频`,`${paidEst.images} images OR ${paidEst.videoSeconds} seconds of video`),q(`${paidEst.images} 张图片 或 ${paidEst.videoSeconds} 秒视频`,`${paidEst.images} images OR ${paidEst.videoSeconds} seconds of video`)],
        [q('活动窗口结束后','After the launch window'),q('一次性权益不变','One-time allowance unchanged'),q(`每月 ${after.base} 基础积分`,`${after.base} base credits / month`),q(`每月 ${after.base} 基础积分`,`${after.base} base credits / month`)]
      ]},
      {id:'ai', title:q('AI 权益','AI benefits'), defaultOpen:true, rows:[
        [q('模型','Models'),q('部分开放','Selected'),q('全部开放','All'),q('全部开放','All')],
        [q('同时运行 AI 任务','Concurrent AI tasks'),'2',String(t.concurrency),String(t.concurrency)],
        [q('图片 · 视频最高规格','Image · video limits'),'1K · 480P',`${t.imageRes.basic} · ${t.videoRes.basic}`,`${t.imageRes.pro} · ${t.videoRes.pro}`],
        [q('商用','Commercial use'),q('不可商用','Non-commercial'),q('AI 生成内容可商用','AI output'),q('全部成果可商用','All deliverables')],
        [q('Arco 增强与放大','Arco enhance & upscale'),q('消耗积分','Uses credits'),q('消耗积分','Uses credits'),q('消耗积分','Uses credits')],
        [q('Render 增强与放大','Render enhance & upscale'),q('不支持','Unavailable'),q('不支持','Unavailable'),q('不消耗积分','No credit consumption')]
      ]},
      {id:'features', title:q('功能与分享','Features & sharing'), defaultOpen:false, rows:[
        [q('D5 Render 专业版','D5 Render Pro'),'—','—',q('完整权益','Full benefits')],
        [q('云空间','Cloud storage'),q('限量','Limited'),'10 GB','10 GB'],
        [q('每画布分享链接','Share links per canvas'),'1','3','3'],
        [q('分享下载权限','Download controls'),q('默认开启，不可关闭','On, cannot disable'),q('可关闭','Can disable'),q('可关闭','Can disable')],
        [q('署名水印','Attribution watermark'),q('可关闭','Can disable'),q('可关闭','Can disable'),q('可关闭','Can disable')],
        [q('积分充值','Credit top-up'),q('不可充值','Unavailable'),q('在订可充值 · 独立充值页','Active subscription · separate page'),q('在订可充值 · 独立充值页','Active subscription · separate page')]
      ]}
    ]};
  }
  function snapshotPricing() {
    const batch = monthlyBatch(true), after = monthlyBatch(false), once = communityCredits();
    return {dataRevision: DATA_REVISION, currency:'CNY', personal:JSON.parse(JSON.stringify(PERSONAL_TIERS)),
      community: {oneTimeCredits: once, ...outputEstimate(once)},
      launch: {...LAUNCH}, eligibleMonthlyBatch: batch, afterWindowMonthlyBatch: after,
      annual: {payment:'full-annual-fee', baseCreditsPerMonth:batch.base, issuance:'monthly', bonus:'eligible-batches-only'},
      businessLaunchBonus: false, demoOverlay: demoPricing() ? JSON.parse(JSON.stringify(demoPricing())) : null,
      sourceDefaults: sourcePricing()};
  }
  function freeze(obj) {
    Object.values(obj).forEach(v => { if (v && typeof v === 'object') freeze(v); });
    return Object.freeze(obj);
  }
  global.D5Data = freeze({DATA_REVISION, dataRevision:DATA_REVISION, TIER_MAX, DEFAULT_TIER,
    TIER_NAMES:{zh:['首发方案'],en:['Launch plan']}, PERSONAL_TIERS, COMMUNITY, PLAN_META,
    BUSINESS, EDUCATION, LAUNCH, monthlyBatch, outputEstimate, price, buildCompare, snapshotPricing,
    communityCredits, communityDays, sourcePricing, demoPricing, currency:'CNY'});
})(typeof window !== 'undefined' ? window : globalThis);
