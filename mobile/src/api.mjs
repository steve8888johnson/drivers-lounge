export function apiOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      url.pathname !== '/' || url.search || url.hash ||
      !(url.hostname === 'driverslounge.app' ||
        /^drivers-lounge-[a-z0-9-]+-steves-projects-c46af6ff\.vercel\.app$/.test(url.hostname)))
    throw new Error('Use the Drivers Lounge HTTPS production origin or a Drivers Lounge Vercel preview.');
  return url.origin;
}
export function createApiFetch({ nativeHttp, webFetch, localOrigin, backendOrigin }) {
  const base = apiOrigin(backendOrigin), local = new URL(localOrigin);
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), localOrigin);
    if (url.protocol !== local.protocol || url.host !== local.host || !url.pathname.startsWith('/api/')) return webFetch(input, init);
    const request = new Request(url, input instanceof Request ? input : undefined);
    const effective = init ? new Request(request, init) : request;
    if (effective.signal.aborted) throw effective.signal.reason || new DOMException('Aborted', 'AbortError');
    const headers = Object.fromEntries(effective.headers);
    // These APIs accept JSON/text, never cookies or arbitrary multipart uploads.
    const body = ['GET','HEAD'].includes(effective.method) ? undefined : await effective.text();
    if (body && !/^application\/json\b/i.test(headers['content-type'] || ''))
      throw new TypeError('Native API requests must use application/json.');
    const data = body ? JSON.parse(body) : undefined;
    const destination = new URL(url.pathname + url.search, base).href;
    let onAbort;
    const aborted = new Promise((_, reject) => {
      onAbort = () => reject(effective.signal.reason || new DOMException('Aborted', 'AbortError'));
      effective.signal.addEventListener('abort', onAbort, { once: true });
    });
    try {
      if (effective.signal.aborted) throw effective.signal.reason || new DOMException('Aborted', 'AbortError');
      const response = await Promise.race([aborted, nativeHttp.request({
        url: destination, method: effective.method, headers, data,
        responseType: 'text', connectTimeout: 15000, readTimeout: 30000,
        disableRedirects: true
      })]);
      // Never follow API redirects to a different host with authorization headers.
      if (response.status >= 300 && response.status < 400) throw new Error('Unexpected API redirect.');
      const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      return new Response([204,205,304].includes(response.status) ? null : text,
        { status: response.status, headers: response.headers });
    } finally { effective.signal.removeEventListener('abort', onAbort); }
  };
}
