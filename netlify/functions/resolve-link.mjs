// Opens a short Google Maps link (maps.app.goo.gl/…) and returns the long link it points to.
// Browsers can't do this themselves (Google blocks it), so it runs on Netlify's servers.
//
// GET /api/resolve-link?url=https://maps.app.goo.gl/abc123  ->  { url: "https://www.google.com/maps/place/…" }
//
// Only Google links are followed, so nobody can use this to open other websites.
const SHORT_HOSTS = ['maps.app.goo.gl', 'goo.gl'];
const GOOGLE_HOST = /(^|\.)google\.[a-z.]+$/i;

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const isAllowed = (url) => url.protocol === 'https:' && (SHORT_HOSTS.includes(url.hostname) || GOOGLE_HOST.test(url.hostname));
// A real map link (has a /maps path or coordinates), not a redirect page.
const isMapLink = (url) => GOOGLE_HOST.test(url.hostname) && /\/maps|[?&](q|ll)=/.test(url.pathname + url.search);

export default async (req) => {
  let url;
  try {
    url = new URL(new URL(req.url).searchParams.get('url') || '');
  } catch {
    return json(400, { error: 'Not a link' });
  }
  if (!SHORT_HOSTS.includes(url.hostname)) return json(400, { error: 'Only maps.app.goo.gl links' });

  try {
    // Follow up to 5 redirects by hand, checking each one is still Google.
    for (let i = 0; i < 5; i++) {
      if (!isAllowed(url)) return json(400, { error: 'Not a Google link' });
      if (isMapLink(url)) return json(200, { url: url.href });
      const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (Aqualife map link reader)' } });
      const next = res.headers.get('location');
      if (!next) break;
      url = new URL(next, url);
      // Google's cookie page: the real link is in "continue".
      const cont = url.hostname.startsWith('consent.') && url.searchParams.get('continue');
      if (cont) url = new URL(cont);
    }
    return isMapLink(url) ? json(200, { url: url.href }) : json(404, { error: 'Could not open the link' });
  } catch {
    return json(502, { error: 'Could not open the link' });
  }
};

export const config = { path: '/api/resolve-link' };
