/**
 * D5 Beta pricing share API — Cloudflare Worker + per-project Durable Object.
 * Strong consistency: each project lives in one DO; requests are serialized.
 * Version check + write happen in the same DO critical section → true 409 under concurrency.
 * No public list. Edit vs view tokens. Secrets never baked into static assets.
 *
 * KV is NOT used as the source of truth (removed).
 */

const MAX_PAYLOAD_BYTES = 1_500_000;
const MAX_TITLE = 120;
const ID_BYTES = 18;
const TOKEN_BYTES = 24;
const STORAGE_KEY = 'project';

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });
}

function parseOrigins(env) {
  const raw = (env.ALLOWED_ORIGINS || '').trim();
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function corsHeaders(env, request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = parseOrigins(env);
  const headers = {
    'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin'
  };
  if (origin && allowed.includes(origin)) {
    headers['access-control-allow-origin'] = origin;
  }
  return headers;
}

function withCors(env, request, response) {
  const h = corsHeaders(env, request);
  const out = new Response(response.body, response);
  for (const [k, v] of Object.entries(h)) out.headers.set(k, v);
  return out;
}

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomToken(byteLen) {
  const buf = new Uint8Array(byteLen);
  crypto.getRandomValues(buf);
  return b64url(buf);
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const enc = new TextEncoder();
  const aa = enc.encode(a);
  const bb = enc.encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

function roleFor(project, token) {
  if (!token || !project) return null;
  if (timingSafeEqual(token, project.editToken)) return 'edit';
  if (timingSafeEqual(token, project.viewToken)) return 'view';
  return null;
}

function publicProject(project, role) {
  return {
    id: project.id,
    version: project.version,
    updatedAt: project.updatedAt,
    title: project.title || '',
    role,
    payload: project.payload
  };
}

async function readBody(request) {
  const text = await request.text();
  if (text.length > MAX_PAYLOAD_BYTES + 50_000) {
    throw Object.assign(new Error('body too large'), { status: 413 });
  }
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error('invalid JSON'), { status: 400 });
  }
}

function matchRoute(pathname) {
  if (pathname === '/api/projects') return { name: 'collection' };
  let m = pathname.match(/^\/api\/projects\/([^/]+)\/rotate$/);
  if (m) return { name: 'rotate', id: decodeURIComponent(m[1]) };
  m = pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (m) return { name: 'item', id: decodeURIComponent(m[1]) };
  return null;
}

/**
 * Per-project Durable Object. All GET/PUT/create/rotate for one id run here,
 * serialized by the DO runtime (and by FakeProjectNamespace in Node tests).
 */
export class ProjectDO {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async load() {
    return (await this.ctx.storage.get(STORAGE_KEY)) || null;
  }

  async save(project) {
    await this.ctx.storage.put(STORAGE_KEY, project);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const op = url.searchParams.get('op') || '';

    try {
      if (request.method === 'POST' && op === 'create') {
        return await this.handleCreate(request);
      }
      if (request.method === 'GET' && op === 'get') {
        return await this.handleGet(url);
      }
      if (request.method === 'PUT' && op === 'put') {
        return await this.handlePut(request);
      }
      if (request.method === 'POST' && op === 'rotate') {
        return await this.handleRotate(request);
      }
      return json({ error: 'method_not_allowed' }, 405);
    } catch (err) {
      const status = err.status || 500;
      return json({ error: err.message || 'server_error' }, status);
    }
  }

  async handleCreate(request) {
    const existing = await this.load();
    if (existing) {
      return json({ error: 'already_exists' }, 409);
    }
    const body = await readBody(request);
    const id = body.id;
    if (typeof id !== 'string' || !id) return json({ error: 'id_required' }, 400);

    const editToken = randomToken(TOKEN_BYTES);
    const viewToken = randomToken(TOKEN_BYTES);
    const title = typeof body.title === 'string' ? body.title.slice(0, MAX_TITLE) : 'D5 Beta 价格页';
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
    const payloadStr = JSON.stringify(payload);
    if (payloadStr.length > MAX_PAYLOAD_BYTES) {
      return json({ error: 'payload_too_large', maxBytes: MAX_PAYLOAD_BYTES }, 413);
    }
    const now = new Date().toISOString();
    const record = {
      id,
      editToken,
      viewToken,
      version: 1,
      updatedAt: now,
      title,
      payload
    };
    await this.save(record);
    return json({
      id,
      editToken,
      viewToken,
      version: 1,
      updatedAt: now,
      title
    }, 201);
  }

  async handleGet(url) {
    const project = await this.load();
    if (!project) return json({ error: 'not_found' }, 404);
    const token = url.searchParams.get('token') || '';
    const role = roleFor(project, token);
    if (!role) return json({ error: 'forbidden' }, 403);
    return json(publicProject(project, role));
  }

