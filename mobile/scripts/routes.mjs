// Capacitor serves real files, whereas Vercel supports extensionless clean URLs.
export function rewriteLocalRoutes(source, routes) {
  const known = new Set(routes.map(path => path.replace(/\.html$/, '')));
  return source.replace(/(["'\x60])\/([a-zA-Z0-9/_-]*)([?#][^"'\x60\s<>]*)?\1/g,
    (match, quote, path, suffix = '') => {
      if (!path) return quote + '/index.html' + suffix + quote;
      return known.has(path) ? quote + '/' + path + '.html' + suffix + quote : match;
    });
}
