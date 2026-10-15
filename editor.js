/* Beta page editor — V3/V4 freedom + offline HTML. Business defaults stay in data.js; demo overlay is draft-only. */
(function () {
  'use strict';
  const SCHEMA = 'd5-beta-editor-gork-v1';
  const LEGACY_SCHEMAS = new Set(['d5-beta-editor-v1', 'd5-beta-editor-gork-v1']);
  const revision = window.D5Data.DATA_REVISION;
  const boot = window.D5_EDITOR_BOOT || null;
  const bundle = window.D5_OFFLINE_BUNDLE || null;
  const STORE = 'd5-pricing-beta-gork-v1' + (boot ? '-offline-' + boot.id : '');
  const LEGACY_STORE = 'd5-beta-copy-v1' + (boot ? '-offline-' + boot.id : '');
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const emptyDraft = () => ({
    schema: SCHEMA,
    dataRevision: revision,
    copy: {},
    styles: {},
    demoPricing: null,
    moduleVisibility: {},
    membershipId: 'community'
  });

  let draft = emptyDraft();
  let editing = false;
  let selected = null;
  let dirty = false;
  let saving = null;
  let storageError = '';
  const fields = new Map();
  const undo = [];
  const redo = [];

  const lang = () => (window.state?.lang === 'en' ? 'en' : 'zh');
  const idFor = (el) => {
    const key = el.dataset.editKey || el.getAttribute('data-edit') || el.dataset.editAuto;
    return lang() + ':' + key;
  };
  const keyOf = (el) => el.dataset.editKey || el.getAttribute('data-edit') || el.dataset.editAuto;

  function sourceDemoPricing() {
    return window.D5Data.sourcePricing ? clone(window.D5Data.sourcePricing()) : {
      prices: { basic: { monthly: 49, annual: 399 }, pro: { monthly: 200, annual: 1920 } },
      monthlyCredits: 1000,
      launchBonus: 500,
      communityCredits: 300,
      communityDays: 365
    };
  }

  function sanitizeDemoPricing(raw) {
    if (raw == null) return null;
    if (typeof raw !== 'object' || Array.isArray(raw)) throw Error('demoPricing 无效');
    const src = sourceDemoPricing();
    const out = {
      prices: {
        basic: {
          monthly: Number(raw.prices?.basic?.monthly ?? src.prices.basic.monthly),
          annual: Number(raw.prices?.basic?.annual ?? src.prices.basic.annual)
        },
        pro: {
          monthly: Number(raw.prices?.pro?.monthly ?? src.prices.pro.monthly),
          annual: Number(raw.prices?.pro?.annual ?? src.prices.pro.annual)
        }
      },
      monthlyCredits: Number(raw.monthlyCredits ?? src.monthlyCredits),
      launchBonus: Number(raw.launchBonus ?? src.launchBonus),
      communityCredits: Number(raw.communityCredits ?? src.communityCredits),
      communityDays: Number(raw.communityDays ?? src.communityDays)
    };
    for (const n of [
      out.prices.basic.monthly, out.prices.basic.annual,
      out.prices.pro.monthly, out.prices.pro.annual,
      out.monthlyCredits, out.launchBonus, out.communityCredits, out.communityDays
    ]) {
      if (!Number.isFinite(n) || n < 0 || n > 1e7) throw Error('演示价格/积分超出范围');
    }
    return out;
  }

  function applyDemoToRuntime() {
    window.D5Demo = window.D5Demo || {};
    window.D5Demo.pricing = draft.demoPricing ? clone(draft.demoPricing) : null;
    window.D5Demo.membershipId = draft.membershipId || 'community';
  }

  function validate(x, { migrate = true } = {}) {
    if (!x || typeof x !== 'object') throw Error('草稿无效');
    let schema = x.schema;
    if (migrate && schema === 'd5-beta-editor-v1') schema = SCHEMA;
    if (!LEGACY_SCHEMAS.has(x.schema) && x.schema !== SCHEMA) throw Error('草稿版本不匹配');
    if (x.dataRevision !== revision) throw Error('草稿 dataRevision 与页面不一致');
    if (!x.copy || typeof x.copy !== 'object' || Array.isArray(x.copy)) throw Error('copy 无效');
    if (Object.keys(x.copy).length > 2000) throw Error('草稿字段过多');
    const out = emptyDraft();
    out.schema = SCHEMA;
    out.dataRevision = revision;
    for (const [k, v] of Object.entries(x.copy)) {
      const [l, ...rest] = k.split(':');
      const field = rest.join(':');
      if (!['zh', 'en'].includes(l) || !field || typeof v !== 'string' || v.length > 8000) {
        throw Error('草稿包含无效文案字段：' + k);
      }
      out.copy[k] = v;
    }
    if (x.styles) {
      if (typeof x.styles !== 'object' || Array.isArray(x.styles) || Object.keys(x.styles).length > 2000) {
        throw Error('样式字段无效');
      }
      for (const [k, v] of Object.entries(x.styles)) {
        const [l, ...rest] = k.split(':');
        if (!['zh', 'en'].includes(l) || !rest.join(':') || !v || typeof v !== 'object') throw Error('样式字段无效');
        const s = {};
        for (const [p, val] of Object.entries(v)) {
          if (p === 'fontSize' && Number.isInteger(val) && val >= 10 && val <= 72) s[p] = val;
          else if (p === 'color' && typeof val === 'string' && /^#[0-9a-f]{6}$/i.test(val)) s[p] = val;
          else if (p === 'textAlign' && ['left', 'center', 'right'].includes(val)) s[p] = val;
          else if (p === 'paddingTop' && Number.isInteger(val) && val >= 0 && val <= 120) s[p] = val;
          else throw Error('样式值无效');
        }
        out.styles[k] = s;
      }
    }
    if (Object.prototype.hasOwnProperty.call(x, 'demoPricing')) {
      out.demoPricing = sanitizeDemoPricing(x.demoPricing);
    }
    if (x.moduleVisibility && typeof x.moduleVisibility === 'object' && !Array.isArray(x.moduleVisibility)) {
      for (const [k, v] of Object.entries(x.moduleVisibility)) {
        if (typeof v === 'boolean' && /^[a-zA-Z0-9._-]{1,40}$/.test(k)) out.moduleVisibility[k] = v;
      }
    }
    if (typeof x.membershipId === 'string' && x.membershipId.length < 40) out.membershipId = x.membershipId;
    return out;
  }

  function loadInitial() {
    try {
      let saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (!saved && !boot?.draft) {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_STORE) || 'null');
        if (legacy) {
          saved = legacy;
          storageError = '已从旧草稿键迁移，请导出备份';
        }
      }
      if (boot?.draft) saved = boot.draft;
      if (saved) draft = validate(saved);
    } catch (e) {
      storageError = '草稿未加载：' + e.message;
      draft = emptyDraft();
    }
    applyDemoToRuntime();
    if (boot?.view) {
      Object.assign(window.state, {
        lang: boot.view.lang === 'en' ? 'en' : 'zh',
        billing: boot.view.billing === 'annual' ? 'annual' : 'monthly',
        audience: boot.view.audience === 'team' ? 'team' : 'personal'
      });
    }
  }

  const SWEEP = [
    '.hero h1', '.hero p', '.hero .beta-marker',
    '.education-inner strong', '.education-inner span', '.education-inner a',
    '.billing > span', '.billing-annual > span', '.billing-annual > b',
    '.segmented [data-audience]',
    '.plan-desc', '.plan-name h2', '.plan-button', '.product-scope', '.price-period', '.price-context',
    '.credit-kicker', '.credit-basis', '.benefit-label', '.feature-inheritance', '.feature-storage',
    '.capacity-label', '.generation-output', '.pool-note', '.generation-assumptions summary', '.generation-assumptions p',
    '.plan-list li span', '.benefit-terms summary', '.benefit-terms li span', '.benefit-terms p',
    '.section-head h2', '.section-head p', '.compare-hint', '.comparison-note',
    '.faq-title h2', '.faq-list summary span', '.faq-list details p',
    '.compare-head th', '.compare-group span', '.compare-row .lead', '.compare-table .lead span', '.compare-text',
    '.launch-band-head strong', '.launch-band-head span', '.launch-band-head a',
    '#launch-details summary', '#launch-details p', '#launch-details a',
    '.team-intro h2', '.team-intro p', '.biz-module-head h2', '.biz-module-head p', '.biz-module-note', '.biz-module-tagline',
    '.seat-card .plan-name h2', '.seat-card .plan-desc', '.seat-card .plan-button span', '.seat-card .product-scope',
    '.capacity-title', '.beta-footer [data-edit-key]', '.footer-links a', '.footer-links button',
    '.preview-top .beta-marker', '#preview-title', '.preview-demo', '.order-note', '.preview-done',
    '.order-row dt', '.global-nav .section-nav a', '.skip-link'
  ];

  function markEditable(el, key) {
    if (!el || el.closest('#d5-editor, #d5-editor-reveal, .sr-only, script, style')) return;
    if (el.matches('input, textarea, select, img, svg, path, .launch-dot')) return;
    if (el.hasAttribute('data-demo-field')) return;
    if (!el.dataset.editKey && !el.getAttribute('data-edit')) {
      el.setAttribute('data-edit-key', key);
    }
    const k = keyOf(el);
    if (!k) return;
    el.setAttribute('contenteditable', editing ? 'plaintext-only' : 'false');
    el.setAttribute('spellcheck', 'false');
    el.classList.toggle('editor-can-edit', editing);
  }

  function enableSweep() {
    if (!editing) {
      document.querySelectorAll('[contenteditable]').forEach((el) => {
        el.setAttribute('contenteditable', 'false');
        el.classList.remove('editor-can-edit');
      });
      return;
    }
    document.querySelectorAll('[data-edit-key], [data-edit]').forEach((el) => markEditable(el, keyOf(el)));
    document.querySelectorAll('[data-i18n]').forEach((el) => markEditable(el, el.dataset.i18n));
    document.querySelectorAll('[data-zh][data-en]').forEach((el) => {
      if (keyOf(el)) { markEditable(el, keyOf(el)); return; }
      const guess = (el.className || el.tagName || 'node').toString().replace(/\s+/g, '.').slice(0, 40);
      markEditable(el, 'i18n.' + guess + '.' + Math.abs(hash(el.textContent || guess) % 10000));
    });
    let autoIdx = 0;
    document.querySelectorAll(SWEEP.join(',')).forEach((el) => {
      if (keyOf(el)) { markEditable(el, keyOf(el)); return; }
      if (el.dataset.i18n) { markEditable(el, el.dataset.i18n); return; }
      const key = el.getAttribute('data-edit-auto') || `auto.${(el.className || el.tagName || 'node').toString().replace(/\s+/g, '.').slice(0, 40)}.${autoIdx++}`;
      el.setAttribute('data-edit-auto', key);
      markEditable(el, key);
    });
  }

  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h;
  }

  function applyModuleVisibility() {
    const map = {
      hero: '.hero',
      launchBand: '#launch-rules, .launch-band',
      education: '.education',
      comparison: '#comparison',
      faq: '#faq',
      footer: '.beta-footer'
    };
    for (const [id, sel] of Object.entries(map)) {
      const visible = draft.moduleVisibility[id] !== false;
      document.querySelectorAll(sel).forEach((el) => {
        el.hidden = !visible;
        el.setAttribute('data-module', id);
      });
      const cb = bar.querySelector(`[data-module-toggle="${id}"]`);
      if (cb) cb.checked = visible;
    }
  }

  function ensureBase(e, id) {
    if (fields.has(id)) return fields.get(id);
    const source = e.dataset[lang()];
    const base = {
      text: source ?? e.textContent,
      html: source !== undefined ? null : null,
      style: ''
    };
    fields.set(id, base);
    return base;
  }
  function applyCopyStyles() {
    // Fresh render wins for untouched keys; only overlay draft.copy / draft.styles.
    document.querySelectorAll('[data-edit-key], [data-edit], [data-edit-auto]').forEach((e) => {
      if (e.hasAttribute('data-demo-field')) return;
      const key = keyOf(e);
      if (!key) return;
      const id = lang() + ':' + key;
      ensureBase(e, id);
      if (Object.prototype.hasOwnProperty.call(draft.copy, id)) e.textContent = draft.copy[id];
      for (const [p, val] of Object.entries(draft.styles[id] || {})) {
        if (p === 'fontSize') e.style.fontSize = val + 'px';
        else if (p === 'paddingTop') e.style.paddingTop = val + 'px';
        else e.style[p] = val;
      }
    });
  }

  function apply() {
    applyDemoToRuntime();
    applyModuleVisibility();
    applyCopyStyles();
    enableSweep();
    if (bundle) {
      document.querySelectorAll('a[href="topup.html"],a[href^="http://127.0.0.1"],a[href^="http://localhost"]').forEach((a) => {
        if (!/topup\.html/.test(a.getAttribute('href') || '') && !a.dataset.onlineOnly) return;
        a.dataset.onlineOnly = 'topup';
        a.setAttribute('href', '#');
        a.setAttribute('aria-disabled', 'true');
        a.title = '充值页为独立在线预览，请返回本机预览服务查看';
      });
    }
    if (typeof window.alignCardSections === 'function') window.alignCardSections();
    controls();
    refreshJsonPanel(false);
  }

  function remember() {
    undo.push(clone(draft));
    if (undo.length > 50) undo.shift();
    redo.length = 0;
  }

  function status(message) {
    bar.querySelector('.editor-status').textContent =
      message || storageError || (dirty ? '修改中 · 未保存' : '草稿已保存于本机');
  }

  function save() {
    clearTimeout(saving);
    try {
      localStorage.setItem(STORE, JSON.stringify(draft));
      dirty = false;
      storageError = storageError.startsWith('已从旧草稿') ? storageError : '';
      status('已保存于本机 · 导出可分享');
    } catch (e) {
      storageError = '本机存储不可用，请导出保存';
      status(storageError);
    }
    controls();
  }

  function changed() {
    dirty = true;
    status('修改中 · 自动保存…');
    clearTimeout(saving);
    saving = setTimeout(save, 350);
    controls();
  }

  function controls() {
    bar.querySelector('[data-editor=undo]').disabled = !undo.length;
    bar.querySelector('[data-editor=redo]').disabled = !redo.length;
  }

  function setMode(on) {
    editing = !!on;
    selected = null;
    document.body.classList.toggle('d5-editing', editing);
    document.body.classList.toggle('editing', editing);
    bar.querySelector('[data-editor=mode]').textContent = editing ? '✓ 完成编辑' : '✎ 编辑页面';
    bar.querySelector('.editor-format').hidden = !editing;
    bar.querySelector('.editor-modules').hidden = !editing;
    apply();
    status(editing ? '编辑中 · 点虚线文案直接修改；价格数字用「价格 / JSON」' : '预览中 · 修改保留');
  }

  function commit(e) {
    if (!editing || !e || !e.isConnected) return;
    if (!e.matches('[data-edit-key], [data-edit], [data-edit-auto]')) return;
    if (e.hasAttribute('data-demo-field')) return;
    const key = keyOf(e);
    if (!key) return;
    const id = lang() + ':' + key;
    const value = (e.textContent || '').slice(0, 8000);
    const prev = draft.copy[id] ?? fields.get(id)?.text;
    if (value === prev) return;
    remember();
    draft.copy[id] = value;
    document.querySelectorAll('[data-edit-key], [data-edit], [data-edit-auto]').forEach((other) => {
      if (other !== e && keyOf(other) === key) other.textContent = value;
    });
    changed();
  }

  function selectField(e) {
    const demo = e.target.closest('[data-demo-field]');
    if (editing && demo) {
      openJsonPanel(true);
      status('演示数字请在「价格 / JSON」面板修改，保证订单一致');
      return;
    }
    const el = e.target.closest('[data-edit-key], [data-edit], [data-edit-auto]');
    if (!editing || !el || el.hasAttribute('data-demo-field')) return;
    selected = el;
    const cs = getComputedStyle(el);
    bar.querySelector('.editor-selected').textContent = keyOf(el) || '';
    const rgb = cs.color.match(/\d+/g);
    if (rgb?.length >= 3) {
      bar.querySelector('[data-format=color]').value =
        '#' + rgb.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('');
    }
    bar.querySelector('[data-format=fontSize]').value = Math.round(parseFloat(cs.fontSize));
    bar.querySelector('[data-format=textAlign]').value =
      ['left', 'center', 'right'].includes(cs.textAlign) ? cs.textAlign : 'left';
    const pad = Math.round(parseFloat(cs.paddingTop)) || 0;
    bar.querySelector('[data-format=paddingTop]').value = pad;
  }

  function payload() {
    commit(document.activeElement);
    return clone(draft);
  }

  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function panelPayload() {
    return {
      schema: SCHEMA,
      dataRevision: revision,
      note: '改 demoPricing 后点「应用」；卡片价/对比表/订单同源。copy 为按 lang:key 的文案覆盖。',
      demoPricing: draft.demoPricing || sourceDemoPricing(),
      membershipId: draft.membershipId,
      moduleVisibility: draft.moduleVisibility,
      copy: draft.copy,
      styles: draft.styles
    };
  }

  function refreshJsonPanel(force) {
    const ta = bar.querySelector('#edit-json-text');
    if (!ta) return;
    if (!force && document.activeElement === ta) return;
    ta.value = JSON.stringify(panelPayload(), null, 2);
  }

  function openJsonPanel(open) {
    const panel = bar.querySelector('.edit-json-panel');
    if (!panel) return;
    panel.hidden = open === false ? true : open === true ? false : !panel.hidden;
    if (!panel.hidden) refreshJsonPanel(true);
  }

  function applyJsonPanel() {
    const ta = bar.querySelector('#edit-json-text');
    const msg = bar.querySelector('#edit-json-msg');
    try {
      const data = JSON.parse(ta.value);
      remember();
      if (data.copy) {
        for (const [k, v] of Object.entries(data.copy)) {
          if (typeof v === 'string') draft.copy[k] = v.slice(0, 8000);
        }
      }
      if (data.styles && typeof data.styles === 'object') draft.styles = data.styles;
      if (Object.prototype.hasOwnProperty.call(data, 'demoPricing')) {
        draft.demoPricing = sanitizeDemoPricing(data.demoPricing);
      }
      if (data.moduleVisibility) draft.moduleVisibility = { ...draft.moduleVisibility, ...data.moduleVisibility };
      if (typeof data.membershipId === 'string') draft.membershipId = data.membershipId;
      draft = validate(draft);
      applyDemoToRuntime();
      if (typeof window.renderAll === 'function') window.renderAll();
      else apply();
      changed();
      if (msg) msg.textContent = '已应用 · 卡片/对比/订单已同步';
    } catch (e) {
      if (msg) msg.textContent = '应用失败：' + e.message;
      status('JSON 应用失败：' + e.message);
    }
  }

  async function resources() {
    if (bundle) return bundle;
    const response = await fetch('index.html', { cache: 'no-store' });
    if (!response.ok) throw Error('无法读取页面模板');
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const texts = {};
    for (const e of doc.querySelectorAll('link[rel=stylesheet][href],script[src]')) {
      const ref = e.getAttribute('href') || e.getAttribute('src');
      const r = await fetch(ref, { cache: 'no-store' });
      if (!r.ok) throw Error('资源读取失败：' + ref);
      texts[ref] = await r.text();
    }
    const assets = {};
    const strings = [html, ...Object.values(texts)].join('\n');
    const names = new Set([...strings.matchAll(/assets\/[a-zA-Z0-9_./-]+\.(?:svg|png|webp|jpe?g)/g)].map((m) => m[0]));
    for (const ref of names) {
      const r = await fetch(ref);
      if (!r.ok) throw Error('图片读取失败：' + ref);
      const blob = await r.blob();
      assets[ref] = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(blob);
      });
    }
    return { html, texts, assets };
  }

  const scriptSafe = (s) => s.replace(/<\/script/gi, '<\\/script');

  async function buildHtml() {
    const draftCopy = payload();
    const b = await resources();
    const doc = new DOMParser().parseFromString(b.html, 'text/html');
    const replaceAssets = (text) => {
      for (const [k, v] of Object.entries(b.assets)) text = text.split(k).join(v);
      return text;
    };
    for (const e of [...doc.querySelectorAll('link[rel=stylesheet]')]) {
      const style = doc.createElement('style');
      style.textContent = replaceAssets(b.texts[e.getAttribute('href')]);
      e.replaceWith(style);
    }
    for (const e of [...doc.querySelectorAll('script[src]')]) {
      const script = doc.createElement('script');
      script.textContent = scriptSafe(replaceAssets(b.texts[e.getAttribute('src')]));
      e.replaceWith(script);
    }
    for (const e of doc.querySelectorAll('[src],link[rel=icon]')) {
      for (const attr of ['src', 'href']) {
        if (e.hasAttribute(attr)) {
          const ref = e.getAttribute(attr);
          if (b.assets[ref]) e.setAttribute(attr, b.assets[ref]);
        }
      }
    }
    // Offline boot: draft + view only. Never embed cloud edit/view tokens.
    const bootPayload = {
      id: Date.now().toString(36),
      draft: draftCopy,
      view: { lang: state.lang, billing: state.billing, audience: state.audience }
    };
    const meta = doc.createElement('script');
    meta.textContent = scriptSafe(
      'window.D5_OFFLINE_BUNDLE=' + JSON.stringify(b) +
      ';window.D5_EDITOR_BOOT=' + JSON.stringify(bootPayload) +
      ';window.D5_CLOUD_API=undefined;try{sessionStorage.removeItem("d5-cloud-session-v1")}catch(e){}'
    );
    doc.head.prepend(meta);
    for (const a of doc.querySelectorAll('a[href="topup.html"]')) {
      a.setAttribute('href', new URL('topup.html', location.protocol === 'file:' ? 'http://127.0.0.1:8768/' : location.href).href);
      a.setAttribute('title', '独立充值页仅在本机预览可用');
    }
    return '<!doctype html>\n' + doc.documentElement.outerHTML;
  }

  async function exportHtml() {
    status('正在生成离线 HTML…');
    try {
      const html = await buildHtml();
      download('D5-首发价格页-Beta-可编辑.html', html, 'text/html;charset=utf-8');
      status('HTML 已导出 · 草稿保留');
      return html;
    } catch (e) {
      status('导出失败：' + e.message);
      throw e;
    }
  }

  function importDraft(text) {
    if (typeof text !== 'string' || text.length > 2e6) throw Error('草稿文件过大');
    const parsed = JSON.parse(text);
    // Accept V4-ish payload with copyOverrides / tiers → map into our schema
    let next;
    if (parsed.copyOverrides || parsed.tiers || parsed.demoPricing || parsed.copy) {
      if (parsed.schema || parsed.copy) {
        next = validate({
          schema: parsed.schema || SCHEMA,
          dataRevision: parsed.dataRevision || revision,
          copy: parsed.copy || {},
          styles: parsed.styles || {},
          demoPricing: parsed.demoPricing ?? null,
          moduleVisibility: parsed.moduleVisibility || {},
          membershipId: parsed.membershipId || 'community'
        });
      } else {
        // Loose V4 import: copyOverrides keys without lang prefix → apply to current lang
        const copy = {};
        if (parsed.copyOverrides) {
          for (const [k, v] of Object.entries(parsed.copyOverrides)) {
            const str = typeof v === 'string' ? v : (v?.[lang()] || v?.zh || v?.en || '');
            if (str) copy[lang() + ':' + k] = String(str).slice(0, 8000);
          }
        }
        let demoPricing = parsed.demoPricing || null;
        if (!demoPricing && Array.isArray(parsed.tiers) && parsed.tiers[0]?.prices) {
          const t = parsed.tiers[0];
          demoPricing = {
            prices: {
              basic: { monthly: t.prices?.basic?.monthly ?? 49, annual: t.prices?.basic?.annual ?? 399 },
              pro: { monthly: t.prices?.pro?.monthly ?? 200, annual: t.prices?.pro?.annual ?? 1920 }
            },
            monthlyCredits: t.monthlyCredits ?? 1000,
            launchBonus: Math.round((t.monthlyCredits ?? 1000) * 0.5),
            communityCredits: 300,
            communityDays: 365
          };
        }
        next = validate({
          schema: SCHEMA,
          dataRevision: revision,
          copy,
          styles: {},
          demoPricing,
          moduleVisibility: {},
          membershipId: parsed.membershipId || 'community'
        });
      }
    } else {
      next = validate(parsed);
    }
    remember();
    draft = next;
    applyDemoToRuntime();
    if (typeof window.renderAll === 'function') window.renderAll();
    else apply();
    changed();
    return true;
  }

  // ---- UI ----
  const bar = document.createElement('aside');
  bar.id = 'd5-editor';
  bar.setAttribute('aria-label', '页面编辑工具');
  bar.innerHTML = `
    <div class="editor-main">
      <button type="button" data-editor="mode" class="editor-primary">✎ 编辑页面</button>
      <span class="editor-status" role="status"></span>
      <button type="button" data-editor="undo" title="撤销">↶</button>
      <button type="button" data-editor="redo" title="重做">↷</button>
      <button type="button" data-editor="save">保存草稿</button>
      <button type="button" data-editor="json-panel">价格 / JSON</button>
      <button type="button" data-editor="html">导出 HTML</button>
      <button type="button" data-editor="more" aria-expanded="false">更多 ⋯</button>
      <button type="button" data-editor="collapse" title="收起编辑工具">⌄</button>
    </div>
    <div class="editor-more" hidden>
      <button type="button" data-editor="json">导出草稿 JSON</button>
      <button type="button" data-editor="import">导入草稿</button>
      <button type="button" data-editor="import-legacy">导入旧 Beta 草稿</button>
      <button type="button" data-editor="reset">恢复原稿</button>
      <span>HTML 支持离线查看与再编辑；教育官网需联网；独立充值页仅在本机预览可用。</span>
    </div>
    <div class="editor-format" hidden>
      <span class="editor-selected">点选文案调整样式</span>
      <label>字号 <input type="number" min="10" max="72" data-format="fontSize" aria-label="字号"></label>
      <label>颜色 <input type="color" data-format="color" aria-label="颜色"></label>
      <label>对齐 <select data-format="textAlign" aria-label="对齐"><option value="left">左</option><option value="center">中</option><option value="right">右</option></select></label>
      <label>上间距 <input type="number" min="0" max="120" data-format="paddingTop" aria-label="上间距"></label>
      <span class="editor-help">虚线可直接改 · 价格/积分离开「价格 / JSON」面板 · 改后订单同源</span>
    </div>
    <div class="editor-modules" hidden>
      <span class="editor-help">模块显隐</span>
      <label><input type="checkbox" data-module-toggle="hero" checked> Hero</label>
      <label><input type="checkbox" data-module-toggle="launchBand" checked> 首发短带</label>
      <label><input type="checkbox" data-module-toggle="education" checked> 学生条</label>
      <label><input type="checkbox" data-module-toggle="comparison" checked> 对比表</label>
      <label><input type="checkbox" data-module-toggle="faq" checked> FAQ</label>
      <label><input type="checkbox" data-module-toggle="footer" checked> 页脚</label>
    </div>
    <div class="edit-json-panel" hidden>
      <label for="edit-json-text">演示价格 / 积分 + 文案覆盖（改数字后点应用，卡片·对比表·订单同源）</label>
      <textarea id="edit-json-text" spellcheck="false" rows="12"></textarea>
      <div class="edit-json-actions">
        <button type="button" class="editor-primary" data-editor="apply-json">应用</button>
        <button type="button" data-editor="refresh-json">刷新面板</button>
        <button type="button" data-editor="clear-demo">清除演示价（回源）</button>
        <span id="edit-json-msg" class="edit-json-msg"></span>
      </div>
    </div>
    <input type="file" accept="application/json,.json" hidden data-import-file>`;

  document.body.append(bar);
  const reveal = document.createElement('button');
  reveal.id = 'd5-editor-reveal';
  reveal.textContent = '✎ 编辑页面';
  reveal.hidden = true;
  document.body.append(reveal);
  reveal.onclick = () => { bar.hidden = false; reveal.hidden = true; };

  const badge = document.createElement('div');
  badge.id = 'd5-editor-badge';
  badge.hidden = true;
  badge.textContent = '编辑中 · 草稿';
  document.body.append(badge);

  loadInitial();
  if (typeof window.renderAll === 'function') window.renderAll();

  document.addEventListener('focusin', selectField);
  document.addEventListener('pointerdown', selectField);
  document.addEventListener('click', selectField, true);
  document.addEventListener('focusout', (e) => {
    commit(e.target);
    if (editing && typeof window.alignCardSections === 'function') window.alignCardSections();
  });
  document.addEventListener('input', (e) => {
    if (editing && e.target.matches('[data-edit-key], [data-edit], [data-edit-auto]')) commit(e.target);
  });
  document.addEventListener('paste', (e) => {
    if (!editing || !e.target.matches('[data-edit-key], [data-edit], [data-edit-auto]')) return;
    e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData?.getData('text/plain') || '').slice(0, 8000));
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-online-only]')) {
      e.preventDefault();
      status('独立充值页需本机预览服务；本文件可离线查看和编辑');
      return;
    }
    if (!editing) return;
    // Keep real product actions usable in edit mode (order preview / audience / billing / FAQ toggles).
    if (e.target.closest('[data-preview-plan],[data-contact-sales],[data-close-preview],[data-billing-toggle],[data-lang],[data-audience],[data-toggle-group],[data-export],.language-switch,.audience-switch')) return;
    if (e.target.closest('[data-demo-field]')) return;
    if (e.target.closest('[data-edit-key], [data-edit], [data-edit-auto]')) {
      if (e.target.closest('a[href],summary')) e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  bar.addEventListener('change', (e) => {
    const mod = e.target.dataset.moduleToggle;
    if (mod) {
      remember();
      draft.moduleVisibility[mod] = e.target.checked;
      applyModuleVisibility();
      changed();
      return;
    }
    const p = e.target.dataset.format;
    if (!p || !selected?.isConnected) return;
    commit(selected);
    remember();
    const id = idFor(selected);
    draft.styles[id] ??= {};
    if (p === 'fontSize') draft.styles[id][p] = Math.round(Math.max(10, Math.min(72, Number(e.target.value) || 16)));
    else if (p === 'paddingTop') draft.styles[id][p] = Math.round(Math.max(0, Math.min(120, Number(e.target.value) || 0)));
    else draft.styles[id][p] = e.target.value;
    applyCopyStyles();
    changed();
  });

  document.addEventListener('d5:render', () => {
    selected = null;
    fields.clear();
    apply();
    badge.hidden = !editing;
  });

  bar.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-editor]')?.dataset.editor;
    if (!action) return;
    commit(document.activeElement);
    if (action === 'mode') {
      setMode(!editing);
      badge.hidden = !editing;
    } else if (action === 'save') save();
    else if (action === 'undo' && undo.length) {
      redo.push(clone(draft));
      draft = undo.pop();
      applyDemoToRuntime();
      if (typeof window.renderAll === 'function') window.renderAll();
      else apply();
      changed();
    } else if (action === 'redo' && redo.length) {
      undo.push(clone(draft));
      draft = redo.pop();
      applyDemoToRuntime();
      if (typeof window.renderAll === 'function') window.renderAll();
      else apply();
      changed();
    } else if (action === 'json') {
      download('D5-Beta-editor-gork-draft.json', JSON.stringify(payload(), null, 2), 'application/json');
      status('草稿已导出');
    } else if (action === 'html') {
      try { await exportHtml(); } catch (err) { console.error(err); }
    } else if (action === 'import') bar.querySelector('[data-import-file]').click();
    else if (action === 'import-legacy') {
      try {
        const legacy = localStorage.getItem(LEGACY_STORE);
        if (!legacy) { status('未找到旧草稿 ' + LEGACY_STORE); return; }
        importDraft(legacy);
        status('已导入旧 Beta 草稿');
      } catch (err) { status('导入旧草稿失败：' + err.message); }
    } else if (action === 'reset' && confirm('恢复原稿？当前文案、样式与演示价格将清空，可先导出草稿。')) {
      remember();
      draft = emptyDraft();
      applyDemoToRuntime();
      if (typeof window.renderAll === 'function') window.renderAll();
      else apply();
      changed();
    } else if (action === 'more') {
      const m = bar.querySelector('.editor-more');
      m.hidden = !m.hidden;
      e.target.setAttribute('aria-expanded', String(!m.hidden));
    } else if (action === 'collapse') {
      setMode(false);
      badge.hidden = true;
      bar.hidden = true;
      reveal.hidden = false;
    } else if (action === 'json-panel') openJsonPanel();
    else if (action === 'apply-json') applyJsonPanel();
    else if (action === 'refresh-json') refreshJsonPanel(true);
    else if (action === 'clear-demo') {
      remember();
      draft.demoPricing = null;
      applyDemoToRuntime();
      if (typeof window.renderAll === 'function') window.renderAll();
      else apply();
      changed();
      const msg = bar.querySelector('#edit-json-msg');
      if (msg) msg.textContent = '已回源业务默认价';
      refreshJsonPanel(true);
    }
  });

  bar.querySelector('[data-import-file]').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      if (f.size > 2e6) throw Error('文件超过 2MB');
      importDraft(await f.text());
      status('草稿已导入');
    } catch (err) {
      status('导入失败：' + err.message);
    }
    e.target.value = '';
  };

  document.addEventListener('keydown', (e) => {
    if (editing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      commit(document.activeElement);
      save();
    }
    if (e.key === 'Escape' && editing) {
      commit(document.activeElement);
      if (!bar.querySelector('.edit-json-panel')?.hidden) openJsonPanel(false);
      else setMode(false);
      badge.hidden = true;
    }
  });

  window.addEventListener('beforeunload', () => {
    commit(document.activeElement);
    if (dirty) save();
  });

  window.applyDemoPricing = function (overlay) {
    remember();
    draft.demoPricing = sanitizeDemoPricing(overlay);
    applyDemoToRuntime();
    if (typeof window.renderAll === 'function') window.renderAll();
    else apply();
    changed();
  };

  window.D5Editor = Object.freeze({
    getDraft: payload,
    importDraft,
    buildHtml,
    exportHtml,
    setMode,
    save,
    setStatus: status,
    storageKey: STORE,
    schema: SCHEMA,
    applyDemoPricing: window.applyDemoPricing
  });

  apply();
  status(boot ? '离线副本 · 修改可继续导出' : storageError || '预览中 · 点击编辑页面（V3/V4 级自由度）');
})();
