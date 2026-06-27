// tests/helpers.js — shared HTTP client with a cookie jar (not a test file).
// fetch() doesn't persist cookies, so we capture Set-Cookie and replay them.

function makeClient(base) {
  let jar = {};

  function header(extra) {
    const pairs = Object.entries(jar).map(([k, v]) => `${k}=${v}`);
    if (extra) pairs.push(extra);
    return pairs.join("; ");
  }

  function capture(res) {
    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of setCookies) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      const k = pair.slice(0, i).trim();
      const v = pair.slice(i + 1).trim();
      if (v === "") delete jar[k];
      else jar[k] = v;
    }
  }

  return {
    jar: () => jar,
    reset() {
      jar = {};
    },
    set(k, v) {
      jar[k] = v;
    },
    async call(method, path, body, extraCookie) {
      const res = await fetch(base + path, {
        method,
        headers: { "Content-Type": "application/json", Cookie: header(extraCookie) },
        body: body ? JSON.stringify(body) : undefined,
      });
      capture(res);
      let data = {};
      try {
        data = await res.json();
      } catch (_) {
        /* no body */
      }
      return { status: res.status, data };
    },
  };
}

module.exports = { makeClient };
