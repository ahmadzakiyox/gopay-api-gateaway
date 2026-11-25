// Minimal RFC6265 cookie jar implementation in native Node.js
// Designed specifically for Shopee multi-domain authentication flow.

function canonicalHost(host) {
  let h = String(host || '').toLowerCase().trim();
  const colonIdx = h.indexOf(':');
  if (colonIdx !== -1) {
    h = h.slice(0, colonIdx);
  }
  return h;
}

function domainMatch(requestHost, cookieDomain) {
  if (!cookieDomain) return true;
  const req = canonicalHost(requestHost);
  let dom = cookieDomain.toLowerCase().trim();
  if (dom.startsWith('.')) {
    dom = dom.slice(1);
  }
  if (req === dom) return true;
  return req.endsWith('.' + dom);
}

function pathMatch(requestPath, cookiePath) {
  if (!cookiePath || cookiePath === '/') return true;
  const req = requestPath || '/';
  if (req === cookiePath) return true;
  if (req.startsWith(cookiePath)) {
    if (cookiePath.endsWith('/')) return true;
    return req[cookiePath.length] === '/';
  }
  return false;
}

function parseSetCookie(headerStr, defaultDomain, defaultPath) {
  if (!headerStr) return null;
  const parts = headerStr.split(';').map(p => p.trim());
  if (!parts[0]) return null;
  const eqIdx = parts[0].indexOf('=');
  if (eqIdx === -1) return null;
  const name = parts[0].slice(0, eqIdx).trim();
  const value = parts[0].slice(eqIdx + 1).trim();

  let domain = defaultDomain;
  let path = defaultPath || '/';
  let expires = 0;
  let secure = false;
  let httpOnly = false;
  let hostOnly = true;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const pEq = part.indexOf('=');
    const key = (pEq === -1 ? part : part.slice(0, pEq)).toLowerCase().trim();
    const val = pEq === -1 ? '' : part.slice(pEq + 1).trim();

    if (key === 'domain' && val) {
      domain = val;
      hostOnly = false;
    } else if (key === 'path' && val) {
      path = val;
    } else if (key === 'expires' && val) {
      const ms = Date.parse(val);
      if (!isNaN(ms)) expires = ms;
    } else if (key === 'max-age' && val) {
      const secs = parseInt(val, 10);
      if (!isNaN(secs)) expires = Date.now() + (secs * 1000);
    } else if (key === 'secure') {
      secure = true;
    } else if (key === 'httponly') {
      httpOnly = true;
    }
  }

  return { name, value, domain, path, expires, secure, httpOnly, hostOnly };
}

class ShopeeCookieJar {
  constructor(initialCookies = []) {
    this.cookies = [];
    if (Array.isArray(initialCookies)) {
      this.restore(initialCookies);
    }
  }

  setCookiesFromHeaders(headerValues, requestUrl) {
    if (!headerValues) return;
    const u = new URL(requestUrl);
    const headers = Array.isArray(headerValues) ? headerValues : [headerValues];
    for (const h of headers) {
      const parsed = parseSetCookie(h, u.hostname, u.pathname);
      if (parsed) {
        this.setCookie(parsed);
      }
    }
  }

  setCookie(cookie) {
    if (!cookie || !cookie.name) return;
    // Remove duplicate name + domain + path
    this.cookies = this.cookies.filter(c => !(
      c.name === cookie.name &&
      canonicalHost(c.domain) === canonicalHost(cookie.domain) &&
      (c.path || '/') === (cookie.path || '/')
    ));
    this.cookies.push(cookie);
  }

  getCookieString(requestUrl) {
    const u = new URL(requestUrl);
    const host = canonicalHost(u.hostname);
    const path = u.pathname || '/';
    const now = Date.now();

    const matched = [];
    for (const c of this.cookies) {
      if (c.expires > 0 && c.expires < now) continue;
      if (c.secure && u.protocol !== 'https:') continue;
      if (!domainMatch(host, c.domain)) continue;
      if (!pathMatch(path, c.path)) continue;
      matched.push(`${c.name}=${c.value}`);
    }
    return matched.join('; ');
  }

  get(name, requestUrl) {
    const u = new URL(requestUrl);
    const host = canonicalHost(u.hostname);
    const now = Date.now();
    for (const c of this.cookies) {
      if (c.name === name) {
        if (c.expires > 0 && c.expires < now) continue;
        if (domainMatch(host, c.domain)) return c.value;
      }
    }
    return '';
  }

  snapshot() {
    return this.cookies.map(c => ({ ...c }));
  }

  restore(cookiesArray) {
    if (!Array.isArray(cookiesArray)) {
      this.cookies = [];
      return;
    }
    this.cookies = cookiesArray.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || '/',
      secure: Boolean(c.secure),
      httpOnly: Boolean(c.httpOnly),
      expires: Number(c.expires || 0),
      hostOnly: Boolean(c.hostOnly)
    }));
  }

  clear() {
    this.cookies = [];
  }
}

module.exports = {
  ShopeeCookieJar,
  parseSetCookie,
  domainMatch,
  pathMatch
};