  async handlePut(request) {
    const body = await readBody(request);
    const token = body.token;
    const clientVersion = body.version;
    const payload = body.payload;
    if (typeof token !== 'string' || !token) return json({ error: 'token_required' }, 400);
    if (!Number.isInteger(clientVersion) || clientVersion < 1) {
      return json({ error: 'version_required' }, 400);
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return json({ error: 'payload_required' }, 400);
    }
    const payloadStr = JSON.stringify(payload);
    if (payloadStr.length > MAX_PAYLOAD_BYTES) {
      return json({ error: 'payload_too_large', maxBytes: MAX_PAYLOAD_BYTES }, 413);
    }

    // Critical section: DO serializes concurrent fetches for this object.
    const project = await this.load();
    if (!project) return json({ error: 'not_found' }, 404);
    if (roleFor(project, token) !== 'edit') return json({ error: 'forbidden' }, 403);

    if (clientVersion !== project.version) {
      return json({
        error: 'conflict',
        currentVersion: project.version,
        serverUpdatedAt: project.updatedAt
      }, 409);
    }

    const now = new Date().toISOString();
    project.version = project.version + 1;
    project.updatedAt = now;
    project.payload = payload;
    if (typeof body.title === 'string') project.title = body.title.slice(0, MAX_TITLE);
    await this.save(project);

    return json({
      id: project.id,
      version: project.version,
      updatedAt: project.updatedAt,
      title: project.title || ''
    });
  }

  async handleRotate(request) {
    const body = await readBody(request);
    const token = body.token;
    if (typeof token !== 'string' || !token) return json({ error: 'token_required' }, 400);
    const project = await this.load();
    if (!project) return json({ error: 'not_found' }, 404);
    if (roleFor(project, token) !== 'edit') return json({ error: 'forbidden' }, 403);
    project.editToken = randomToken(TOKEN_BYTES);
    project.updatedAt = new Date().toISOString();
    await this.save(project);
    return json({
      id: project.id,
      editToken: project.editToken,
      viewToken: project.viewToken,
      version: project.version,
      updatedAt: project.updatedAt
    });
  }
}

function projectStub(env, id) {
  if (!env.PROJECT) return null;
  const doId = env.PROJECT.idFromName(id);
  return env.PROJECT.get(doId);
}

async function forwardToDO(stub, pathWithQuery, init) {
  // Internal URL; op + params carried on query string for DO handler.
  const url = 'https://do.internal' + pathWithQuery;
  return stub.fetch(new Request(url, init));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return withCors(env, request, new Response(null, { status: 204 }));
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      return withCors(
        env,
        request,
        json({
          ok: true,
          service: 'd5-pricing-beta-share',
          storage: 'durable_object'
        })
      );
    }

    const route = matchRoute(url.pathname);
    if (!route) {
      return withCors(env, request, json({ error: 'not_found' }, 404));
    }

    if (!env.PROJECT) {
      return withCors(env, request, json({ error: 'do_not_bound' }, 500));
    }

    try {
      if (route.name === 'collection' && request.method === 'POST') {
        const body = await readBody(request);
        const id = randomToken(ID_BYTES);
        const stub = projectStub(env, id);
        const res = await forwardToDO(stub, '/?op=create', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id,
            title: body.title,
            payload: body.payload
          })
        });
        return withCors(env, request, res);
      }

      if (route.name === 'item' && request.method === 'GET') {
        const token = url.searchParams.get('token') || '';
        const stub = projectStub(env, route.id);
        const res = await forwardToDO(
          stub,
          '/?op=get&token=' + encodeURIComponent(token),
          { method: 'GET' }
        );
        return withCors(env, request, res);
      }

      if (route.name === 'item' && request.method === 'PUT') {
        const raw = await request.text();
        const stub = projectStub(env, route.id);
        const res = await forwardToDO(stub, '/?op=put', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: raw
        });
        return withCors(env, request, res);
      }

      if (route.name === 'rotate' && request.method === 'POST') {
        const raw = await request.text();
        const stub = projectStub(env, route.id);
        const res = await forwardToDO(stub, '/?op=rotate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: raw
        });
        return withCors(env, request, res);
      }

      return withCors(env, request, json({ error: 'method_not_allowed' }, 405));
    } catch (err) {
      const status = err.status || 500;
      return withCors(env, request, json({ error: err.message || 'server_error' }, status));
    }
  }
};

/**
 * In-memory Durable Object namespace for Node tests.
 * Serializes fetch per object id — same concurrency model as CF DO.
 */
export function createFakeProjectNamespace(ProjectDOClass = ProjectDO) {
  const instances = new Map();

  class MemoryStorage {
    constructor() {
      this.map = new Map();
    }
    async get(key) {
      return this.map.has(key) ? this.map.get(key) : undefined;
    }
    async put(key, value) {
      this.map.set(key, value);
    }
  }

  function getStub(idKey) {
    if (!instances.has(idKey)) {
      const storage = new MemoryStorage();
      const ctx = { storage };
      const dob = new ProjectDOClass(ctx, {});
      let chain = Promise.resolve();
      instances.set(idKey, {
        fetch(request) {
          const run = chain.then(() => dob.fetch(request));
          // Keep queue alive even if one request rejects
          chain = run.then(
            () => {},
            () => {}
          );
          return run;
        }
      });
    }
    return instances.get(idKey);
  }

  return {
    idFromName(name) {
      return { name, toString: () => name };
    },
    get(id) {
      const key = typeof id === 'string' ? id : id.name || String(id);
      return getStub(key);
    },
    /** test-only */
    _instances: instances
  };
}

export const __test = {
  matchRoute,
  roleFor,
  timingSafeEqual,
  ProjectDO,
  createFakeProjectNamespace,
  MAX_PAYLOAD_BYTES,
  STORAGE_KEY
};
