/**
 * Cloudflare share sync for D5 Beta editor.
 * Depends on window.D5Editor (editor.js). Local draft remains cache; cloud is share source.
 */
(function () {
  'use strict';

  const SESSION_KEY = 'd5-cloud-session-v1';
  const API_LS_KEY = 'd5-cloud-api-base';

  const state = {
    projectId: null,
    editToken: null,
    viewToken: null,
    version: null,
    role: null,
    title: '',
    busy: false
  };

  function apiBase() {
    if (typeof window.D5_CLOUD_API === 'string' && window.D5_CLOUD_API.trim()) {
      return window.D5_CLOUD_API.trim().replace(/\/$/, '');
    }
    const meta = document.querySelector('meta[name="d5-cloud-api"]');
    if (meta?.content?.trim()) return meta.content.trim().replace(/\/$/, '');
    try {
      const ls = localStorage.getItem(API_LS_KEY);
      if (ls && ls.trim()) return ls.trim().replace(/\/$/, '');
    } catch (_) { /* ignore */ }
    return '';
  }

  function setStatus(msg) {
    if (window.D5Editor?.setStatus) window.D5Editor.setStatus(msg);
    else {
      const el = document.querySelector('#d5-editor .editor-status');
      if (el) el.textContent = msg;
    }
  }

  function persistSession() {
    try {
      if (!state.projectId) {
        sessionStorage.removeItem(SESSION_KEY);
        return;
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        projectId: state.projectId,
        editToken: state.editToken,
        viewToken: state.viewToken,
        version: state.version,
        role: state.role,
        title: state.title
      }));
    } catch (_) { /* ignore */ }
  }

  function loadSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s?.projectId) Object.assign(state, s);
    } catch (_) { /* ignore */ }
  }

  function parseUrlShare() {
    const params = new URLSearchParams(location.search);
    const projectId = params.get('project');
    if (!projectId) return null;
    const hash = (location.hash || '').replace(/^#/, '');
    let editToken = null;
    let viewToken = null;
    if (hash.startsWith('edit=')) editToken = decodeURIComponent(hash.slice(5));
    else if (hash.startsWith('view=')) viewToken = decodeURIComponent(hash.slice(5));
    else {
      const hp = new URLSearchParams(hash);
      editToken = hp.get('edit');
      viewToken = hp.get('view');
    }
    return { projectId, editToken, viewToken };
  }

  /**
   * Share base from the *current page URL* so GitHub Pages subpaths
   * like /d5pricing-beta/ are kept. Never rebuild as origin + "/index.html"
   * (that drops the repo path). Origin for CORS is host-only; path stays in the link.
   */
  function pageShareBase() {
    const u = new URL(location.href);
    u.hash = '';
    u.search = '';
    // Normalize .../index.html or .../index2.html → directory with trailing slash
    if (/\/index2?\.html$/i.test(u.pathname)) {
      u.pathname = u.pathname.replace(/\/index2?\.html$/i, '/');
    } else if (u.pathname && !u.pathname.endsWith('/')) {
      // Keep file paths as-is (e.g. custom entry); directories already end with /
    }
    return u.origin + u.pathname;
  }

  function buildLinks() {
    if (!state.projectId) return { edit: '', view: '' };
    const base = pageShareBase();
    const q = '?project=' + encodeURIComponent(state.projectId);
    return {
      edit: state.editToken ? base + q + '#edit=' + encodeURIComponent(state.editToken) : '',
      view: state.viewToken ? base + q + '#view=' + encodeURIComponent(state.viewToken) : ''
    };
  }

  async function request(path, options = {}) {
    const base = apiBase();
    if (!base) {
      const err = new Error('未配置云端 API');
      err.code = 'no_api';
      throw err;
    }
    let res;
    try {
      res = await fetch(base + path, {
        ...options,
        headers: {
          'content-type': 'application/json',
          ...(options.headers || {})
        }
      });
    } catch (e) {
      const err = new Error('网络失败：' + (e.message || '无法连接'));
      err.code = 'network';
      throw err;
    }
    let data = null;
    const text = await res.text();
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!res.ok) {
      const err = new Error((data && (data.error || data.message)) || ('HTTP ' + res.status));
      err.status = res.status;
      err.data = data;
      err.code = data?.error || 'http_' + res.status;
      throw err;
    }
    return data;
  }

  function applyPayload(payload) {
    if (!window.D5Editor?.importDraft) throw new Error('编辑器未就绪');
    window.D5Editor.importDraft(JSON.stringify(payload));
  }

  function currentPayload() {
    if (!window.D5Editor?.getDraft) throw new Error('编辑器未就绪');
    return window.D5Editor.getDraft();
  }

  function refreshCloudUi() {
    const panel = document.getElementById('d5-cloud-panel');
    if (!panel) return;
    const base = apiBase();
    const cfg = panel.querySelector('[data-cloud=api]');
    if (cfg && document.activeElement !== cfg) cfg.value = base;
    panel.querySelector('[data-cloud=hint]').textContent = base
      ? ('API：' + base)
      : '未配置云端 API，仅本地。填写 Worker URL 后点「保存 API」。';
    const links = buildLinks();
    const editIn = panel.querySelector('[data-cloud=edit-link]');
    const viewIn = panel.querySelector('[data-cloud=view-link]');
    if (editIn) editIn.value = links.edit;
    if (viewIn) viewIn.value = links.view;
    panel.querySelector('[data-cloud=meta]').textContent = state.projectId
      ? ('项目 ' + state.projectId.slice(0, 10) + '… · v' + (state.version ?? '?') + ' · ' + (state.role || '未知角色'))
      : '尚未创建或打开云端项目';
    const canEdit = state.role === 'edit' && !!state.editToken;
    panel.querySelector('[data-cloud=save]').disabled = !canEdit || state.busy || !base;
    panel.querySelector('[data-cloud=pull]').disabled = !state.projectId || !(state.editToken || state.viewToken) || state.busy || !base;
    panel.querySelector('[data-cloud=create]').disabled = state.busy || !base;
    panel.querySelector('[data-cloud=force]').disabled = !canEdit || state.busy || !base;
  }

  async function createProject() {
    const base = apiBase();
    if (!base) { setStatus('未配置云端 API，仅本地'); refreshCloudUi(); return; }
    state.busy = true;
    refreshCloudUi();
    setStatus('正在创建云端项目…');
    try {
      const data = await request('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: 'D5 Beta 价格页',
          payload: currentPayload()
        })
      });
      state.projectId = data.id;
      state.editToken = data.editToken;
      state.viewToken = data.viewToken;
      state.version = data.version;
      state.role = 'edit';
      state.title = data.title || '';
      persistSession();
      // Update URL without reload
      const url = new URL(location.href);
      url.searchParams.set('project', state.projectId);
      history.replaceState(null, '', url.pathname + url.search + '#edit=' + encodeURIComponent(state.editToken));
      setStatus('已创建云端项目 · v' + state.version + ' · 请复制编辑/只读链接');
      openPanel(true);
    } catch (e) {
      setStatus('创建失败：' + e.message);
    } finally {
      state.busy = false;
      refreshCloudUi();
    }
  }

  async function pullProject({ silent } = {}) {
    const token = state.editToken || state.viewToken;
    if (!state.projectId || !token) {
      setStatus('无项目或令牌，无法拉取');
      return;
    }
    if (!apiBase()) { setStatus('未配置云端 API，仅本地'); return; }
    state.busy = true;
    refreshCloudUi();
    if (!silent) setStatus('正在从云端拉取…');
    try {
      const data = await request(
        '/api/projects/' + encodeURIComponent(state.projectId) + '?token=' + encodeURIComponent(token)
      );
      state.version = data.version;
      state.role = data.role;
      state.title = data.title || state.title;
      if (data.role === 'edit' && !state.editToken) state.editToken = token;
      if (data.role === 'view' && !state.viewToken) state.viewToken = token;
      persistSession();
      applyPayload(data.payload);
      setStatus('已拉取云端 · v' + data.version + (data.role === 'view' ? ' · 只读令牌' : ''));
    } catch (e) {
      setStatus('拉取失败：' + e.message + (e.status ? ' (' + e.status + ')' : ''));
    } finally {
      state.busy = false;
      refreshCloudUi();
    }
  }

  async function saveProject({ force } = {}) {
    if (state.role !== 'edit' || !state.editToken) {
      setStatus('当前为只读链接，无法保存到云端');
      return;
    }
    if (!apiBase()) { setStatus('未配置云端 API，仅本地'); return; }
    state.busy = true;
    refreshCloudUi();
    setStatus(force ? '强制覆盖保存中…' : '正在保存到云端…');
    try {
      const data = await request('/api/projects/' + encodeURIComponent(state.projectId), {
        method: 'PUT',
        body: JSON.stringify({
          token: state.editToken,
          version: state.version,
          payload: currentPayload(),
          title: state.title || 'D5 Beta 价格页'
        })
      });
      state.version = data.version;
      persistSession();
      setStatus('已保存到云端 · v' + data.version);
    } catch (e) {
      if (e.status === 409 && e.data) {
        setStatus('冲突：服务器 v' + e.data.currentVersion + '（' + (e.data.serverUpdatedAt || '') + '）。请拉取或确认强制覆盖。');
        const forceBtn = document.querySelector('[data-cloud=force]');
        if (forceBtn) forceBtn.dataset.pendingVersion = String(e.data.currentVersion);
      } else {
        setStatus('云端保存失败：' + e.message + (e.status ? ' (' + e.status + ')' : ''));
      }
    } finally {
      state.busy = false;
      refreshCloudUi();
    }
  }

  async function forceSave() {
    const pending = document.querySelector('[data-cloud=force]')?.dataset.pendingVersion;
    if (!pending) {
      setStatus('无冲突版本可覆盖；请先保存触发 409，或先拉取');
      return;
    }
    if (!confirm('强制用本机草稿覆盖服务器 v' + pending + '？他人未拉取的修改会丢失。')) return;
    // Align local version to server so PUT succeeds
    state.version = Number(pending);
    persistSession();
    await saveProject({ force: true });
    const forceBtn = document.querySelector('[data-cloud=force]');
    if (forceBtn) delete forceBtn.dataset.pendingVersion;
  }

  function copyText(value, label) {
    if (!value) { setStatus('无可复制的' + label); return; }
    navigator.clipboard.writeText(value).then(
      () => setStatus('已复制' + label),
      () => setStatus('复制失败，请手动全选链接')
    );
  }

  function openPanel(forceOpen) {
    const panel = document.getElementById('d5-cloud-panel');
    if (!panel) return;
    if (forceOpen === true) panel.hidden = false;
    else if (forceOpen === false) panel.hidden = true;
    else panel.hidden = !panel.hidden;
    refreshCloudUi();
  }

  function injectUi() {
    const bar = document.getElementById('d5-editor');
    if (!bar || document.getElementById('d5-cloud-panel')) return;

    const main = bar.querySelector('.editor-main');
    if (main && !bar.querySelector('[data-editor=cloud]')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.editor = 'cloud';
      btn.textContent = '云端分享';
      const after = bar.querySelector('[data-editor=html]');
      if (after?.nextSibling) main.insertBefore(btn, after.nextSibling);
      else main.appendChild(btn);
    }

    const panel = document.createElement('div');
    panel.id = 'd5-cloud-panel';
    panel.className = 'editor-cloud-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="editor-cloud-row">
        <strong>云端分享（Cloudflare）</strong>
        <span data-cloud="hint" class="editor-help"></span>
      </div>
      <div class="editor-cloud-row">
        <label class="editor-cloud-grow">API Base
          <input type="url" data-cloud="api" placeholder="https://d5-pricing-beta-share.&lt;account&gt;.workers.dev" spellcheck="false">
        </label>
        <button type="button" data-cloud="save-api">保存 API</button>
      </div>
      <div class="editor-cloud-row">
        <button type="button" class="editor-primary" data-cloud="create">创建分享项目</button>
        <button type="button" data-cloud="save">保存到云端</button>
        <button type="button" data-cloud="pull">拉取最新</button>
        <button type="button" data-cloud="force" title="仅在 409 冲突后使用">强制覆盖</button>
      </div>
      <p data-cloud="meta" class="editor-help"></p>
      <div class="editor-cloud-row">
        <label class="editor-cloud-grow">编辑链接
          <input type="text" data-cloud="edit-link" readonly>
        </label>
        <button type="button" data-cloud="copy-edit">复制</button>
      </div>
      <div class="editor-cloud-row">
        <label class="editor-cloud-grow">只读链接
          <input type="text" data-cloud="view-link" readonly>
        </label>
        <button type="button" data-cloud="copy-view">复制</button>
      </div>
      <p class="editor-help">同一链接多人打开可编辑；保存进服务器，刷新读最新。非各端 localStorage。离线 HTML 导出不含 token。</p>
    `;
    bar.appendChild(panel);

    bar.addEventListener('click', (e) => {
      const ed = e.target.closest('[data-editor]')?.dataset.editor;
      if (ed === 'cloud') {
        openPanel();
        return;
      }
      const cloud = e.target.closest('[data-cloud]')?.dataset.cloud;
      if (!cloud) return;
      if (cloud === 'save-api') {
        const v = panel.querySelector('[data-cloud=api]').value.trim().replace(/\/$/, '');
        try {
          if (v) localStorage.setItem(API_LS_KEY, v);
          else localStorage.removeItem(API_LS_KEY);
          window.D5_CLOUD_API = v || undefined;
        } catch (err) {
          setStatus('无法写入本机 API 配置：' + err.message);
          return;
        }
        setStatus(v ? '已保存云端 API' : '已清除云端 API（仅本地）');
        refreshCloudUi();
      } else if (cloud === 'create') createProject();
      else if (cloud === 'save') saveProject();
      else if (cloud === 'pull') pullProject();
      else if (cloud === 'force') forceSave();
      else if (cloud === 'copy-edit') copyText(panel.querySelector('[data-cloud=edit-link]').value, '编辑链接');
      else if (cloud === 'copy-view') copyText(panel.querySelector('[data-cloud=view-link]').value, '只读链接');
    });

    refreshCloudUi();
  }

  async function bootFromUrl() {
    loadSession();
    const share = parseUrlShare();
    if (share?.projectId) {
      state.projectId = share.projectId;
      if (share.editToken) {
        state.editToken = share.editToken;
        state.role = 'edit';
      } else if (share.viewToken) {
        state.viewToken = share.viewToken;
        state.role = 'view';
      }
      persistSession();
      if (apiBase() && (state.editToken || state.viewToken)) {
        await pullProject({ silent: false });
      } else if (!apiBase()) {
        setStatus('分享链接已识别，但未配置云端 API — 仅本地草稿');
      }
    }
    refreshCloudUi();
  }

  function init() {
    injectUi();
    bootFromUrl();
  }

  window.D5Cloud = Object.freeze({
    apiBase,
    getState: () => ({ ...state }),
    createProject,
    saveProject,
    pullProject,
    buildLinks,
    pageShareBase,
    refreshCloudUi
  });

  if (document.getElementById('d5-editor')) init();
  else document.addEventListener('DOMContentLoaded', init);
  // editor.js appends bar synchronously before this script if ordered after; also retry shortly
  setTimeout(() => { if (!document.getElementById('d5-cloud-panel')) init(); }, 0);
})();
