/**
 * The edge in front of the static site, kept from v1 (workers-site/ and functions/get.js on the main branch): short
 * links redirect, /api/on-repeat asks Last.fm what is on repeat, and any other request is the site. Short links match
 * only the first path segment, lower-cased, as before.
 */

interface Env {
  /** The built site in dist/, bound in wrangler.jsonc. */
  readonly ASSETS: { fetch(request: Request): Promise<Response> };
  /** Set with `npx wrangler secret put LASTFM_API_KEY`, and in .dev.vars for `wrangler dev`. */
  readonly LASTFM_API_KEY?: string;
}

/** /<slug> goes to the address (v1's workers-site/data.js). A Map, so /constructor is not a slug. */
const SHORT_LINKS = new Map<string, string>([
  ['resume', 'https://drive.google.com/file/d/1V25rHeFhoW1z8kEf4_qxwI8sxW36gO7j/view?usp=sharing'],
  ['twitter', 'https://twitter.com/VisheshBansal17'],
  ['instagram', 'https://instagram.com/thevisheshbansal'],
  ['linkedin', 'https://www.linkedin.com/in/bansalvishesh/'],
  ['medium', 'https://medium.com/@visheshbansal'],
  ['kaggle', 'https://kaggle.com/bansalvishesh'],
  ['behance', 'https://behance.net/visheshbansal'],
  ['dribbble', 'https://dribbble.com/visheshbansal'],
  ['arc-sw.js', 'https://arc.io/arc-sw.js'],
]);

const GITHUB = 'https://github.com/VisheshBansal';
const MOVED_PERMANENTLY = 301;

/** Last.fm: the user from v1, and how long an answer is reused (seconds) at the edge and in the browser. */
const LASTFM = { endpoint: 'https://ws.audioscrobbler.com/2.0/', user: 'VisheshBansal', ttl: 300, retry: 60 } as const;
const ON_REPEAT_PATH = '/api/on-repeat';
/** Last.fm's chart windows, newest first: a quiet week falls back to the newest window with plays. */
const PERIODS = ['7day', '1month', '3month', '6month', '12month', 'overall'] as const;

interface TopTracks {
  readonly error?: number;
  readonly toptracks?: {
    readonly track?: readonly {
      readonly name: string;
      readonly url: string;
      readonly playcount: string;
      readonly artist: { readonly name: string };
    }[];
  };
}

/** /gh, /gh/<repo>, /gh/<repo>/<sha> for a commit, and /gh/<repo>/<anything>/<n> for issue n. */
function github(parts: readonly string[]): string | null {
  const [, repo, sha, issue] = parts;
  if (parts.length === 1) return GITHUB;
  if (parts.length === 2) return `${GITHUB}/${repo}`;
  if (parts.length === 3) return `${GITHUB}/${repo}/commit/${sha}`;
  if (parts.length === 4) return `${GITHUB}/${repo}/issues/${issue}`;
  return null;
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${status === 200 ? LASTFM.ttl : LASTFM.retry}` },
  });

/**
 * The most played track of the newest window with plays, and which window that was (`period`, so the page never calls
 * an old favourite "on repeat"). 503 when there is no key, Last.fm fails ('unavailable'), or nothing was ever played.
 */
async function onRepeat(env: Env): Promise<Response> {
  if (!env.LASTFM_API_KEY) return json({ error: 'not configured' }, 503);
  // Cloudflare caches each Last.fm answer itself, so Last.fm is asked at most once per window per ttl per location.
  const init: RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } } = {
    cf: { cacheTtl: LASTFM.ttl, cacheEverything: true },
  };
  try {
    for (const period of PERIODS) {
      const url = new URL(LASTFM.endpoint);
      url.search = new URLSearchParams({
        method: 'user.gettoptracks',
        user: LASTFM.user,
        period,
        limit: '1',
        api_key: env.LASTFM_API_KEY,
        format: 'json',
      }).toString();
      const response = await fetch(url, init);
      const body = response.ok ? ((await response.json()) as TopTracks) : undefined;
      if (!body || body.error) return json({ error: 'unavailable' }, 503);
      const top = body.toptracks?.track?.[0];
      if (top) return json({ track: top.name, artist: top.artist.name, plays: Number(top.playcount), url: top.url, period }, 200);
    }
    return json({ error: 'nothing on repeat' }, 503);
  } catch {
    return json({ error: 'unavailable' }, 503);
  }
}

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === ON_REPEAT_PATH) return onRepeat(env);
    const parts = pathname
      .split('/')
      .filter(Boolean)
      .map((part) => part.toLowerCase());
    const [first = ''] = parts;
    const target = SHORT_LINKS.get(first) ?? (first === 'gh' ? github(parts) : null);
    return target ? Response.redirect(target, MOVED_PERMANENTLY) : env.ASSETS.fetch(request);
  },
};
